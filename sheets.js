const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const SPREADSHEET_ID = '1xy-Esq5L7LAcImbIgAqFUDYnsNfhuV_NSbM8nULNfE8';

async function getUserData(fullName) {
  if (!fullName) throw new Error('Missing fullName parameter');

  const client = await auth.getClient();
  const googleSheets = google.sheets({ version: 'v4', auth: client });

  const response = await googleSheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sheet1!A2:D',
  });

  const rows = response.data.values || [];
  const userRow = rows.find(row => row[0].toLowerCase() === fullName.toLowerCase());

  if (!userRow) {
    return null;
  }

  return {
    fullName: userRow[0],
    serviceHours: userRow[1] || '0',
    meetingCredit: userRow[2] || '0',
    position: userRow[3] || 'Member',
  };
}

module.exports = { getUserData };
