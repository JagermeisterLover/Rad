const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs').promises;

let mainWindow;
let tablesDir;
let reportsDir;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
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

app.whenReady().then(() => {
  // Initialize paths after app is ready
  const userDataPath = app.getPath('userData');
  tablesDir = path.join(userDataPath, 'tables');
  reportsDir = path.join(userDataPath, 'reports');

  createWindow();
});

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

// Export HTML report
ipcMain.handle('report:exportHTML', async (event, htmlContent, tabName) => {
  try {
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export HTML Report',
      defaultPath: `report_${tabName}_${Date.now()}.html`,
      filters: [
        { name: 'HTML Files', extensions: ['html'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return null;
    }

    // Save HTML file
    await fs.writeFile(result.filePath, htmlContent, 'utf-8');

    // Show file in folder
    shell.showItemInFolder(result.filePath);

    return result.filePath;
  } catch (error) {
    console.error('HTML export error:', error);
    throw error;
  }
});

// Export PDF report using Electron's built-in printToPDF
ipcMain.handle('report:exportPDF', async (event, htmlContent, tabName) => {
  try {
    // Show save dialog
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export PDF Report',
      defaultPath: `report_${tabName}_${Date.now()}.pdf`,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled) {
      return null;
    }

    // Create a hidden window for PDF generation
    const pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load the HTML content
    await pdfWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

    // Wait for content to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate PDF using Electron's built-in method
    const pdfData = await pdfWindow.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: true,
      margins: {
        marginType: 'custom',
        top: 20,
        bottom: 20,
        left: 15,
        right: 15
      }
    });

    // Close the hidden window
    pdfWindow.close();

    // Save PDF file
    await fs.writeFile(result.filePath, pdfData);

    // Show file in folder
    shell.showItemInFolder(result.filePath);

    return result.filePath;
  } catch (error) {
    console.error('PDF export error:', error);
    throw error;
  }
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

// Window control handlers
ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});
