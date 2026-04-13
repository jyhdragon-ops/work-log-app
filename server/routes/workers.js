const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const workers = db.prepare('SELECT * FROM workers ORDER BY name').all();
  res.json(workers);
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: '이름을 입력해주세요.' });
  }
  try {
    const result = db.prepare('INSERT INTO workers (name) VALUES (?)').run(name.trim());
    res.status(201).json({ id: result.lastInsertRowid, name: name.trim() });
  } catch {
    res.status(400).json({ error: '이미 존재하는 작업자입니다.' });
  }
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM workers WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
