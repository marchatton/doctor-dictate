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
  autoSave: (data) => ipcRenderer.invoke('auto-save', data),
  ensureDocumentsDir: () => ipcRenderer.invoke('ensure-documents-dir'),
  
  // Audio recording (we'll implement these later)
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  
  // Whisper transcription
  initializeWhisper: () => ipcRenderer.invoke('initialize-whisper'),
  validateWhisper: () => ipcRenderer.invoke('validate-whisper'),
  transcribeAudio: (audioFilePath) => ipcRenderer.invoke('transcribe-audio', audioFilePath),
  getConfidenceScore: (data) => ipcRenderer.invoke('get-confidence-score', data),
  resetTranscriptionState: () => ipcRenderer.invoke('reset-transcription-state'),
  
  // Model selection
  getWhisperModels: () => ipcRenderer.invoke('get-whisper-models'),
  setWhisperModel: (model) => ipcRenderer.invoke('set-whisper-model', model),
  
  // Listen for transcription progress updates
  onTranscriptionProgress: (callback) => {
    ipcRenderer.on('transcription-progress', (event, progress) => callback(progress));
  },
  removeTranscriptionProgressListener: () => {
    ipcRenderer.removeAllListeners('transcription-progress');
  },
  
  // Audio file handling
  saveAudioBlob: (audioBuffer) => ipcRenderer.invoke('save-audio-blob', audioBuffer),
  
  // Settings and preferences (we'll implement these later)
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  
  // Utility functions
  showError: (message) => ipcRenderer.invoke('show-error', message),
  showSuccess: (message) => ipcRenderer.invoke('show-success', message),
});

// Expose process information for debugging (don't override existing process)
contextBridge.exposeInMainWorld('appInfo', {
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.version,
});
