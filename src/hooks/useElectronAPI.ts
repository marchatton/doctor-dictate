import { useCallback } from 'react';

declare global {
  interface Window {
    electronAPI: {
      saveAudioBlob: (audioBuffer: ArrayBuffer) => Promise<{success: boolean, filePath?: string, error?: string}>;
      transcribeAudio: (
        request: string | { audioPath: string; mode?: string }
      ) => Promise<{success: boolean, transcript?: string, error?: string}>;
      listTranscriptionModes: () => Promise<{success: boolean, modes?: Array<{ key: string; label: string }>, error?: string}>;
      setWhisperModel: (model: string) => Promise<{success: boolean}>;
      onTranscriptionProgress: (callback: (progress: any) => void) => void;
      removeTranscriptionProgressListener: () => void;
      formatTranscript: (transcript: string, template?: string) => Promise<{success: boolean, formatted?: string, error?: string}>;
      saveFormattedNote: (content: string) => Promise<{success: boolean, filePath?: string, error?: string}>;
    };
  }
}

export function useElectronAPI() {
  const saveAudioBlob = useCallback(async (audioBlob: Blob) => {
    const arrayBuffer = await audioBlob.arrayBuffer();
    return window.electronAPI.saveAudioBlob(arrayBuffer);
  }, []);
  
  const transcribeAudio = useCallback(async (request: string | { audioPath: string; mode?: string }) => {
    return window.electronAPI.transcribeAudio(request);
  }, []);

  const listTranscriptionModes = useCallback(async () => {
    return window.electronAPI.listTranscriptionModes();
  }, []);
  
  const setWhisperModel = useCallback(async (model: string) => {
    return window.electronAPI.setWhisperModel(model);
  }, []);
  
  const formatTranscript = useCallback(async (transcript: string, template?: string) => {
    return window.electronAPI.formatTranscript(transcript, template);
  }, []);
  
  const saveFormattedNote = useCallback(async (content: string) => {
    return window.electronAPI.saveFormattedNote(content);
  }, []);
  
  const onTranscriptionProgress = useCallback((callback: (progress: any) => void) => {
    window.electronAPI.onTranscriptionProgress(callback);
  }, []);
  
  const removeTranscriptionProgressListener = useCallback(() => {
    window.electronAPI.removeTranscriptionProgressListener();
  }, []);
  
  return {
    saveAudioBlob,
    transcribeAudio,
    setWhisperModel,
    listTranscriptionModes,
    formatTranscript,
    saveFormattedNote,
    onTranscriptionProgress,
    removeTranscriptionProgressListener
  };
}