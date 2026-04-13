module.exports = async function handler(req, res) {
  try {
    const raw = process.env.GOOGLE_CREDENTIALS;
    if (!raw) return res.json({ error: 'GOOGLE_CREDENTIALS 없음' });

    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
    const creds = JSON.parse(json);

    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const client = google.sheets({ version: 'v4', auth });
    const meta = await client.spreadsheets.get({ spreadsheetId: process.env.SPREADSHEET_ID });
    res.json({ ok: true, sheets: meta.data.sheets.map(s => s.properties.title) });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
};
