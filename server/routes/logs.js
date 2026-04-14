const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const sheets = require('../sheets');

const HEADERS = sheets.LOGS_HEADERS;

function calcTime(start, end) {
  if (!start || !end) return { hours: 0, minutes: 0 };
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const total = (eh * 60 + em) - (sh * 60 + sm);
  if (total <= 0) return { hours: 0, minutes: 0 };
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

// GET export (must be before /:id)
router.get('/export', async (req, res) => {
  const { date_from, date_to } = req.query;
  let logs = await sheets.getAllLogsRows(date_from, date_to);
  if (date_from) logs = logs.filter(l => l.date >= date_from);
  if (date_to)   logs = logs.filter(l => l.date <= date_to);
  logs.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('작업일지');
  ws.columns = [
    { header: '일자',             key: 'date',             width: 12 },
    { header: '품명',             key: 'product_name',     width: 22 },
    { header: '구분',             key: 'category',         width: 10 },
    { header: '작업내용',         key: 'work_content',     width: 30 },
    { header: '시작',             key: 'start_time',       width: 8  },
    { header: '종료',             key: 'end_time',         width: 8  },
    { header: '총사용시간(시간)', key: 'total_hours',      width: 14 },
    { header: '총사용시간(분)',   key: 'total_minutes',    width: 14 },
    { header: '작업자',           key: 'worker',           width: 16 },
    { header: '제조번호',         key: 'lot_number',       width: 14 },
    { header: '제조일자',         key: 'manufacture_date', width: 12 },
    { header: '비고',             key: 'notes',            width: 20 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  logs.forEach(log => ws.addRow(log));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="worklog.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

// GET all logs
router.get('/', async (req, res) => {
  const { date_from, date_to, worker } = req.query;
  let logs = await sheets.getAllLogsRows(date_from, date_to);
  if (date_from) logs = logs.filter(l => l.date >= date_from);
  if (date_to)   logs = logs.filter(l => l.date <= date_to);
  if (worker)    logs = logs.filter(l => l.worker.includes(worker));
  logs.sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));
  res.json(logs);
});

// POST create
router.post('/', async (req, res) => {
  const { date, product_name, category, work_content, start_time, end_time,
          worker, lot_number, manufacture_date, notes } = req.body;
  const { hours, minutes } = calcTime(start_time, end_time);
  const data = {
    id: Date.now().toString(),
    date: date || '',
    product_name: product_name || '',
    category: category || '',
    work_content: work_content || '',
    start_time: start_time || '',
    end_time: end_time || '',
    total_hours: hours,
    total_minutes: minutes,
    total_minutes_combined: hours * 60 + minutes,
    worker: worker || '',
    lot_number: lot_number || '',
    manufacture_date: manufacture_date || '',
    notes: notes || '',
    created_at: new Date().toISOString(),
  };
  await sheets.appendLogRow(data);
  res.status(201).json(data);
});

// PUT update
router.put('/:id', async (req, res) => {
  const { date, product_name, category, work_content, start_time, end_time,
          worker, lot_number, manufacture_date, notes } = req.body;
  const { hours, minutes } = calcTime(start_time, end_time);
  const data = {
    id: req.params.id,
    date: date || '',
    product_name: product_name || '',
    category: category || '',
    work_content: work_content || '',
    start_time: start_time || '',
    end_time: end_time || '',
    total_hours: hours,
    total_minutes: minutes,
    total_minutes_combined: hours * 60 + minutes,
    worker: worker || '',
    lot_number: lot_number || '',
    manufacture_date: manufacture_date || '',
    notes: notes || '',
    created_at: new Date().toISOString(),
  };
  await sheets.updateLogRow(req.params.id, data);
  res.json(data);
});

// DELETE
router.delete('/:id', async (req, res) => {
  await sheets.deleteLogRow(req.params.id);
  res.json({ success: true });
});

module.exports = router;
