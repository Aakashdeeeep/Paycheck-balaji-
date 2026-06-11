const { ipcMain } = require('electron');
const { getDb } = require('../database');

const LUNCH_START = 13 * 60; // 1:00 PM
const LUNCH_END   = 14 * 60; // 2:00 PM

function hoursWorked(timeIn, timeOut) {
  const [h1, m1] = timeIn.split(':').map(Number);
  const [h2, m2] = timeOut.split(':').map(Number);
  const start = h1 * 60 + m1;
  const end   = h2 * 60 + m2;
  const raw   = end - start;
  if (raw <= 0) return 0;
  const lunch = Math.max(0, Math.min(end, LUNCH_END) - Math.max(start, LUNCH_START));
  return (raw - lunch) / 60;
}

function computePayroll(employee, attendanceRows, deductAmount, previousCompanyBalance, payAmount) {
  const otRate = Math.floor(employee.salary_per_shift / 8);

  let totalShifts = 0;
  let totalOtHours = 0;

  const breakdown = attendanceRows.map((row) => {
    const hrs = hoursWorked(row.time_in, row.time_out);
    const shifts = hrs >= 8 ? 1 : 0;
    // Partial day (< 8 hrs) → those hours paid at OT rate, not as a full shift
    const ot = hrs >= 8 ? Math.max(0, hrs - 8) : hrs;
    totalShifts += shifts;
    totalOtHours += ot;
    return { ...row, hours: hrs, shifts, ot_hours: ot };
  });

  const grossPay = totalShifts * employee.salary_per_shift + totalOtHours * otRate;

  // netPayable = this week's earnings - advance deduction + what company still owes from last period
  const netPayable = grossPay - deductAmount + previousCompanyBalance;

  // payAmount = how much company is actually paying now (clamped to netPayable)
  const actualPay = Math.max(0, Math.min(payAmount ?? netPayable, netPayable));

  // company balance = what company still owes employee after this payment (always >= 0)
  const companyBalance = Math.max(0, netPayable - actualPay);

  return {
    totalShifts,
    totalOtHours: Math.round(totalOtHours * 100) / 100,
    otRate,
    grossPay,
    advanceDeducted: deductAmount,
    previousCompanyBalance,
    netPayable,
    netPay: actualPay,
    carryBalance: companyBalance,
    breakdown,
  };
}

function getPendingAdvances(db, employeeId, beforeDate) {
  return db
    .prepare(`
      SELECT * FROM advances
      WHERE employee_id = ? AND COALESCE(remaining_balance, amount) > 0 AND date <= ?
      ORDER BY date ASC
    `)
    .all(employeeId, beforeDate);
}

function getTotalOutstanding(db, employeeId, beforeDate) {
  const row = db
    .prepare(`
      SELECT COALESCE(SUM(COALESCE(remaining_balance, amount)), 0) as total
      FROM advances
      WHERE employee_id = ? AND COALESCE(remaining_balance, amount) > 0 AND date <= ?
    `)
    .get(employeeId, beforeDate);
  return row ? row.total : 0;
}

ipcMain.handle('payroll:preview', (_, employeeId, start, end) => {
  const db = getDb();
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);
  if (!employee) throw new Error('Employee not found');

  const attendanceRows = db
    .prepare('SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC')
    .all(employeeId, start, end);

  const totalOutstanding = getTotalOutstanding(db, employeeId, end);

  const lastPayroll = db
    .prepare('SELECT * FROM payroll_periods WHERE employee_id = ? ORDER BY period_end DESC LIMIT 1')
    .get(employeeId);

  const previousCompanyBalance = lastPayroll ? Math.max(0, lastPayroll.carry_balance) : 0;
  const calc = computePayroll(employee, attendanceRows, totalOutstanding, previousCompanyBalance, null);
  return { employee, ...calc, periodStart: start, periodEnd: end, totalOutstanding };
});

ipcMain.handle('payroll:confirm', (_, { employeeId, periodStart, periodEnd, deductAmount, payAmount }) => {
  const db = getDb();
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId);

  const existing = db
    .prepare('SELECT * FROM payroll_periods WHERE employee_id = ? AND period_start = ? AND period_end = ?')
    .get(employeeId, periodStart, periodEnd);
  if (existing && existing.is_paid) {
    throw new Error('This payslip is already marked as paid and cannot be regenerated.');
  }

  const attendanceRows = db
    .prepare('SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC')
    .all(employeeId, periodStart, periodEnd);

  const pendingAdvances = getPendingAdvances(db, employeeId, periodEnd);
  const totalOutstanding = pendingAdvances.reduce((s, a) => s + (a.remaining_balance ?? a.amount), 0);

  const actualDeduct = Math.max(0, Math.min(Number(deductAmount) || 0, totalOutstanding));

  const lastPayroll = db
    .prepare('SELECT * FROM payroll_periods WHERE employee_id = ? AND id != ? ORDER BY period_end DESC LIMIT 1')
    .get(employeeId, existing ? existing.id : 0);

  const previousCompanyBalance = lastPayroll ? Math.max(0, lastPayroll.carry_balance) : 0;
  const calc = computePayroll(employee, attendanceRows, actualDeduct, previousCompanyBalance, Number(payAmount));

  const save = db.transaction(() => {
    if (existing) {
      db.prepare('DELETE FROM payroll_periods WHERE id = ?').run(existing.id);
    }

    const result = db.prepare(`
      INSERT INTO payroll_periods
        (employee_id, period_start, period_end, total_shifts, total_ot_hours,
         ot_rate, gross_pay, advance_deducted, previous_carry, carry_balance, net_pay)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      employeeId, periodStart, periodEnd,
      calc.totalShifts, calc.totalOtHours, calc.otRate,
      calc.grossPay, calc.advanceDeducted, calc.previousCompanyBalance,
      calc.carryBalance, calc.netPay
    );

    // Distribute deduction across advances FIFO (oldest first)
    let remaining = actualDeduct;
    for (const adv of pendingAdvances) {
      if (remaining <= 0) break;
      const advBalance = adv.remaining_balance ?? adv.amount;
      const deductFromThis = Math.min(remaining, advBalance);
      const newBalance = advBalance - deductFromThis;
      remaining -= deductFromThis;

      if (newBalance <= 0) {
        db.prepare('UPDATE advances SET remaining_balance = 0, is_deducted = 1 WHERE id = ?').run(adv.id);
      } else {
        db.prepare('UPDATE advances SET remaining_balance = ? WHERE id = ?').run(newBalance, adv.id);
      }
    }

    return db.prepare('SELECT * FROM payroll_periods WHERE id = ?').get(result.lastInsertRowid);
  });

  return save();
});

ipcMain.handle('payroll:getByEmployee', (_, employeeId) => {
  return getDb()
    .prepare('SELECT * FROM payroll_periods WHERE employee_id = ? ORDER BY period_end DESC')
    .all(employeeId);
});

ipcMain.handle('payroll:getById', (_, id) => {
  const db = getDb();
  const period = db.prepare('SELECT * FROM payroll_periods WHERE id = ?').get(id);
  if (!period) return null;

  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(period.employee_id);
  const attendance = db
    .prepare('SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC')
    .all(period.employee_id, period.period_start, period.period_end);

  const advances = db
    .prepare('SELECT * FROM advances WHERE employee_id = ? AND date <= ? ORDER BY date ASC')
    .all(period.employee_id, period.period_end);

  const otRate = Math.floor(employee.salary_per_shift / 8);

  const breakdown = attendance.map((row) => {
    const hrs = hoursWorked(row.time_in, row.time_out);
    return { ...row, hours: hrs, shifts: hrs >= 8 ? 1 : 0, ot_hours: hrs >= 8 ? Math.max(0, hrs - 8) : hrs };
  });

  return { ...period, employee, breakdown, advances, ot_rate: otRate };
});

ipcMain.handle('payroll:markPaid', (_, id) => {
  getDb().prepare('UPDATE payroll_periods SET is_paid = 1 WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('payroll:delete', (_, id) => {
  const db = getDb();
  const period = db.prepare('SELECT * FROM payroll_periods WHERE id = ?').get(id);
  if (period && period.is_paid) throw new Error('Cannot delete a paid payslip.');
  db.prepare('DELETE FROM payroll_periods WHERE id = ?').run(id);
  return { success: true };
});

ipcMain.handle('payroll:getDashboardStats', () => {
  const db = getDb();
  const totalEmployees = db.prepare('SELECT COUNT(*) as c FROM employees').get().c;
  const unpaidAdvances = db
    .prepare(`SELECT COALESCE(SUM(COALESCE(remaining_balance, amount)), 0) as total FROM advances WHERE COALESCE(remaining_balance, amount) > 0`)
    .get().total;
  const pendingPayslips = db
    .prepare('SELECT COUNT(*) as c FROM payroll_periods WHERE is_paid = 0')
    .get().c;

  const employees = db.prepare('SELECT * FROM employees').all();
  const employeeStats = employees.map((emp) => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(1);
    const startStr = start.toISOString().split('T')[0];
    const endStr = today.toISOString().split('T')[0];

    const rows = db
      .prepare('SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ?')
      .all(emp.id, startStr, endStr);

    let shifts = 0, otHours = 0;
    for (const r of rows) {
      const hrs = hoursWorked(r.time_in, r.time_out);
      if (hrs >= 8) shifts++;
      otHours += hrs >= 8 ? Math.max(0, hrs - 8) : hrs;
    }

    const otRate = Math.floor(emp.salary_per_shift / 8);
    const estimatedPay = shifts * emp.salary_per_shift + otHours * otRate;
    const pendingAdv = db
      .prepare(`SELECT COALESCE(SUM(COALESCE(remaining_balance, amount)), 0) as t FROM advances WHERE employee_id = ? AND COALESCE(remaining_balance, amount) > 0`)
      .get(emp.id).t;

    return { ...emp, shifts, ot_hours: Math.round(otHours * 100) / 100, estimated_pay: estimatedPay, pending_advances: pendingAdv };
  });

  const totalPayroll = employeeStats.reduce((s, e) => s + e.estimated_pay, 0);

  return { totalEmployees, totalPayroll, unpaidAdvances, pendingPayslips, employeeStats };
});

ipcMain.handle('payroll:getAllForPeriod', (_, start, end) => {
  const db = getDb();
  const employees = db.prepare('SELECT * FROM employees').all();
  return employees.map((emp) => {
    const period = db
      .prepare('SELECT * FROM payroll_periods WHERE employee_id = ? AND period_start = ? AND period_end = ?')
      .get(emp.id, start, end);
    if (!period) return null;

    const attendance = db
      .prepare('SELECT * FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ? ORDER BY date ASC')
      .all(emp.id, start, end);

    const otRate = Math.floor(emp.salary_per_shift / 8);
    const breakdown = attendance.map((row) => {
      const hrs = hoursWorked(row.time_in, row.time_out);
      return { ...row, hours: hrs, shifts: hrs >= 8 ? 1 : 0, ot_hours: hrs >= 8 ? Math.max(0, hrs - 8) : hrs };
    });

    return { ...period, employee: emp, breakdown, ot_rate: otRate };
  }).filter(Boolean);
});
