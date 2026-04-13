const { google } = require('googleapis');

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

const LOGS_HEADERS = [
  'id', 'date', 'product_name', 'category', 'work_content',
  'start_time', 'end_time', 'total_hours', 'total_minutes', 'total_minutes_combined',
  'worker', 'lot_number', 'manufacture_date', 'notes', 'created_at'
];
const WORKERS_HEADERS = ['id', 'name'];

const LOGS_DISPLAY_HEADERS = [
  'ID', '일자', '품명', '구분', '작업내용',
  '시작시간', '종료시간', '총시간(시)', '총시간(분)', '총시간(합계분)',
  '작업자', '제조번호', '제조일자', '비고', '작성일시'
];
const WORKERS_DISPLAY_HEADERS = ['ID', '작업자명'];

let _client = null;

async function getClient() {
  if (_client) return _client;
  const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  _client = google.sheets({ version: 'v4', auth });
  return _client;
}

async function ensureSheet(client, sheetName, headers, displayHeaders) {
  const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets.some(s => s.properties.title === sheetName);
  if (!exists) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
    });
  }
  // 항상 한국어 헤더로 첫 행 업데이트
  await client.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [displayHeaders || headers] },
  });
}

async function init() {
  const client = await getClient();
  await ensureSheet(client, 'logs', LOGS_HEADERS, LOGS_DISPLAY_HEADERS);
  await ensureSheet(client, 'workers', WORKERS_HEADERS, WORKERS_DISPLAY_HEADERS);
}

async function getAllRows(sheetName, headers) {
  const client = await getClient();
  const res = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A2:Z`,
  });
  const rows = res.data.values || [];
  return rows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
    return obj;
  });
}

async function appendRow(sheetName, headers, data) {
  const client = await getClient();
  const row = headers.map(h => data[h] !== undefined ? String(data[h]) : '');
  await client.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

async function findRowIndex(client, sheetName, id) {
  const res = await client.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:A`,
  });
  const rows = res.data.values || [];
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) return i + 1;
  }
  return -1;
}

async function updateRow(sheetName, headers, id, data) {
  const client = await getClient();
  const rowIndex = await findRowIndex(client, sheetName, id);
  if (rowIndex === -1) return;
  const row = headers.map(h => data[h] !== undefined ? String(data[h]) : '');
  await client.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

async function deleteRow(sheetName, id) {
  const client = await getClient();
  const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) return;
  const sheetId = sheet.properties.sheetId;
  const rowIndex = await findRowIndex(client, sheetName, id);
  if (rowIndex === -1) return;
  await client.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex }
        }
      }]
    },
  });
}

module.exports = { init, getAllRows, appendRow, updateRow, deleteRow, LOGS_HEADERS, WORKERS_HEADERS };
