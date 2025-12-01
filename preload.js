const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveProject: (data) => ipcRenderer.invoke('dialog:saveProject', data),
  openProject: () => ipcRenderer.invoke('dialog:openProject'),

  // Report generation
  exportHTML: (htmlContent, tabName) => ipcRenderer.invoke('report:exportHTML', htmlContent, tabName),
  exportPDF: (htmlContent, tabName) => ipcRenderer.invoke('report:exportPDF', htmlContent, tabName),

  // File operations
  readTemplate: () => ipcRenderer.invoke('file:readTemplate'),

  // File system operations for tabs
  ensureDir: () => ipcRenderer.invoke('fs:ensureDir'),
  saveTab: (tabId, data) => ipcRenderer.invoke('fs:saveTab', tabId, data),
  loadTab: (tabId) => ipcRenderer.invoke('fs:loadTab', tabId),
  deleteTab: (tabId) => ipcRenderer.invoke('fs:deleteTab', tabId),
  listTabs: () => ipcRenderer.invoke('fs:listTabs'),
  saveStructure: (structure) => ipcRenderer.invoke('fs:saveStructure', structure),
  loadStructure: () => ipcRenderer.invoke('fs:loadStructure'),

  // Localization
  loadLocale: (locale) => ipcRenderer.invoke('i18n:loadLocale', locale),
  getAvailableLocales: () => ipcRenderer.invoke('i18n:getAvailableLocales'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Platform info
  platform: process.platform
});
