import React, { useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '../utils/format';

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

function EmployeeForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || { name: '', salary_per_shift: '', salary_type: 'weekly' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Name is required');
    const salary = Number(form.salary_per_shift);
    if (!salary || salary <= 0) return setError('Enter a valid salary');
    setError('');
    try {
      await onSave({ ...form, salary_per_shift: salary });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && <div className="bg-red-900/50 border border-red-700 text-red-300 text-sm px-3 py-2 rounded-lg">{error}</div>}
      <div>
        <label className="text-slate-300 text-sm font-medium block mb-1">Employee Name</label>
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none text-sm"
          placeholder="e.g. Ravi Kumar" autoFocus />
      </div>
      <div>
        <label className="text-slate-300 text-sm font-medium block mb-1">Salary Per Shift (₹)</label>
        <input type="number" value={form.salary_per_shift} onChange={(e) => setForm({ ...form, salary_per_shift: e.target.value })}
          className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none text-sm"
          placeholder="e.g. 750" min="1" />
      </div>
      <div>
        <label className="text-slate-300 text-sm font-medium block mb-1">Salary Type</label>
        <select value={form.salary_type} onChange={(e) => setForm({ ...form, salary_type: e.target.value })}
          className="w-full bg-slate-900 text-white border border-slate-600 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none text-sm">
          <option value="weekly">Weekly (Mon–Sun)</option>
          <option value="monthly">Monthly (1st–Last)</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose}
          className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
          Cancel
        </button>
        <button type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
          {initial ? 'Save Changes' : 'Add Employee'}
        </button>
      </div>
    </form>
  );
}

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [summaries, setSummaries] = useState({});

  const load = async () => {
    setLoading(true);
    const emps = await window.api.employees.getAll();
    setEmployees(emps);
    const sums = {};
    for (const e of emps) {
      sums[e.id] = await window.api.employees.getSummary(e.id);
    }
    setSummaries(sums);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (data) => {
    await window.api.employees.create(data);
    setShowAdd(false);
    load();
  };

  const handleEdit = async (data) => {
    await window.api.employees.update(editing.id, data);
    setEditing(null);
    load();
  };

  const handleDelete = async () => {
    await window.api.employees.delete(deleting.id);
    setDeleting(null);
    load();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  );

  return (
    <div className="p-6">
      {showAdd && (
        <Modal title="Add Employee" onClose={() => setShowAdd(false)}>
          <EmployeeForm onSave={handleAdd} onClose={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit Employee" onClose={() => setEditing(null)}>
          <EmployeeForm initial={editing} onSave={handleEdit} onClose={() => setEditing(null)} />
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete Employee" onClose={() => setDeleting(null)}>
          <p className="text-slate-300 text-sm mb-6">
            Are you sure you want to delete <strong className="text-white">{deleting.name}</strong>?
            This will also delete all their attendance, advances, and payslips.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleting(null)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors">
              Cancel
            </button>
            <button onClick={handleDelete}
              className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
              Delete
            </button>
          </div>
        </Modal>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-white text-2xl font-bold">Employees</h2>
          <p className="text-slate-400 text-sm mt-1">{employees.length} employee{employees.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </button>
      </div>

      <div className="grid gap-4">
        {employees.map((emp) => {
          const s = summaries[emp.id] || {};
          return (
            <div key={emp.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-900/50 border border-blue-800 rounded-xl flex items-center justify-center text-blue-400 font-bold text-lg">
                    {emp.name[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{emp.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-emerald-400 font-semibold">{formatCurrency(emp.salary_per_shift)}/shift</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${emp.salary_type === 'weekly' ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400'}`}>
                        {emp.salary_type}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditing(emp)}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => setDeleting(emp)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex gap-6 mt-4 pt-4 border-t border-slate-800">
                <div>
                  <p className="text-slate-500 text-xs">OT Rate</p>
                  <p className="text-slate-300 text-sm font-medium">{formatCurrency(Math.floor(emp.salary_per_shift / 8))}/hr</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Pending Advances</p>
                  <p className={`text-sm font-medium ${s.pending_advances > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {formatCurrency(s.pending_advances || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Last Payslip</p>
                  <p className="text-slate-300 text-sm font-medium">
                    {s.last_payslip ? formatDate(s.last_payslip.period_end) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Member Since</p>
                  <p className="text-slate-300 text-sm font-medium">{formatDate(emp.created_at.split(' ')[0])}</p>
                </div>
              </div>
            </div>
          );
        })}

        {employees.length === 0 && (
          <div className="text-center py-16">
            <div className="text-slate-600 text-sm">No employees yet</div>
            <button onClick={() => setShowAdd(true)} className="mt-3 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
              Add your first employee →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
