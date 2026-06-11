const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const Store = require('./store');

if (require('electron-squirrel-startup')) app.quit();

let store;
let mainWindow;

function createWindow() {
  const bounds = store.get('windowBounds', { width: 1280, height: 800, x: undefined, y: undefined });

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    x: bounds.x,
    y: bounds.y,
    minWidth: 1024,
    minHeight: 700,
    title: 'Payroll Manager',
    icon: path.join(__dirname, '..', 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    backgroundColor: '#0f172a',
    show: false,
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:4821');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('close', () => {
    const b = mainWindow.getBounds();
    store.set('windowBounds', b);
  });
}

app.whenReady().then(() => {
  store = new Store();

  const { initDatabase } = require('./database');
  initDatabase();

  require('./ipc/employees');
  require('./ipc/attendance');
  require('./ipc/advances');
  require('./ipc/payroll');

  ipcMain.handle('dialog:showSaveDialog', async (_, options) => {
    return dialog.showSaveDialog(mainWindow, options);
  });

  ipcMain.handle('shell:openExternal', async (_, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('attendance:sync-machine', async () => {
    // Future hook: machine attendance sync endpoint
    // When a biometric/attendance machine is integrated, implement here.
    // Expected payload: [{ employee_id, date, time_in, time_out, source: 'machine' }]
    return { status: 'not_implemented', message: 'Machine sync not configured' };
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
