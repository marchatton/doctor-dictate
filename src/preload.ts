import { contextBridge, ipcRenderer } from 'electron';

import type { ElectronAPI, FormatTranscriptRequest } from './types/ipc.js';

const api: ElectronAPI = {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppName: () => ipcRenderer.invoke('get-app-name'),
  saveTranscript: (data) => ipcRenderer.invoke('save-transcript', data),
  exportPDF: (data) => ipcRenderer.invoke('export-pdf', data),
  autoSave: (data) => ipcRenderer.invoke('auto-save', data),
  ensureDocumentsDir: () => ipcRenderer.invoke('ensure-documents-dir'),
  startRecording: () => ipcRenderer.invoke('start-recording'),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  initializeWhisper: () => ipcRenderer.invoke('initialize-whisper'),
  validateWhisper: () => ipcRenderer.invoke('validate-whisper'),
  transcribeAudio: (request) => ipcRenderer.invoke('transcribe-audio', request),
  listTranscriptionModes: () => ipcRenderer.invoke('list-transcription-modes'),
  getConfidenceScore: (data) => ipcRenderer.invoke('get-confidence-score', data),
  resetTranscriptionState: () => ipcRenderer.invoke('reset-transcription-state'),
  formatTranscript: (payload: FormatTranscriptRequest, _template?: string) =>
    ipcRenderer.invoke('format-transcript', payload),
  saveFormattedNote: (data) => ipcRenderer.invoke('save-formatted-note', data),
  getWhisperModels: () => ipcRenderer.invoke('get-whisper-models'),
  setWhisperModel: (model) => ipcRenderer.invoke('set-whisper-model', model),
  validateModelAssets: () => ipcRenderer.invoke('validate-model-assets'),
  downloadModelAssets: (options) => ipcRenderer.invoke('download-model-assets', options),
  onTranscriptionProgress: (callback) => {
    ipcRenderer.on('transcription-progress', (_event, progress) => callback(progress));
  },
  removeTranscriptionProgressListener: () => {
    ipcRenderer.removeAllListeners('transcription-progress');
  },
  saveAudioBlob: (audioBuffer) => ipcRenderer.invoke('save-audio-blob', audioBuffer),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),
  showError: (message) => ipcRenderer.invoke('show-error', message),
  showSuccess: (message) => ipcRenderer.invoke('show-success', message),
};

contextBridge.exposeInMainWorld('electronAPI', api);

contextBridge.exposeInMainWorld('appInfo', {
  platform: process.platform,
  arch: process.arch,
  nodeVersion: process.version,
});
