const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;

// Get user data directory for storing tables
const userDataPath = app.getPath('userData');
const tablesDir = path.join(userDataPath, 'tables');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, 'src/assets/icon.png')
  });

  mainWindow.loadFile('src/index.html');

  // Open DevTools in development mode
  if (process.argv.includes('--enable-logging')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers

// Open file dialog for Zemax import
ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Zemax Files', extensions: ['zmx', 'txt'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  const filePath = result.filePaths[0];

  // Try reading as UTF-8 first, then fall back to latin1 (ANSI)
  let content;
  try {
    content = await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    // If UTF-8 fails, try latin1 which handles ANSI
    content = await fs.readFile(filePath, 'latin1');
  }

  return {
    path: filePath,
    content: content
  };
});

// Save project file
ipcMain.handle('dialog:saveProject', async (event, data) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Testplate Project', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: 'testplate-project.json'
  });

  if (result.canceled) {
    return null;
  }

  await fs.writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf-8');
  return result.filePath;
});

// Open project file
ipcMain.handle('dialog:openProject', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Testplate Project', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled) {
    return null;
  }

  const filePath = result.filePaths[0];
  const content = await fs.readFile(filePath, 'utf-8');

  return {
    path: filePath,
    data: JSON.parse(content)
  };
});

// Save PDF report
ipcMain.handle('dialog:savePDF', async (event, pdfData) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    defaultPath: 'testplate-report.pdf'
  });

  if (result.canceled) {
    return null;
  }

  // Convert base64 to buffer
  const buffer = Buffer.from(pdfData, 'base64');
  await fs.writeFile(result.filePath, buffer);

  return result.filePath;
});

// Read report template
ipcMain.handle('file:readTemplate', async () => {
  const templatePath = path.join(__dirname, 'reports', 'template.html');
  const content = await fs.readFile(templatePath, 'utf-8');
  return content;
});

// Initialize tables directory
async function ensureTablesDir() {
  try {
    await fs.access(tablesDir);
  } catch {
    await fs.mkdir(tablesDir, { recursive: true });
  }
}

// File system operations for tabs
ipcMain.handle('fs:ensureDir', async () => {
  await ensureTablesDir();
  return tablesDir;
});

ipcMain.handle('fs:saveTab', async (event, tabId, data) => {
  await ensureTablesDir();
  const filePath = path.join(tablesDir, `${tabId}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  return filePath;
});

ipcMain.handle('fs:loadTab', async (event, tabId) => {
  const filePath = path.join(tablesDir, `${tabId}.json`);
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
});

ipcMain.handle('fs:deleteTab', async (event, tabId) => {
  const filePath = path.join(tablesDir, `${tabId}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('fs:listTabs', async () => {
  await ensureTablesDir();
  try {
    const files = await fs.readdir(tablesDir);
    const tabs = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(tablesDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(content);
        tabs.push(data);
      }
    }

    return tabs;
  } catch {
    return [];
  }
});

ipcMain.handle('fs:saveStructure', async (event, structure) => {
  await ensureTablesDir();
  const structurePath = path.join(tablesDir, '_structure.json');
  await fs.writeFile(structurePath, JSON.stringify(structure, null, 2), 'utf-8');
  return true;
});

ipcMain.handle('fs:loadStructure', async () => {
  const structurePath = path.join(tablesDir, '_structure.json');
  try {
    const content = await fs.readFile(structurePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
});

// Localization handlers
ipcMain.handle('i18n:loadLocale', async (event, locale) => {
  const localePath = path.join(__dirname, 'src', 'locales', `${locale}.json`);
  try {
    const content = await fs.readFile(localePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to load locale ${locale}:`, error);
    // Fallback to English
    const fallbackPath = path.join(__dirname, 'src', 'locales', 'en.json');
    const fallbackContent = await fs.readFile(fallbackPath, 'utf-8');
    return JSON.parse(fallbackContent);
  }
});

ipcMain.handle('i18n:getAvailableLocales', async () => {
  const localesDir = path.join(__dirname, 'src', 'locales');
  try {
    const files = await fs.readdir(localesDir);
    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  } catch {
    return ['en'];
  }
});
