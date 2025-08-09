const { google } = require('googleapis');
const path = require('path');
const sheets = google.sheets('v4');

// Load your service account credentials
const auth = new google.auth.GoogleAuth({
  keyFile: path.join(__dirname, 'service-account.json'),  // path to your json file
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const SPREADSHEET_ID = '1xy-Esq5L7LAcImbIgAqFUDYnsNfhuV_NSbM8nULNfE8';  // Put your spreadsheet ID here

// Endpoint to get user info by full name
app.get('/api/userinfo', async (req, res) => {
  const fullName = req.query.fullName;
  if (!fullName) return res.status(400).json({ error: 'Missing fullName query parameter' });

  try {
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
      return res.status(404).json({ error: 'User not found' });
    }

    // Columns: A=0, B=1, C=2, D=3
    const userInfo = {
      fullName: userRow[0],
      serviceHours: userRow[1] || '0',
      meetingCredit: userRow[2] || '0',
      position: userRow[3] || 'Member',
    };

    res.json(userInfo);
  } catch (err) {
    console.error('Error reading Google Sheet:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
