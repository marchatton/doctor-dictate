import AccurateMode from './modes/AccurateMode';
import FastMode from './modes/FastMode';
import AudioChunker from './processors/AudioChunker';
import ResultMerger from './processors/ResultMerger';
import VADProcessor from './processors/VADProcessor';
import { MemoryMonitor } from './utils/MemoryMonitor';
import { ProgressReporter } from './utils/ProgressReporter';
import { SmartModeSelector, ModeDecision } from './utils/SmartModeSelector';

type ModeConfig = {
  performance?: { maxMemoryMB?: number };
  chunking?: Record<string, unknown>;
  vad?: (Record<string, unknown> & { enabled?: boolean }) | undefined;
  whisper?: { implementation?: string; [key: string]: unknown };
  formatting?: { mode?: string } & Record<string, unknown>;
  [key: string]: unknown;
};

type ChunkDescriptor = {
  id?: string | number;
  path: string;
  start?: number;
  end?: number;
  duration?: number;
  [key: string]: unknown;
};

type ChunkTranscription = {
  text?: string;
  segments?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
};

type ModeEngine = {
  initialize?: (config?: ModeConfig) => Promise<void>;
  finalize?: (chunks: ChunkTranscription[], context: Record<string, unknown>) => Promise<void>;
  cleanup?: () => Promise<void>;
  transcribeChunk: (chunk: ChunkDescriptor, context: { config: ModeConfig }) => Promise<ChunkTranscription>;
};

type SegmentResult = {
  chunks: ChunkDescriptor[];
  duration: number;
};

type MergeResult = {
  text: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  formatted?: string;
  corrected?: string;
  raw?: string;
  segments?: Array<Record<string, unknown>>;
};

type TranscriptionMode = {
  key: string;
  label: string;
  description?: string;
  config: ModeConfig;
  createEngine: () => ModeEngine;
};

type ProcessorOverrides = {
  audioChunker?: AudioChunker;
  vadProcessor?: VADProcessor;
  resultMerger?: ResultMerger;
};

type TranscriptionManagerOptions = {
  modes?: Map<string, TranscriptionMode>;
  memoryMonitor?: MemoryMonitor;
  processors?: ProcessorOverrides;
  progressReporterFactory?: (context: Record<string, unknown>) => ProgressReporter;
  formattingManager?: {
    format: (payload: {
      transcript: string;
      mode: string;
      metadata: Record<string, unknown>;
    }) => Promise<{ formatted: string; metadata?: Record<string, unknown>; segments?: unknown[] }>;
  } | null;
  modeSelector?: SmartModeSelector;
};

export class TranscriptionManager {
  private readonly modes: Map<string, TranscriptionMode>;

  private readonly memoryMonitor: MemoryMonitor;

  private readonly audioChunker: AudioChunker;

  private readonly vadProcessor: VADProcessor;

  private readonly resultMerger: ResultMerger;

  private readonly progressReporterFactory: (context: Record<string, unknown>) => ProgressReporter;

  private readonly formattingManager: TranscriptionManagerOptions['formattingManager'];

  private readonly modeSelector: SmartModeSelector;

  constructor(options: TranscriptionManagerOptions = {}) {
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
    this.modeSelector = modeSelector || new SmartModeSelector({ modes: this.modes });
  }

  createDefaultModes(): Map<string, TranscriptionMode> {
    const fastMode = new FastMode();
    const accurateMode = new AccurateMode();
    return new Map([
      [fastMode.key, fastMode as unknown as TranscriptionMode],
      [accurateMode.key, accurateMode as unknown as TranscriptionMode],
    ]);
  }

  listModes() {
    const autoMode = {
      key: 'auto',
      label: 'Smart (Auto)',
      description: 'Automatically selects Fast or Accurate based on audio length and device headroom.',
      badge: 'Recommended',
      config: { heuristics: this.modeSelector.thresholds },
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
  }: {
    audioPath: string;
    mode?: string;
    signal?: AbortSignal;
    progressReporter?: ProgressReporter;
    metadata?: Record<string, unknown>;
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

    progressReporter.updateContext?.({ mode: selectedMode.key, decision });

    const engine = selectedMode.createEngine();

    this.throwIfAborted(signal);

    this.memoryMonitor.startMonitoring(config.performance?.maxMemoryMB);
    progressReporter.start('initializing', { audioPath, mode: selectedMode.key });

    let segmentResult: SegmentResult | null = null;
    const chunkResults: ChunkTranscription[] = [];
    try {
      progressReporter.start('mode-selection', {
        chosenMode: selectedMode.key,
        reason: decision?.reason,
      });

      if (typeof engine.initialize === 'function') {
        await engine.initialize(config);
      }

      segmentResult = await this.audioChunker.segment(audioPath, { chunkConfig: config.chunking }, progressReporter);

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
      });
      chunkResults.push(...processedChunks);

      if (typeof engine.finalize === 'function') {
        await engine.finalize(chunkResults, { config });
      }

      let merged = (await this.resultMerger.merge({
        chunks: chunkResults,
        duration: segmentResult.duration,
        mode: selectedMode.key,
        config,
      })) as MergeResult;

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
            error: (formattingError as Error).message,
          });
          throw formattingError;
        }
      }

      const result = this.attachMetadata(merged, {
        mode: selectedMode.key,
        config,
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
        typeof engine.cleanup === 'function' ? engine.cleanup() : Promise.resolve(),
        segmentResult ? this.audioChunker.cleanup(segmentResult) : Promise.resolve(),
      ]);
    }
  }

  private async resolveMode(
    requestedMode: string,
    { audioPath, metadata }: { audioPath: string; metadata: Record<string, unknown> },
  ) {
    if (requestedMode && requestedMode !== 'auto') {
      const selected = this.modes.get(requestedMode);
      if (!selected) {
        throw new Error(`Requested mode '${requestedMode}' is not available`);
      }
      return { selectedMode: selected, decision: null };
    }

    if (!this.modeSelector) {
      const fallback = [...this.modes.values()][0];
      if (!fallback) {
        throw new Error('No transcription modes configured');
      }
      return { selectedMode: fallback, decision: null };
    }

    const decision: ModeDecision = await this.modeSelector.decide({
      requestedMode,
      audioPath,
      metadata,
      availableModes: this.modes,
    });

    const selectedMode = this.modes.get(decision.mode);
    if (!selectedMode) {
      throw new Error(`Requested mode '${decision.mode}' is not available`);
    }

    return { selectedMode, decision };
  }

  private async processChunks({
    chunks,
    engine,
    config,
    signal,
    progressReporter,
  }: {
    chunks: ChunkDescriptor[];
    engine: ModeEngine;
    config: ModeConfig;
    signal?: AbortSignal;
    progressReporter: ProgressReporter;
  }): Promise<ChunkTranscription[]> {
    const results: ChunkTranscription[] = [];
    for (let index = 0; index < chunks.length; index += 1) {
      this.throwIfAborted(signal);
      const chunk = chunks[index];
      progressReporter.chunkProgress({ current: index + 1, total: chunks.length });
      const transcription = await engine.transcribeChunk(chunk, { config });
      results.push(transcription);
    }
    return results;
  }

  private attachMetadata(merged: MergeResult, context: { mode: string; config: ModeConfig; decision: ModeDecision | null }) {
    const metadata: Record<string, unknown> = {
      ...merged.metadata,
      mode: context.mode,
      engine: merged.metadata?.engine || context.config?.whisper?.implementation,
      peakMemoryMB: this.memoryMonitor.getPeakUsage(),
    };

    if (context.decision) {
      metadata.modeDecision = context.decision;
    }

    return {
      ...merged,
      metadata,
    };
  }

  private throwIfAborted(signal?: AbortSignal): void {
    if (signal?.aborted) {
      const error = new Error('Operation aborted');
      (error as Error & { name?: string }).name = 'AbortError';
      throw error;
    }
  }

}

export default TranscriptionManager;
