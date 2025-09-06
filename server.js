const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getUserData } = require('./sheets'); // your Google Sheets helper
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;
const EVENTS_FILE = path.join(__dirname, 'events.json');

// --- Static files ---
app.use(express.static(path.join(__dirname, 'public')));

// --- API route to get user data from Google Sheets ---
app.get('/api/userinfo', async (req, res) => {
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
