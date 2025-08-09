const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const SPREADSHEET_ID = '1xy-Esq5L7LAcImbIgAqFUDYnsNfhuV_NSbM8nULNfE8';

async function getUserEventsFromColumns(fullName) {
  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: 'v4', auth: client });

  const response = await googleSheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Events!A1:AM', // Adjust if needed
  });

  const rows = response.data.values || [];
  if (rows.length < 2) return [];

  const headers = rows[0];
  const userRow = rows.find(row => row[0].toLowerCase() === fullName.toLowerCase());
  if (!userRow) return [];

  const events = [];
  for (let col = 1; col < headers.length; col++) {
    const eventName = headers[col];
    const hoursStr = userRow[col] || '0';
    const hours = Number(hoursStr) || 0;
    if (hours > 0) {
      events.push({ eventName, hoursEarned: hours });
    }
  }

  return events;
}

async function getUserData(fullName) {
  if (!fullName) throw new Error('Missing fullName parameter');

  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: 'v4', auth: client });

  // Adjust range if needed for your main sheet (Sheet1)
  const response = await googleSheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A2:D',
  });

  const rows = response.data.values || [];
  const userRow = rows.find(row => row[0].toLowerCase() === fullName.toLowerCase());

  if (!userRow) {
    return null;
  }

  const events = await getUserEventsFromColumns(fullName);

  return {
    fullName: userRow[0],
    serviceHours: userRow[1] || '0',
    meetingCredit: userRow[2] || '0',
    position: userRow[3] || 'Member',
    events, // include events array here
  };
}

module.exports = { getUserData };
