const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  
  // File operations
  saveTranscript: (data) => ipcRenderer.invoke('save-transcript', data),
  exportPDF: (data) => ipcRenderer.invoke('export-pdf', data),
  ensureDocumentsDir: () => ipcRenderer.invoke('ensure-documents-dir'),
  
  // Audio recording (we'll implement these later)
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  
  // Whisper transcription (we'll implement these later)
  transcribeAudio: (audioData) => ipcRenderer.invoke('transcribe-audio', audioData),
  getTranscriptionProgress: () => ipcRenderer.invoke('get-transcription-progress'),
  
  // Settings and preferences (we'll implement these later)
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  
  // Utility functions
  showError: (message) => ipcRenderer.invoke('show-error', message),
  showSuccess: (message) => ipcRenderer.invoke('show-success', message),
});

// Expose a safe version of console for debugging
contextBridge.exposeInMainWorld('console', {
  log: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
});

// Expose process information for debugging
contextBridge.exposeInMainWorld('process', {
  platform: process.platform,
  arch: process.arch,
  version: process.version,
});
