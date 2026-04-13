const sheets = require('../_sheets');
const ExcelJS = require('exceljs');

const HEADERS = sheets.LOGS_HEADERS;

module.exports = async function handler(req, res) {
  await sheets.init();
  const { date_from, date_to } = req.query;
  let logs = await sheets.getAllRows('logs', HEADERS);
  if (date_from) logs = logs.filter(l => l.date >= date_from);
  if (date_to)   logs = logs.filter(l => l.date <= date_to);
  logs.sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('작업일지');
  ws.columns = [
    { header: '일자',             key: 'date',                   width: 12 },
    { header: '품명',             key: 'product_name',           width: 22 },
    { header: '구분',             key: 'category',               width: 10 },
    { header: '작업내용',         key: 'work_content',           width: 30 },
    { header: '시작',             key: 'start_time',             width: 8  },
    { header: '종료',             key: 'end_time',               width: 8  },
    { header: '총시간(시)',       key: 'total_hours',            width: 12 },
    { header: '총시간(분)',       key: 'total_minutes',          width: 12 },
    { header: '총시간(합계분)',   key: 'total_minutes_combined', width: 14 },
    { header: '작업자',           key: 'worker',                 width: 16 },
    { header: '제조번호',         key: 'lot_number',             width: 14 },
    { header: '제조일자',         key: 'manufacture_date',       width: 12 },
    { header: '비고',             key: 'notes',                  width: 20 },
  ];
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E1F2' } };
  logs.forEach(log => ws.addRow(log));

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="worklog.xlsx"');
  await wb.xlsx.write(res);
  res.end();
};
