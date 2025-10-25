const { FastMode } = require('./modes/FastMode');
const { AccurateMode } = require('./modes/AccurateMode');
const { MemoryMonitor } = require('./utils/MemoryMonitor');
const { ProgressReporter } = require('./utils/ProgressReporter');
const { SmartModeSelector } = require('./utils/SmartModeSelector');
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
      formattingManager,
      modeSelector,
    } = options;

    this.modes = modes instanceof Map ? modes : this.createDefaultModes();
    this.memoryMonitor = memoryMonitor || new MemoryMonitor();
    this.audioChunker = processors.audioChunker || new AudioChunker();
    this.vadProcessor = processors.vadProcessor || new VADProcessor();
    this.resultMerger = processors.resultMerger || new ResultMerger();
    this.progressReporterFactory =
      progressReporterFactory || ((context) => new ProgressReporter(context));
    this.formattingManager = formattingManager || null;
    this.modeSelector =
      modeSelector ||
      new SmartModeSelector({
        modes: this.modes,
      });
    if (this.modeSelector && typeof this.modeSelector === 'object') {
      this.modeSelector.modes = this.modes;
    }
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
    const autoMode = {
      key: 'auto',
      label: 'Smart (Auto)',
      description: 'Automatically selects Fast or Accurate based on audio length and device headroom.',
      badge: 'Recommended',
      config: { heuristics: this.modeSelector?.thresholds },
    };

    const configuredModes = Array.from(this.modes.values()).map((mode) => ({
      key: mode.key,
      label: mode.label,
      description: mode.description,
      config: mode.config,
    }));

    return [autoMode, ...configuredModes];
  }

  async transcribe({
    audioPath,
    mode = 'accurate',
    signal,
    progressReporter: providedReporter,
    metadata = {},
  }) {
    if (!audioPath) {
      throw new Error('audioPath is required for transcription');
    }

    const { selectedMode, decision } = await this.resolveMode(mode, {
      audioPath,
      metadata,
    });
    const { config } = selectedMode;

    const progressReporter =
      providedReporter ||
      this.progressReporterFactory({
        audioPath,
        mode: selectedMode.key,
        decision,
      });

    if (progressReporter && typeof progressReporter.updateContext === 'function') {
      progressReporter.updateContext({ mode: selectedMode.key, decision });
    }

    const engine = selectedMode.createEngine();

    this.throwIfAborted(signal);

    this.memoryMonitor.startMonitoring(config.performance.maxMemoryMB);
    progressReporter.start('initializing', { audioPath, mode: selectedMode.key });

    let segmentResult = null;
    const chunkResults = [];
    const startedAt = Date.now();

    try {
      progressReporter.start('mode-selection', {
        chosenMode: selectedMode.key,
        reason: decision?.reason,
      });

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

      let merged = await this.resultMerger.merge({
        chunks: chunkResults,
        duration: segmentResult.duration,
        mode: selectedMode.key,
        config,
      });

      if (this.formattingManager && merged.text) {
        progressReporter.advance('formatting', {
          stage: 'formatting',
          totalSegments: chunkResults.length,
        });

        try {
          const formatting = await this.formattingManager.format({
            transcript: merged.text,
            mode: config.formatting?.mode || selectedMode.key,
            metadata: {
              mode: selectedMode.key,
              duration: segmentResult.duration,
              config,
            },
          });

          merged = {
            ...merged,
            formatted: formatting.formatted,
            formattingMetadata: formatting.metadata,
            formattingSegments: formatting.segments,
          };
        } catch (formattingError) {
          progressReporter.advance('formatting', {
            stage: 'formatting-error',
            error: formattingError.message,
          });
          throw formattingError;
        }
      }

      const result = this.attachMetadata(merged, {
        mode: selectedMode.key,
        config,
        startedAt,
        decision,
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

  async resolveMode(requestedMode, context = {}) {
    if (this.modes.has(requestedMode) && requestedMode !== 'auto') {
      const explicitMode = this.modes.get(requestedMode);
      return {
        selectedMode: explicitMode,
        decision: { mode: explicitMode.key, reason: 'explicit' },
      };
    }

    const fallback = this.modes.get('accurate') || this.modes.values().next().value;
    if (!fallback) {
      throw new Error('No transcription modes configured');
    }

    if (!this.modeSelector) {
      return {
        selectedMode: fallback,
        decision: { mode: fallback.key, reason: 'fallback' },
      };
    }

    const decision = await this.modeSelector.decide({
      requestedMode,
      audioPath: context.audioPath,
      metadata: context.metadata,
      availableModes: this.modes,
    });

    const resolvedMode = this.modes.get(decision.mode) || fallback;
    return {
      selectedMode: resolvedMode,
      decision: { ...decision, mode: resolvedMode.key },
    };
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

  attachMetadata(result, { mode, config, startedAt, decision }) {
    const now = Date.now();
    const processingTimeMs = startedAt ? now - startedAt : undefined;
    const metadata = {
      ...((result && result.metadata) || {}),
      mode,
      engine: config.whisper?.implementation || 'unknown',
      processingTimeMs,
      peakMemoryMB: this.memoryMonitor.getPeakUsage(),
      formatting: result?.formattingMetadata,
      modeDecision: decision,
    };

    return {
      text: result?.text || result?.raw || '',
      segments: result?.segments || [],
      duration: result?.duration,
      metadata,
      raw: result?.raw,
      corrected: result?.corrected,
      formatted: result?.formatted,
      formattingSegments: result?.formattingSegments,
    };
  }
}

module.exports = { TranscriptionManager };
