import React, { useEffect, useState } from 'react';
import { formatTime12, hoursWorked, todayStr } from '../utils/format';

// ── helpers ────────────────────────────────────────────────────────────────

function hrsToShifts(h) { return h >= 8 ? 1 : 0; }
function hrsToOt(h) { return Math.max(0, h - 8); }

function dayColor(record) {
  if (!record) return 'bg-slate-800 text-slate-600';
  const h = hoursWorked(record.time_in, record.time_out);
  if (h >= 8 && h <= 8.1) return 'bg-green-900 text-green-300';
  if (h > 8.1) return 'bg-orange-900 text-orange-300';
  if (h > 0) return 'bg-yellow-900 text-yellow-300';
  return 'bg-slate-800 text-slate-600';
}

function monthDays(year, month) {
  const first = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  return { first, total };
}

// ── Bulk Entry Sub-view ────────────────────────────────────────────────────

function BulkEntry() {
  const [date, setDate] = useState(todayStr());
  const [employees, setEmployees] = useState([]);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const loadDate = async (d) => {
    setDate(d);
    const emps = await window.api.employees.getAll();
    const existing = await window.api.attendance.getByDate(d);
    const byEmpId = Object.fromEntries(existing.map((r) => [r.employee_id, r]));

    setEmployees(emps);
    setRows(emps.map((emp) => {
      const ex = byEmpId[emp.id];
      return {
        employee_id: emp.id,
        name: emp.name,
        time_in: ex ? ex.time_in : '',
        time_out: ex ? ex.time_out : '',
        existing_id: ex ? ex.id : null,
      };
    }));
  };

  useEffect(() => { loadDate(date); }, []);

  const update = (i, field, val) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const records = rows
        .filter((r) => r.time_in && r.time_out)
        .map((r) => ({
          employee_id: r.employee_id,
          date,
          time_in: r.time_in,
          time_out: r.time_out,
          source: 'manual',
        }));
      await window.api.attendance.saveBulk(records);
      setMsg({ type: 'success', text: `Saved attendance for ${records.length} employee(s)` });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    setSaving(false);
  };

  return (
    <div>
      <div className="flex items-center gap-4 mb-5">
        <div>
          <label className="text-slate-400 text-xs font-medium block mb-1">Date</label>
          <input type="date" value={date}
            onChange={(e) => loadDate(e.target.value)}
            max={todayStr()}
            className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
        </div>
        <div className="pt-5">
          <div className="text-slate-400 text-xs">
            {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${msg.type === 'success' ? 'bg-emerald-900/50 border border-emerald-700 text-emerald-300' : 'bg-red-900/50 border border-red-700 text-red-300'}`}>
          {msg.text}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Employee</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Time In</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Time Out</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Hours</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Shifts</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">OT Hrs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const hrs = hoursWorked(row.time_in, row.time_out);
              const shifts = hrsToShifts(hrs);
              const ot = hrsToOt(hrs);
              return (
                <tr key={row.employee_id} className="border-b border-slate-800/50">
                  <td className="px-5 py-3">
                    <span className="text-white font-medium">{row.name}</span>
                    {row.existing_id && <span className="ml-2 text-xs text-blue-400">(editing)</span>}
                  </td>
                  <td className="px-5 py-3">
                    <input type="time" value={row.time_in}
                      onChange={(e) => update(i, 'time_in', e.target.value)}
                      className="bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none w-28" />
                  </td>
                  <td className="px-5 py-3">
                    <input type="time" value={row.time_out}
                      onChange={(e) => update(i, 'time_out', e.target.value)}
                      className="bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-sm focus:border-blue-500 focus:outline-none w-28" />
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.time_in && row.time_out
                      ? <span className={hrs >= 8 ? 'text-emerald-400' : hrs > 0 ? 'text-yellow-400' : 'text-slate-500'}>{hrs.toFixed(1)}</span>
                      : <span className="text-slate-600">—</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">{row.time_in && row.time_out ? shifts : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    {row.time_in && row.time_out && ot > 0
                      ? <span className="text-orange-400">{ot.toFixed(1)}</span>
                      : <span className="text-slate-600">{row.time_in && row.time_out ? '0' : '—'}</span>
                    }
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-4">
        <button onClick={save} disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
          {saving ? 'Saving…' : 'Save All Attendance'}
        </button>
        <div className="flex gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-900 inline-block"></span> Full shift (8h)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-900 inline-block"></span> OT worked</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-900 inline-block"></span> Partial (&lt;8h)</span>
        </div>
      </div>
    </div>
  );
}

// ── Calendar Sub-view ────────────────────────────────────────────────────

function CalendarView() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [records, setRecords] = useState([]);
  const [modal, setModal] = useState(null); // { date, record }
  const [form, setForm] = useState({ time_in: '', time_out: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    window.api.employees.getAll().then((emps) => {
      setEmployees(emps);
      if (emps.length > 0) setSelectedEmp(String(emps[0].id));
    });
  }, []);

  useEffect(() => {
    if (!selectedEmp) return;
    window.api.attendance.getByEmployee(Number(selectedEmp), month + 1, year).then(setRecords);
  }, [selectedEmp, month, year]);

  const recordMap = Object.fromEntries(records.map((r) => [r.date, r]));
  const { first, total } = monthDays(year, month);

  const openDay = (day) => {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const rec = recordMap[d];
    setModal({ date: d, record: rec });
    setForm({ time_in: rec ? rec.time_in : '09:00', time_out: rec ? rec.time_out : '18:00', id: rec ? rec.id : null });
    setError('');
  };

  const saveModal = async () => {
    if (!form.time_in || !form.time_out) return setError('Both time fields are required');
    setSaving(true);
    setError('');
    try {
      await window.api.attendance.save({
        id: form.id || null,
        employee_id: Number(selectedEmp),
        date: modal.date,
        time_in: form.time_in,
        time_out: form.time_out,
        source: 'manual',
      });
      setModal(null);
      window.api.attendance.getByEmployee(Number(selectedEmp), month + 1, year).then(setRecords);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const deleteRecord = async () => {
    if (!form.id) return;
    await window.api.attendance.delete(form.id);
    setModal(null);
    window.api.attendance.getByEmployee(Number(selectedEmp), month + 1, year).then(setRecords);
  };

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  return (
    <div>
      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-80 shadow-2xl">
            <h3 className="text-white font-bold mb-4">
              {modal.date} — {employees.find(e => String(e.id) === selectedEmp)?.name}
            </h3>
            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-slate-300 text-xs font-medium block mb-1">Time In</label>
                <input type="time" value={form.time_in} onChange={(e) => setForm({ ...form, time_in: e.target.value })}
                  className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-slate-300 text-xs font-medium block mb-1">Time Out</label>
                <input type="time" value={form.time_out} onChange={(e) => setForm({ ...form, time_out: e.target.value })}
                  className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {form.id && (
                <button onClick={deleteRecord} className="px-3 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg text-xs font-medium transition-colors">
                  Delete
                </button>
              )}
              <button onClick={() => setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={saveModal} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Saving…' : modal.record ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div>
          <label className="text-slate-400 text-xs font-medium block mb-1">Employee</label>
          <select value={selectedEmp} onChange={(e) => setSelectedEmp(e.target.value)}
            className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
            {employees.map((e) => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-white font-semibold w-40 text-center">{MONTHS[month]} {year}</span>
          <button onClick={nextMonth} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {/* Calendar legend */}
      <div className="flex gap-4 text-xs text-slate-500 mb-4">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-900 inline-block"></span> Full shift</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-900 inline-block"></span> OT worked</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-900 inline-block"></span> Partial (&lt;8h)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-800 inline-block"></span> Absent</span>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map((d) => (
            <div key={d} className="text-center text-xs text-slate-500 font-medium py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: first }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: total }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const rec = recordMap[dateStr];
            const colorCls = dayColor(rec);
            const isToday = dateStr === todayStr();
            return (
              <button key={day} onClick={() => openDay(day)}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium transition-all hover:ring-2 hover:ring-blue-500 cursor-pointer ${colorCls} ${isToday ? 'ring-2 ring-blue-400' : ''}`}>
                <span className="font-semibold">{day}</span>
                {rec && <span className="text-[10px] opacity-75">{hoursWorked(rec.time_in, rec.time_out).toFixed(0)}h</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats for this month */}
      {records.length > 0 && (
        <div className="mt-4 flex gap-6">
          {(() => {
            let shifts = 0, otHrs = 0, partials = 0;
            records.forEach((r) => {
              const h = hoursWorked(r.time_in, r.time_out);
              if (h >= 8) shifts++;
              else if (h > 0) partials++;
              otHrs += Math.max(0, h - 8);
            });
            return (
              <>
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <p className="text-slate-400 text-xs">Days Present</p>
                  <p className="text-white font-bold">{records.length}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <p className="text-slate-400 text-xs">Full Shifts</p>
                  <p className="text-emerald-400 font-bold">{shifts}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <p className="text-slate-400 text-xs">OT Hours</p>
                  <p className="text-orange-400 font-bold">{otHrs.toFixed(1)}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3">
                  <p className="text-slate-400 text-xs">Partial Days</p>
                  <p className="text-yellow-400 font-bold">{partials}</p>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Attendance() {
  const [view, setView] = useState('bulk');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold">Attendance</h2>
          <p className="text-slate-400 text-sm mt-1">Track daily shifts and overtime</p>
        </div>
        <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
          <button onClick={() => setView('bulk')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'bulk' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            Daily Bulk Entry
          </button>
          <button onClick={() => setView('calendar')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            Individual / Calendar
          </button>
        </div>
      </div>

      {view === 'bulk' ? <BulkEntry /> : <CalendarView />}
    </div>
  );
}
