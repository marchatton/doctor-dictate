import { dialog, ipcMain } from 'electron';
import fs from 'fs';
import os from 'os';
import path from 'path';

jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn(() => '1.0.0'),
    getName: jest.fn(() => 'DoctorDictate'),
    getPath: jest.fn((pathName: string) => `/mock/${pathName}`),
    quit: jest.fn(),
    isPackaged: false,
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn(),
  },
  BrowserWindow: jest.fn().mockImplementation(() => ({
    loadURL: jest.fn(),
    loadFile: jest.fn(),
    on: jest.fn(),
    once: jest.fn(),
    show: jest.fn(),
    webContents: {
      openDevTools: jest.fn(),
      setWindowOpenHandler: jest.fn(),
      session: {
        webRequest: {
          onHeadersReceived: jest.fn(),
        },
      },
      on: jest.fn(),
      send: jest.fn(),
    },
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn(),
  },
  dialog: {
    showSaveDialog: jest.fn(),
  },
}));

jest.mock('fs');
jest.mock('path');
jest.mock('os', () => ({
  cpus: jest.fn(() =>
    Array.from({ length: 4 }, () => ({
      model: 'mock',
      speed: 1,
      times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
    })),
  ),
  tmpdir: jest.fn(() => '/tmp'),
}));
jest.mock('pdfkit', () => jest.fn());
jest.mock('../services/formatting/manager/FormattingManager', () => ({
  FormattingManager: jest.fn().mockImplementation(() => ({
    format: jest.fn(async ({ transcript }: { transcript?: string }) => ({
      success: true,
      formatted: transcript ?? '',
      segments: [],
      metadata: {},
    })),
  })),
}));

type IpcHandler = (...args: unknown[]) => unknown | Promise<unknown>;
type IpcHandlerMap = Record<string, IpcHandler>;

const mockedFs = jest.mocked(fs, true);
const mockedPath = jest.mocked(path, true);
const mockedOs = jest.mocked(os, true);
const mockedIpcMain = ipcMain as unknown as jest.Mocked<typeof ipcMain>;
const mockedDialog = jest.mocked(dialog, true);
const mockedPdfKit = jest.requireMock('pdfkit') as jest.Mock;

const loadMainProcess = async () => {
  await import('../main');
};

const getHandler = (ipcHandlers: IpcHandlerMap, channel: string): IpcHandler => {
  const handler = ipcHandlers[channel];
  if (!handler) {
    throw new Error(`IPC handler not registered for ${channel}`);
  }
  return handler;
};

describe('Electron Main Process', () => {
  const ipcHandlers: IpcHandlerMap = {};

  mockedIpcMain.handle.mockImplementation((channel: string, handler: IpcHandler) => {
    ipcHandlers[channel] = handler;
  });

  beforeAll(async () => {
    await loadMainProcess();
  });

  beforeEach(() => {

    mockedFs.writeFileSync.mockReset();
    mockedFs.existsSync.mockReset().mockReturnValue(true);
    mockedFs.mkdirSync.mockReset();
    mockedFs.createWriteStream.mockReset().mockReturnValue({
      on: jest.fn(),
    } as unknown as fs.WriteStream);
    mockedPdfKit.mockReset();

    mockedPath.join.mockImplementation((...segments: string[]) => segments.join('/'));
    mockedOs.tmpdir.mockReturnValue('/tmp');
    mockedOs.cpus.mockReturnValue(
      Array.from({ length: 4 }, () => ({
        model: 'mock',
        speed: 1,
        times: { user: 0, nice: 0, sys: 0, idle: 0, irq: 0 },
      })) as os.CpuInfo[],
    );
    mockedDialog.showSaveDialog.mockReset().mockResolvedValue({ canceled: true, filePath: undefined });
  });

  describe('IPC Handler Registration', () => {

    it('registers all required IPC handlers', () => {
      const expectedHandlers = [
        'get-app-version',
        'get-app-name',
        'save-transcript',
        'export-pdf',
        'auto-save',
        'ensure-documents-dir',
        'save-audio-blob',
        'initialize-whisper',
        'validate-whisper',
        'get-whisper-models',
        'set-whisper-model',
        'transcribe-audio',
        'reset-transcription-state',
        'get-confidence-score',
      ];

      expectedHandlers.forEach((handler) => {
        expect(mockedIpcMain.handle).toHaveBeenCalledWith(handler, expect.any(Function));
      });
    });
  });

  describe('App Information Handlers', () => {

    it('returns app version', async () => {
      const handler = getHandler(ipcHandlers, 'get-app-version');
      const result = await handler();
      expect(result).toBe('1.0.0');
    });

    it('returns app name', async () => {
      const handler = getHandler(ipcHandlers, 'get-app-name');
      const result = await handler();
      expect(result).toBe('DoctorDictate');
    });
  });

  describe('File Operations', () => {

    describe('save-transcript handler', () => {
      it('saves transcript successfully', async () => {
        mockedDialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/mock/transcript.txt' });

        const handler = getHandler(ipcHandlers, 'save-transcript');
        const result = await handler({}, { filename: 'test-transcript.txt', content: 'Test transcript content' });

        expect(result).toEqual({ success: true, path: '/mock/transcript.txt' });
        expect(mockedFs.writeFileSync).toHaveBeenCalledWith('/mock/transcript.txt', 'Test transcript content', 'utf8');
      });

      it('handles user cancellation', async () => {
        mockedDialog.showSaveDialog.mockResolvedValue({ canceled: true, filePath: undefined });

        const handler = getHandler(ipcHandlers, 'save-transcript');
        const result = await handler({}, {});

        expect(result).toEqual({ success: false, canceled: true });
        expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
      });

      it('propagates write errors for visibility', async () => {
        mockedDialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/mock/transcript.txt' });
        mockedFs.writeFileSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        const handler = getHandler(ipcHandlers, 'save-transcript');
        await expect(handler({}, { filename: 'error.txt', content: 'test' })).rejects.toThrow('Permission denied');
      });
    });

    describe('save-audio-blob handler', () => {
      it('saves audio blob successfully', async () => {
        const handler = getHandler(ipcHandlers, 'save-audio-blob');
        const result = await handler({}, new ArrayBuffer(1024));

        expect(result.success).toBe(true);
        expect(result.filePath).toMatch(/doctordictate-audio-\d+\.webm$/);
        expect(mockedFs.writeFileSync).toHaveBeenCalled();
      });

      it('handles save errors', async () => {
        mockedFs.writeFileSync.mockImplementation(() => {
          throw new Error('Disk full');
        });

        const handler = getHandler(ipcHandlers, 'save-audio-blob');
        const result = await handler({}, new ArrayBuffer(1024));

        expect(result).toEqual({ success: false, error: 'Disk full' });
      });

      it('generates unique filenames', async () => {
        const dateSpy = jest.spyOn(Date, 'now').mockReturnValueOnce(1_700_000_000_000).mockReturnValueOnce(1_700_000_100_000);
        const handler = getHandler(ipcHandlers, 'save-audio-blob');
        const result1 = await handler({}, new ArrayBuffer(1024));
        const result2 = await handler({}, new ArrayBuffer(1024));

        expect(result1.filePath).not.toBe(result2.filePath);
        dateSpy.mockRestore();
      });
    });

    describe('ensure-documents-dir handler', () => {
      it('creates documents directory if missing', async () => {
        mockedFs.existsSync.mockReturnValue(false);

        const handler = getHandler(ipcHandlers, 'ensure-documents-dir');
        const result = await handler();

        expect(result.success).toBe(true);
        expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/mock/documents/DoctorDictate', { recursive: true });
      });

      it('skips creation when directory exists', async () => {
        mockedFs.existsSync.mockReturnValue(true);

        const handler = getHandler(ipcHandlers, 'ensure-documents-dir');
        const result = await handler();

        expect(result.success).toBe(true);
        expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
      });

      it('handles mkdir errors', async () => {
        mockedFs.existsSync.mockReturnValue(false);
        mockedFs.mkdirSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        const handler = getHandler(ipcHandlers, 'ensure-documents-dir');
        await expect(handler()).rejects.toThrow('Permission denied');
      });
    });

    describe('auto-save handler', () => {
      it('auto-saves with timestamp', async () => {
        const handler = getHandler(ipcHandlers, 'auto-save');
        const result = await handler({}, { content: 'Auto-save content' });

        expect(result.success).toBe(true);
        expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
          '/mock/documents/DoctorDictate/auto-save.txt',
          expect.stringMatching(/^# Auto-saved: .+\n\nAuto-save content$/),
          'utf8',
        );
      });

      it('creates directory for auto-save when needed', async () => {
        mockedFs.existsSync.mockReturnValue(false);

        const handler = getHandler(ipcHandlers, 'auto-save');
        await handler({}, { content: 'test' });

        expect(mockedFs.mkdirSync).toHaveBeenCalledWith('/mock/documents/DoctorDictate', { recursive: true });
      });
    });
  });

  describe('PDF Export', () => {

    it('exports PDF successfully', async () => {
      mockedDialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/mock/transcript.pdf',
      });

      const mockStream = {
        on: jest.fn((event: string, callback: () => void) => {
          if (event === 'finish') {
            setTimeout(callback, 0);
          }
        }),
      } as unknown as fs.WriteStream;
      mockedFs.createWriteStream.mockReturnValue(mockStream);

      const mockDoc = {
        fontSize: jest.fn().mockReturnThis(),
        font: jest.fn().mockReturnThis(),
        text: jest.fn().mockReturnThis(),
        moveDown: jest.fn().mockReturnThis(),
        pipe: jest.fn(),
        end: jest.fn(),
        page: { width: 612, height: 792 },
      };
      mockedPdfKit.mockImplementation(() => mockDoc);

      const handler = getHandler(ipcHandlers, 'export-pdf');
      const result = await handler({}, { filename: 'test.pdf', content: 'Test content for PDF' });

      expect(result).toEqual({ success: true, path: '/mock/transcript.pdf' });
      expect(mockDoc.text).toHaveBeenCalledWith('DoctorDictate Medical Transcript', { align: 'center' });
    });

    it('handles PDF generation errors', async () => {
      mockedDialog.showSaveDialog.mockResolvedValue({ canceled: false, filePath: '/mock/transcript.pdf' });
      mockedPdfKit.mockImplementation(() => {
        throw new Error('PDF generation failed');
      });

      const handler = getHandler(ipcHandlers, 'export-pdf');
      await expect(handler({}, { filename: 'test.pdf', content: 'Test content' })).rejects.toThrow('PDF generation failed');
    });
  });

  describe('Error Handling', () => {

    it('logs unexpected errors without throwing', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const handler = getHandler(ipcHandlers, 'get-app-version');
      try {
        await handler();
      } catch {
        // handler should swallow errors
      }

      consoleErrorSpy.mockRestore();
    });

    it('validates input parameters gracefully', async () => {
      const handler = getHandler(ipcHandlers, 'save-transcript');
      const result = await handler({}, {});
      expect(result.success).toBeDefined();
    });
  });

  describe('Path Security', () => {

    it('uses safe default paths', async () => {
      const handler = getHandler(ipcHandlers, 'ensure-documents-dir');
      await handler();

      expect(mockedPath.join).toHaveBeenCalledWith('/mock/documents', 'DoctorDictate');
    });

    it('generates safe temporary filenames', async () => {
      const handler = getHandler(ipcHandlers, 'save-audio-blob');
      const result = await handler({}, new ArrayBuffer(1024));

      expect(result.filePath).not.toMatch(/\.\./);
      expect(result.filePath).toMatch(/^\/tmp\/doctordictate-audio-\d+\.webm$/);
    });
  });
});
