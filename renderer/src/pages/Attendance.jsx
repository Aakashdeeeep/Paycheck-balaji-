import React, { useEffect, useRef, useState } from 'react';
import { hoursWorked, todayStr } from '../utils/format';

// ── helpers ────────────────────────────────────────────────────────────────

function hrsToShifts(h) { return h >= 8 ? 1 : 0; }
function hrsToOt(h) { return h >= 8 ? Math.max(0, h - 8) : h; }

function dayColor(record) {
  if (!record) return 'bg-slate-800 text-slate-600';
  if (record.source === 'leave') return 'bg-violet-900/70 text-violet-300';
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

// ── TimeInput ─────────────────────────────────────────────────────────────
// Split hour / minute fields so backspace works naturally.
// Stores/emits 24-hr "HH:MM" (DB format). Displays 12-hr to the user.

function to24(h12, mins, ampm) {
  let h = parseInt(h12, 10);
  const m = parseInt(mins, 10);
  if (isNaN(h) || isNaN(m)) return '';
  if (ampm === 'AM') { if (h === 12) h = 0; }
  else               { if (h !== 12) h += 12; }
  if (h > 23 || m > 59) return '';
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function from24(val24) {
  if (!val24) return { h: '', m: '', ampm: 'AM' };
  const [h24, m24] = val24.split(':').map(Number);
  if (isNaN(h24)) return { h: '', m: '', ampm: 'AM' };
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return { h: String(h12), m: String(m24).padStart(2, '0'), ampm };
}

function TimeInput({ value, onChange, className = '' }) {
  const init = from24(value);
  const [h, setH] = useState(init.h);
  const [m, setM] = useState(init.m);
  const [ampm, setAmpm] = useState(init.ampm);
  const prevValue = useRef(value);
  const minRef = useRef(null);

  // Sync if parent changes the value externally
  useEffect(() => {
    if (value !== prevValue.current) {
      const p = from24(value);
      setH(p.h); setM(p.m); setAmpm(p.ampm);
      prevValue.current = value;
    }
  }, [value]);

  const emit = (hv, mv, ap) => {
    const v = to24(hv, mv, ap);
    if (v) { prevValue.current = v; onChange(v); }
  };

  // Hour field
  const onHourChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (raw === '') { setH(''); return; }
    const n = parseInt(raw, 10);
    if (n > 12) return; // block >12
    setH(raw);
    emit(raw, m, ampm);
    // auto-jump to minutes: single digit 2-9 can't go higher, or two digits entered
    if (raw.length === 2 || n >= 2) minRef.current?.select();
  };

  const onHourKey = (e) => {
    if (e.key === 'ArrowUp')   { const n = Math.min(12, (parseInt(h,10)||0)+1); setH(String(n)); emit(String(n), m, ampm); e.preventDefault(); }
    if (e.key === 'ArrowDown') { const n = Math.max(1,  (parseInt(h,10)||13)-1); setH(String(n)); emit(String(n), m, ampm); e.preventDefault(); }
  };

  // Minute field
  const onMinChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
    if (raw === '') { setM(''); return; }
    const n = parseInt(raw, 10);
    if (n > 59) return;
    setM(raw);
    emit(h, raw, ampm);
  };

  const onMinBlur = () => {
    if (m === '' || m === undefined) return;
    const padded = String(parseInt(m, 10) || 0).padStart(2, '0');
    setM(padded);
    emit(h, padded, ampm);
  };

  const onMinKey = (e) => {
    if (e.key === 'ArrowUp')   { const n = Math.min(59, (parseInt(m,10)||0)+1); const s = String(n).padStart(2,'0'); setM(s); emit(h, s, ampm); e.preventDefault(); }
    if (e.key === 'ArrowDown') { const n = Math.max(0,  (parseInt(m,10)||0)-1); const s = String(n).padStart(2,'0'); setM(s); emit(h, s, ampm); e.preventDefault(); }
  };

  const toggleAmpm = (ap) => { setAmpm(ap); emit(h, m, ap); };

  return (
    <div className={`inline-flex items-center ${className}`}>
      <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg overflow-hidden focus-within:border-blue-500 transition-colors">
        {/* Hour */}
        <input
          type="text" inputMode="numeric"
          value={h} onChange={onHourChange} onKeyDown={onHourKey}
          maxLength={2}
          className="bg-transparent text-white text-center py-1.5 text-sm focus:outline-none w-8 font-mono"
        />
        <span className="text-slate-500 select-none text-sm">:</span>
        {/* Minute */}
        <input
          ref={minRef}
          type="text" inputMode="numeric"
          value={m} onChange={onMinChange} onKeyDown={onMinKey} onBlur={onMinBlur}
          maxLength={2}
          className="bg-transparent text-white text-center py-1.5 text-sm focus:outline-none w-9 font-mono"
        />
        {/* AM / PM toggle */}
        <div className="flex border-l border-slate-700 ml-0.5">
          <button type="button" onClick={() => toggleAmpm('AM')}
            className={`px-2 py-1.5 text-xs font-bold transition-colors ${ampm === 'AM' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
            AM
          </button>
          <button type="button" onClick={() => toggleAmpm('PM')}
            className={`px-2 py-1.5 text-xs font-bold border-l border-slate-700 transition-colors ${ampm === 'PM' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
            PM
          </button>
        </div>
      </div>
    </div>
  );
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
        leave: false,
      };
    }));
  };

  useEffect(() => { loadDate(date); }, []);

  const update = (i, field, val) => {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  };

  const toggleLeave = (i) => {
    setRows((prev) => prev.map((r, idx) =>
      idx === i ? { ...r, leave: !r.leave, time_in: !r.leave ? '' : r.time_in, time_out: !r.leave ? '' : r.time_out } : r
    ));
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const records = rows
        .filter((r) => r.time_in && r.time_out && hoursWorked(r.time_in, r.time_out) > 0)
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
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const hrs = hoursWorked(row.time_in, row.time_out);
              const invalid = !row.leave && row.time_in && row.time_out && hrs <= 0;
              const shifts = !invalid ? hrsToShifts(hrs) : 0;
              const ot = !invalid ? hrsToOt(hrs) : 0;
              return (
                <tr key={row.employee_id} className={`border-b border-slate-800/50 ${row.leave ? 'bg-slate-800/40' : invalid ? 'bg-red-950/30' : ''}`}>
                  <td className="px-5 py-3">
                    <span className={`font-medium ${row.leave ? 'text-slate-500' : 'text-white'}`}>{row.name}</span>
                    {row.existing_id && !row.leave && <span className="ml-2 text-xs text-blue-400">(editing)</span>}
                  </td>
                  <td className="px-5 py-3">
                    {row.leave
                      ? <span className="text-slate-600 text-xs italic">—</span>
                      : <TimeInput value={row.time_in} onChange={(v) => update(i, 'time_in', v)} />}
                  </td>
                  <td className="px-5 py-3">
                    {row.leave
                      ? <span className="text-slate-600 text-xs italic">—</span>
                      : <TimeInput value={row.time_out} onChange={(v) => update(i, 'time_out', v)} />}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {row.leave
                      ? <span className="text-slate-500 text-xs">Leave</span>
                      : invalid
                        ? <span className="text-red-400 text-xs font-semibold">Check AM/PM</span>
                        : row.time_in && row.time_out
                          ? <span className={hrs >= 8 ? 'text-emerald-400' : 'text-yellow-400'}>{hrs.toFixed(1)}</span>
                          : <span className="text-slate-600">—</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">{!row.leave && row.time_in && row.time_out && !invalid ? shifts : '—'}</td>
                  <td className="px-5 py-3 text-right">
                    {!row.leave && row.time_in && row.time_out && !invalid && ot > 0
                      ? <span className="text-orange-400">{ot.toFixed(1)}</span>
                      : <span className="text-slate-600">{!row.leave && row.time_in && row.time_out && !invalid ? '0' : '—'}</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => toggleLeave(i)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                        row.leave
                          ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                          : 'bg-amber-900/50 hover:bg-amber-900 text-amber-400 border border-amber-800/50'
                      }`}>
                      {row.leave ? 'Undo' : 'Leave'}
                    </button>
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
  const [paidPeriods, setPaidPeriods] = useState([]);
  const [modal, setModal] = useState(null);
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
    window.api.payroll.getByEmployee(Number(selectedEmp)).then((periods) => {
      setPaidPeriods(periods.filter((p) => p.is_paid));
    });
  }, [selectedEmp, month, year]);

  // Check if a date falls inside any paid payroll period
  const isPaidDate = (dateStr) => {
    return paidPeriods.some((p) => dateStr >= p.period_start && dateStr <= p.period_end);
  };

  // Which paid period covers this date (for tooltip info)
  const getPaidPeriod = (dateStr) => {
    return paidPeriods.find((p) => dateStr >= p.period_start && dateStr <= p.period_end);
  };

  const recordMap = Object.fromEntries(records.map((r) => [r.date, r]));
  const { first, total } = monthDays(year, month);

  const openDay = (day) => {
    const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const rec = recordMap[d];
    const isLeave = rec?.source === 'leave';
    setModal({ date: d, record: rec, paidPeriod: getPaidPeriod(d), isLeave });
    setForm({
      time_in: (!rec || isLeave) ? '09:00' : rec.time_in,
      time_out: (!rec || isLeave) ? '18:00' : rec.time_out,
      id: rec ? rec.id : null,
    });
    setError('');
  };

  const saveLeave = async () => {
    setSaving(true);
    setError('');
    try {
      await window.api.attendance.save({
        id: form.id || null,
        employee_id: Number(selectedEmp),
        date: modal.date,
        time_in: '00:00',
        time_out: '00:00',
        source: 'leave',
      });
      setModal(null);
      window.api.attendance.getByEmployee(Number(selectedEmp), month + 1, year).then(setRecords);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const removeLeave = async () => {
    if (form.id) await window.api.attendance.delete(form.id);
    setModal(null);
    window.api.attendance.getByEmployee(Number(selectedEmp), month + 1, year).then(setRecords);
  };

  const saveModal = async () => {
    if (!form.time_in || !form.time_out) return setError('Both time fields are required');
    if (hoursWorked(form.time_in, form.time_out) <= 0) return setError('Time out must be after time in — check AM/PM');
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
            <h3 className="text-white font-bold mb-1">
              {new Date(modal.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
            </h3>
            <p className="text-slate-400 text-xs mb-4">{employees.find(e => String(e.id) === selectedEmp)?.name}</p>

            {modal.paidPeriod && (
              <div className="mb-4 px-3 py-2 bg-emerald-900/40 border border-emerald-700/50 rounded-lg flex items-center gap-2">
                <span className="text-emerald-400 text-sm">✓</span>
                <div>
                  <p className="text-emerald-300 text-xs font-semibold">Payslip Paid</p>
                  <p className="text-emerald-600 text-xs">Period covered by a paid payslip</p>
                </div>
              </div>
            )}

            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-3 py-2 rounded-lg mb-3">{error}</div>}

            {modal.isLeave ? (
              <div className="mb-2">
                <div className="flex items-center gap-2 px-3 py-3 bg-violet-900/40 border border-violet-700/50 rounded-lg mb-4">
                  <span className="text-violet-300 text-base">🏖</span>
                  <div>
                    <p className="text-violet-200 text-sm font-semibold">Marked as Leave</p>
                    <p className="text-violet-500 text-xs">This day is recorded as leave</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                    Close
                  </button>
                  <button onClick={removeLeave} className="flex-1 bg-red-900/60 hover:bg-red-900 text-red-300 py-2 rounded-lg text-sm font-medium transition-colors">
                    Remove Leave
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-300 text-xs font-medium block mb-1.5">Time In</label>
                    <TimeInput value={form.time_in} onChange={(v) => setForm({ ...form, time_in: v })} />
                  </div>
                  <div>
                    <label className="text-slate-300 text-xs font-medium block mb-1.5">Time Out</label>
                    <TimeInput value={form.time_out} onChange={(v) => setForm({ ...form, time_out: v })} />
                  </div>
                  {form.time_in && form.time_out && (() => {
                    const h = hoursWorked(form.time_in, form.time_out);
                    if (h <= 0) return (
                      <div className="text-xs text-red-400 bg-red-950/40 border border-red-800/50 rounded px-2 py-1.5">
                        Time out is before time in — check AM/PM
                      </div>
                    );
                    return (
                      <div className="flex gap-3 text-xs text-slate-400 px-1">
                        <span>Hours: <span className="text-white font-medium">{h.toFixed(1)}</span></span>
                        <span>Shifts: <span className="text-emerald-400 font-medium">{hrsToShifts(h)}</span></span>
                        <span>OT: <span className="text-orange-400 font-medium">{hrsToOt(h).toFixed(1)}h</span></span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex gap-2 mt-4">
                  {form.id && (
                    <button onClick={deleteRecord} className="px-3 py-2 bg-red-900/50 hover:bg-red-900 text-red-400 rounded-lg text-xs font-medium transition-colors">
                      Delete
                    </button>
                  )}
                  <button onClick={saveLeave} disabled={saving}
                    className="px-3 py-2 bg-violet-900/50 hover:bg-violet-900 text-violet-300 border border-violet-800/50 rounded-lg text-xs font-medium transition-colors">
                    Leave
                  </button>
                  <button onClick={() => setModal(null)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                    Cancel
                  </button>
                  <button onClick={saveModal} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                    {saving ? 'Saving…' : modal.record ? 'Update' : 'Save'}
                  </button>
                </div>
              </>
            )}
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

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-4">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-900 inline-block"></span> Full shift</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-orange-900 inline-block"></span> OT worked</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-yellow-900 inline-block"></span> Partial (&lt;8h)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-violet-900/70 inline-block"></span> Leave</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-slate-800 inline-block"></span> Absent</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-slate-800 inline-block ring-1 ring-emerald-500"></span> Payslip paid
        </span>
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
            const paid = isPaidDate(dateStr);

            return (
              <button key={day} onClick={() => openDay(day)}
                className={`
                  aspect-square flex flex-col items-center justify-center rounded-lg text-xs font-medium
                  transition-all hover:ring-2 hover:ring-blue-500 cursor-pointer relative
                  ${colorCls}
                  ${isToday ? 'ring-2 ring-blue-400' : ''}
                  ${paid && !isToday ? 'ring-1 ring-emerald-500' : ''}
                `}>
                <span className="font-semibold">{day}</span>
                {rec && (rec.source === 'leave'
                  ? <span className="text-[9px] font-bold opacity-90">Leave</span>
                  : <span className="text-[9px] opacity-75">{hoursWorked(rec.time_in, rec.time_out).toFixed(0)}h</span>
                )}
                {paid && (
                  <span className="absolute bottom-0.5 right-0.5 text-emerald-400 text-[8px] leading-none font-bold">₹</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      {records.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {(() => {
            let shifts = 0, otHrs = 0, partials = 0;
            records.forEach((r) => {
              const h = hoursWorked(r.time_in, r.time_out);
              if (h >= 8) shifts++;
              else if (h > 0) partials++;
              otHrs += hrsToOt(h);
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
  const [view, setView] = useState('calendar');

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold">Attendance</h2>
          <p className="text-slate-400 text-sm mt-1">Track daily shifts and overtime</p>
        </div>
        <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
          <button onClick={() => setView('calendar')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'calendar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            Calendar
          </button>
          <button onClick={() => setView('bulk')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'bulk' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}>
            Daily Entry
          </button>
        </div>
      </div>

      {view === 'calendar' ? <CalendarView /> : <BulkEntry />}
    </div>
  );
}
