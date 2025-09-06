const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fetch = require('node-fetch'); // 👈 for pulling the CSV

const app = express();
const PORT = process.env.PORT || 3000;
const EVENTS_FILE = path.join(__dirname, 'events.json');

// --- Google Sheet CSV (your Directory) ---
const sheetCSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9nsgWRuANHKqhFPeAWN88MvusJSzkQtcm4nUdaVIjAky1WifmSchquUEg0BV5r1dEvedKnKjtyiwC/pub?gid=411848997&single=true&output=csv";

// --- Middleware ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'aVerySecretSessionKeyChangeThis', // 👈 CHANGE THIS
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // true if HTTPS
}));

// --- Helper: load accounts from CSV ---
async function loadAccounts() {
  const res = await fetch(sheetCSV);
  const csv = await res.text();

  const rows = csv.split("\n").filter(r => r.trim() !== "");
  const headers = rows[0].split(",");

  return rows.slice(1).map(row => {
    const values = row.split(",");
    let obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i] ? values[i].trim() : "";
    });
    return obj;
  });
}

// --- Middleware to check authentication ---
function requireLogin(req, res, next) {
  if (req.session && req.session.userId) {
    next(); // ✅ Already logged in, proceed
  } else {
    res.redirect('/login'); // ❌ Not logged in, send to login
  }
}

// --- Make /login accessible without auth ---
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const accounts = await loadAccounts(); // CSV loader
    const user = accounts.find(
      u => u.Email.toLowerCase() === email.toLowerCase() && u.Password === password
    );

    if (!user) {
      return res.status(401).send("❌ Invalid email or password. <a href='/login.html'>Try again</a>");
    }

    // Save session info
    req.session.userId = user.Email;
    req.session.position = user.Position;
    req.session.grade = user.Grade;

    res.redirect('/index.html');
  } catch (err) {
    console.error(err);
    res.status(500).send("❌ Server error. Check server logs.");
  }
});

// Serve CSS, JS, images publicly
app.use(express.static(path.join(__dirname, 'public')));

// Protect HTML pages
app.get(['/index.html','/directory.html','/admin.html'], requireLogin, (req, res, next) => {
  next(); // allow access
});


// --- Dashboard (default after login) ---
app.get('/', requireLogin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html')); 
});

// --- Event API routes (unchanged) ---
function readEvents() {
  if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(EVENTS_FILE));
}

function writeEvents(events) {
  fs.writeFileSync(EVENTS_FILE, JSON.stringify(events, null, 2));
}

app.get('/api/events', (req, res) => {
  res.json(readEvents());
});

app.get('/api/events/:id', (req, res) => {
  const events = readEvents();
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

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

app.post('/api/events/:id/waitlist', (req, res) => {
  const { slotIndex, name } = req.body;
  const events = readEvents();
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const slot = event.timeSlots[slotIndex];
  if (!slot) return res.status(400).json({ error: 'Invalid slot index' });

  if (!slot.waitlist) slot.waitlist = [];

  if (slot.waitlist.some(s => s.toLowerCase() === name.toLowerCase())) {
    return res.status(400).json({ error: 'Already on waitlist' });
  }

  slot.waitlist.push(name);
  writeEvents(events);
  res.json({ success: true });
});

app.delete('/api/events/:id', (req, res) => {
  let events = readEvents();
  events = events.filter(e => e.id !== req.params.id);
  writeEvents(events);
  res.json({ success: true });
});

app.post('/api/events/:id/cancel', (req, res) => {
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
