const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const EVENTS_FILE = path.join(__dirname, 'events.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));

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
    scheduleType,  // <-- add this line to save scheduleType
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

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

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

app.get('/api/getHours', async (req, res) => {
  const email = req.query.email;
  
  try {
    const rows = await getGoogleSheetRows(); // You'll write this function using Sheets API
    const match = rows.find(r => r[3] && r[3].toLowerCase() === email.toLowerCase()); // D column (index 3)

    if (match) {
      res.json({ hours: match[0] }); // A column (index 0)
    } else {
      res.json({ hours: null });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error reading Google Sheet" });
  }
});

const { google } = require('googleapis');
const path = require('path');

async function getGoogleSheetRows() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = 'YOUR_SHEET_ID'; // from the URL of your Google Sheet
  const range = 'Sheet1!A:D'; // Adjust to match your sheet & columns

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  });

  return res.data.values || [];
}
