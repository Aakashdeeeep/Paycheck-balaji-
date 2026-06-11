import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate, todayStr } from '../utils/format';

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-white font-bold text-lg">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Advances() {
  const [employees, setEmployees] = useState([]);
  const [selected, setSelected] = useState('all');
  const [advances, setAdvances] = useState([]);
  const [showDeducted, setShowDeducted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ employee_id: '', amount: '', note: '', date: todayStr() });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const emps = await window.api.employees.getAll();
    setEmployees(emps);
    if (emps.length > 0 && !form.employee_id) setForm((f) => ({ ...f, employee_id: String(emps[0].id) }));

    const all = [];
    for (const emp of emps) {
      const rows = await window.api.advances.getByEmployee(emp.id);
      rows.forEach((r) => all.push({ ...r, employee_name: emp.name }));
    }
    all.sort((a, b) => new Date(b.date) - new Date(a.date));
    setAdvances(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = advances
    .filter((a) => selected === 'all' || String(a.employee_id) === selected)
    .filter((a) => showDeducted || !a.is_deducted || (a.remaining_balance ?? a.amount) > 0);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.employee_id) return setError('Select an employee');
    const amt = Number(form.amount);
    if (!amt || amt <= 0) return setError('Enter a valid amount');
    if (!form.date) return setError('Date is required');
    setSaving(true);
    setError('');
    try {
      await window.api.advances.create({ employee_id: Number(form.employee_id), amount: amt, note: form.note, date: form.date });
      setShowAdd(false);
      setForm({ employee_id: String(employees[0]?.id || ''), amount: '', note: '', date: todayStr() });
      load();
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  const handleDelete = async (adv) => {
    if (!window.confirm(`Delete ₹${adv.amount} advance for ${adv.employee_name}?`)) return;
    try {
      await window.api.advances.delete(adv.id);
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  const totals = {};
  advances.forEach((a) => {
    const rem = a.remaining_balance ?? a.amount;
    if (rem > 0) totals[a.employee_id] = (totals[a.employee_id] || 0) + rem;
  });

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-slate-400 text-sm">Loading...</div></div>;

  return (
    <div className="p-6">
      {showAdd && (
        <Modal title="Record Advance" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleAdd} className="space-y-4">
            {error && <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-3 py-2 rounded-lg">{error}</div>}
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Employee</label>
              <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none text-sm">
                {employees.map((e) => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Amount (₹)</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="e.g. 500" min="1" autoFocus />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Date</label>
              <input type="date" value={form.date} max={todayStr()} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none text-sm" />
            </div>
            <div>
              <label className="text-slate-300 text-sm font-medium block mb-1">Note (optional)</label>
              <input type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none text-sm"
                placeholder="e.g. Medical emergency" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowAdd(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                {saving ? 'Saving…' : 'Record Advance'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold">Advances</h2>
          <p className="text-slate-400 text-sm mt-1">Track salary advances and deductions</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Give Advance
        </button>
      </div>

      {/* Outstanding cards */}
      {Object.keys(totals).length > 0 && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {employees.filter((e) => totals[e.id]).map((emp) => (
            <div key={emp.id} className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-4">
              <p className="text-amber-300 text-xs font-medium">{emp.name}</p>
              <p className="text-amber-400 font-bold text-lg mt-1">{formatCurrency(totals[emp.id])}</p>
              <p className="text-amber-600 text-xs">outstanding</p>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <select value={selected} onChange={(e) => setSelected(e.target.value)}
          className="bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
          <option value="all">All Employees</option>
          {employees.map((e) => <option key={e.id} value={String(e.id)}>{e.name}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showDeducted}
            onChange={(e) => setShowDeducted(e.target.checked)}
            className="accent-slate-400"
          />
          <span className="text-slate-400 text-sm">Show fully deducted</span>
        </label>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Employee</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Date</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Original</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Remaining</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Note</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Status</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((adv) => {
              const remaining = adv.remaining_balance ?? adv.amount;
              const isPartial = remaining > 0 && remaining < adv.amount;
              return (
              <tr key={adv.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                <td className="px-5 py-3 text-white font-medium">{adv.employee_name}</td>
                <td className="px-5 py-3 text-slate-300">{formatDate(adv.date)}</td>
                <td className="px-5 py-3 text-right text-slate-400 font-medium">{formatCurrency(adv.amount)}</td>
                <td className="px-5 py-3 text-right font-semibold">
                  <span className={remaining > 0 ? 'text-amber-400' : 'text-slate-600'}>{formatCurrency(remaining)}</span>
                </td>
                <td className="px-5 py-3 text-slate-400 italic">{adv.note || '—'}</td>
                <td className="px-5 py-3">
                  {adv.is_deducted && remaining === 0 ? (
                    <span className="px-2 py-0.5 bg-emerald-900/50 text-emerald-400 rounded text-xs font-medium">Cleared</span>
                  ) : isPartial ? (
                    <span className="px-2 py-0.5 bg-blue-900/50 text-blue-400 rounded text-xs font-medium">Partial</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-900/50 text-amber-400 rounded text-xs font-medium">Pending</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  {remaining > 0 && (
                    <button onClick={() => handleDelete(adv)}
                      className="text-red-400 hover:text-red-300 text-xs font-medium transition-colors">
                      Delete
                    </button>
                  )}
                </td>
              </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-slate-600">No advances recorded</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
