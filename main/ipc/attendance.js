const { ipcMain } = require('electron');
const { getDb } = require('../database');

function calcHours(timeIn, timeOut) {
  const [h1, m1] = timeIn.split(':').map(Number);
  const [h2, m2] = timeOut.split(':').map(Number);
  return (h2 * 60 + m2 - (h1 * 60 + m1)) / 60;
}

ipcMain.handle('attendance:getByEmployee', (_, employeeId, month, year) => {
  const db = getDb();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db
    .prepare("SELECT * FROM attendance WHERE employee_id = ? AND date LIKE ? ORDER BY date ASC")
    .all(employeeId, `${prefix}%`);
});

ipcMain.handle('attendance:getByDate', (_, date) => {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT a.*, e.name as employee_name, e.salary_per_shift
      FROM attendance a
      JOIN employees e ON e.id = a.employee_id
      WHERE a.date = ?
      ORDER BY e.name ASC
    `)
    .all(date);
  return rows;
});

ipcMain.handle('attendance:getByRange', (_, employeeId, start, end) => {
  return getDb()
    .prepare(
      "SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC"
    )
    .all(employeeId, start, end);
});

ipcMain.handle('attendance:saveBulk', (_, records) => {
  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO attendance (employee_id, date, time_in, time_out, source)
    VALUES (@employee_id, @date, @time_in, @time_out, @source)
    ON CONFLICT(employee_id, date) DO UPDATE SET
      time_in = excluded.time_in,
      time_out = excluded.time_out,
      source = excluded.source
  `);

  const run = db.transaction((recs) => {
    const results = [];
    for (const r of recs) {
      if (!r.time_in || !r.time_out) continue;
      upsert.run({ ...r, source: r.source || 'manual' });
      results.push(r);
    }
    return results;
  });

  return run(records);
});

ipcMain.handle('attendance:save', (_, record) => {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM attendance WHERE employee_id = ? AND date = ?')
    .get(record.employee_id, record.date);

  if (existing && !record.id) {
    throw new Error(`Attendance for this employee on ${record.date} already exists.`);
  }

  if (record.id) {
    db.prepare(
      'UPDATE attendance SET time_in = ?, time_out = ?, source = ? WHERE id = ?'
    ).run(record.time_in, record.time_out, record.source || 'manual', record.id);
    return db.prepare('SELECT * FROM attendance WHERE id = ?').get(record.id);
  }

  const result = db
    .prepare(
      'INSERT INTO attendance (employee_id, date, time_in, time_out, source) VALUES (?, ?, ?, ?, ?)'
    )
    .run(record.employee_id, record.date, record.time_in, record.time_out, record.source || 'manual');
  return db.prepare('SELECT * FROM attendance WHERE id = ?').get(result.lastInsertRowid);
});

ipcMain.handle('attendance:update', (_, id, data) => {
  const db = getDb();
  db.prepare(
    'UPDATE attendance SET time_in = ?, time_out = ?, source = ? WHERE id = ?'
  ).run(data.time_in, data.time_out, data.source || 'manual', id);
  return db.prepare('SELECT * FROM attendance WHERE id = ?').get(id);
});

ipcMain.handle('attendance:delete', (_, id) => {
  getDb().prepare('DELETE FROM attendance WHERE id = ?').run(id);
  return { success: true };
});
