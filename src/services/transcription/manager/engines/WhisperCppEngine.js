const fs = require('fs');
const path = require('path');

class WhisperCppEngine {
  constructor(options = {}) {
    this.config = options.config || null;
    this.transcriber = options.transcriber || null;
    this.whisperFactory = options.whisperFactory || null;
    this.logger = options.logger || console;
    this.whisper = null;
  }

  async initialize(config) {
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

  async loadBackend() {
    if (typeof this.whisperFactory === 'function') {
      return this.whisperFactory();
    }

    const module = await import('whisper-node');
    return module.default || module;
  }

  async transcribeChunk(chunk, context = {}) {
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

  async invokeBackend(chunkPath, context) {
    if (this.transcriber?.runWhisper) {
      const text = await this.transcriber.runWhisper(chunkPath);
      return [{ start: context.chunkStart, end: context.chunkEnd, text }];
    }

    if (!this.whisper) {
      this.whisper = await this.loadBackend();
    }

    const whisperOptions = buildWhisperOptions(context.whisper?.settings || {});
    return this.whisper(chunkPath, {
      modelPath: context.modelPath,
      whisperOptions,
    });
  }

  async finalize() {
    // No-op for Whisper.cpp
  }

  async cleanup() {
    // No-op for Whisper.cpp
  }
}

function resolveModelPath(modelPath) {
  if (!modelPath) {
    return path.resolve(process.cwd(), 'models/whisper/ggml-base.en.bin');
  }
  if (path.isAbsolute(modelPath)) {
    return modelPath;
  }
  return path.resolve(process.cwd(), modelPath);
}

function buildWhisperOptions(settings) {
  const cpuCount = require('os').cpus().length;
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

function normalizeSegments(result, { chunkStart, chunkEnd }) {
  if (!result) {
    return [createFallbackSegment('', chunkStart, chunkEnd)];
  }

  if (typeof result === 'string') {
    return [createFallbackSegment(result, chunkStart, chunkEnd)];
  }

  const segmentsArray = Array.isArray(result)
    ? result
    : Array.isArray(result.segments)
    ? result.segments
    : [];

  if (segmentsArray.length === 0) {
    const text = result.text || '';
    return [createFallbackSegment(text, chunkStart, chunkEnd)];
  }

  return segmentsArray.map((segment) => ({
    start: segment.start ?? segment.t0 ?? chunkStart,
    end: segment.end ?? segment.t1 ?? chunkEnd,
    text: (segment.text || segment.speech || '').trim(),
  }));
}

function createFallbackSegment(text, start, end) {
  return {
    start,
    end,
    text: (text || '').trim(),
  };
}

module.exports = { WhisperCppEngine };
