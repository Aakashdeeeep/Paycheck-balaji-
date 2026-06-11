import * as XLSX from 'xlsx';
import { formatDate, formatTime12, dayName } from './format';

function bold(ws, ref) {
  if (!ws[ref]) return;
  ws[ref].s = { ...ws[ref].s, font: { bold: true } };
}

function setGreen(ws, ref) {
  if (!ws[ref]) return;
  ws[ref].s = { ...ws[ref].s, fill: { fgColor: { rgb: 'C6EFCE' } } };
}

function autoWidth(ws, data) {
  const cols = [];
  data.forEach((row) => {
    Object.values(row).forEach((val, i) => {
      const len = String(val ?? '').length + 2;
      cols[i] = Math.max(cols[i] || 0, len);
    });
  });
  ws['!cols'] = cols.map((w) => ({ wch: Math.min(w, 40) }));
}

export async function exportPayslip(payslip) {
  const { employee, period_start, period_end, breakdown, advances,
    total_shifts, total_ot_hours, ot_rate, gross_pay,
    advance_deducted, previous_carry, net_pay } = payslip;

  const wb = XLSX.utils.book_new();

  // Sheet 1 — Attendance
  const attRows = breakdown.map((r) => ({
    Date: formatDate(r.date),
    Day: dayName(r.date),
    'Time In': formatTime12(r.time_in),
    'Time Out': formatTime12(r.time_out),
    'Hours Worked': Math.round(r.hours * 100) / 100,
    Shifts: r.shifts,
    'OT Hours': Math.round(r.ot_hours * 100) / 100,
  }));

  const ws1 = XLSX.utils.json_to_sheet(attRows);
  ws1['!freeze'] = { xSplit: 0, ySplit: 1 };
  autoWidth(ws1, attRows);
  XLSX.utils.book_append_sheet(wb, ws1, 'Attendance');

  // Sheet 2 — Payslip Summary
  const summaryData = [
    { Field: 'Employee Name', Value: employee.name },
    { Field: 'Period', Value: `${formatDate(period_start)} – ${formatDate(period_end)}` },
    { Field: 'Salary Per Shift', Value: employee.salary_per_shift },
    { Field: 'OT Rate Per Hour', Value: ot_rate },
    { Field: 'Total Shifts', Value: total_shifts },
    { Field: 'Total OT Hours', Value: total_ot_hours },
    { Field: 'Gross Pay', Value: gross_pay },
    { Field: 'Advances Deducted', Value: advance_deducted },
    { Field: 'Previous Carry Balance', Value: previous_carry },
    { Field: 'Net Payable', Value: net_pay },
  ];

  const ws2 = XLSX.utils.json_to_sheet(summaryData);
  ws2['!freeze'] = { xSplit: 0, ySplit: 1 };
  autoWidth(ws2, summaryData);

  // Highlight Net Pay row
  const netRow = summaryData.length;
  setGreen(ws2, `B${netRow + 1}`);

  XLSX.utils.book_append_sheet(wb, ws2, 'Payslip Summary');

  // Sheet 3 — Advances
  const advRows = (advances || []).map((a) => ({
    Date: formatDate(a.date),
    Amount: a.amount,
    Note: a.note || '',
    Status: a.is_deducted ? 'Deducted' : 'Pending',
  }));

  const ws3 = XLSX.utils.json_to_sheet(advRows.length ? advRows : [{ Date: '', Amount: 0, Note: 'No advances', Status: '' }]);
  ws3['!freeze'] = { xSplit: 0, ySplit: 1 };
  autoWidth(ws3, advRows);
  XLSX.utils.book_append_sheet(wb, ws3, 'Advances');

  const name = `${employee.name}_${period_start}_${period_end}.xlsx`;
  const result = await window.api.dialog.showSaveDialog({
    defaultPath: name,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });

  if (!result.canceled && result.filePath) {
    XLSX.writeFile(wb, result.filePath);
    return true;
  }
  return false;
}

export async function exportAllPayroll(payslips, start, end) {
  const wb = XLSX.utils.book_new();

  // Summary sheet
  const summaryRows = payslips.map((p) => ({
    Employee: p.employee.name,
    Shifts: p.total_shifts,
    'OT Hrs': p.total_ot_hours,
    Gross: p.gross_pay,
    Advances: p.advance_deducted,
    Carry: p.previous_carry,
    'Net Pay': p.net_pay,
  }));

  const totals = {
    Employee: 'TOTAL',
    Shifts: summaryRows.reduce((s, r) => s + r.Shifts, 0),
    'OT Hrs': summaryRows.reduce((s, r) => s + r['OT Hrs'], 0),
    Gross: summaryRows.reduce((s, r) => s + r.Gross, 0),
    Advances: summaryRows.reduce((s, r) => s + r.Advances, 0),
    Carry: '',
    'Net Pay': summaryRows.reduce((s, r) => s + r['Net Pay'], 0),
  };

  const ws0 = XLSX.utils.json_to_sheet([...summaryRows, totals]);
  ws0['!freeze'] = { xSplit: 0, ySplit: 1 };
  autoWidth(ws0, [...summaryRows, totals]);
  XLSX.utils.book_append_sheet(wb, ws0, 'Summary');

  // One sheet per employee
  for (const p of payslips) {
    const rows = p.breakdown.map((r) => ({
      Date: formatDate(r.date),
      Day: dayName(r.date),
      'Time In': formatTime12(r.time_in),
      'Time Out': formatTime12(r.time_out),
      Hours: Math.round(r.hours * 100) / 100,
      Shifts: r.shifts,
      'OT Hours': Math.round(r.ot_hours * 100) / 100,
    }));

    rows.push({}, {
      Date: 'Total Shifts:', Day: p.total_shifts, 'Time In': 'Gross Pay:', 'Time Out': p.gross_pay,
      Hours: 'Net Pay:', Shifts: p.net_pay, 'OT Hours': '',
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    autoWidth(ws, rows);
    const sheetName = p.employee.name.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const name = `Payroll_${start}_${end}.xlsx`;
  const result = await window.api.dialog.showSaveDialog({
    defaultPath: name,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }],
  });

  if (!result.canceled && result.filePath) {
    XLSX.writeFile(wb, result.filePath);
    return true;
  }
  return false;
}
