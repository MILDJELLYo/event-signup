const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getUserData } = require('./sheets'); // your Google Sheets helper
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
require('dotenv').config();
const admin = require('firebase-admin');


// --- Initialize Firebase Admin ---
const serviceAccount = require('./service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// --- Second Firebase app (for /api/userinfo) ---
const secondServiceAccount = require('./servicekey.json');
const secondApp = admin.initializeApp({
  credential: admin.credential.cert(secondServiceAccount),
}, 'secondApp'); // unique name is required

const app = express();
const PORT = process.env.PORT || 3000;
const EVENTS_FILE = path.join(__dirname, 'events.json');

// --- Session middleware ---
app.use(session({
  secret: 'super-secret-key', // change to a strong secret in production
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 1 day
}));

// --- Authentication middleware ---
// Protect all HTML pages
app.use((req, res, next) => {
  if (req.path.endsWith('.html') && req.path !== '/login.html' && !req.session.user) {
    return res.redirect('/login.html');
  }
  next();
});

// --- Body parser ---
app.use(express.json());

// --- Serve static files ---
app.use(express.static(path.join(__dirname, 'public')));


// --- Homepage redirect ---
app.get('/', (req, res) => {
  if (!req.session.user) return res.redirect('/login.html');
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Logout ---
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: 'Could not log out' });
    res.json({ success: true });
  });
});

// --- Login route ---
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

  try {
    // Check if user exists in Firebase
    await admin.auth().getUserByEmail(email);

    // Verify password via Firebase REST API
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      }
    );

    const data = await response.json();
    if (data.error) return res.status(401).json({ message: data.error.message });

    // Determine role based on email
    let role = 'member'; // default
    const execBoardEmails = [
      'laniehen000@mysbisd.org',
      'yanghye001@mysbisd.org'
      // add other exec_board emails here
    ];
    if (execBoardEmails.includes(email)) role = 'exec_board';

    // Save session with role
    req.session.user = { email, uid: data.localId, role };

    // Return role to frontend
    res.json({ message: 'Login successful', email, token: data.idToken, role });
  } catch (err) {
    console.error(err);
    res.status(400).json({ message: 'Invalid email or password' });
  }
});


// --- Updated API route to get user data from Google Sheets ---
const { getUserDataByEmail } = require('./sheets'); // make sure sheets.js has getUserDataByEmail

app.get('/api/userinfo', async (req, res) => {
  try {
    // Check if user is logged in
    if (!req.session.user || !req.session.user.email) {
      return res.status(401).json({ error: 'Not logged in' });
    }

    const email = req.session.user.email;
    const data = await getUserDataByEmail(email);

    if (!data) return res.status(404).json({ error: 'User not found' });

    // Add role from session
    res.json({
      ...data,
      role: req.session.user.role || 'member'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



// --- Event API routes (all your original ones preserved) ---
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
  try {
    const { title, date, location, description, contactName, contactEmail, scheduleType, timeSlots } = req.body;
    if (!title || !date || !location || !description || !contactName || !contactEmail || !scheduleType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
      return res.status(400).json({ error: 'Time slots are required' });
    }

    const sanitizedSlots = timeSlots.map(slot => ({
      time: slot.time || 'Unknown',
      hours: Number(slot.hours) || 0,
      maxSpots: Number(slot.maxSpots) || 0,
      signups: Array.isArray(slot.signups) ? slot.signups : [],
      waitlist: Array.isArray(slot.waitlist) ? slot.waitlist : []
    }));

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
      timeSlots: sanitizedSlots
    };

    events.push(newEvent);
    writeEvents(events);
    res.status(201).json(newEvent);
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
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

const { getServiceHours, updateServiceHours } = require('./sheets'); // make sure these are in sheets.js

// --- Get Service Hours table ---
app.get('/api/service-hours', async (req, res) => {
  try {
    const table = await getServiceHours(); // 2D array
    res.json({ table });
  } catch (err) {
    console.error('Error fetching service hours:', err);
    res.status(500).json({ error: 'Failed to fetch service hours' });
  }
});

// --- Update Service Hours table ---
app.post('/api/service-hours', async (req, res) => {
  try {
    const { table } = req.body;
    if (!Array.isArray(table)) return res.status(400).json({ error: 'Invalid table format' });

    await updateServiceHours(table); // writes 2D array to Google Sheet
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating service hours:', err);
    res.status(500).json({ error: 'Failed to update service hours' });
  }
});


// Get user info by email (for modal)
app.get('/api/userinfo/email', async (req, res) => {
  try {
    const email = req.query.email?.toLowerCase();
    if (!email) return res.status(400).json({ error: 'Email is required' });

    // Use Firebase Admin to fetch the user by email
    const userRecord = await admin.auth().getUserByEmail(email);

    // Example: fetch additional service info from your sheets or database
    const { getUserDataByEmail } = require('./sheets'); // your helper function
    const userData = await getUserDataByEmail(email); // must return { identifier, serviceHours, meetingCredit, position, events, role }

    if (!userData) return res.status(404).json({ error: 'User not found' });

    res.json(userData);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

async function getMemberFromSheet(email) {
  const sheetCSV =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vT9nsgWRuANHKqhFPeAWN88MvusJSzkQtcm4nUdaVIjAky1WifmSchquUEg0BV5r1dEvedKnKjtyiwC/pub?gid=0&single=true&output=csv";

  const res = await fetch(
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(sheetCSV)
  );

  const csv = await res.text();
  const rows = csv.split("\n").slice(1);

  for (const row of rows) {
    const cols = row.split(",");
    const rowEmail = cols[COLS.Email]?.trim().toLowerCase();

    if (rowEmail === email.toLowerCase()) {
      return {
        email: rowEmail,
        name: cols[COLS.Name]?.trim()
      };
    }
  }
  return null;
}


// --- Start server ---
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
