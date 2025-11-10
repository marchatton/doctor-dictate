import os from 'os';

type WhisperConfig = {
  model: string;
  threads: number;
  parallel: number;
  chunkSize: number;
  overlap: number;
};

type OllamaConfig = {
  model: string;
  temperature: number;
  numPredict: number;
  numCtx: number;
  timeout: number;
};

type VadConfig = {
  enabled: boolean;
  threshold: number;
  debounce: number;
};

type ExpectedMetrics = {
  speed: string;
  accuracy: string;
  ramUsage: string;
  formatCompliance: string;
};

type ProcessingMode = {
  name: string;
  description: string;
  whisper: WhisperConfig;
  ollama: OllamaConfig;
  vad: VadConfig;
  expected: ExpectedMetrics;
};

export const ProcessingModes: Record<'FAST' | 'ACCURATE', ProcessingMode> = {
  FAST: {
    name: 'Fast',
    description: 'Quick draft - 3-4 minutes for 30-min audio',
    whisper: {
      model: 'base.en',
      threads: Math.max(1, os.cpus().length - 2),
      parallel: 4,
      chunkSize: 15,
      overlap: 2,
    },
    ollama: {
      model: 'qwen2.5:1.5b',
      temperature: 0.1,
      numPredict: 10000,
      numCtx: 32768,
      timeout: 90_000,
    },
    vad: {
      enabled: true,
      threshold: 0.6,
      debounce: 500,
    },
    expected: {
      speed: '7-10x real-time',
      accuracy: '85%',
      ramUsage: '2-3GB',
      formatCompliance: '80%'
    },
  },
  ACCURATE: {
    name: 'High Accuracy',
    description: 'Best quality - 6-8 minutes for 30-min audio',
    whisper: {
      model: 'small.en',
      threads: Math.max(1, os.cpus().length - 2),
      parallel: 2,
      chunkSize: 30,
      overlap: 5,
    },
    ollama: {
      model: 'qwen2.5:1.5b',
      temperature: 0.1,
      numPredict: 12000,
      numCtx: 32768,
      timeout: 120_000,
    },
    vad: {
      enabled: true,
      threshold: 0.4,
      debounce: 1000,
    },
    expected: {
      speed: '3-5x real-time',
      accuracy: '95%',
      ramUsage: '3.5-4.5GB',
      formatCompliance: '90%',
    },
  },
};

export const AutoModeSelector = {
  selectMode(recordingDuration: number): ProcessingMode {
    if (recordingDuration < 300) {
      return ProcessingModes.ACCURATE;
    }
    if (recordingDuration > 1800) {
      return ProcessingModes.FAST;
    }
    return ProcessingModes.ACCURATE;
  },
};

export type { ProcessingMode };
