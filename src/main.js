const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { WhisperTranscriber } = require('./whisper.js');

// Keep a global reference of the window object
let mainWindow;

// Initialize Whisper transcriber
const whisperTranscriber = new WhisperTranscriber();

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
    title: 'DoctorDictate - Local Medical Transcription',
    icon: path.join(__dirname, 'assets/icon.png'), // We'll add this later
    show: false, // Don't show until ready
  });

  // Load the React app (dev server in development, built files in production)
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-react/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Set Content Security Policy for production
  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;"]
        }
      });
    });
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Security: Prevent new window creation
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });
}

// Initialize the app when Electron is ready
app.whenReady().then(async () => {
  // Initialize Whisper environment first
  try {
    console.log('Initializing Whisper environment...');
    const initResult = await whisperTranscriber.initializeWhisper();
    if (initResult) {
      console.log('Whisper environment initialized successfully');
    } else {
      console.warn('Whisper environment initialization failed - transcription may not work');
    }
  } catch (error) {
    console.error('Failed to initialize Whisper during startup:', error);
  }
  
  // Then create the window
  createWindow();
});

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
    const defaultPath = path.join(app.getPath('documents'), 'DoctorDictate', filename);
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
    const defaultPath = path.join(app.getPath('documents'), 'DoctorDictate', filename);
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: [
        { name: 'PDF Files', extensions: ['pdf'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePath) {
      // Generate PDF using pdfkit
      const doc = new PDFDocument({
        size: 'letter',
        margins: {
          top: 72,
          bottom: 72,
          left: 72,
          right: 72
        }
      });
      
      // Pipe PDF to file
      const stream = fs.createWriteStream(result.filePath);
      doc.pipe(stream);
      
      // Add header
      doc.fontSize(16).font('Helvetica-Bold');
      doc.text('DoctorDictate Medical Transcript', { align: 'center' });
      doc.moveDown();
      
      // Add timestamp
      doc.fontSize(10).font('Helvetica');
      doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown(2);
      
      // Add content
      doc.fontSize(12).font('Helvetica');
      
      // Split content into lines and handle long lines
      const lines = content.split('\n');
      for (const line of lines) {
        if (line.trim() === '') {
          doc.moveDown(0.5);
        } else if (line.includes(':') && line.length < 50) {
          // Likely a header - make it bold
          doc.font('Helvetica-Bold').text(line);
          doc.font('Helvetica');
          doc.moveDown(0.3);
        } else {
          doc.text(line, {
            width: doc.page.width - 144, // Account for margins
            align: 'left'
          });
          doc.moveDown(0.2);
        }
      }
      
      // Add footer
      doc.fontSize(8).font('Helvetica');
      doc.text('Generated by DoctorDictate - Privacy-focused medical transcription', 
        72, doc.page.height - 50, { align: 'center' });
      
      // Finalize PDF
      doc.end();
      
      // Wait for stream to finish
      await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
      });
      
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    console.error('Error exporting PDF:', error);
    return { success: false, error: error.message };
  }
});

// Auto-save functionality
ipcMain.handle('auto-save', async (event, { content }) => {
  try {
    const documentsPath = path.join(app.getPath('documents'), 'DoctorDictate');
    if (!fs.existsSync(documentsPath)) {
      fs.mkdirSync(documentsPath, { recursive: true });
    }
    
    const autoSavePath = path.join(documentsPath, 'auto-save.txt');
    const timestamp = new Date().toISOString();
    const contentWithTimestamp = `# Auto-saved: ${timestamp}\n\n${content}`;
    
    fs.writeFileSync(autoSavePath, contentWithTimestamp, 'utf8');
    console.log('Auto-saved transcript to:', autoSavePath);
    
    return { success: true, path: autoSavePath };
  } catch (error) {
    console.error('Error auto-saving:', error);
    return { success: false, error: error.message };
  }
});

// Ensure documents directory exists
ipcMain.handle('ensure-documents-dir', async () => {
  try {
    const documentsPath = path.join(app.getPath('documents'), 'DoctorDictate');
    if (!fs.existsSync(documentsPath)) {
      fs.mkdirSync(documentsPath, { recursive: true });
    }
    return { success: true, path: documentsPath };
  } catch (error) {
    console.error('Error creating documents directory:', error);
    return { success: false, error: error.message };
  }
});

// Whisper transcription handlers
ipcMain.handle('initialize-whisper', async () => {
  try {
    const success = await whisperTranscriber.initializeWhisper();
    return { success, message: success ? 'Whisper initialized successfully' : 'Failed to initialize Whisper' };
  } catch (error) {
    console.error('Error initializing Whisper:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('validate-whisper', async () => {
  try {
    const isValid = await whisperTranscriber.validateWhisperInstallation();
    return { success: isValid, available: isValid };
  } catch (error) {
    console.error('Error validating Whisper:', error);
    return { success: false, available: false, error: error.message };
  }
});

// Model selection handlers
ipcMain.handle('get-whisper-models', async () => {
  try {
    return {
      success: true,
      models: whisperTranscriber.getAvailableModels(),
      current: whisperTranscriber.getCurrentModel()
    };
  } catch (error) {
    console.error('Error getting Whisper models:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-whisper-model', async (event, model) => {
  try {
    const success = whisperTranscriber.setModel(model);
    return {
      success,
      current: whisperTranscriber.getCurrentModel()
    };
  } catch (error) {
    console.error('Error setting Whisper model:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('transcribe-audio', async (event, audioFilePath) => {
  try {
    const result = await whisperTranscriber.transcribeAudio(audioFilePath, (progress) => {
      // Send progress updates to renderer
      event.sender.send('transcription-progress', progress);
    });
    
    // The frontend expects a 'transcript' property
    return { 
      success: true, 
      transcript: result.formatted || result.corrected || result.raw,
      ...result 
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    // Ensure processing state is reset on error
    whisperTranscriber.resetProcessingState();
    return { success: false, error: error.message };
  }
});

// Add handler to reset transcription state
ipcMain.handle('reset-transcription-state', async () => {
  try {
    whisperTranscriber.resetProcessingState();
    return { success: true };
  } catch (error) {
    console.error('Error resetting transcription state:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-confidence-score', async (event, { rawText, correctedText, corrections }) => {
  try {
    const score = whisperTranscriber.getConfidenceScore(rawText, correctedText, corrections);
    return { success: true, confidence: score };
  } catch (error) {
    console.error('Error calculating confidence score:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-audio-blob', async (event, audioBuffer) => {
  try {
    const os = require('os');
    const timestamp = Date.now();
    const audioFilePath = path.join(os.tmpdir(), `doctordictate-audio-${timestamp}.webm`);
    
    fs.writeFileSync(audioFilePath, Buffer.from(audioBuffer));
    return { success: true, filePath: audioFilePath };
  } catch (error) {
    console.error('Error saving audio blob:', error);
    return { success: false, error: error.message };
  }
});
