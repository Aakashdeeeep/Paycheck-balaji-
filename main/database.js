const Database = require('better-sqlite3');
const path = require('path');
const { app } = require('electron');

let db;

function getDb() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

function initDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'payroll.db');
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  runMigrations();
  runColumnMigrations();
  seedIfEmpty();
}

function runMigrations() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      salary_per_shift REAL NOT NULL,
      salary_type TEXT NOT NULL CHECK(salary_type IN ('weekly','monthly')),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      time_in TEXT NOT NULL,
      time_out TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','machine')),
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
      UNIQUE(employee_id, date)
    );

    CREATE TABLE IF NOT EXISTS advances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      remaining_balance REAL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      is_deducted INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS payroll_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
      period_start TEXT NOT NULL,
      period_end TEXT NOT NULL,
      total_shifts INTEGER NOT NULL DEFAULT 0,
      total_ot_hours REAL NOT NULL DEFAULT 0,
      ot_rate INTEGER NOT NULL DEFAULT 0,
      gross_pay REAL NOT NULL DEFAULT 0,
      advance_deducted REAL NOT NULL DEFAULT 0,
      previous_carry REAL NOT NULL DEFAULT 0,
      carry_balance REAL NOT NULL DEFAULT 0,
      net_pay REAL NOT NULL DEFAULT 0,
      is_paid INTEGER NOT NULL DEFAULT 0,
      generated_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);
}

function runColumnMigrations() {
  // Add remaining_balance to advances if missing
  const advCols = db.prepare('PRAGMA table_info(advances)').all().map((c) => c.name);
  if (!advCols.includes('remaining_balance')) {
    db.exec(`ALTER TABLE advances ADD COLUMN remaining_balance REAL`);
    db.exec(`UPDATE advances SET remaining_balance = CASE WHEN is_deducted = 1 THEN 0 ELSE amount END`);
  }

  // Expand source CHECK to include 'leave' if the current schema doesn't have it
  const schema = db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name='attendance'`).get();
  if (schema && !schema.sql.includes("'leave'")) {
    db.exec(`
      PRAGMA foreign_keys = OFF;

      ALTER TABLE attendance RENAME TO attendance_old;

      CREATE TABLE attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        date TEXT NOT NULL,
        time_in TEXT NOT NULL,
        time_out TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','machine','leave')),
        created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
        UNIQUE(employee_id, date)
      );

      INSERT INTO attendance SELECT * FROM attendance_old;

      DROP TABLE attendance_old;

      PRAGMA foreign_keys = ON;
    `);
  }
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) as c FROM employees').get();
  if (count.c > 0) return;

  const insertEmployee = db.prepare(
    'INSERT INTO employees (name, salary_per_shift, salary_type) VALUES (?, ?, ?)'
  );
  const insertAttendance = db.prepare(
    'INSERT OR IGNORE INTO attendance (employee_id, date, time_in, time_out, source) VALUES (?, ?, ?, ?, ?)'
  );
  const insertAdvance = db.prepare(
    'INSERT INTO advances (employee_id, amount, remaining_balance, note, date) VALUES (?, ?, ?, ?, ?)'
  );

  const seed = db.transaction(() => {
    const raviId = insertEmployee.run('Ravi', 750, 'weekly').lastInsertRowid;
    const priyaId = insertEmployee.run('Priya', 900, 'monthly').lastInsertRowid;
    const arjunId = insertEmployee.run('Arjun', 650, 'weekly').lastInsertRowid;

    // Generate 2 weeks of attendance ending yesterday
    const today = new Date();
    const entries = [
      ['09:00', '18:00'], // 9 hrs → 1 shift, 1 OT
      ['09:00', '20:00'], // 11 hrs → 1 shift, 3 OT
      ['09:00', '20:00'], // 11 hrs → 1 shift, 3 OT
      ['09:00', '18:00'], // 9 hrs → 1 shift, 1 OT
      ['09:00', '18:00'], // 9 hrs → 1 shift, 1 OT
      ['09:00', '18:00'], // 9 hrs → 1 shift, 1 OT
      null,               // Sunday off
      ['09:00', '17:30'], // 8.5 hrs → 1 shift, 0.5 OT
      ['09:00', '18:00'],
      ['09:00', '19:00'], // 10 hrs → 1 shift, 2 OT
      ['09:00', '18:00'],
      ['09:00', '18:00'],
      ['10:00', '15:00'], // 5 hrs → 0 shifts (partial)
      null,               // Sunday off
    ];

    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (14 - i));
      const dateStr = d.toISOString().split('T')[0];
      const entry = entries[i];
      if (!entry) continue;

      insertAttendance.run(raviId, dateStr, entry[0], entry[1], 'manual');
      insertAttendance.run(priyaId, dateStr, entry[0], entry[1] === '18:00' ? '18:30' : entry[1], 'manual');
      insertAttendance.run(arjunId, dateStr, entry[0], entry[1], 'manual');
    }

    const advDate = new Date(today);
    advDate.setDate(advDate.getDate() - 7);
    const advDateStr = advDate.toISOString().split('T')[0];

    insertAdvance.run(raviId, 500, 500, 'Personal expense', advDateStr);
    insertAdvance.run(priyaId, 1000, 1000, 'Medical emergency', advDateStr);
    insertAdvance.run(arjunId, 300, 300, 'Travel advance', advDateStr);
  });

  seed();
}

module.exports = { getDb, initDatabase };
