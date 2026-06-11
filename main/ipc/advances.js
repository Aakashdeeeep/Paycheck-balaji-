const { ipcMain } = require('electron');
const { getDb } = require('../database');

ipcMain.handle('advances:getByEmployee', (_, employeeId) => {
  return getDb()
    .prepare(`SELECT * FROM advances WHERE employee_id = ? ORDER BY date DESC`)
    .all(employeeId);
});

ipcMain.handle('advances:getPending', (_, employeeId) => {
  return getDb()
    .prepare(`
      SELECT * FROM advances
      WHERE employee_id = ? AND COALESCE(remaining_balance, amount) > 0
      ORDER BY date ASC
    `)
    .all(employeeId);
});

ipcMain.handle('advances:create', (_, { employee_id, amount, note, date }) => {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO advances (employee_id, amount, remaining_balance, note, date) VALUES (?, ?, ?, ?, ?)')
    .run(employee_id, amount, amount, note || '', date);
  return db.prepare('SELECT * FROM advances WHERE id = ?').get(result.lastInsertRowid);
});

ipcMain.handle('advances:delete', (_, id) => {
  const db = getDb();
  const adv = db.prepare('SELECT * FROM advances WHERE id = ?').get(id);
  const remaining = adv ? (adv.remaining_balance ?? adv.amount) : 0;
  if (adv && adv.is_deducted && remaining === 0) {
    throw new Error('Cannot delete a fully deducted advance.');
  }
  db.prepare('DELETE FROM advances WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('advances:getTotalOutstanding', () => {
  return getDb()
    .prepare(`
      SELECT employee_id, COALESCE(SUM(COALESCE(remaining_balance, amount)), 0) as total
      FROM advances
      WHERE COALESCE(remaining_balance, amount) > 0
      GROUP BY employee_id
    `)
    .all();
});

ipcMain.handle('advances:getOutstandingByEmployee', (_, employeeId) => {
  const row = getDb()
    .prepare(`
      SELECT COALESCE(SUM(COALESCE(remaining_balance, amount)), 0) as total
      FROM advances
      WHERE employee_id = ? AND COALESCE(remaining_balance, amount) > 0
    `)
    .get(employeeId);
  return row ? row.total : 0;
});
