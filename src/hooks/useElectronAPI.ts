import { useCallback } from 'react';

declare global {
  interface Window {
    electronAPI: {
      saveAudioBlob: (audioBuffer: ArrayBuffer) => Promise<{success: boolean, filePath?: string, error?: string}>;
      transcribeAudio: (
        request: string | { audioPath: string; mode?: string }
      ) => Promise<{
        success: boolean;
        transcript?: string;
        formatted?: string;
        metadata?: Record<string, unknown>;
        formattingSegments?: Array<Record<string, unknown>>;
        error?: string;
      }>;
      listTranscriptionModes: () => Promise<{
        success: boolean;
        modes?: Array<{ key: string; label: string; description?: string; config?: Record<string, unknown> }>;
        error?: string;
      }>;
      setWhisperModel: (model: string) => Promise<{success: boolean}>;
      onTranscriptionProgress: (callback: (progress: any) => void) => void;
      removeTranscriptionProgressListener: () => void;
      formatTranscript: (
        transcript: string | { transcript: string; mode?: string; metadata?: Record<string, unknown> },
        template?: string
      ) => Promise<{
        success: boolean;
        formatted?: string;
        segments?: Array<Record<string, unknown>>;
        metadata?: Record<string, unknown>;
        error?: string;
      }>;
      saveFormattedNote: (
        content: string | { content: string; filename?: string }
      ) => Promise<{success: boolean, filePath?: string, path?: string, canceled?: boolean, error?: string}>;
      validateModelAssets: () => Promise<{
        success: boolean;
        results?: Array<{ key: string; valid: boolean; reason?: string }>;
        error?: string;
      }>;
      downloadModelAssets: (
        options?: { keys?: string[] }
      ) => Promise<{
        success: boolean;
        results?: Array<{ key?: string; status?: string; reason?: string }>;
        error?: string;
      }>;
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
  
  const formatTranscript = useCallback(
    async (
      transcript: string | { transcript: string; mode?: string; metadata?: Record<string, unknown> },
      template?: string
    ) => {
      return window.electronAPI.formatTranscript(transcript, template);
    },
    []
  );

  const saveFormattedNote = useCallback(async (content: string | { content: string; filename?: string }) => {
    return window.electronAPI.saveFormattedNote(content);
  }, []);

  const validateModelAssets = useCallback(async () => {
    return window.electronAPI.validateModelAssets();
  }, []);

  const downloadModelAssets = useCallback(async (options?: { keys?: string[] }) => {
    return window.electronAPI.downloadModelAssets(options);
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
    validateModelAssets,
    downloadModelAssets,
    onTranscriptionProgress,
    removeTranscriptionProgressListener
  };
}
