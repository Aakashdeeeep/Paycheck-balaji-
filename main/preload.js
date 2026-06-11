const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Employees
  employees: {
    getAll: () => ipcRenderer.invoke('employees:getAll'),
    getById: (id) => ipcRenderer.invoke('employees:getById', id),
    create: (data) => ipcRenderer.invoke('employees:create', data),
    update: (id, data) => ipcRenderer.invoke('employees:update', id, data),
    delete: (id) => ipcRenderer.invoke('employees:delete', id),
    getSummary: (id) => ipcRenderer.invoke('employees:getSummary', id),
  },

  // Attendance
  attendance: {
    getByEmployee: (employeeId, month, year) =>
      ipcRenderer.invoke('attendance:getByEmployee', employeeId, month, year),
    getByDate: (date) => ipcRenderer.invoke('attendance:getByDate', date),
    getByRange: (employeeId, start, end) =>
      ipcRenderer.invoke('attendance:getByRange', employeeId, start, end),
    saveBulk: (records) => ipcRenderer.invoke('attendance:saveBulk', records),
    save: (record) => ipcRenderer.invoke('attendance:save', record),
    update: (id, data) => ipcRenderer.invoke('attendance:update', id, data),
    delete: (id) => ipcRenderer.invoke('attendance:delete', id),
    syncMachine: () => ipcRenderer.invoke('attendance:sync-machine'),
  },

  // Advances
  advances: {
    getByEmployee: (employeeId) => ipcRenderer.invoke('advances:getByEmployee', employeeId),
    getPending: (employeeId) => ipcRenderer.invoke('advances:getPending', employeeId),
    create: (data) => ipcRenderer.invoke('advances:create', data),
    delete: (id) => ipcRenderer.invoke('advances:delete', id),
    getTotalOutstanding: () => ipcRenderer.invoke('advances:getTotalOutstanding'),
    getOutstandingByEmployee: (employeeId) => ipcRenderer.invoke('advances:getOutstandingByEmployee', employeeId),
  },

  // Payroll
  payroll: {
    preview: (employeeId, start, end) =>
      ipcRenderer.invoke('payroll:preview', employeeId, start, end),
    confirm: (data) => ipcRenderer.invoke('payroll:confirm', data),
    getByEmployee: (employeeId) => ipcRenderer.invoke('payroll:getByEmployee', employeeId),
    getById: (id) => ipcRenderer.invoke('payroll:getById', id),
    markPaid: (id) => ipcRenderer.invoke('payroll:markPaid', id),
    delete: (id) => ipcRenderer.invoke('payroll:delete', id),
    getDashboardStats: () => ipcRenderer.invoke('payroll:getDashboardStats'),
    getAllForPeriod: (start, end) => ipcRenderer.invoke('payroll:getAllForPeriod', start, end),
  },

  // Native dialogs and system
  dialog: {
    showSaveDialog: (options) => ipcRenderer.invoke('dialog:showSaveDialog', options),
  },

  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
});
