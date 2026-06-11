import React, { useState, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Advances from './pages/Advances';
import Payroll from './pages/Payroll';
import PayslipView from './pages/PayslipView';
import EmployeePortal from './pages/EmployeePortal';
import About from './pages/About';

export const AppContext = createContext({ isCompanyView: true });
export const useApp = () => useContext(AppContext);

const COMPANY_PIN = '1234';

function PinModal({ onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (pin === COMPANY_PIN) { onSuccess(); }
    else { setError('Incorrect PIN'); setPin(''); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl p-8 w-80 shadow-2xl border border-slate-700">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-white font-bold text-xl">Company Access</h2>
          <p className="text-slate-400 text-sm mt-1">Enter PIN to switch to Company View</p>
        </div>
        <form onSubmit={submit}>
          <input
            type="password"
            maxLength={4}
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            className="w-full bg-slate-900 text-white text-center text-2xl tracking-widest rounded-lg px-4 py-3 border border-slate-600 focus:border-blue-500 focus:outline-none mb-3"
            placeholder="••••"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm text-center mb-3">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onCancel}
              className="flex-1 bg-slate-700 text-white py-2 rounded-lg hover:bg-slate-600 transition-colors">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-500 transition-colors font-semibold">
              Unlock
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', company: true },
  { to: '/employees', label: 'Employees', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', company: true },
  { to: '/attendance', label: 'Attendance', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', company: true },
  { to: '/advances', label: 'Advances', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z', company: true },
  { to: '/payroll', label: 'Payroll', icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z', company: true },
  { to: '/portal', label: 'Employee Portal', icon: 'M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zM21 12a9 9 0 11-18 0 9 9 0 0118 0z', company: false },
];

function Layout({ isCompanyView, setIsCompanyView }) {
  const [showPin, setShowPin] = useState(false);

  const handleViewToggle = () => {
    if (!isCompanyView) {
      setShowPin(true);
    } else {
      setIsCompanyView(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      {showPin && (
        <PinModal
          onSuccess={() => { setIsCompanyView(true); setShowPin(false); }}
          onCancel={() => setShowPin(false)}
        />
      )}

      {/* Sidebar */}
      <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shrink-0">₹</div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">Payroll Manager</h1>
              <p className="text-slate-500 text-xs">My Business</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
          {NAV.filter(n => isCompanyView ? true : !n.company).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`
              }
            >
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-2">
          <button
            onClick={handleViewToggle}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
              isCompanyView
                ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={isCompanyView ? 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' : 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'}
              />
            </svg>
            {isCompanyView ? 'Company View' : 'Switch to Company'}
          </button>

          <NavLink to="/about"
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-colors ${isActive ? 'text-slate-300' : ''}`
            }>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            About
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-950 scrollbar-thin">
        <AppContext.Provider value={{ isCompanyView }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/advances" element={<Advances />} />
            <Route path="/payroll" element={<Payroll />} />
            <Route path="/payslip/:id" element={<PayslipView />} />
            <Route path="/portal" element={<EmployeePortal />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </AppContext.Provider>
      </main>
    </div>
  );
}

export default function App() {
  const [isCompanyView, setIsCompanyView] = useState(true);
  return (
    <HashRouter>
      <Layout isCompanyView={isCompanyView} setIsCompanyView={setIsCompanyView} />
    </HashRouter>
  );
}
