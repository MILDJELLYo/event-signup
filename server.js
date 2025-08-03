const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const EVENTS_FILE = path.join(__dirname, 'events.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper function to read events
function readEvents() {
  if (!fs.existsSync(EVENTS_FILE)) fs.writeFileSync(EVENTS_FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(EVENTS_FILE));
}

// Helper function to write events
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

// Create event
app.post('/api/events', (req, res) => {
  const { title, date, location, hours, maxSpots } = req.body;
  const events = readEvents();
  const newEvent = {
    id: uuidv4(),
    title,
    date,
    location,
    hours,
    maxSpots: Number(maxSpots),
    signups: []
  };
  events.push(newEvent);
  writeEvents(events);
  res.status(201).json(newEvent);
});

// Sign up for event
app.post('/api/events/:id/signup', (req, res) => {
  const { name } = req.body;
  const events = readEvents();
  const event = events.find(e => e.id === req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  if (event.signups.length >= event.maxSpots) {
    return res.status(400).json({ error: 'No spots left' });
  }

  event.signups.push(name);
  writeEvents(events);
  res.json(event);
});

// Edit event
app.put('/api/events/:id', (req, res) => {
  const events = readEvents();
  const index = events.findIndex(e => e.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Event not found' });

  events[index] = { ...events[index], ...req.body };
  writeEvents(events);
  res.json(events[index]);
});

// Delete event
app.delete('/api/events/:id', (req, res) => {
  let events = readEvents();
  events = events.filter(e => e.id !== req.params.id);
  writeEvents(events);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
