import { FasterWhisperBridge } from '../engines/FasterWhisperBridge';

type EngineFactory = (config: Record<string, unknown>) => unknown;

type ModeOptions = {
  config?: Record<string, unknown>;
  engineFactory?: EngineFactory | null;
};

export class AccurateMode {
  readonly key = 'accurate';

  readonly label = 'Accurate (Faster Whisper)';

  readonly description =
    'High accuracy transcription using the Python Faster Whisper bridge with VAD-driven segmentation.';

  readonly config: Record<string, unknown>;

  private readonly engineFactory: EngineFactory | null;

  constructor(options: ModeOptions = {}) {
    const overrides = options.config || {};

    this.config = {
      whisper: {
        implementation: 'faster-whisper',
        model: 'small.en',
        modelPath: './models/faster-whisper/small.en.bin',
        settings: {
          device: 'cpu',
          computeType: 'int8',
          beamSize: 3,
          temperature: 0.0,
          language: 'en',
          conditionOnPreviousText: true,
          compressionRatioThreshold: 2.4,
          logProbThreshold: -1.0,
          noSpeechThreshold: 0.6,
          wordTimestamps: true,
          prependPunctuations: '"\'"¿([{-',
          appendPunctuations: '"\'.。,，!！?？:：")]}、',
        },
      },
      chunking: {
        chunkSize: 30,
        overlap: 2,
        maxBufferSize: 30,
        method: 'vad',
      },
      vad: {
        enabled: true,
        minSilenceDurationMs: 500,
        minSpeechDurationMs: 250,
        speechPadMs: 200,
        method: 'silero',
      },
      llm: {
        model: 'qwen2.5:1.5b',
        endpoint: 'http://localhost:11434',
        settings: {
          temperature: 0.3,
          maxTokens: 1000,
          numCtx: 4096,
          numPredict: 1000,
          topK: 40,
          topP: 0.95,
          repeatPenalty: 1.1,
          seed: null,
        },
        timeout: 45000,
      },
      performance: {
        maxMemoryMB: 3584,
        targetProcessingRatio: 0.15,
        maxRetries: 3,
      },
    };

    this.config = mergeConfig(this.config, overrides);
    this.engineFactory = options.engineFactory || null;
  }

  createEngine() {
    if (typeof this.engineFactory === 'function') {
      return this.engineFactory(this.config);
    }

    return new FasterWhisperBridge({ config: this.config });
  }
}

export default AccurateMode;

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
