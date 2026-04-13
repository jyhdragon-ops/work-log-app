const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

// 배포 환경에서는 DATA_DIR 환경변수로 경로 지정 (Railway volume 등)
const dbPath = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'worklog.db')
  : path.join(__dirname, 'worklog.db');

// DB 파일이 위치할 디렉토리가 없으면 생성
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    product_name TEXT DEFAULT '',
    category TEXT DEFAULT '',
    work_content TEXT DEFAULT '',
    start_time TEXT DEFAULT '',
    end_time TEXT DEFAULT '',
    total_hours INTEGER DEFAULT 0,
    total_minutes INTEGER DEFAULT 0,
    worker TEXT DEFAULT '',
    lot_number TEXT DEFAULT '',
    manufacture_date TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  );
`);

module.exports = db;
