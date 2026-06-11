import { _electron as electron } from 'playwright-core';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(__dirname, '..');
const SHOT_DIR = '/tmp/shots';
fs.mkdirSync(SHOT_DIR, { recursive: true });

const electronBin = path.join(
  APP_DIR,
  'node_modules/electron/dist/Electron.app/Contents/MacOS/Electron'
);

async function shot(page, name) {
  const f = path.join(SHOT_DIR, name + '.png');
  await page.screenshot({ path: f });
  console.log('screenshot:', f);
  return f;
}

async function clickNav(page, label) {
  await page.evaluate(text => {
    const els = [...document.querySelectorAll('a, button')];
    const el = els.find(e => e.textContent?.trim() === text)
            ?? els.find(e => e.textContent?.includes(text));
    el?.click();
  }, label);
  await page.waitForTimeout(800);
}

(async () => {
  console.log('Launching Payroll Manager...');
  const app = await electron.launch({
    executablePath: electronBin,
    args: [APP_DIR],
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 30_000,
  });

  console.log('Waiting for window...');
  await new Promise(r => setTimeout(r, 5000));

  const windows = app.windows();
  console.log('Windows:', windows.length);
  windows.forEach((w, i) => console.log(`  [${i}]`, w.url()));

  const page = windows.find(w => !w.url().startsWith('devtools://'))
           ?? await app.firstWindow();

  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await new Promise(r => setTimeout(r, 2000));

  // 1 — Dashboard
  await shot(page, '01-dashboard');
  console.log('Dashboard body text:', (await page.evaluate(() =>
    document.body?.innerText?.substring(0, 200)
  )));

  // 2 — Employees page
  await clickNav(page, 'Employees');
  await shot(page, '02-employees');

  // 3 — Attendance page
  await clickNav(page, 'Attendance');
  await shot(page, '03-attendance');

  // 4 — Advances
  await clickNav(page, 'Advances');
  await shot(page, '04-advances');

  // 5 — Payroll
  await clickNav(page, 'Payroll');
  await shot(page, '05-payroll');

  // 6 — Employee Portal
  await clickNav(page, 'Employee Portal');
  await shot(page, '06-portal');

  // Back to Dashboard, click Preview Payslip
  await clickNav(page, 'Dashboard');
  await page.waitForTimeout(500);
  await shot(page, '07-dashboard-refresh');

  console.log('\nAll screenshots saved to /tmp/shots/');
  await app.close();
  process.exit(0);
})().catch(err => {
  console.error('FATAL:', err.message);
  process.exit(1);
});
