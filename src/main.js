const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'PsychScribe - Local Dictation for Psychiatrists',
    icon: path.join(__dirname, 'assets/icon.png'), // We'll add this later
    show: false, // Don't show until ready
  });

  // Load the index.html file
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Security: Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent navigation to external URLs
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'file://') {
      event.preventDefault();
    }
  });
});

// IPC handlers for main process communication
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-name', () => {
  return app.getName();
});

// File system operations
ipcMain.handle('save-transcript', async (event, { filename, content }) => {
  try {
    const defaultPath = path.join(app.getPath('documents'), 'PsychScribe', filename);
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, 'utf8');
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    console.error('Error saving transcript:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('export-pdf', async (event, { filename, content }) => {
  try {
    const defaultPath = path.join(app.getPath('documents'), 'PsychScribe', filename);
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      // TODO: Implement PDF generation using pdfkit
      // For now, just save as text
      fs.writeFileSync(result.filePath, content, 'utf8');
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return { success: false, error: error.message };
  }
});

// Ensure documents directory exists
ipcMain.handle('ensure-documents-dir', async () => {
  try {
    const documentsPath = path.join(app.getPath('documents'), 'PsychScribe');
    if (!fs.existsSync(documentsPath)) {
      fs.mkdirSync(documentsPath, { recursive: true });
    }
    return { success: true, path: documentsPath };
  } catch (error) {
    console.error('Error creating documents directory:', error);
    return { success: false, error: error.message };
  }
});
