const sheets = require('../_sheets');

module.exports = async function handler(req, res) {
  await sheets.init();

  if (req.method === 'DELETE') {
    await sheets.deleteRow('workers', req.query.id);
    return res.json({ success: true });
  }

  res.status(405).end();
};
