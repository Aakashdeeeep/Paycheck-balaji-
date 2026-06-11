const { ipcMain } = require('electron');
const { getDb } = require('../database');

ipcMain.handle('employees:getAll', () => {
  const db = getDb();
  return db.prepare('SELECT * FROM employees ORDER BY name ASC').all();
});

ipcMain.handle('employees:getById', (_, id) => {
  return getDb().prepare('SELECT * FROM employees WHERE id = ?').get(id);
});

ipcMain.handle('employees:create', (_, { name, salary_per_shift, salary_type }) => {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO employees (name, salary_per_shift, salary_type) VALUES (?, ?, ?)')
    .run(name.trim(), salary_per_shift, salary_type);
  return db.prepare('SELECT * FROM employees WHERE id = ?').get(result.lastInsertRowid);
});

ipcMain.handle('employees:update', (_, id, { name, salary_per_shift, salary_type }) => {
  const db = getDb();
  db.prepare(
    'UPDATE employees SET name = ?, salary_per_shift = ?, salary_type = ? WHERE id = ?'
  ).run(name.trim(), salary_per_shift, salary_type, id);
  return db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
});

ipcMain.handle('employees:delete', (_, id) => {
  getDb().prepare('DELETE FROM employees WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('employees:getSummary', (_, id) => {
  const db = getDb();
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  if (!employee) return null;

  const pendingAdvances = db
    .prepare('SELECT COALESCE(SUM(amount),0) as total FROM advances WHERE employee_id = ? AND is_deducted = 0')
    .get(id);

  const lastPayslip = db
    .prepare('SELECT * FROM payroll_periods WHERE employee_id = ? ORDER BY period_end DESC LIMIT 1')
    .get(id);

  return { ...employee, pending_advances: pendingAdvances.total, last_payslip: lastPayslip };
});
