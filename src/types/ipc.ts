export type TranscriptionModeInfo = {
  key: string;
  label: string;
  description?: string;
  details?: string[];
  badge?: string;
  config?: Record<string, unknown>;
};

export type TranscriptionProgressUpdate = {
  mode?: string;
  stage?: string;
  status?: string;
  percent?: number;
  message?: string;
  decision?: string;
  current?: number;
  total?: number;
  estimatedMsRemaining?: number;
  error?: string;
  metadata?: Record<string, unknown>;
};

export type SaveTranscriptPayload = {
  filename: string;
  content: string;
};

export type FormatTranscriptRequest =
  | string
  | {
      transcript: string;
      mode?: string;
      metadata?: Record<string, unknown>;
    };

export type ElectronAPI = {
  getAppVersion: () => Promise<string>;
  getAppName: () => Promise<string>;
  saveTranscript: (
    payload: SaveTranscriptPayload,
  ) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
  exportPDF: (
    payload: SaveTranscriptPayload,
  ) => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
  autoSave: (payload: { content: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
  ensureDocumentsDir: () => Promise<{ success: boolean; path?: string; error?: string }>;
  startRecording: () => Promise<{ success: boolean; error?: string }>;
  stopRecording: () => Promise<{ success: boolean; error?: string }>;
  initializeWhisper: () => Promise<{ success: boolean; message?: string; error?: string }>;
  validateWhisper: () => Promise<{ success: boolean; available?: boolean; error?: string }>;
  transcribeAudio: (
    request: string | { audioPath: string; mode?: string }
  ) => Promise<{
    success: boolean;
    transcript?: string;
    formatted?: string;
    metadata?: Record<string, unknown>;
    formattingSegments?: Array<Record<string, unknown>>;
    corrected?: string;
    raw?: string;
    error?: string;
  }>;
  listTranscriptionModes: () => Promise<{
    success: boolean;
    modes?: TranscriptionModeInfo[];
    error?: string;
  }>;
  getConfidenceScore: (payload: {
    rawText: string;
    correctedText: string;
    corrections: unknown;
  }) => Promise<{ success: boolean; confidence?: number; error?: string }>;
  resetTranscriptionState: () => Promise<{ success: boolean; error?: string }>;
  formatTranscript: (
    transcript: FormatTranscriptRequest,
    template?: string,
  ) => Promise<{
    success: boolean;
    formatted?: string;
    segments?: Array<Record<string, unknown>>;
    metadata?: Record<string, unknown>;
    error?: string;
  }>;
  saveFormattedNote: (
    content: string | { content: string; filename?: string },
  ) => Promise<{ success: boolean; filePath?: string; path?: string; canceled?: boolean; error?: string }>;
  getWhisperModels: () => Promise<{
    success: boolean;
    models?: Array<Record<string, unknown>>;
    current?: string;
    error?: string;
  }>;
  setWhisperModel: (model: string) => Promise<{ success: boolean; current?: string; error?: string }>;
  validateModelAssets: () => Promise<{
    success: boolean;
    results?: Array<{ key: string; valid: boolean; reason?: string }>;
    error?: string;
  }>;
  downloadModelAssets: (
    options?: { keys?: string[] },
  ) => Promise<{
    success: boolean;
    results?: Array<{ key?: string; status?: string; reason?: string }>;
    error?: string;
  }>;
  onTranscriptionProgress: (callback: (progress: TranscriptionProgressUpdate) => void) => void;
  removeTranscriptionProgressListener: () => void;
  saveAudioBlob: (audioBuffer: ArrayBuffer) => Promise<{ success: boolean; filePath?: string; error?: string }>;
  getSettings: () => Promise<{ success: boolean; error?: string }>;
  saveSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean; error?: string }>;
  showError: (message: string) => Promise<{ success: boolean }>;
  showSuccess: (message: string) => Promise<{ success: boolean }>;
};
