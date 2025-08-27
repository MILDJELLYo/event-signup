const { google } = require('googleapis');

const SPREADSHEET_ID = '1xy-Esq5L7LAcImbIgAqFUDYnsNfhuV_NSbM8nULNfE8';

async function testSheets() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    console.error('⚠ GOOGLE_SERVICE_ACCOUNT_JSON is not set.');
    return;
  }

  let creds;
  try {
    creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  } catch (err) {
    console.error('❌ Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON:', err.message);
    return;
  }

  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const client = await auth.getClient();
  const sheets = google.sheets({ version: 'v4', auth: client });

  try {
    const mainSheet = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A2:D',
    });
    console.log('--- Main Sheet Rows ---');
    console.log(mainSheet.data.values || []);

    const eventsSheet = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Events!A1:AM',
    });
    console.log('--- Events Sheet Rows ---');
    console.log(eventsSheet.data.values || []);
  } catch (err) {
    console.error('❌ Google Sheets API error:', err.message);
  }
}

testSheets();
