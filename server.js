const session = require('express-session');
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const EVENTS_FILE = path.join(__dirname, 'events.json');

// --- Password for admin ---
const ADMIN_PASSWORD = 'password'; // <--- CHANGE THIS!

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // to parse form POST data
app.use(session({
  secret: 'aVerySecretSessionKeyChangeThis', // <--- CHANGE THIS!
  resave: false,
  saveUninitialized: false,
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

// --- Auth middleware ---
function checkAuth(req, res, next) {
  if (req.session && req.session.loggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
}

// --- Serve login page ---
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// --- Handle login form submission ---
app.post('/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.loggedIn = true;
    res.redirect('/admin');
  } else {
    res.send('Incorrect password. <a href="/login">Try again</a>');
  }
});

// --- Protect admin route ---
app.get('/admin', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// --- Logout ---
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// --- Your existing event API routes below ---

function readEvents() {
  if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(EVENTS_FILE));
}

function writeEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

// Get all events
app.get('/api/events', (req, res) => {
  res.json(readEvents());
});

// Get single event
app.get('/api/events/:id', (req, res) => {
  const events = readEvents();
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

// Create event with time slots
app.post('/api/events', (req, res) => {
  const { title, date, location, description, contactName, contactEmail, scheduleType, timeSlots } = req.body;
  const events = readEvents();
  const newEvent = {
    id: uuidv4(),
    title,
    date,
    location,
    description,
    contactName,
    contactEmail,
    scheduleType,
    timeSlots: timeSlots.map(slot => ({
      time: slot.time,
      hours: slot.hours,
      maxSpots: Number(slot.maxSpots),
      signups: []
    }))
  };
  events.push(newEvent);
  writeEvents(events);
  res.status(201).json(newEvent);
});

// Sign up for a specific slot
app.post('/api/events/:id/signup', (req, res) => {
  const { slotIndex, name } = req.body;
  const events = readEvents();
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (!event.timeSlots[slotIndex]) return res.status(400).json({ error: 'Invalid slot index' });

  const slot = event.timeSlots[slotIndex];
  if (slot.signups.length >= slot.maxSpots) {
    return res.status(400).json({ error: 'No spots left for this time slot' });
  }

  slot.signups.push(name);
  writeEvents(events);
  res.json(event);
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
  let events = readEvents();
  events = events.filter(e => e.id !== req.params.id);
  writeEvents(events);
  res.json({ success: true });
});

// Cancel signup
app.post('/api/events/:id/cancel', (req, res) => {
  const { slotIndex, name } = req.body;
  const events = readEvents();
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const slot = event.timeSlots[slotIndex];
  const index = slot.signups.findIndex(s => s.toLowerCase() === name.toLowerCase());
  if (index === -1) return res.status(404).json({ error: 'Signup not found' });

  slot.signups.splice(index, 1);
  writeEvents(events);
  res.json({ success: true });
});

// --- Start server ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
