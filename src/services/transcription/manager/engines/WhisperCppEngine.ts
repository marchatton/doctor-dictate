import fs from 'fs';
import os from 'os';
import path from 'path';

import type { WhisperTranscriber } from '../../transcription/whisper';

type WhisperSettings = {
  language?: string;
  beamSize?: number;
  temperature?: number;
  threads?: number;
  maxContext?: number;
  maxLen?: number;
  splitOnWord?: boolean;
  noFallback?: boolean;
  suppressBlank?: boolean;
  suppressNonSpeechTokens?: boolean;
  [key: string]: unknown;
};

type WhisperConfig = {
  whisper?: {
    model?: string;
    modelPath?: string;
    settings?: WhisperSettings;
  };
  [key: string]: unknown;
};

type BackendSegment = {
  start?: number;
  end?: number;
  t0?: number;
  t1?: number;
  text?: string;
  speech?: string;
};

type WhisperBackendResult = string | BackendSegment[] | { segments?: BackendSegment[]; text?: string };

type WhisperBackend = (
  chunkPath: string,
  options: { modelPath: string; whisperOptions: Record<string, unknown> },
) => Promise<WhisperBackendResult>;

type ChunkInput = {
  path: string;
  start?: number;
  startTime?: number;
  end?: number;
  duration?: number;
};

type WhisperCppEngineOptions = {
  config?: WhisperConfig | null;
  transcriber?: Partial<WhisperTranscriber> | null;
  whisperFactory?: () => Promise<WhisperBackend> | WhisperBackend;
  logger?: Pick<Console, 'info' | 'error' | 'debug' | 'warn'>;
};

export class WhisperCppEngine {
  private config: WhisperConfig | null;

  private readonly transcriber: Partial<WhisperTranscriber> | null;

  private readonly whisperFactory?: () => Promise<WhisperBackend> | WhisperBackend;

  private readonly logger: Pick<Console, 'info' | 'error' | 'debug' | 'warn'>;

  private whisper: WhisperBackend | null;

  constructor(options: WhisperCppEngineOptions = {}) {
    this.config = options.config || null;
    this.transcriber = options.transcriber || null;
    this.whisperFactory = options.whisperFactory;
    this.logger = options.logger || console;
    this.whisper = null;
  }

  async initialize(config?: WhisperConfig): Promise<void> {
    this.config = config || this.config;

    if (this.transcriber?.initializeWhisper) {
      await this.transcriber.initializeWhisper();
      return;
    }

    if (this.whisper) {
      return;
    }

    this.whisper = await this.loadBackend();
  }

  async transcribeChunk(
    chunk: ChunkInput,
    context: { config?: WhisperConfig } = {},
  ) {
    if (!chunk || !chunk.path) {
      throw new Error('Chunk path is required for WhisperCppEngine');
    }

    const config = context.config || this.config || {};
    const whisperConfig = config.whisper || {};
    const modelPath = resolveModelPath(whisperConfig.modelPath);

    if (!fs.existsSync(modelPath)) {
      throw new Error(`Whisper model not found at ${modelPath}`);
    }

    const chunkStart = chunk.start ?? chunk.startTime ?? 0;
    const chunkEnd = chunk.end ?? chunkStart + (chunk.duration || 0);

    const result = await this.invokeBackend(chunk.path, {
      modelPath,
      whisper: whisperConfig,
      chunkStart,
      chunkEnd,
    });

    const segments = normalizeSegments(result, { chunkStart, chunkEnd });
    const text = segments.map((segment) => segment.text).join(' ').trim();

    return {
      text,
      raw: text,
      segments,
      start: chunkStart,
      end: chunkEnd,
      metadata: {
        engine: 'whisper.cpp',
        model: whisperConfig.model,
      },
    };
  }

  async finalize(): Promise<void> {
    // no-op
  }

  async cleanup(): Promise<void> {
    // no-op
  }

  private async loadBackend(): Promise<WhisperBackend> {
    if (typeof this.whisperFactory === 'function') {
      const backend = await this.whisperFactory();
      return backend as WhisperBackend;
    }

    const module = await import('whisper-node');
    return (module.default || module) as WhisperBackend;
  }

  private async invokeBackend(
    chunkPath: string,
    context: { chunkStart: number; chunkEnd: number; modelPath: string; whisper: Record<string, unknown> },
  ) {
    if (this.transcriber?.runWhisper) {
      const text = await this.transcriber.runWhisper(chunkPath);
      return [{ start: context.chunkStart, end: context.chunkEnd, text }];
    }

    if (!this.whisper) {
      this.whisper = await this.loadBackend();
    }

    const whisperOptions = buildWhisperOptions((context.whisper?.settings as WhisperSettings) || {});
    return this.whisper(chunkPath, {
      modelPath: context.modelPath,
      whisperOptions,
    });
  }
}

function resolveModelPath(modelPath?: string) {
  if (!modelPath) {
    return path.resolve(process.cwd(), 'models/whisper/ggml-base.en.bin');
  }
  if (path.isAbsolute(modelPath)) {
    return modelPath;
  }
  return path.resolve(process.cwd(), modelPath);
}

function buildWhisperOptions(settings: WhisperSettings) {
  const cpuCount = os.cpus().length;
  return {
    language: settings.language || 'en',
    beam_size: settings.beamSize ?? 1,
    temperature: settings.temperature ?? 0,
    threads: settings.threads || Math.max(1, cpuCount - 1),
    max_context: settings.maxContext ?? -1,
    max_len: settings.maxLen ?? 0,
    split_on_word: settings.splitOnWord ?? true,
    no_fallback: settings.noFallback ?? false,
    suppress_blank: settings.suppressBlank ?? true,
    suppress_non_speech_tokens: settings.suppressNonSpeechTokens ?? true,
  };
}

function normalizeSegments(
  result: WhisperBackendResult | null | undefined,
  { chunkStart, chunkEnd }: { chunkStart: number; chunkEnd: number },
) {
  if (!result) {
    return [createFallbackSegment('', chunkStart, chunkEnd)];
  }

  if (typeof result === 'string') {
    return [createFallbackSegment(result, chunkStart, chunkEnd)];
  }

  const segmentsArray: BackendSegment[] = Array.isArray(result)
    ? result
    : Array.isArray(result?.segments)
    ? result?.segments ?? []
    : [];

  if (segmentsArray.length === 0) {
    const text = result.text || '';
    return [createFallbackSegment(text, chunkStart, chunkEnd)];
  }

  return segmentsArray.map((segment: BackendSegment) => ({
    start: segment.start ?? segment.t0 ?? chunkStart,
    end: segment.end ?? segment.t1 ?? chunkEnd,
    text: (segment.text || segment.speech || '').trim(),
  }));
}

function createFallbackSegment(text: string, start: number, end: number) {
  return {
    start,
    end,
    text: (text || '').trim(),
  };
}

export default WhisperCppEngine;
