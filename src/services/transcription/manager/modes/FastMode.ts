import os from 'os';

import { WhisperCppEngine } from '../engines/WhisperCppEngine';

type EngineFactory = (config: Record<string, unknown>) => unknown;

type ModeOptions = {
  config?: Record<string, unknown>;
  cpuCores?: number;
  engineFactory?: EngineFactory | null;
};

export class FastMode {
  readonly key = 'fast';

  readonly label = 'Fast (Whisper.cpp)';

  readonly description = 'Optimized for sub-2 minute turnaround using Whisper.cpp with deterministic chunking.';

  readonly config: Record<string, unknown>;

  private readonly engineFactory: EngineFactory | null;

  constructor(options: ModeOptions = {}) {
    const overrides = options.config || {};

    this.config = {
      whisper: {
        implementation: 'whisper.cpp',
        model: 'base.en',
        modelPath: './models/whisper/ggml-base.en.bin',
        settings: {
          beamSize: 1,
          temperature: 0.0,
          language: 'en',
          threads: Math.max(1, (options.cpuCores || os.cpus().length) - 1),
          processors: 1,
          maxContext: -1,
          maxLen: 0,
          splitOnWord: true,
          noFallback: false,
          suppressBlank: true,
          suppressNonSpeechTokens: true,
        },
      },
      chunking: {
        chunkSize: 15,
        overlap: 0.5,
        maxBufferSize: 30,
        method: 'fixed',
      },
      vad: {
        enabled: true,
        minSilenceDurationMs: 800,
        minSpeechDurationMs: 250,
        speechPadMs: 100,
      },
      llm: {
        model: 'tinyllama:1.1b',
        endpoint: 'http://localhost:11434',
        settings: {
          temperature: 0.1,
          maxTokens: 500,
          numCtx: 2048,
          numPredict: 500,
          topK: 40,
          topP: 0.9,
          repeatPenalty: 1.0,
          seed: 42,
        },
        timeout: 30000,
      },
      performance: {
        maxMemoryMB: 2048,
        targetProcessingRatio: 0.05,
        maxRetries: 2,
      },
    };

    this.config = mergeConfig(this.config, overrides);
    this.engineFactory = options.engineFactory || null;
  }

  createEngine() {
    if (typeof this.engineFactory === 'function') {
      return this.engineFactory(this.config);
    }

    return new WhisperCppEngine({ config: this.config });
  }
}

export default FastMode;

function mergeConfig(base: Record<string, unknown>, overrides: Record<string, unknown>) {
  if (!overrides) {
    return base;
  }

  const merged: Record<string, unknown> = { ...base };
  for (const key of Object.keys(overrides)) {
    const value = overrides[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = mergeConfig((base[key] as Record<string, unknown>) || {}, value as Record<string, unknown>);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}
