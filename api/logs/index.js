const sheets = require('../_sheets');

const HEADERS = sheets.LOGS_HEADERS;

function calcTime(start, end) {
  if (!start || !end) return { hours: 0, minutes: 0 };
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const total = (eh * 60 + em) - (sh * 60 + sm);
  if (total <= 0) return { hours: 0, minutes: 0 };
  return { hours: Math.floor(total / 60), minutes: total % 60 };
}

module.exports = async function handler(req, res) {
  await sheets.init();

  if (req.method === 'GET') {
    const { date_from, date_to, worker } = req.query;
    let logs = await sheets.getAllLogsRows(date_from, date_to);
    if (date_from) logs = logs.filter(l => l.date >= date_from);
    if (date_to)   logs = logs.filter(l => l.date <= date_to);
    if (worker)    logs = logs.filter(l => l.worker.includes(worker));
    logs.sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));
    return res.json(logs);
  }

  if (req.method === 'POST') {
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
    return res.status(201).json(data);
  }

  res.status(405).end();
};
