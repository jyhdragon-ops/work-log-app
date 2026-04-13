module.exports = async function handler(req, res) {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    const hasCredentials = !!process.env.GOOGLE_CREDENTIALS;

    if (!spreadsheetId || !hasCredentials) {
      return res.json({ error: 'env 없음', spreadsheetId, hasCredentials });
    }

    const { google } = require('googleapis');
    const raw = process.env.GOOGLE_CREDENTIALS;
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const credentials = JSON.parse(json);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const client = google.sheets({ version: 'v4', auth });
    const meta = await client.spreadsheets.get({ spreadsheetId });
    res.json({ ok: true, spreadsheetId, sheets: meta.data.sheets.map(s => s.properties.title) });
  } catch (e) {
    res.status(500).json({ error: e.message, spreadsheetId: process.env.SPREADSHEET_ID });
  }
};
