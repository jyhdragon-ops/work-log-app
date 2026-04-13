const sheets = require('../_sheets');

const HEADERS = sheets.WORKERS_HEADERS;

module.exports = async function handler(req, res) {
  await sheets.init();

  if (req.method === 'GET') {
    const workers = await sheets.getAllRows('workers', HEADERS);
    workers.sort((a, b) => a.name.localeCompare(b.name));
    return res.json(workers);
  }

  if (req.method === 'POST') {
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
    return res.status(201).json(data);
  }

  res.status(405).end();
};
