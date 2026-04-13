const express = require('express');
const router = express.Router();
const sheets = require('../sheets');

const HEADERS = sheets.WORKERS_HEADERS;

router.get('/', async (req, res) => {
  const workers = await sheets.getAllRows('workers', HEADERS);
  workers.sort((a, b) => a.name.localeCompare(b.name));
  res.json(workers);
});

router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '이름을 입력해주세요.' });
  }
  const workers = await sheets.getAllRows('workers', HEADERS);
  if (workers.some(w => w.name === name.trim())) {
    return res.status(400).json({ error: '이미 존재하는 작업자입니다.' });
  }
  const data = { id: Date.now().toString(), name: name.trim() };
  await sheets.appendRow('workers', HEADERS, data);
  res.status(201).json(data);
});

router.delete('/:id', async (req, res) => {
  await sheets.deleteRow('workers', req.params.id);
  res.json({ success: true });
});

module.exports = router;
