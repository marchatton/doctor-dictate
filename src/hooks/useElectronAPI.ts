import { useCallback } from 'react';

import type { ElectronAPI, TranscriptionProgressUpdate } from '../types/ipc';

const electronAPI: ElectronAPI = window.electronAPI;

export function useElectronAPI() {
  const saveAudioBlob = useCallback(async (audioBlob: Blob) => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    return electronAPI.saveAudioBlob(arrayBuffer);
  }, []);
  
  const transcribeAudio = useCallback(async (request: string | { audioPath: string; mode?: string }) => {
    return electronAPI.transcribeAudio(request);
  }, []);

  const listTranscriptionModes = useCallback(async () => {
    return electronAPI.listTranscriptionModes();
  }, []);
  
  const setWhisperModel = useCallback(async (model: string) => {
    return electronAPI.setWhisperModel(model);
  }, []);
  
  const formatTranscript = useCallback(
    async (
      transcript: string | { transcript: string; mode?: string; metadata?: Record<string, unknown> },
      template?: string
    ) => {
      return electronAPI.formatTranscript(transcript, template);
    },
    []
  );

  const saveFormattedNote = useCallback(async (content: string | { content: string; filename?: string }) => {
    return electronAPI.saveFormattedNote(content);
  }, []);

  const validateModelAssets = useCallback(async () => {
    return electronAPI.validateModelAssets();
  }, []);

  const downloadModelAssets = useCallback(async (options?: { keys?: string[] }) => {
    return electronAPI.downloadModelAssets(options);
  }, []);
  
  const onTranscriptionProgress = useCallback((callback: (progress: TranscriptionProgressUpdate) => void) => {
    electronAPI.onTranscriptionProgress(callback);
  }, []);
  
  const removeTranscriptionProgressListener = useCallback(() => {
    electronAPI.removeTranscriptionProgressListener();
  }, []);
  
  return {
    saveAudioBlob,
    transcribeAudio,
    setWhisperModel,
    listTranscriptionModes,
    formatTranscript,
    saveFormattedNote,
    validateModelAssets,
    downloadModelAssets,
    onTranscriptionProgress,
    removeTranscriptionProgressListener
  };
}
