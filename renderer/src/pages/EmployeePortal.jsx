import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate, formatTime12, hoursWorked, todayStr } from '../utils/format';

function dayColor(record) {
  if (!record) return 'bg-slate-800 text-slate-600';
  const h = hoursWorked(record.time_in, record.time_out);
  if (h >= 8 && h <= 8.1) return 'bg-green-900/70 text-green-300';
  if (h > 8.1) return 'bg-orange-900/70 text-orange-300';
  if (h > 0) return 'bg-yellow-900/70 text-yellow-300';
  return 'bg-slate-800 text-slate-600';
}

function monthDays(year, month) {
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  return { first, total };
}

export default function EmployeePortal() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [tab, setTab] = useState('attendance');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [records, setRecords] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [advances, setAdvances] = useState([]);

  useEffect(() => {
    window.api.employees.getAll().then((emps) => {
      setEmployees(emps);
      if (emps.length) setSelectedEmp(String(emps[0].id));
    });
  }, []);

  useEffect(() => {
    if (!selectedEmp) return;
    const id = Number(selectedEmp);
    window.api.attendance.getByEmployee(id, month + 1, year).then(setRecords);
    window.api.payroll.getByEmployee(id).then(setPayslips);
    window.api.advances.getByEmployee(id).then(setAdvances);
  }, [selectedEmp, month, year]);

  const recordMap = Object.fromEntries(records.map((r) => [r.date, r]));
  const { first, total } = monthDays(year, month);

  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const prevMonth = () => { if (month === 0) { setYear(y=>y-1); setMonth(11); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y=>y+1); setMonth(0); } else setMonth(m=>m+1); };

  const pendingAdvances = advances.filter((a) => !a.is_deducted).reduce((s, a) => s + a.amount, 0);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-white text-2xl font-bold">Employee Portal</h2>
        <p className="text-slate-400 text-sm mt-1">View your attendance, payslips, and advances — read-only</p>
      </div>

      {/* Employee select */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-900/50 border border-blue-800 rounded-xl flex items-center justify-center text-blue-400 font-bold text-lg">
            {employees.find(e => String(e.id) === selectedEmp)?.name[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <label className="text-slate-400 text-xs font-medium block mb-1">Select Employee</label>
            <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}
              className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none w-64">
              {employees.map((e) => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
            </select>
          </div>
          {pendingAdvances > 0 && (
            <div className="bg-amber-900/30 border border-amber-800 rounded-lg px-4 py-2 text-center">
              <p className="text-amber-400 text-xs">Outstanding Advance</p>
              <p className="text-amber-400 font-bold">{formatCurrency(pendingAdvances)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800 rounded-lg p-1 w-fit mb-6">
        {['attendance', 'payslips', 'advances'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Attendance Tab */}
      {tab === 'attendance' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <button onClick={prevMonth} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="text-white font-semibold w-44 text-center">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          <div className="flex gap-4 text-xs text-slate-500 mb-3">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-900 inline-block"></span> Full shift</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-900 inline-block"></span> OT worked</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-900 inline-block"></span> Partial (&lt;8h)</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-800 inline-block"></span> Absent</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 max-w-md">
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: total }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                const rec = recordMap[dateStr];
                const color = dayColor(rec);
                return (
                  <div key={day}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium ${color} ${dateStr === todayStr() ? 'ring-2 ring-blue-400' : ''}`}
                    title={rec ? `${formatTime12(rec.time_in)} – ${formatTime12(rec.time_out)}` : 'No record'}>
                    <span className="font-semibold">{day}</span>
                    {rec && <span className="text-[10px] opacity-75">{hoursWorked(rec.time_in, rec.time_out).toFixed(0)}h</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month stats */}
          {records.length > 0 && (() => {
            let shifts = 0, otHrs = 0, partials = 0;
            records.forEach((r) => {
              const h = hoursWorked(r.time_in, r.time_out);
              if (h >= 8) shifts++;
              else if (h > 0) partials++;
              otHrs += Math.max(0, h - 8);
            });
            return (
              <div className="mt-4 flex flex-wrap gap-3">
                {[['Days Present', records.length, 'text-white'], ['Full Shifts', shifts, 'text-emerald-400'], ['OT Hours', otHrs.toFixed(1), 'text-orange-400'], ['Partial Days', partials, 'text-yellow-400']].map(([label, val, color]) => (
                  <div key={label} className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                    <p className="text-slate-400 text-xs">{label}</p>
                    <p className={`font-bold ${color}`}>{val}</p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Payslips Tab */}
      {tab === 'payslips' && (
        <div className="space-y-3">
          {payslips.length === 0 && (
            <div className="text-center py-12 text-slate-500">No payslips generated yet</div>
          )}
          {payslips.map((p) => (
            <div key={p.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-colors cursor-pointer"
              onClick={() => navigate(`/payslip/${p.id}`)}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">{formatDate(p.period_start)} – {formatDate(p.period_end)}</p>
                  <p className="text-slate-400 text-sm mt-0.5">{p.total_shifts} shifts · {p.total_ot_hours} OT hrs</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-400 font-bold text-lg">{formatCurrency(p.net_pay)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded ${p.is_paid ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}`}>
                    {p.is_paid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Advances Tab */}
      {tab === 'advances' && (
        <div>
          {pendingAdvances > 0 && (
            <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-4 mb-4">
              <p className="text-amber-400 text-sm font-medium">Outstanding Balance: {formatCurrency(pendingAdvances)}</p>
              <p className="text-amber-600 text-xs mt-1">Will be deducted from next payslip</p>
            </div>
          )}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Date</th>
                  <th className="text-right px-5 py-3 text-slate-400 font-medium">Amount</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Note</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {advances.map((adv) => (
                  <tr key={adv.id} className="border-b border-slate-800/50">
                    <td className="px-5 py-3 text-slate-300">{formatDate(adv.date)}</td>
                    <td className="px-5 py-3 text-right text-amber-400 font-semibold">{formatCurrency(adv.amount)}</td>
                    <td className="px-5 py-3 text-slate-400 italic">{adv.note || '—'}</td>
                    <td className="px-5 py-3">
                      {adv.is_deducted
                        ? <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded text-xs">Deducted</span>
                        : <span className="px-2 py-0.5 bg-amber-900/50 text-amber-400 rounded text-xs">Pending</span>
                      }
                    </td>
                  </tr>
                ))}
                {advances.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-600">No advances recorded</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
