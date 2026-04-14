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
  const raw = process.env.GOOGLE_CREDENTIALS;
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const credentials = JSON.parse(json);
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
  await client.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [displayHeaders || headers] },
  });
}

async function init() {
  const client = await getClient();
  await ensureSheet(client, 'workers', WORKERS_HEADERS, WORKERS_DISPLAY_HEADERS);
}

// ─── workers 전용 (기존 그대로) ──────────────────────────────

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

// ─── 월별 시트 (logs 전용) ────────────────────────────────────

function getMonthsInRange(date_from, date_to) {
  const from = date_from ? date_from.substring(0, 7) : null;
  const to = date_to ? date_to.substring(0, 7) : null;
  if (!from && !to) return null;
  const start = from || to;
  const end = to || from;
  const months = [];
  let [y, m] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return months;
}

async function getAllMonthlySheetNames(client) {
  const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  return meta.data.sheets
    .map(s => s.properties.title)
    .filter(t => /^\d{4}-\d{2}$/.test(t));
}

async function getAllLogsRows(date_from, date_to) {
  const client = await getClient();
  const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const existingSheets = new Set(meta.data.sheets.map(s => s.properties.title));

  const targetMonths = getMonthsInRange(date_from, date_to);
  const monthsToRead = targetMonths
    ? targetMonths.filter(m => existingSheets.has(m))
    : [...existingSheets].filter(t => /^\d{4}-\d{2}$/.test(t));

  const allRows = [];
  for (const month of monthsToRead) {
    const res = await client.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${month}!A2:Z`,
    });
    (res.data.values || []).forEach(row => {
      const obj = {};
      LOGS_HEADERS.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
      allRows.push(obj);
    });
  }
  return allRows;
}

async function appendLogRow(data) {
  const client = await getClient();
  const sheetName = data.date.substring(0, 7);
  await ensureSheet(client, sheetName, LOGS_HEADERS, LOGS_DISPLAY_HEADERS);
  const row = LOGS_HEADERS.map(h => data[h] !== undefined ? String(data[h]) : '');
  await client.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    requestBody: { values: [row] },
  });
}

async function findLogRow(client, id) {
  const sheetNames = await getAllMonthlySheetNames(client);
  for (const sheetName of sheetNames) {
    const res = await client.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:A`,
    });
    const rows = res.data.values || [];
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == id) return { sheetName, rowIndex: i + 1 };
    }
  }
  return null;
}

async function _deleteRowByLocation(client, sheetName, rowIndex) {
  const meta = await client.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = meta.data.sheets.find(s => s.properties.title === sheetName);
  if (!sheet) return;
  await client.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: {
            sheetId: sheet.properties.sheetId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1,
            endIndex: rowIndex
          }
        }
      }]
    },
  });
}

async function updateLogRow(id, data) {
  const client = await getClient();
  const found = await findLogRow(client, id);
  if (!found) return;
  const { sheetName, rowIndex } = found;
  const newSheet = data.date.substring(0, 7);
  const row = LOGS_HEADERS.map(h => data[h] !== undefined ? String(data[h]) : '');

  if (sheetName === newSheet) {
    await client.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });
  } else {
    await _deleteRowByLocation(client, sheetName, rowIndex);
    await appendLogRow(data);
  }
}

async function deleteLogRow(id) {
  const client = await getClient();
  const found = await findLogRow(client, id);
  if (!found) return;
  await _deleteRowByLocation(client, found.sheetName, found.rowIndex);
}

module.exports = {
  init,
  getAllRows, appendRow, updateRow, deleteRow,
  getAllLogsRows, appendLogRow, updateLogRow, deleteLogRow,
  LOGS_HEADERS, WORKERS_HEADERS
};
