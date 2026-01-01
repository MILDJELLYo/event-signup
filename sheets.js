const { google } = require('googleapis');

// -------------------- SPREADSHEET IDS --------------------
const SPREADSHEET_ID_USERS = '1xy-Esq5L7LAcImbIgAqFUDYnsNfhuV_NSbM8nULNfE8';
const SPREADSHEET_ID_SERVICE_HOURS = '1AOZ9o7UfEcvocfHg9xolU6vLalgBwmWwAmTd9hvL98A';
const SERVICE_HOURS_RANGE = "'Service Hours'!B7:E51"; // columns B-E, rows 6-51

// -------------------- GOOGLE AUTH --------------------
let auth = null;

try {
  const creds = require('./servicekey.json');
  if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');

  auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
} catch (err) {
  console.error('❌ Error setting up Google Auth:', err.message);
  auth = null;
}

// -------------------- USERS / EVENTS SHEET --------------------

// Get events for a specific identifier
async function getUserEventsByIdentifier(identifier) {
  if (!auth) return [];

  try {
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID_USERS,
      range: 'Events!A1:AM',
    });

    const rows = response.data.values || [];
    if (rows.length < 2) return [];

    const headers = rows[0];
    const userRow = rows.find(row =>
      row[0]?.trim().toLowerCase() === identifier.trim().toLowerCase()
    );
    if (!userRow) return [];

    return headers.slice(1).map((eventName, i) => {
      const hours = Number(userRow[i + 1] || 0);
      return hours > 0 ? { eventName, hoursEarned: hours } : null;
    }).filter(Boolean);

  } catch (err) {
    console.error('❌ Google Sheets API (getUserEventsByIdentifier) error:', err.message);
    return [];
  }
}

// Get user data by full name
async function getUserData(fullName) {
  if (!auth) return null;
  if (!fullName) throw new Error('Missing fullName parameter');

  try {
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID_USERS,
      range: 'Sheet1!A2:D',
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row =>
      row[0]?.trim().toLowerCase() === fullName.trim().toLowerCase()
    );
    if (!userRow) return null;

    const events = await getUserEventsByIdentifier(fullName);

    return {
      identifier: userRow[0],
      serviceHours: userRow[1] || '0',
      meetingCredit: userRow[2] || '0',
      position: userRow[3] || 'Member',
      events,
    };
  } catch (err) {
    console.error('❌ Google Sheets API (getUserData) error:', err.message);
    return null;
  }
}

// Get user data by email
async function getUserDataByEmail(email) {
  if (!auth) return null;
  if (!email) throw new Error('Missing email parameter');

  const identifier = email.trim().toLowerCase();

  try {
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID_USERS,
      range: 'Sheet1!A2:D',
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row =>
      row[0]?.trim().toLowerCase() === identifier
    );
    if (!userRow) return null;

    const events = await getUserEventsByIdentifier(identifier);

    return {
      identifier: userRow[0],
      serviceHours: userRow[1] || '0',
      meetingCredit: userRow[2] || '0',
      position: userRow[3] || 'Member',
      events,
    };
  } catch (err) {
    console.error('❌ Google Sheets API (getUserDataByEmail) error:', err.message);
    return null;
  }
}

// -------------------- SERVICE HOURS SHEET --------------------

// Fetch service-hours table
async function getServiceHours() {
  if (!auth) return [];
  try {
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID_SERVICE_HOURS,
      range: SERVICE_HOURS_RANGE
    });

    return response.data.values || [];
  } catch (err) {
    console.error('❌ Google Sheets API (getServiceHours) error:', err.message);
    return [];
  }
}

// Update service-hours table
async function updateServiceHours(data) {
  if (!auth) return false;
  try {
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    await googleSheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID_SERVICE_HOURS,
      range: SERVICE_HOURS_RANGE,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: data }
    });

    return true;
  } catch (err) {
    console.error('❌ Google Sheets API (updateServiceHours) error:', err.message);
    return false;
  }
}

// -------------------- EXPORT --------------------
module.exports = {
  getUserData,
  getUserDataByEmail,
  getUserEventsByIdentifier,
  getServiceHours,
  updateServiceHours
};
