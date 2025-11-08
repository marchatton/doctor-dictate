import { app, BrowserWindow, dialog, ipcMain, IpcMainInvokeEvent } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';
import PDFDocument from 'pdfkit';

import { WhisperTranscriber } from './services/transcription/whisper';
import type { TranscriptionCorrection } from './types/medical';
import TranscriptionManager from './services/transcription/manager/TranscriptionManager';
import { FastMode } from './services/transcription/manager/modes/FastMode';
import { AccurateMode } from './services/transcription/manager/modes/AccurateMode';
import { ProgressReporter } from './services/transcription/manager/utils/ProgressReporter';
import { WhisperCppEngine } from './services/transcription/manager/engines/WhisperCppEngine';
import { FasterWhisperBridge } from './services/transcription/manager/engines/FasterWhisperBridge';
import { FormattingManager } from './services/formatting/manager/FormattingManager';
import { ModelValidator } from './services/models/ModelValidator';
import { ModelDownloader } from './services/models/ModelDownloader';

import type { TranscriptionProgressUpdate } from './types/ipc.js';

let mainWindow: BrowserWindow | null = null;

const sharedWhisperTranscriber = new WhisperTranscriber();
const modelValidator = new ModelValidator();
const modelDownloader = new ModelDownloader();

const fastMode = new FastMode({
  engineFactory: (config: Record<string, unknown>) =>
    new WhisperCppEngine({ config, transcriber: sharedWhisperTranscriber }),
});

const accurateMode = new AccurateMode({
  engineFactory: (config: Record<string, unknown>) =>
    new FasterWhisperBridge({ config, transcriber: sharedWhisperTranscriber }),
});

const formattingManager = new FormattingManager();

const transcriptionManager = new TranscriptionManager({
  modes: new Map([
    [fastMode.key, fastMode],
    [accurateMode.key, accurateMode],
  ]),
  formattingManager,
});

const warnMissingModels = async (): Promise<void> => {
  try {
    const missing = modelValidator.getMissing() as Array<{ key?: string }>;
    if (missing.length === 0) {
      return;
    }

    const missingKeys = missing.map((entry) => entry.key ?? 'unknown').join(', ');
    console.warn('[models] Missing required model assets:', missingKeys);
    console.warn('[models] Run `pnpm node scripts/download-models.js` to fetch binaries or provide them manually.');
  } catch (error) {
    console.warn('[models] Failed to validate local models:', error);
  }
};

const resolvePreloadPath = (): string => {
  const preloadFile = app.isPackaged ? 'preload.js' : 'preload.ts';
  return path.join(__dirname, preloadFile);
};

const resolveIconPath = (): string | undefined => {
  const candidate = path.join(__dirname, 'assets', 'icon.png');
  return fs.existsSync(candidate) ? candidate : undefined;
};

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: resolvePreloadPath(),
    },
    title: 'DoctorDictate - Local Medical Transcription',
    icon: resolveIconPath(),
    show: false,
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    try {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    } catch (error) {
      console.warn('Failed to open DevTools:', error);
    }
  } else {
    const rendererPath = path.join(__dirname, '../dist-react/index.html');
    mainWindow.loadFile(rendererPath);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;",
          ],
        },
      });
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
};

const initializeTranscriptionEngines = async (): Promise<void> => {
  try {
    console.log('Initializing transcription engines...');
    const defaultMode = transcriptionManager.modes.get('accurate') ?? [...transcriptionManager.modes.values()][0];
    if (!defaultMode) {
      return;
    }
    const engine = defaultMode.createEngine();
    if (engine && typeof engine.initialize === 'function') {
      await engine.initialize(defaultMode.config);
      console.log(`Initialized transcription mode: ${defaultMode.key}`);
    }
  } catch (error) {
    console.error('Failed to initialize transcription engines:', error);
  }
};

const ensureDocumentsDir = (): string => {
  const documentsPath = path.join(app.getPath('documents'), 'DoctorDictate');
  if (!fs.existsSync(documentsPath)) {
    fs.mkdirSync(documentsPath, { recursive: true });
  }
  return documentsPath;
};

type FormatTranscriptPayload =
  | string
  | {
      transcript: string;
      mode?: string;
      metadata?: Record<string, unknown>;
    };

app.whenReady().then(async () => {
  await warnMissingModels();
  await initializeTranscriptionEngines();
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

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (navigateEvent, url) => {
    const parsed = new URL(url);
    if (parsed.origin !== 'file://') {
      navigateEvent.preventDefault();
    }
  });
});

ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-app-name', () => app.getName());

ipcMain.handle('save-transcript', async (_event, { filename, content }: { filename: string; content: string }) => {
  const defaultPath = path.join(ensureDocumentsDir(), filename);
  const options = {
    defaultPath,
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  };
  const dialogResult = mainWindow
    ? await dialog.showSaveDialog(mainWindow, options)
    : await dialog.showSaveDialog(options);

  if (!dialogResult.canceled && dialogResult.filePath) {
    fs.writeFileSync(dialogResult.filePath, content, 'utf8');
    return { success: true, path: dialogResult.filePath };
  }

  return { success: false, canceled: true };
});

ipcMain.handle('export-pdf', async (_event, { filename, content }: { filename: string; content: string }) => {
  const defaultPath = path.join(ensureDocumentsDir(), filename);
  const options = {
    defaultPath,
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  };
  const dialogResult = mainWindow
    ? await dialog.showSaveDialog(mainWindow, options)
    : await dialog.showSaveDialog(options);

  if (dialogResult.canceled || !dialogResult.filePath) {
    return { success: false, canceled: true };
  }

  const doc = new PDFDocument({
    size: 'letter',
    margins: { top: 72, bottom: 72, left: 72, right: 72 },
  });
  const stream = fs.createWriteStream(dialogResult.filePath);
  doc.pipe(stream);

  doc.fontSize(16).font('Helvetica-Bold');
  doc.text('DoctorDictate Medical Transcript', { align: 'center' });
  doc.moveDown();

  doc.fontSize(10).font('Helvetica');
  doc.text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
  doc.moveDown(2);

  doc.fontSize(12).font('Helvetica');

  const lines = content.split('\n');
  for (const line of lines) {
    if (line.trim() === '') {
      doc.moveDown(0.5);
    } else if (line.includes(':') && line.length < 50) {
      doc.font('Helvetica-Bold').text(line);
      doc.font('Helvetica');
      doc.moveDown(0.3);
    } else {
      doc.text(line, {
        width: doc.page.width - 144,
        align: 'left',
      });
      doc.moveDown(0.2);
    }
  }

  doc.fontSize(8).font('Helvetica');
  doc.text('Generated by DoctorDictate - Privacy-focused medical transcription', 72, doc.page.height - 50, {
    align: 'center',
  });

  doc.end();

  await new Promise<void>((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { success: true, path: dialogResult.filePath };
});

ipcMain.handle('auto-save', async (_event, { content }: { content: string }) => {
  const documentsPath = ensureDocumentsDir();
  const autoSavePath = path.join(documentsPath, 'auto-save.txt');
  const timestamp = new Date().toISOString();
  const contentWithTimestamp = `# Auto-saved: ${timestamp}\n\n${content}`;
  fs.writeFileSync(autoSavePath, contentWithTimestamp, 'utf8');
  console.log('Auto-saved transcript to:', autoSavePath);
  return { success: true, path: autoSavePath };
});

ipcMain.handle('ensure-documents-dir', async () => ({ success: true, path: ensureDocumentsDir() }));

ipcMain.handle('initialize-whisper', async () => {
  try {
    const success = await sharedWhisperTranscriber.initializeWhisper();
    return { success, message: success ? 'Whisper initialized successfully' : 'Failed to initialize Whisper' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error initializing Whisper:', error);
    return { success: false, error: message };
  }
});

ipcMain.handle('validate-whisper', async () => {
  try {
    const isValid = await sharedWhisperTranscriber.validateWhisperInstallation();
    return { success: isValid, available: isValid };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error validating Whisper:', error);
    return { success: false, available: false, error: message };
  }
});

ipcMain.handle('validate-model-assets', async () => {
  try {
    const results = modelValidator.validateAll();
    return { success: true, results };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error validating model assets:', error);
    return { success: false, error: message };
  }
});

ipcMain.handle('download-model-assets', async (_event, options: { keys?: string[] } = {}) => {
  if (process.env.DD_ALLOW_MODEL_DOWNLOADS !== '1') {
    return {
      success: false,
      error: 'Model downloads disabled. Set DD_ALLOW_MODEL_DOWNLOADS=1 to enable automatic downloads.',
    };
  }

  const keys = Array.isArray(options.keys) ? options.keys : null;
  const selectedModels = (keys && keys.length > 0
    ? modelDownloader.models.filter((model: { key: string }) => keys.includes(model.key))
    : modelDownloader.models) as Array<{ key: string }>;

  try {
    const results = await modelDownloader.ensureModels(selectedModels);
    return { success: true, results };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error downloading model assets:', error);
    return { success: false, error: message };
  }
});

ipcMain.handle('get-whisper-models', async () => {
  try {
    return {
      success: true,
      models: sharedWhisperTranscriber.getAvailableModels(),
      current: sharedWhisperTranscriber.getCurrentModel(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error getting Whisper models:', error);
    return { success: false, error: message };
  }
});

ipcMain.handle('set-whisper-model', async (_event, model: string) => {
  try {
    const success = sharedWhisperTranscriber.setModel(model);
    return {
      success,
      current: sharedWhisperTranscriber.getCurrentModel(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error setting Whisper model:', error);
    return { success: false, error: message };
  }
});

ipcMain.handle('list-transcription-modes', async () => {
  try {
    return {
      success: true,
      modes: transcriptionManager.listModes(),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error listing transcription modes:', error);
    return { success: false, error: message };
  }
});

ipcMain.handle('format-transcript', async (_event, payload: FormatTranscriptPayload) => {
  const request = typeof payload === 'string' ? { transcript: payload } : payload ?? {};

  const { transcript, mode, metadata = {} } = request;
  if (!transcript) {
    return { success: false, error: 'Transcript is required for formatting' };
  }

  try {
    const formatted = await formattingManager.format({ transcript, mode, metadata });
    return { success: true, ...formatted };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error formatting transcript:', error);
    return { success: false, error: message };
  }
});

ipcMain.handle('save-formatted-note', async (_event, { content, filename }: { content: string; filename?: string }) => {
  const defaultPath = path.join(
    ensureDocumentsDir(),
    filename ?? `formatted-note-${Date.now()}.md`,
  );

  const options = {
    defaultPath,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'Text', extensions: ['txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  };

  const dialogResult = mainWindow
    ? await dialog.showSaveDialog(mainWindow, options)
    : await dialog.showSaveDialog(options);

  if (!dialogResult.canceled && dialogResult.filePath) {
    fs.writeFileSync(dialogResult.filePath, content, 'utf8');
    return { success: true, path: dialogResult.filePath };
  }

  return { success: false, canceled: true };
});

ipcMain.handle('transcribe-audio', async (event: IpcMainInvokeEvent, payload: string | { audioPath: string; mode?: string }) => {
  const request = typeof payload === 'string' ? { audioPath: payload } : payload ?? {};
  const { audioPath, mode = 'accurate' } = request;
  if (!audioPath) {
    return { success: false, error: 'Audio path is required' };
  }

  let emittedMode = mode;
  const progressReporter = new ProgressReporter(
    { audioPath, mode },
    {
      emitter: {
        emit: (eventName: string, data: { context?: { mode?: string; decision?: string }; [key: string]: unknown }) => {
          emittedMode = data?.context?.mode ?? emittedMode;
          const decision = data?.context?.decision;
          const progress: TranscriptionProgressUpdate = {
            mode: emittedMode,
            decision,
          };

          switch (eventName) {
            case 'stage':
              event.sender.send('transcription-progress', {
                ...progress,
                stage: data.stage as string | undefined,
                status: data.status as string | undefined,
                percent: data.percent as number | undefined,
                message: data.message as string | undefined,
              });
              break;
            case 'chunk':
              event.sender.send('transcription-progress', {
                ...progress,
                stage: 'chunk',
                current: data.current as number | undefined,
                total: data.total as number | undefined,
                estimatedMsRemaining: data.estimatedMsRemaining as number | undefined,
              });
              break;
            case 'error':
              event.sender.send('transcription-progress', {
                ...progress,
                stage: 'error',
                error: data.error instanceof Error ? data.error.message : String(data.error),
              });
              break;
            case 'complete':
              event.sender.send('transcription-progress', {
                ...progress,
                stage: 'complete',
                metadata: (data.result as { metadata?: Record<string, unknown> } | undefined)?.metadata,
                decision: ((data.result as { metadata?: { modeDecision?: string } } | undefined)?.metadata?.modeDecision) ?? decision,
              });
              break;
            default:
              break;
          }
        },
      },
    },
  );

  try {
    console.log('🔍 MAIN IPC - Starting transcription for:', audioPath, 'mode:', mode);
    const result = await transcriptionManager.transcribe({
      audioPath,
      mode: emittedMode,
      signal: undefined,
      progressReporter,
    });

    console.log('🔍 MAIN IPC - Transcription complete, result keys:', Object.keys(result));
    console.log('🔍 MAIN IPC - Available transcript options:');
    console.log('  formatted length:', result.formatted?.length);
    console.log('  corrected length:', result.corrected?.length);
    console.log('  raw length:', result.raw?.length);

    const transcript = result.formatted ?? result.corrected ?? result.raw;
    console.log('🔍 MAIN IPC - Selected transcript source:', result.formatted ? 'formatted' : result.corrected ? 'corrected' : 'raw');
    console.log('🔍 MAIN IPC - Final transcript length:', transcript?.length);
    console.log('🔍 MAIN IPC - Final transcript preview:', transcript?.substring(0, 100) + '...');

    return {
      success: true,
      transcript,
      ...result,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('🔍 MAIN IPC - Error transcribing audio:', error);
    sharedWhisperTranscriber.resetProcessingState();
    return { success: false, error: message };
  }
});

ipcMain.handle('reset-transcription-state', async () => {
  try {
    sharedWhisperTranscriber.resetProcessingState();
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error resetting transcription state:', error);
    return { success: false, error: message };
  }
});

ipcMain.handle('get-confidence-score', async (_event, { rawText, correctedText, corrections }: { rawText: string; correctedText: string; corrections: TranscriptionCorrection[] }) => {
  try {
    const score = sharedWhisperTranscriber.getConfidenceScore(rawText, correctedText, corrections);
    return { success: true, confidence: score };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error calculating confidence score:', error);
    return { success: false, error: message };
  }
});

ipcMain.handle('save-audio-blob', async (_event, audioBuffer: ArrayBuffer) => {
  try {
    const timestamp = Date.now();
    const audioFilePath = path.join(os.tmpdir(), `doctordictate-audio-${timestamp}.webm`);
    fs.writeFileSync(audioFilePath, Buffer.from(audioBuffer));
    return { success: true, filePath: audioFilePath };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error saving audio blob:', error);
    return { success: false, error: message };
  }
});

// Placeholder handlers (retain compatibility with preload surface)
ipcMain.handle('start-recording', () => ({ success: false, error: 'start-recording not implemented in main process' }));
ipcMain.handle('stop-recording', () => ({ success: false, error: 'stop-recording not implemented in main process' }));
ipcMain.handle('get-settings', () => ({ success: false, error: 'get-settings not implemented' }));
ipcMain.handle('save-settings', () => ({ success: false, error: 'save-settings not implemented' }));
ipcMain.handle('show-error', (_event, message: string) => {
  console.error('Renderer error:', message);
  return { success: true };
});
ipcMain.handle('show-success', (_event, message: string) => {
  console.log('Renderer success:', message);
  return { success: true };
});
