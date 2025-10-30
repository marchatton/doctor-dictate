const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { WhisperTranscriber } = require('./services/transcription/whisper.js');
const { TranscriptionManager } = require('./services/transcription/manager/TranscriptionManager');
const { FastMode } = require('./services/transcription/manager/modes/FastMode');
const { AccurateMode } = require('./services/transcription/manager/modes/AccurateMode');
const { ProgressReporter } = require('./services/transcription/manager/utils/ProgressReporter');
const { WhisperCppEngine } = require('./services/transcription/manager/engines/WhisperCppEngine');
const { FasterWhisperBridge } = require('./services/transcription/manager/engines/FasterWhisperBridge');
const { FormattingManager } = require('./services/formatting/manager/FormattingManager');
const { ModelValidator } = require('./services/models/ModelValidator');
const { ModelDownloader } = require('./services/models/ModelDownloader');

// Keep a global reference of the window object
let mainWindow;

// Initialize Whisper transcriber and manager
const sharedWhisperTranscriber = new WhisperTranscriber();

const modelValidator = new ModelValidator();
const modelDownloader = new ModelDownloader();

const fastMode = new FastMode({
  engineFactory: (config) => new WhisperCppEngine({ config, transcriber: sharedWhisperTranscriber }),
});
const accurateMode = new AccurateMode({
  engineFactory: (config) => new FasterWhisperBridge({ config, transcriber: sharedWhisperTranscriber }),
});

const formattingManager = new FormattingManager();

const transcriptionManager = new TranscriptionManager({
  modes: new Map([
    [fastMode.key, fastMode],
    [accurateMode.key, accurateMode],
  ]),
  formattingManager,
});

async function warnMissingModels() {
  try {
    const missing = modelValidator.getMissing();
    if (missing.length === 0) {
      return;
    }

    const missingKeys = missing.map((entry) => entry.key || 'unknown').join(', ');
    console.warn('[models] Missing required model assets:', missingKeys);
    console.warn('[models] Run `pnpm node scripts/download-models.js` to fetch binaries or provide them manually.');
  } catch (error) {
    console.warn('[models] Failed to validate local models:', error);
  }
}

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
  await warnMissingModels();

  // Initialize transcription engines before showing UI
  try {
    console.log('Initializing transcription engines...');
    const defaultMode =
      transcriptionManager.modes.get('accurate') ||
      Array.from(transcriptionManager.modes.values())[0];
    if (defaultMode) {
      const engine = defaultMode.createEngine();
      if (engine && typeof engine.initialize === 'function') {
        await engine.initialize(defaultMode.config);
        console.log(`Initialized transcription mode: ${defaultMode.key}`);
      }
    }
  } catch (error) {
    console.error('Failed to initialize transcription engines:', error);
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
    const success = await sharedWhisperTranscriber.initializeWhisper();
    return { success, message: success ? 'Whisper initialized successfully' : 'Failed to initialize Whisper' };
  } catch (error) {
    console.error('Error initializing Whisper:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('validate-whisper', async () => {
  try {
    const isValid = await sharedWhisperTranscriber.validateWhisperInstallation();
    return { success: isValid, available: isValid };
  } catch (error) {
    console.error('Error validating Whisper:', error);
    return { success: false, available: false, error: error.message };
  }
});

ipcMain.handle('validate-model-assets', async () => {
  try {
    const results = modelValidator.validateAll();
    return { success: true, results };
  } catch (error) {
    console.error('Error validating model assets:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('download-model-assets', async (event, options = {}) => {
  if (process.env.DD_ALLOW_MODEL_DOWNLOADS !== '1') {
    return {
      success: false,
      error: 'Model downloads disabled. Set DD_ALLOW_MODEL_DOWNLOADS=1 to enable automatic downloads.',
    };
  }

  const keys = Array.isArray(options.keys) ? options.keys : null;
  const selectedModels = keys && keys.length > 0
    ? modelDownloader.models.filter((model) => keys.includes(model.key))
    : modelDownloader.models;

  try {
    const results = await modelDownloader.ensureModels(selectedModels);
    return { success: true, results };
  } catch (error) {
    console.error('Error downloading model assets:', error);
    return { success: false, error: error.message };
  }
});

// Model selection handlers
ipcMain.handle('get-whisper-models', async () => {
  try {
    return {
      success: true,
      models: sharedWhisperTranscriber.getAvailableModels(),
      current: sharedWhisperTranscriber.getCurrentModel()
    };
  } catch (error) {
    console.error('Error getting Whisper models:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('set-whisper-model', async (event, model) => {
  try {
    const success = sharedWhisperTranscriber.setModel(model);
    return {
      success,
      current: sharedWhisperTranscriber.getCurrentModel()
    };
  } catch (error) {
    console.error('Error setting Whisper model:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('list-transcription-modes', async () => {
  try {
    return {
      success: true,
      modes: transcriptionManager.listModes(),
    };
  } catch (error) {
    console.error('Error listing transcription modes:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('format-transcript', async (event, payload) => {
  const request =
    typeof payload === 'string'
      ? { transcript: payload }
      : payload || {};

  const { transcript, mode, metadata = {} } = request;
  if (!transcript) {
    return { success: false, error: 'Transcript is required for formatting' };
  }

  try {
    const formatted = await formattingManager.format({
      transcript,
      mode,
      metadata,
    });
    return { success: true, ...formatted };
  } catch (error) {
    console.error('Error formatting transcript:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('save-formatted-note', async (event, { content, filename }) => {
  try {
    const defaultPath = path.join(
      app.getPath('documents'),
      'DoctorDictate',
      filename || `formatted-note-${Date.now()}.md`
    );
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters: [
        { name: 'Markdown', extensions: ['md'] },
        { name: 'Text', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePath) {
      fs.writeFileSync(result.filePath, content, 'utf8');
      return { success: true, path: result.filePath };
    }
    return { success: false, canceled: true };
  } catch (error) {
    console.error('Error saving formatted note:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('transcribe-audio', async (event, payload) => {
  const request =
    typeof payload === 'string'
      ? { audioPath: payload }
      : payload || {};

  const { audioPath, mode = 'accurate' } = request;
  if (!audioPath) {
    return { success: false, error: 'Audio path is required' };
  }

  let emittedMode = mode;
  const progressReporter = new ProgressReporter(
    { audioPath, mode },
    {
      emitter: {
        emit: (eventName, data) => {
          emittedMode = data?.context?.mode || emittedMode;
          const decision = data?.context?.decision;
          switch (eventName) {
            case 'stage':
              event.sender.send('transcription-progress', {
                mode: emittedMode,
                stage: data.stage,
                status: data.status,
                percent: data.percent,
                message: data.message,
                decision,
              });
              break;
            case 'chunk':
              event.sender.send('transcription-progress', {
                mode: emittedMode,
                stage: 'chunk',
                current: data.current,
                total: data.total,
                estimatedMsRemaining: data.estimatedMsRemaining,
                decision,
              });
              break;
            case 'error':
              event.sender.send('transcription-progress', {
                mode: emittedMode,
                stage: 'error',
                error: data.error?.message || String(data.error),
                decision,
              });
              break;
            case 'complete':
              event.sender.send('transcription-progress', {
                mode: emittedMode,
                stage: 'complete',
                metadata: data.result?.metadata,
                decision: data.result?.metadata?.modeDecision || decision,
              });
              break;
            default:
              break;
          }
        },
      },
    }
  );

  try {
    console.log('🔍 MAIN IPC - Starting transcription for:', audioPath, 'mode:', mode);
    const result = await transcriptionManager.transcribe({
      audioPath,
      mode: emittedMode,
      progressReporter,
    });

    console.log('🔍 MAIN IPC - Transcription complete, result keys:', Object.keys(result));
    console.log('🔍 MAIN IPC - Available transcript options:');
    console.log('  formatted length:', result.formatted?.length);
    console.log('  corrected length:', result.corrected?.length);
    console.log('  raw length:', result.raw?.length);

    // The frontend expects a 'transcript' property
    const transcript = result.formatted || result.corrected || result.raw;
    console.log(
      '🔍 MAIN IPC - Selected transcript source:',
      result.formatted ? 'formatted' : result.corrected ? 'corrected' : 'raw'
    );
    console.log('🔍 MAIN IPC - Final transcript length:', transcript?.length);
    console.log('🔍 MAIN IPC - Final transcript preview:', transcript?.substring(0, 100) + '...');

    const response = {
      success: true,
      transcript,
      ...result,
    };

    console.log('🔍 MAIN IPC - Returning response with transcript length:', response.transcript?.length);
    return response;
  } catch (error) {
    console.error('🔍 MAIN IPC - Error transcribing audio:', error);
    sharedWhisperTranscriber.resetProcessingState();
    return { success: false, error: error.message };
  }
});

// Add handler to reset transcription state
ipcMain.handle('reset-transcription-state', async () => {
  try {
    sharedWhisperTranscriber.resetProcessingState();
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
