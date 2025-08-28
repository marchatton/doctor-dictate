// Mock Electron APIs for testing
module.exports = {
  app: {
    getVersion: jest.fn(() => '1.0.0'),
    getName: jest.fn(() => 'DoctorDictate'),
    getPath: jest.fn((path) => `/mock/${path}`),
    quit: jest.fn(),
    isPackaged: false,
    whenReady: jest.fn(() => Promise.resolve()),
    on: jest.fn()
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
          onHeadersReceived: jest.fn()
        }
      },
      on: jest.fn(),
      send: jest.fn()
    }
  })),
  ipcMain: {
    handle: jest.fn(),
    on: jest.fn()
  },
  ipcRenderer: {
    invoke: jest.fn(),
    on: jest.fn(),
    removeAllListeners: jest.fn(),
    send: jest.fn()
  },
  dialog: {
    showSaveDialog: jest.fn(() => Promise.resolve({ canceled: false, filePath: '/mock/file.txt' })),
    showOpenDialog: jest.fn(() => Promise.resolve({ canceled: false, filePaths: ['/mock/file.txt'] }))
  },
  contextBridge: {
    exposeInMainWorld: jest.fn()
  }
};