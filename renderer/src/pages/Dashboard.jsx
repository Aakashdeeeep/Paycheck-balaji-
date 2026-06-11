import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, todayStr } from '../utils/format';

function StatCard({ title, value, sub, color, icon }) {
  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-slate-500 text-xs mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color === 'text-blue-400' ? 'bg-blue-900/50' : color === 'text-emerald-400' ? 'bg-emerald-900/50' : color === 'text-amber-400' ? 'bg-amber-900/50' : 'bg-red-900/50'}`}>
          <svg className={`w-5 h-5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const data = await window.api.payroll.getDashboardStats();
      setStats(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-slate-400 text-sm">Loading...</div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-white text-2xl font-bold">Dashboard</h2>
        <p className="text-slate-400 text-sm mt-1">{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Employees"
          value={stats.totalEmployees}
          color="text-blue-400"
          icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <StatCard
          title="Est. Payroll This Period"
          value={formatCurrency(stats.totalPayroll)}
          sub="Based on current attendance"
          color="text-emerald-400"
          icon="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
        <StatCard
          title="Unpaid Advances"
          value={formatCurrency(stats.unpaidAdvances)}
          sub="Total outstanding"
          color="text-amber-400"
          icon="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        />
        <StatCard
          title="Pending Payslips"
          value={stats.pendingPayslips}
          sub="Unpaid payslips"
          color="text-red-400"
          icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <button onClick={() => navigate('/attendance')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Attendance
        </button>
        <button onClick={() => navigate('/advances')}
          className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Give Advance
        </button>
        <button onClick={() => navigate('/payroll')}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Generate Payslip
        </button>
        <button onClick={load}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Employee table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">Employee Overview — This Period</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Employee</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Salary/Shift</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Type</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">Shifts</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">OT Hrs</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">Est. Pay</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">Advances</th>
                <th className="text-right px-5 py-3 text-slate-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(stats.employeeStats || []).map((emp) => (
                <tr key={emp.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-5 py-3 text-white font-medium">{emp.name}</td>
                  <td className="px-5 py-3 text-slate-300">{formatCurrency(emp.salary_per_shift)}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${emp.salary_type === 'weekly' ? 'bg-blue-900/50 text-blue-400' : 'bg-purple-900/50 text-purple-400'}`}>
                      {emp.salary_type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-slate-300">{emp.shifts}</td>
                  <td className="px-5 py-3 text-right text-slate-300">{emp.ot_hours}</td>
                  <td className="px-5 py-3 text-right text-emerald-400 font-semibold">{formatCurrency(emp.estimated_pay)}</td>
                  <td className="px-5 py-3 text-right">
                    {emp.pending_advances > 0
                      ? <span className="text-amber-400">{formatCurrency(emp.pending_advances)}</span>
                      : <span className="text-slate-500">—</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button onClick={() => navigate('/payroll', { state: { employeeId: emp.id } })}
                      className="text-blue-400 hover:text-blue-300 text-xs font-medium transition-colors">
                      Payslip →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
