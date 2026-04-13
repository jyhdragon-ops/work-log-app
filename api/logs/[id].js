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
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { date, product_name, category, work_content, start_time, end_time,
            worker, lot_number, manufacture_date, notes } = req.body;
    const { hours, minutes } = calcTime(start_time, end_time);
    const data = {
      id,
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
    await sheets.updateRow('logs', HEADERS, id, data);
    return res.json(data);
  }

  if (req.method === 'DELETE') {
    await sheets.deleteRow('logs', id);
    return res.json({ success: true });
  }

  res.status(405).end();
};
