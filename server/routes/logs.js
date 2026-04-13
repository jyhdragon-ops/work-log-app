const express = require('express');
const router = express.Router();
const db = require('../db');
const ExcelJS = require('exceljs');

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
  let query = 'SELECT * FROM logs WHERE 1=1';
  const params = [];
  if (date_from) { query += ' AND date >= ?'; params.push(date_from); }
  if (date_to)   { query += ' AND date <= ?'; params.push(date_to); }
  query += ' ORDER BY date ASC, start_time ASC';

  const logs = db.prepare(query).all(...params);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('작업일지');

  ws.columns = [
    { header: '일자',         key: 'date',             width: 12 },
    { header: '품명',         key: 'product_name',     width: 22 },
    { header: '구분',         key: 'category',         width: 10 },
    { header: '작업내용',     key: 'work_content',     width: 30 },
    { header: '시작',         key: 'start_time',       width: 8 },
    { header: '종료',         key: 'end_time',         width: 8 },
    { header: '총사용시간(시간)', key: 'total_hours',  width: 14 },
    { header: '총사용시간(분)',   key: 'total_minutes', width: 14 },
    { header: '작업자',       key: 'worker',           width: 16 },
    { header: '제조번호',     key: 'lot_number',       width: 14 },
    { header: '제조일자',     key: 'manufacture_date', width: 12 },
    { header: '비고',         key: 'notes',            width: 20 },
  ];

  // Header style
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = {
    type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' }
  };

  logs.forEach(log => ws.addRow({
    date: log.date,
    product_name: log.product_name,
    category: log.category,
    work_content: log.work_content,
    start_time: log.start_time,
    end_time: log.end_time,
    total_hours: log.total_hours,
    total_minutes: log.total_minutes,
    worker: log.worker,
    lot_number: log.lot_number,
    manufacture_date: log.manufacture_date,
    notes: log.notes,
  }));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="worklog.xlsx"');
  await wb.xlsx.write(res);
  res.end();
});

// GET all logs
router.get('/', (req, res) => {
  const { date_from, date_to, worker } = req.query;
  let query = 'SELECT * FROM logs WHERE 1=1';
  const params = [];
  if (date_from) { query += ' AND date >= ?'; params.push(date_from); }
  if (date_to)   { query += ' AND date <= ?'; params.push(date_to); }
  if (worker)    { query += ' AND worker LIKE ?'; params.push(`%${worker}%`); }
  query += ' ORDER BY date ASC, start_time ASC';
  res.json(db.prepare(query).all(...params));
});

// POST create
router.post('/', (req, res) => {
  const { date, product_name, category, work_content, start_time, end_time,
          worker, lot_number, manufacture_date, notes } = req.body;
  const { hours, minutes } = calcTime(start_time, end_time);
  const result = db.prepare(`
    INSERT INTO logs (date, product_name, category, work_content, start_time, end_time,
                      total_hours, total_minutes, worker, lot_number, manufacture_date, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(date, product_name || '', category || '', work_content || '',
         start_time || '', end_time || '', hours, minutes,
         worker || '', lot_number || '', manufacture_date || '', notes || '');
  res.status(201).json(db.prepare('SELECT * FROM logs WHERE id = ?').get(result.lastInsertRowid));
});

// PUT update
router.put('/:id', (req, res) => {
  const { date, product_name, category, work_content, start_time, end_time,
          worker, lot_number, manufacture_date, notes } = req.body;
  const { hours, minutes } = calcTime(start_time, end_time);
  db.prepare(`
    UPDATE logs SET date=?, product_name=?, category=?, work_content=?,
    start_time=?, end_time=?, total_hours=?, total_minutes=?,
    worker=?, lot_number=?, manufacture_date=?, notes=?
    WHERE id=?
  `).run(date, product_name || '', category || '', work_content || '',
         start_time || '', end_time || '', hours, minutes,
         worker || '', lot_number || '', manufacture_date || '', notes || '',
         req.params.id);
  res.json(db.prepare('SELECT * FROM logs WHERE id = ?').get(req.params.id));
});

// DELETE
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM logs WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
