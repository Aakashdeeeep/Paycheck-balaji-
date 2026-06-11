import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../App';
import { formatCurrency, formatDate, formatTime12, dayName } from '../utils/format';
import { exportPayslip } from '../utils/excel';

export default function PayslipView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isCompanyView } = useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const d = await window.api.payroll.getById(Number(id));
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const markPaid = async () => {
    if (!window.confirm('Mark this payslip as paid? This cannot be undone.')) return;
    setMarking(true);
    await window.api.payroll.markPaid(Number(id));
    setData((d) => ({ ...d, is_paid: 1 }));
    setMarking(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportPayslip(data);
    } catch (err) {
      alert(err.message);
    }
    setExporting(false);
  };

  const handlePrint = () => window.print();

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400 text-sm">Loading…</div></div>;
  if (!data) return <div className="flex items-center justify-center h-full"><div className="text-slate-400 text-sm">Payslip not found.</div></div>;

  const { employee, breakdown, advances, period_start, period_end,
    total_shifts, total_ot_hours, ot_rate, gross_pay,
    advance_deducted, previous_carry, carry_balance, net_pay, is_paid, generated_at } = data;

  return (
    <div className="p-6">
      {/* Actions bar */}
      {isCompanyView && (
        <div className="flex items-center gap-3 mb-6 no-print">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <div className="flex-1" />
          <button onClick={handleExport} disabled={exporting}
            className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </button>
          {!is_paid && (
            <button onClick={markPaid} disabled={marking}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {marking ? 'Marking…' : 'Mark as Paid'}
            </button>
          )}
          {is_paid && (
            <span className="flex items-center gap-1 bg-emerald-900/50 border border-emerald-800 text-emerald-400 px-3 py-2 rounded-lg text-sm font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Paid
            </span>
          )}
        </div>
      )}

      {/* Payslip document */}
      <div id="payslip" className="bg-white text-gray-900 rounded-xl p-8 max-w-3xl mx-auto shadow-xl">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-gray-200 pb-5 mb-5">
          <div>
            <h1 className="text-2xl font-black text-gray-900">My Business</h1>
            <p className="text-gray-500 text-sm mt-1">Computer Generated Payslip</p>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900 uppercase tracking-wide">PAYSLIP</div>
            <div className={`mt-1 inline-block px-3 py-0.5 rounded-full text-xs font-semibold ${is_paid ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {is_paid ? 'PAID' : 'UNPAID'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-2">
            <div className="flex gap-3">
              <span className="text-gray-500 text-sm w-28 shrink-0">Employee</span>
              <span className="text-gray-900 text-sm font-semibold">{employee.name}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500 text-sm w-28 shrink-0">Salary Type</span>
              <span className="text-gray-900 text-sm capitalize font-medium">{employee.salary_type}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500 text-sm w-28 shrink-0">Salary/Shift</span>
              <span className="text-gray-900 text-sm font-medium">{formatCurrency(employee.salary_per_shift)}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex gap-3">
              <span className="text-gray-500 text-sm w-24 shrink-0">Period</span>
              <span className="text-gray-900 text-sm font-semibold">{formatDate(period_start)} – {formatDate(period_end)}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500 text-sm w-24 shrink-0">Generated</span>
              <span className="text-gray-900 text-sm">{formatDate(generated_at.split(' ')[0])}</span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500 text-sm w-24 shrink-0">OT Rate</span>
              <span className="text-gray-900 text-sm font-medium">{formatCurrency(ot_rate)}/hr</span>
            </div>
          </div>
        </div>

        {/* Attendance table */}
        <div className="mb-6">
          <h2 className="text-gray-900 font-bold text-sm mb-3 uppercase tracking-wide">Attendance</h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-2 text-gray-600 font-semibold border border-gray-200">Date</th>
                <th className="text-left p-2 text-gray-600 font-semibold border border-gray-200">Day</th>
                <th className="text-left p-2 text-gray-600 font-semibold border border-gray-200">Time In</th>
                <th className="text-left p-2 text-gray-600 font-semibold border border-gray-200">Time Out</th>
                <th className="text-right p-2 text-gray-600 font-semibold border border-gray-200">Hours</th>
                <th className="text-right p-2 text-gray-600 font-semibold border border-gray-200">Shifts</th>
                <th className="text-right p-2 text-gray-600 font-semibold border border-gray-200">OT Hrs</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((r) => (
                <tr key={r.date} className="border border-gray-200">
                  <td className="p-2 text-gray-800">{formatDate(r.date)}</td>
                  <td className="p-2 text-gray-600">{dayName(r.date)}</td>
                  <td className="p-2 text-gray-800">{formatTime12(r.time_in)}</td>
                  <td className="p-2 text-gray-800">{formatTime12(r.time_out)}</td>
                  <td className="p-2 text-right text-gray-800">{r.hours.toFixed(1)}</td>
                  <td className="p-2 text-right text-gray-800">{r.shifts}</td>
                  <td className="p-2 text-right text-gray-800">{r.ot_hours.toFixed(1)}</td>
                </tr>
              ))}
              {breakdown.length === 0 && (
                <tr><td colSpan={7} className="p-3 text-center text-gray-400 border border-gray-200">No attendance recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Earnings & Deductions */}
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <h2 className="text-gray-900 font-bold text-sm uppercase tracking-wide">Earnings & Deductions</h2>
          </div>
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shifts: {total_shifts} × {formatCurrency(employee.salary_per_shift)}</span>
              <span className="text-gray-800 font-medium">{formatCurrency(total_shifts * employee.salary_per_shift)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Overtime: {total_ot_hours} hrs × {formatCurrency(ot_rate)}/hr</span>
              <span className="text-gray-800 font-medium">{formatCurrency(total_ot_hours * ot_rate)}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
              <span className="text-gray-800">Gross Pay</span>
              <span className="text-gray-800">{formatCurrency(gross_pay)}</span>
            </div>
            {advance_deducted > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Advance Deducted</span>
                <span className="text-red-600 font-medium">- {formatCurrency(advance_deducted)}</span>
              </div>
            )}
            {previous_carry > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Company Balance (prev. unpaid)</span>
                <span className="text-blue-600 font-medium">+ {formatCurrency(previous_carry)}</span>
              </div>
            )}
            <div className="border-t-2 border-gray-900 pt-2 flex justify-between text-base font-bold">
              <span className="text-gray-900">Paid This Period</span>
              <span className="text-green-700 text-lg">{formatCurrency(net_pay)}</span>
            </div>
            {carry_balance > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                Note: Company still owes employee {formatCurrency(carry_balance)} — added to next period.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 text-center text-gray-400 text-xs">
          This payslip is computer generated. For queries contact your employer.
        </div>
      </div>
    </div>
  );
}
