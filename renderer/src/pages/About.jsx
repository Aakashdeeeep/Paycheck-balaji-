import React, { useEffect, useState } from 'react';

export default function About() {
  const [version, setVersion] = useState('');
  useEffect(() => { window.api.app.getVersion().then(setVersion); }, []);

  return (
    <div className="p-6 flex items-start justify-center min-h-full">
      <div className="max-w-md w-full">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5 text-white font-black text-3xl shadow-lg">
            ₹
          </div>
          <h1 className="text-white text-2xl font-black">Payroll Manager</h1>
          <p className="text-slate-400 text-sm mt-1">Version {version || '1.0.0'}</p>
          <p className="text-slate-500 text-sm mt-4 leading-relaxed">
            Built for <span className="text-white font-semibold">My Business</span>
          </p>

          <div className="mt-6 pt-6 border-t border-slate-800 space-y-3 text-left">
            {[
              ['Employee Management', 'Add, edit, and track staff'],
              ['Attendance Tracking', 'Daily bulk entry & calendar view'],
              ['Advance Management', 'Record and track salary advances'],
              ['Payroll Calculation', 'Shifts, OT, deductions, carry balance'],
              ['Excel Export', 'SheetJS-powered payslip export'],
              ['Fully Offline', 'No internet required — all data stored locally'],
            ].map(([title, desc]) => (
              <div key={title} className="flex items-start gap-3">
                <div className="w-5 h-5 bg-emerald-900/50 rounded flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{title}</p>
                  <p className="text-slate-500 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-slate-600 text-xs">
              Payroll data stored at your local AppData directory.<br />
              All calculations are done offline on your device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
