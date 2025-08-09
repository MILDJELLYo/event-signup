const { google } = require('googleapis');
const path = require('path');

// Load your service account credentials
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'service-account.json'),  // path to your JSON file
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const SPREADSHEET_ID = '1xy-Esq5L7LAcImbIgAqFUDYnsNfhuV_NSbM8nULNfE8';  // Put your spreadsheet ID here

async function getUserData(fullName) {
  if (!fullName) throw new Error('Missing fullName parameter');

  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: 'v4', auth: client });

  // Read the whole sheet
  const response = await googleSheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A2:D', // assuming headers in row 1
  });

  const rows = response.data.values || [];
  // Find matching row by full name (case-insensitive)
  const userRow = rows.find(row => row[0].toLowerCase() === fullName.toLowerCase());

  if (!userRow) {
    return null; // user not found
  }

  // Columns: A=0, B=1, C=2, D=3
  return {
    fullName: userRow[0],
    serviceHours: userRow[1] || '0',
    meetingCredit: userRow[2] || '0',
    position: userRow[3] || 'Member',
  };
}

module.exports = { getUserData };
