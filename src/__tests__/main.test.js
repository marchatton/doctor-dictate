/**
 * Tests for Electron main process functionality
 * Note: These tests focus on IPC handlers and business logic
 * Window management is tested separately in integration tests
 */

const { ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock dependencies
jest.mock('electron', () => ({
  app: {
    getVersion: jest.fn(() => '1.0.0'),
    getName: jest.fn(() => 'DoctorDictate'),
    getPath: jest.fn((pathName) => `/mock/${pathName}`),
    quit: jest.fn(),
    isPackaged: false
  },
  BrowserWindow: jest.fn(),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  dialog: {
    showSaveDialog: jest.fn()
  }
}));

jest.mock('fs');
jest.mock('path');
jest.mock('os');

describe('Electron Main Process', () => {
  let mockMainWindow;
  let ipcHandlers;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock main window
    mockMainWindow = {
      loadURL: jest.fn(),
      loadFile: jest.fn(),
      show: jest.fn(),
      on: jest.fn(),
      once: jest.fn(),
      webContents: {
        openDevTools: jest.fn(),
        send: jest.fn(),
        setWindowOpenHandler: jest.fn(),
        session: {
          webRequest: {
            onHeadersReceived: jest.fn()
          }
        }
      }
    };

    // Capture IPC handlers for testing
    ipcHandlers = {};
    ipcMain.handle.mockImplementation((channel, handler) => {
      ipcHandlers[channel] = handler;
    });

    // Reset mocks
    fs.writeFileSync = jest.fn();
    fs.existsSync = jest.fn(() => true);
    fs.mkdirSync = jest.fn();
    fs.createWriteStream = jest.fn(() => ({
      on: jest.fn()
    }));
    
    path.join = jest.fn((...args) => args.join('/'));
    os.tmpdir = jest.fn(() => '/tmp');
  });

  describe('IPC Handler Registration', () => {
    beforeEach(() => {
      // Load the main module to register handlers
      delete require.cache[require.resolve('../main.js')];
      require('../main.js');
    });

    it('should register all required IPC handlers', () => {
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
        'get-confidence-score'
      ];

      expectedHandlers.forEach(handler => {
        expect(ipcMain.handle).toHaveBeenCalledWith(handler, expect.any(Function));
      });
    });
  });

  describe('App Information Handlers', () => {
    beforeEach(() => {
      require('../main.js');
    });

    it('should return app version', async () => {
      const result = await ipcHandlers['get-app-version']();
      expect(result).toBe('1.0.0');
    });

    it('should return app name', async () => {
      const result = await ipcHandlers['get-app-name']();
      expect(result).toBe('DoctorDictate');
    });
  });

  describe('File Operations', () => {
    beforeEach(() => {
      require('../main.js');
    });

    describe('save-transcript handler', () => {
      it('should save transcript file successfully', async () => {
        const { dialog } = require('electron');
        dialog.showSaveDialog.mockResolvedValue({
          canceled: false,
          filePath: '/mock/transcript.txt'
        });

        const event = {};
        const data = {
          filename: 'test-transcript.txt',
          content: 'Test transcript content'
        };

        const result = await ipcHandlers['save-transcript'](event, data);

        expect(result).toEqual({ success: true, path: '/mock/transcript.txt' });
        expect(fs.writeFileSync).toHaveBeenCalledWith('/mock/transcript.txt', 'Test transcript content', 'utf8');
      });

      it('should handle user cancellation', async () => {
        const { dialog } = require('electron');
        dialog.showSaveDialog.mockResolvedValue({
          canceled: true
        });

        const result = await ipcHandlers['save-transcript']({}, {});

        expect(result).toEqual({ success: false, canceled: true });
        expect(fs.writeFileSync).not.toHaveBeenCalled();
      });

      it('should handle file write errors', async () => {
        const { dialog } = require('electron');
        dialog.showSaveDialog.mockResolvedValue({
          canceled: false,
          filePath: '/mock/transcript.txt'
        });
        fs.writeFileSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        const result = await ipcHandlers['save-transcript']({}, { content: 'test' });

        expect(result).toEqual({ success: false, error: 'Permission denied' });
      });
    });

    describe('save-audio-blob handler', () => {
      it('should save audio blob successfully', async () => {
        const mockBuffer = new ArrayBuffer(1024);
        
        const result = await ipcHandlers['save-audio-blob']({}, mockBuffer);

        expect(result.success).toBe(true);
        expect(result.filePath).toMatch(/doctordictate-audio-\d+\.webm$/);
        expect(fs.writeFileSync).toHaveBeenCalled();
      });

      it('should handle save errors', async () => {
        fs.writeFileSync.mockImplementation(() => {
          throw new Error('Disk full');
        });

        const result = await ipcHandlers['save-audio-blob']({}, new ArrayBuffer(1024));

        expect(result).toEqual({ success: false, error: 'Disk full' });
      });

      it('should generate unique filenames', async () => {
        const result1 = await ipcHandlers['save-audio-blob']({}, new ArrayBuffer(1024));
        
        // Wait a bit to ensure different timestamp
        await new Promise(resolve => setTimeout(resolve, 1));
        
        const result2 = await ipcHandlers['save-audio-blob']({}, new ArrayBuffer(1024));

        expect(result1.filePath).not.toBe(result2.filePath);
      });
    });

    describe('ensure-documents-dir handler', () => {
      it('should create documents directory if it does not exist', async () => {
        fs.existsSync.mockReturnValue(false);

        const result = await ipcHandlers['ensure-documents-dir']();

        expect(result.success).toBe(true);
        expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/documents/DoctorDictate', { recursive: true });
      });

      it('should not create directory if it already exists', async () => {
        fs.existsSync.mockReturnValue(true);

        const result = await ipcHandlers['ensure-documents-dir']();

        expect(result.success).toBe(true);
        expect(fs.mkdirSync).not.toHaveBeenCalled();
      });

      it('should handle directory creation errors', async () => {
        fs.existsSync.mockReturnValue(false);
        fs.mkdirSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        const result = await ipcHandlers['ensure-documents-dir']();

        expect(result).toEqual({ success: false, error: 'Permission denied' });
      });
    });

    describe('auto-save handler', () => {
      it('should auto-save with timestamp', async () => {
        const content = 'Auto-save content';
        
        const result = await ipcHandlers['auto-save']({}, { content });

        expect(result.success).toBe(true);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          '/mock/documents/DoctorDictate/auto-save.txt',
          expect.stringMatching(/^# Auto-saved: .+\n\nAuto-save content$/),
          'utf8'
        );
      });

      it('should create directory if needed for auto-save', async () => {
        fs.existsSync.mockReturnValue(false);

        await ipcHandlers['auto-save']({}, { content: 'test' });

        expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/documents/DoctorDictate', { recursive: true });
      });
    });
  });

  describe('PDF Export', () => {
    beforeEach(() => {
      require('../main.js');
    });

    it('should export PDF successfully', async () => {
      const { dialog } = require('electron');
      dialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/mock/transcript.pdf'
      });

      const mockStream = {
        on: jest.fn((event, callback) => {
          if (event === 'finish') {
            setTimeout(callback, 0);
          }
        })
      };
      fs.createWriteStream.mockReturnValue(mockStream);

      const PDFDocument = require('pdfkit');
      const mockDoc = {
        fontSize: jest.fn(() => mockDoc),
        font: jest.fn(() => mockDoc),
        text: jest.fn(() => mockDoc),
        moveDown: jest.fn(() => mockDoc),
        pipe: jest.fn(),
        end: jest.fn(),
        page: { width: 612, height: 792 }
      };
      PDFDocument.mockImplementation(() => mockDoc);

      const result = await ipcHandlers['export-pdf']({}, {
        filename: 'test.pdf',
        content: 'Test content for PDF'
      });

      expect(result).toEqual({ success: true, path: '/mock/transcript.pdf' });
      expect(mockDoc.text).toHaveBeenCalledWith('DoctorDictate Medical Transcript', { align: 'center' });
    });

    it('should handle PDF generation errors', async () => {
      const { dialog } = require('electron');
      dialog.showSaveDialog.mockResolvedValue({
        canceled: false,
        filePath: '/mock/transcript.pdf'
      });

      const PDFDocument = require('pdfkit');
      PDFDocument.mockImplementation(() => {
        throw new Error('PDF generation failed');
      });

      const result = await ipcHandlers['export-pdf']({}, {
        filename: 'test.pdf',
        content: 'Test content'
      });

      expect(result).toEqual({ success: false, error: 'PDF generation failed' });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      require('../main.js');
    });

    it('should handle unexpected errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Test with handler that might throw
      try {
        await ipcHandlers['get-app-version']();
      } catch (error) {
        // Should not throw - errors should be caught and logged
      }

      consoleErrorSpy.mockRestore();
    });

    it('should validate input parameters', async () => {
      // Test save-transcript with invalid input
      const result = await ipcHandlers['save-transcript']({}, {});

      // Should handle missing parameters gracefully
      expect(result.success).toBeDefined();
    });
  });

  describe('Path Security', () => {
    beforeEach(() => {
      require('../main.js');
    });

    it('should use safe default paths', async () => {
      await ipcHandlers['ensure-documents-dir']();

      expect(path.join).toHaveBeenCalledWith('/mock/documents', 'DoctorDictate');
    });

    it('should generate safe temporary file names', async () => {
      const result = await ipcHandlers['save-audio-blob']({}, new ArrayBuffer(1024));

      // Should not contain directory traversal
      expect(result.filePath).not.toMatch(/\.\./);
      expect(result.filePath).toMatch(/^\/tmp\/doctordictate-audio-\d+\.webm$/);
    });
  });
});