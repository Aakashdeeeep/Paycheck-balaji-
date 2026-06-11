# Payroll Manager — Desktop App

A fully offline desktop Payroll Management System built with Electron + React + SQLite.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop Shell | Electron 42 |
| Frontend | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Database | better-sqlite3 (SQLite) |
| Excel Export | SheetJS (xlsx) |
| Packaging | electron-builder |

---

## Quick Start (Development)

### Prerequisites
- Node.js 18+ (LTS recommended)
- npm 9+

### Install dependencies
```bash
npm install
```

### Run in development mode
```bash
npm run dev
```

This starts:
1. Vite dev server on `http://localhost:5173`
2. Electron app (loads from dev server, opens DevTools)

The database is auto-created and seeded with 3 sample employees (Ravi, Priya, Arjun) with 2 weeks of attendance and 1 advance each.

---

## Build Installer

### macOS (.dmg)
```bash
npm run build
```
Output: `dist/Payroll Manager-1.0.0.dmg`

### Windows (.exe NSIS installer)
```bash
npm run build
```
Output: `dist/Payroll Manager Setup 1.0.0.exe`

> On Mac, cross-compiling to Windows requires Wine. Build on Windows natively for best results.

---

## Folder Structure

```
/
├── main/
│   ├── main.js          ← Electron main process, window management
│   ├── preload.js       ← contextBridge IPC API (no raw ipcRenderer exposed)
│   ├── database.js      ← SQLite init, schema migrations, seeding
│   ├── store.js         ← Lightweight JSON store for window state
│   └── ipc/
│       ├── employees.js ← CRUD for employees
│       ├── attendance.js← Attendance save/query/bulk entry
│       ├── advances.js  ← Advance management
│       └── payroll.js   ← Payroll calculation, confirm, export data
│
├── renderer/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── index.css    ← Tailwind import + print styles
│       ├── App.jsx      ← Router, sidebar, PIN modal, view toggle
│       ├── utils/
│       │   ├── format.js   ← Currency, date, time, payroll helpers
│       │   └── excel.js    ← SheetJS export (single payslip + all staff)
│       └── pages/
│           ├── Dashboard.jsx
│           ├── Employees.jsx
│           ├── Attendance.jsx
│           ├── Advances.jsx
│           ├── Payroll.jsx
│           ├── PayslipView.jsx
│           ├── EmployeePortal.jsx
│           └── About.jsx
│
├── assets/
│   ├── icon.png
│   ├── icon.icns        ← macOS icon
│   └── icon.svg
└── README.md
```

---

## Database

The SQLite database is stored at:
- **macOS:** `~/Library/Application Support/payroll-manager/payroll.db`
- **Windows:** `%APPDATA%\payroll-manager\payroll.db`

It is **never deleted** on update or reinstall — your data persists.

### Schema

```sql
employees      (id, name, salary_per_shift, salary_type, created_at)
attendance     (id, employee_id, date, time_in, time_out, source, created_at)
advances       (id, employee_id, amount, note, date, is_deducted, created_at)
payroll_periods(id, employee_id, period_start, period_end, total_shifts,
                total_ot_hours, ot_rate, gross_pay, advance_deducted,
                previous_carry, carry_balance, net_pay, is_paid, generated_at)
```

---

## Payroll Calculation Logic

```
For each attendance record in the period:
  hours_worked = time_out - time_in (decimal hours)
  if hours_worked >= 8 → 1 full shift
  ot_hours = max(0, hours_worked - 8)

OT rate = floor(salary_per_shift / 8)   ← always floor

gross_pay = (total_shifts × salary_per_shift) + (total_ot_hours × ot_rate)

previous_carry = carry_balance from employee's last payroll period (0 if first)
total_advances = sum of all pending advances up to period_end

amount_due = gross_pay - total_advances + previous_carry

if amount_due >= 0: net_pay = amount_due, carry_balance = 0
if amount_due < 0:  net_pay = 0, carry_balance = amount_due (employee owes)
```

**Example:**
```
Ravi, salary = ₹750/shift
OT rate = floor(750/8) = ₹93/hr
6 shifts + 10 OT hrs
Gross = (6×750) + (10×93) = ₹4,500 + ₹930 = ₹5,430
Less advance: ₹500
NET = ₹4,930
```

---

## Views & Access Control

| View | PIN Required | Can Edit? |
|---|---|---|
| Company View | Yes — PIN: `1234` | Yes (full access) |
| Employee Portal | No | No (read-only) |

Change the PIN in `renderer/src/App.jsx` → `const COMPANY_PIN = '1234';`

---

## Future: Machine Attendance Integration

The system is future-ready for biometric/attendance machine integration:

- The `attendance` table has a `source` field: `"manual"` or `"machine"`
- IPC channel `attendance:sync-machine` is defined in `main/main.js`
- To integrate: implement the handler in `main/main.js` → `ipcMain.handle('attendance:sync-machine', ...)`
- Expected payload: `[{ employee_id, date, time_in, time_out, source: 'machine' }]`
- All payroll logic remains unchanged — only the data entry source changes

---

## Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Start dev mode (Vite + Electron) |
| `npm run build` | Build React → Package with electron-builder |
| `npm run build:renderer` | Build React only (no packaging) |
| `npm run pack` | Build but output unpacked app (no installer) |

---

## Edge Cases Handled

1. **Advance > salary** → `net_pay = ₹0`, negative carry to next period
2. **Duplicate attendance** → Error blocked, `UNIQUE(employee_id, date)` in DB
3. **Partial day (<8 hrs)** → 0 shifts, 0 OT — recorded for reference only
4. **No attendance in period** → `₹0` payslip can still be generated
5. **Advance double-count** → Advances marked `is_deducted=1` only on payslip confirm
6. **Paid payslip** → Cannot regenerate or delete if `is_paid = true`
7. **First payslip** → `previous_carry = ₹0` automatically
