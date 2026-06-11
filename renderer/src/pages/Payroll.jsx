import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate, formatTime12, getWeekRange, getMonthRange, dayName, todayStr } from '../utils/format';
import { exportAllPayroll } from '../utils/excel';

function Line({ label, value, bold, color, minus, separator }) {
  return (
    <>
      {separator && <div className="border-t border-slate-700 my-2" />}
      <div className={`flex justify-between items-center py-1 ${bold ? 'font-bold' : ''}`}>
        <span className={`text-sm ${bold ? 'text-white' : 'text-slate-300'}`}>{label}</span>
        <span className={`text-sm font-mono ${color || (bold ? 'text-emerald-400' : 'text-slate-200')} ${minus ? 'text-red-400' : ''}`}>
          {value}
        </span>
      </div>
    </>
  );
}

export default function Payroll() {
  const location = useLocation();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [preview, setPreview] = useState(null);
  const [deductInput, setDeductInput] = useState('');
  const [payInput, setPayInput] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    window.api.employees.getAll().then((emps) => {
      setEmployees(emps);
      const initId = location.state?.employeeId ? String(location.state.employeeId) : emps[0] ? String(emps[0].id) : '';
      setSelectedEmp(initId);
    });
  }, []);

  useEffect(() => {
    if (!selectedEmp || employees.length === 0) return;
    const emp = employees.find((e) => String(e.id) === selectedEmp);
    if (!emp) return;
    const range = emp.salary_type === 'weekly' ? getWeekRange() : getMonthRange();
    setDateStart(range.start);
    setDateEnd(range.end);
    setPreview(null);
    window.api.payroll.getByEmployee(Number(selectedEmp)).then(setHistory);
  }, [selectedEmp, employees]);

  // Keep payInput in sync with netPayable when deductInput changes
  useEffect(() => {
    if (!preview) return;
    const d = Math.max(0, Math.min(Number(deductInput) || 0, preview.totalOutstanding));
    const netPayable = preview.grossPay - d + (preview.previousCompanyBalance || 0);
    setPayInput(String(Math.max(0, netPayable)));
  }, [deductInput, preview]);

  const runPreview = async () => {
    if (!selectedEmp || !dateStart || !dateEnd) return;
    setLoading(true);
    setMsg(null);
    try {
      const data = await window.api.payroll.preview(Number(selectedEmp), dateStart, dateEnd);
      setPreview(data);
      setDeductInput(String(data.totalOutstanding || 0));
      setPayInput(String(data.netPayable || 0));
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    setLoading(false);
  };

  const confirm = async () => {
    if (!preview) return;
    setConfirming(true);
    setMsg(null);
    try {
      const deductAmount = Math.max(0, Math.min(Number(deductInput) || 0, preview.totalOutstanding));
      const d = deductAmount;
      const netPayable = preview.grossPay - d + (preview.previousCompanyBalance || 0);
      const payAmount = Math.max(0, Math.min(Number(payInput) || 0, netPayable));
      const record = await window.api.payroll.confirm({
        employeeId: Number(selectedEmp),
        periodStart: dateStart,
        periodEnd: dateEnd,
        deductAmount,
        payAmount,
      });
      setMsg({ type: 'success', text: 'Payslip generated successfully!' });
      setPreview(null);
      window.api.payroll.getByEmployee(Number(selectedEmp)).then(setHistory);
      setTimeout(() => navigate(`/payslip/${record.id}`), 800);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    setConfirming(false);
  };

  const exportAll = async () => {
    if (!dateStart || !dateEnd) return;
    setExporting(true);
    try {
      const payslips = await window.api.payroll.getAllForPeriod(dateStart, dateEnd);
      if (payslips.length === 0) { alert('No confirmed payslips for this period.'); setExporting(false); return; }
      await exportAllPayroll(payslips, dateStart, dateEnd);
    } catch (err) {
      alert(err.message);
    }
    setExporting(false);
  };

  const deletePayslip = async (id) => {
    if (!window.confirm('Delete this payslip?')) return;
    try {
      await window.api.payroll.delete(id);
      window.api.payroll.getByEmployee(Number(selectedEmp)).then(setHistory);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold">Payroll Generator</h2>
          <p className="text-slate-400 text-sm mt-1">Calculate and confirm payslips</p>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${msg.type === 'success' ? 'bg-emerald-900/50 border-emerald-700 text-emerald-300' : 'bg-red-900/50 border-red-700 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid xl:grid-cols-3 gap-6">
        {/* Left: Controls */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Generate Payslip</h3>

            <div className="space-y-4">
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Employee</label>
                <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                  {employees.map((e) => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Period Start</label>
                <input type="date" value={dateStart} onChange={(e) => setDateStart(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Period End</label>
                <input type="date" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)}
                  className="w-full bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>

              <button onClick={runPreview} disabled={loading || !selectedEmp}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                {loading ? 'Calculating…' : 'Preview Payslip'}
              </button>
            </div>
          </div>

          {/* Export all */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-3">Export All Staff</h3>
            <p className="text-slate-400 text-xs mb-3">Export payroll for all employees in the selected period.</p>
            <button onClick={exportAll} disabled={exporting}
              className="w-full bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
              {exporting ? 'Exporting…' : 'Export to Excel'}
            </button>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3">Payslip History</h3>
              <div className="space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0">
                    <div>
                      <p className="text-white text-xs font-medium">{formatDate(h.period_start)} – {formatDate(h.period_end)}</p>
                      <p className="text-emerald-400 text-sm font-bold">{formatCurrency(h.net_pay)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {h.is_paid
                        ? <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 text-xs rounded">Paid</span>
                        : <span className="px-2 py-0.5 bg-amber-900/50 text-amber-400 text-xs rounded">Unpaid</span>
                      }
                      <button onClick={() => navigate(`/payslip/${h.id}`)}
                        className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors">View</button>
                      {!h.is_paid && (
                        <button onClick={() => deletePayslip(h.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors">Del</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div className="xl:col-span-2">
          {preview ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-lg">Payslip Preview</h3>
                  <p className="text-slate-400 text-xs">{preview.employee.name} — {formatDate(dateStart)} to {formatDate(dateEnd)}</p>
                </div>
                <span className="px-3 py-1 bg-blue-900/50 text-blue-400 text-xs rounded-full border border-blue-800 font-medium">Preview</span>
              </div>

              {/* Attendance breakdown */}
              <div className="px-5 py-4">
                <h4 className="text-slate-300 text-sm font-semibold mb-3">Attendance Breakdown</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-700">
                        <th className="text-left py-2 pr-4 text-slate-400 font-medium">Date</th>
                        <th className="text-left py-2 pr-4 text-slate-400 font-medium">Day</th>
                        <th className="text-left py-2 pr-4 text-slate-400 font-medium">In</th>
                        <th className="text-left py-2 pr-4 text-slate-400 font-medium">Out</th>
                        <th className="text-right py-2 pr-4 text-slate-400 font-medium">Hrs</th>
                        <th className="text-right py-2 pr-4 text-slate-400 font-medium">Shifts</th>
                        <th className="text-right py-2 text-slate-400 font-medium">OT Hrs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.breakdown.map((r) => (
                        <tr key={r.date} className="border-b border-slate-800/50">
                          <td className="py-1.5 pr-4 text-slate-300">{formatDate(r.date)}</td>
                          <td className="py-1.5 pr-4 text-slate-400">{dayName(r.date)}</td>
                          <td className="py-1.5 pr-4 text-slate-300">{formatTime12(r.time_in)}</td>
                          <td className="py-1.5 pr-4 text-slate-300">{formatTime12(r.time_out)}</td>
                          <td className="py-1.5 pr-4 text-right text-slate-300">{r.hours.toFixed(1)}</td>
                          <td className="py-1.5 pr-4 text-right text-emerald-400">{r.shifts}</td>
                          <td className="py-1.5 text-right text-orange-400">{r.ot_hours.toFixed(1)}</td>
                        </tr>
                      ))}
                      {preview.breakdown.length === 0 && (
                        <tr><td colSpan={7} className="py-4 text-center text-slate-600">No attendance in this period</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculation */}
              <div className="px-5 py-4 border-t border-slate-800">
                <h4 className="text-slate-300 text-sm font-semibold mb-3">Calculation Summary</h4>
                <div className="bg-slate-800/50 rounded-lg px-4 py-3 space-y-1">
                  <Line label={`Shifts: ${preview.totalShifts} × ${formatCurrency(preview.employee.salary_per_shift)}`} value={formatCurrency(preview.totalShifts * preview.employee.salary_per_shift)} />
                  <Line label={`OT: ${preview.totalOtHours} hrs × ${formatCurrency(preview.otRate)}/hr`} value={formatCurrency(preview.totalOtHours * preview.otRate)} />
                  <Line label="Gross Pay" value={formatCurrency(preview.grossPay)} separator bold color="text-white" />

                  {/* Advance deduction */}
                  {preview.totalOutstanding > 0 && (
                    <div className="py-2">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-slate-400 text-xs">Employee Advance Balance</span>
                        <span className="text-amber-400 text-xs font-semibold">{formatCurrency(preview.totalOutstanding)}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-amber-900/20 border border-amber-800/40 rounded-lg px-3 py-2">
                        <label className="text-amber-300 text-xs whitespace-nowrap font-medium">Deduct advance:</label>
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                          <input type="number" min="0" max={preview.totalOutstanding} step="1"
                            value={deductInput} onChange={(e) => { setDeductInput(e.target.value); }}
                            className="w-full bg-slate-800 text-white border border-amber-700/50 rounded pl-5 pr-2 py-1 text-xs focus:border-amber-500 focus:outline-none" />
                        </div>
                        <button onClick={() => setDeductInput(String(preview.totalOutstanding))} className="text-xs text-amber-400 hover:text-amber-300 font-medium">Full</button>
                        <button onClick={() => setDeductInput('0')} className="text-xs text-slate-500 hover:text-slate-300">None</button>
                      </div>
                    </div>
                  )}

                  {/* Previous company balance (company owes employee) */}
                  {(preview.previousCompanyBalance || 0) > 0 && (
                    <Line
                      label="Company Balance (prev. unpaid)"
                      value={`+ ${formatCurrency(preview.previousCompanyBalance)}`}
                      color="text-blue-400"
                    />
                  )}

                  {/* Live net payable + pay now section */}
                  {(() => {
                    const d = Math.max(0, Math.min(Number(deductInput) || 0, preview.totalOutstanding));
                    const advRemaining = preview.totalOutstanding - d;
                    const netPayable = preview.grossPay - d + (preview.previousCompanyBalance || 0);
                    const payNow = Math.max(0, Math.min(Number(payInput) || 0, netPayable));
                    const companyBalance = Math.max(0, netPayable - payNow);

                    // sync payInput default when netPayable changes
                    return (
                      <>
                        {d > 0 && <Line label="Advance Deducted" value={`- ${formatCurrency(d)}`} minus />}
                        <Line label="Net Payable" value={formatCurrency(netPayable)} separator bold color="text-white" />

                        {/* Pay now input */}
                        <div className="mt-3 bg-emerald-900/20 border border-emerald-800/40 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <label className="text-emerald-300 text-xs whitespace-nowrap font-medium">Pay now:</label>
                            <div className="relative flex-1">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                              <input type="number" min="0" max={netPayable} step="1"
                                value={payInput} onChange={(e) => setPayInput(e.target.value)}
                                className="w-full bg-slate-800 text-white border border-emerald-700/50 rounded pl-5 pr-2 py-1 text-xs focus:border-emerald-500 focus:outline-none" />
                            </div>
                            <button onClick={() => setPayInput(String(netPayable))} className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">Full</button>
                            <button onClick={() => setPayInput('0')} className="text-xs text-slate-500 hover:text-slate-300">None</button>
                          </div>
                        </div>

                        <Line label="Paying Employee" value={formatCurrency(payNow)} bold color="text-emerald-400" />

                        {companyBalance > 0 && (
                          <div className="mt-2 px-3 py-2 bg-blue-900/30 border border-blue-800 rounded text-xs text-blue-300">
                            Company still owes employee {formatCurrency(companyBalance)} — will add to next week's pay.
                          </div>
                        )}
                        {advRemaining > 0 && (
                          <div className="mt-1 px-3 py-2 bg-amber-900/30 border border-amber-800 rounded text-xs text-amber-400">
                            Advance balance remaining: {formatCurrency(advRemaining)} — carries to next period.
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="px-5 py-4 border-t border-slate-800 flex justify-end">
                <button onClick={confirm} disabled={confirming}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-8 py-2.5 rounded-lg text-sm font-bold transition-colors">
                  {confirming ? 'Confirming…' : 'Confirm & Generate Payslip'}
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-64 flex flex-col items-center justify-center text-center bg-slate-900 border border-slate-800 rounded-xl">
              <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-slate-400 font-medium">Select an employee and period</p>
              <p className="text-slate-600 text-sm mt-1">then click Preview Payslip to see the calculation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
