const { google } = require('googleapis');

const SPREADSHEET_ID = '1xy-Esq5L7LAcImbIgAqFUDYnsNfhuV_NSbM8nULNfE8';

let auth = null;

// Initialize Google Auth safely
try {
  const rawCreds = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawCreds) {
    console.warn('⚠ GOOGLE_SERVICE_ACCOUNT_JSON not set. Google Sheets API disabled.');
  } else {
    let creds = JSON.parse(rawCreds);
    if (creds.private_key) {
      creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }

    auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
  }
} catch (err) {
  console.error('❌ Error setting up Google Auth:', err.message);
  auth = null;
}

// Get events from Events sheet
async function getUserEventsFromColumns(fullName) {
  if (!auth) return [];

  try {
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Events!A1:AM',
    });

    const rows = response.data.values || [];
    if (rows.length < 2) return [];

    const headers = rows[0];
    const userRow = rows.find(row =>
      row[0]?.trim().toLowerCase() === fullName.trim().toLowerCase()
    );
    if (!userRow) return [];

    return headers.slice(1).map((eventName, i) => {
      const hours = Number(userRow[i + 1] || 0);
      return hours > 0 ? { eventName, hoursEarned: hours } : null;
    }).filter(Boolean);
  } catch (err) {
    console.error('❌ Google Sheets API (getUserEventsFromColumns) error:', err.message);
    return [];
  }
}

// Get main user data
async function getUserData(fullName) {
  if (!auth) {
    console.warn('⚠ Google Sheets API is disabled — returning null.');
    return null;
  }
  if (!fullName) throw new Error('Missing fullName parameter');

  try {
    const client = await auth.getClient();
    const googleSheets = google.sheets({ version: 'v4', auth: client });

    const response = await googleSheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:D',
    });

    const rows = response.data.values || [];
    const userRow = rows.find(row =>
      row[0]?.trim().toLowerCase() === fullName.trim().toLowerCase()
    );

    if (!userRow) return null;

    const events = await getUserEventsFromColumns(fullName);

    return {
      fullName: userRow[0],
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

module.exports = { getUserData };
