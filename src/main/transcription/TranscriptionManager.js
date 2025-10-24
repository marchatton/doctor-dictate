const { FastMode } = require('./modes/FastMode');
const { AccurateMode } = require('./modes/AccurateMode');
const { MemoryMonitor } = require('./utils/MemoryMonitor');
const { ProgressReporter } = require('./utils/ProgressReporter');
const { AudioChunker } = require('./processors/AudioChunker');
const { VADProcessor } = require('./processors/VADProcessor');
const { ResultMerger } = require('./processors/ResultMerger');

class TranscriptionManager {
  constructor(options = {}) {
    const {
      modes,
      memoryMonitor,
      processors = {},
      progressReporterFactory,
    } = options;

    this.modes = modes instanceof Map ? modes : this.createDefaultModes();
    this.memoryMonitor = memoryMonitor || new MemoryMonitor();
    this.audioChunker = processors.audioChunker || new AudioChunker();
    this.vadProcessor = processors.vadProcessor || new VADProcessor();
    this.resultMerger = processors.resultMerger || new ResultMerger();
    this.progressReporterFactory =
      progressReporterFactory || ((context) => new ProgressReporter(context));
  }

  createDefaultModes() {
    const fastMode = new FastMode();
    const accurateMode = new AccurateMode();
    return new Map([
      [fastMode.key, fastMode],
      [accurateMode.key, accurateMode],
    ]);
  }

  listModes() {
    return Array.from(this.modes.values()).map((mode) => ({
      key: mode.key,
      label: mode.label,
      description: mode.description,
      config: mode.config,
    }));
  }

  async transcribe({
    audioPath,
    mode = 'accurate',
    signal,
    progressReporter: providedReporter,
  }) {
    if (!audioPath) {
      throw new Error('audioPath is required for transcription');
    }

    const selectedMode = this.resolveMode(mode);
    const { config } = selectedMode;

    const progressReporter =
      providedReporter ||
      this.progressReporterFactory({ audioPath, mode: selectedMode.key });

    const engine = selectedMode.createEngine();

    this.throwIfAborted(signal);

    this.memoryMonitor.startMonitoring(config.performance.maxMemoryMB);
    progressReporter.start('initializing', { audioPath, mode: selectedMode.key });

    let segmentResult = null;
    const chunkResults = [];
    const startedAt = Date.now();

    try {
      if (typeof engine.initialize === 'function') {
        await engine.initialize(config);
      }

      segmentResult = await this.audioChunker.segment(
        audioPath,
        { chunkConfig: config.chunking, preprocess: config.preprocess },
        progressReporter
      );

      let chunks = segmentResult.chunks;
      if (config.vad && config.vad.enabled !== false && chunks.length > 0) {
        progressReporter.advance('vad', {
          total: chunks.length,
          config: config.vad,
        });
        chunks = await this.vadProcessor.apply(chunks, config.vad, progressReporter);
      }

      const processedChunks = await this.processChunks({
        chunks,
        engine,
        config,
        signal,
        progressReporter,
        startedAt,
      });
      chunkResults.push(...processedChunks);

      if (typeof engine.finalize === 'function') {
        await engine.finalize(chunkResults, { config });
      }

      const merged = await this.resultMerger.merge({
        chunks: chunkResults,
        duration: segmentResult.duration,
        mode: selectedMode.key,
        config,
      });

      const result = this.attachMetadata(merged, {
        mode: selectedMode.key,
        config,
        startedAt,
      });

      progressReporter.complete(result);
      return result;
    } catch (error) {
      progressReporter.fail(error);
      throw error;
    } finally {
      this.memoryMonitor.stopMonitoring();
      await Promise.allSettled([
        typeof engine.cleanup === 'function' ? engine.cleanup() : undefined,
        segmentResult &&
          typeof this.audioChunker.cleanup === 'function'
          ? this.audioChunker.cleanup(segmentResult)
          : undefined,
      ]);
    }
  }

  resolveMode(requestedMode) {
    if (this.modes.has(requestedMode)) {
      return this.modes.get(requestedMode);
    }

    const fallback = this.modes.get('accurate') || this.modes.values().next().value;
    if (!fallback) {
      throw new Error('No transcription modes configured');
    }

    return fallback;
  }

  async processChunks({
    chunks,
    engine,
    config,
    signal,
    progressReporter,
    startedAt,
  }) {
    const results = [];
    const total = chunks.length;
    const chunkStart = Date.now();

    for (let index = 0; index < total; index += 1) {
      this.throwIfAborted(signal);

      if (this.memoryMonitor.isNearLimit()) {
        await this.memoryMonitor.requestTrim();
      }

      const chunk = chunks[index];
      const chunkResult = await engine.transcribeChunk(chunk, {
        index,
        total,
        config,
        signal,
      });

      const normalized = {
        ...chunkResult,
        index,
        chunk,
        start: chunkResult?.start ?? chunk.start ?? chunk.startTime ?? 0,
        end:
          chunkResult?.end ??
          chunk.end ??
          (chunk.start ?? chunk.startTime ?? 0) + (chunk.duration || 0),
      };
      results.push(normalized);

      const elapsed = Date.now() - chunkStart;
      const averagePerChunk = elapsed / (index + 1);
      const remaining = total - (index + 1);
      const estimatedRemainingMs = Math.max(0, remaining * averagePerChunk);

      progressReporter.chunkProgress({
        current: index + 1,
        total,
        chunk: normalized.chunk,
        startedAt,
        estimatedMsRemaining: estimatedRemainingMs,
      });
    }

    return results;
  }

  throwIfAborted(signal) {
    if (signal?.aborted) {
      const reason =
        typeof signal.reason === 'string'
          ? signal.reason
          : signal.reason?.message || 'Transcription aborted';
      const error = new Error(reason);
      error.name = 'AbortError';
      throw error;
    }
  }

  attachMetadata(result, { mode, config, startedAt }) {
    const now = Date.now();
    const processingTimeMs = startedAt ? now - startedAt : undefined;
    const metadata = {
      ...((result && result.metadata) || {}),
      mode,
      engine: config.whisper?.implementation || 'unknown',
      processingTimeMs,
      peakMemoryMB: this.memoryMonitor.getPeakUsage(),
    };

    return {
      text: result?.text || result?.raw || '',
      segments: result?.segments || [],
      duration: result?.duration,
      metadata,
      raw: result?.raw,
      corrected: result?.corrected,
      formatted: result?.formatted,
    };
  }
}

module.exports = { TranscriptionManager };
