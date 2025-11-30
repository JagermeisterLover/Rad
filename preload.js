const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File dialogs
  openFile: () => ipcRenderer.invoke('dialog:openFile'),
  saveProject: (data) => ipcRenderer.invoke('dialog:saveProject', data),
  openProject: () => ipcRenderer.invoke('dialog:openProject'),
  savePDF: (pdfData) => ipcRenderer.invoke('dialog:savePDF', pdfData),

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

  // Platform info
  platform: process.platform
});
