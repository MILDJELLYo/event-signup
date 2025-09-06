const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getUserData } = require('./sheets'); // your Google Sheets helper
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;
const EVENTS_FILE = path.join(__dirname, 'events.json');

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'change-this-to-a-very-secret-string',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // set true if HTTPS
}));

// --- Passport init ---
app.use(passport.initialize());
app.use(passport.session());

// --- Serialize / deserialize ---
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// --- Google OAuth strategy ---
passport.use(new GoogleStrategy({
    clientID: '324724100175-7f735g4nghi2io0h6chcq54mcdik1l0j.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: '/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // profile contains user info
    return done(null, profile);
  }
));

// --- Auth middleware ---
function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login.html');
}

// --- Serve login page ---
app.get('/login.html', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

// --- Start Google OAuth ---
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => res.redirect('/')
);

// --- Logout ---
app.get('/logout', (req, res) => {
  req.logout(() => res.redirect('/login.html'));
});

// --- Protect all pages ---
app.use(requireLogin, express.static(path.join(__dirname, 'public')));

// --- Dashboard default route ---
app.get('/', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// --- Your existing Google Sheets API route ---
app.get('/api/userinfo', requireLogin, async (req, res) => {
  try {
    const fullName = req.query.fullName;
    if (!fullName) return res.status(400).json({ error: 'Missing fullName query parameter' });

    const data = await getUserData(fullName);
    if (!data) return res.status(404).json({ error: 'User not found' });

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// --- Event API routes (unchanged) ---
function readEvents() {
  if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(EVENTS_FILE));
}

function writeEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

app.get('/api/events', requireLogin, (req, res) => res.json(readEvents()));
app.get('/api/events/:id', requireLogin, (req, res) => {
  const events = readEvents();
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});
app.post('/api/events', requireLogin, (req, res) => {
  const { title, date, location, description, contactName, contactEmail, scheduleType, timeSlots } = req.body;
  const events = readEvents();
  const newEvent = { id: uuidv4(), title, date, location, description, contactName, contactEmail, scheduleType, timeSlots: timeSlots.map(slot => ({ time: slot.time, hours: slot.hours, maxSpots: Number(slot.maxSpots), signups: [] })) };
  events.push(newEvent);
  writeEvents(events);
  res.status(201).json(newEvent);
});
app.post('/api/events/:id/signup', requireLogin, (req, res) => {
  const { slotIndex, name } = req.body;
  const events = readEvents();
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const slot = event.timeSlots[slotIndex];
  if (!slot) return res.status(400).json({ error: 'Invalid slot index' });
  if (slot.signups.length >= slot.maxSpots) return res.status(400).json({ error: 'No spots left' });
  slot.signups.push(name);
  writeEvents(events);
  res.json(event);
});
app.post('/api/events/:id/waitlist', requireLogin, (req, res) => {
  const { slotIndex, name } = req.body;
  const events = readEvents();
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const slot = event.timeSlots[slotIndex];
  if (!slot) return res.status(400).json({ error: 'Invalid slot index' });
  if (!slot.waitlist) slot.waitlist = [];
  if (slot.waitlist.some(s => s.toLowerCase() === name.toLowerCase())) return res.status(400).json({ error: 'Already on waitlist' });
  slot.waitlist.push(name);
  writeEvents(events);
  res.json({ success: true });
});
app.delete('/api/events/:id', requireLogin, (req, res) => {
  let events = readEvents();
  events = events.filter(e => e.id !== req.params.id);
  writeEvents(events);
  res.json({ success: true });
});
app.post('/api/events/:id/cancel', requireLogin, (req, res) => {
  const { slotIndex, name } = req.body;
  const events = readEvents();
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const slot = event.timeSlots[slotIndex];
  const index = slot.signups.findIndex(s => s.toLowerCase() === name.toLowerCase());
  if (index === -1) return res.status(404).json({ error: 'Signup not found' });
  slot.signups.splice(index, 1);
  if (slot.waitlist && slot.waitlist.length > 0) {
    const promoted = slot.waitlist.shift();
    slot.signups.push(promoted);
  }
  writeEvents(events);
  res.json({ success: true });
});

// --- Start server ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
