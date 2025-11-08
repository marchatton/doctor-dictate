import AudioProcessor from '../../../audio/processor';

type ChunkConfig = {
  chunkSize?: number;
  windowSeconds?: number;
  overlap?: number;
  overlapSeconds?: number;
};

type SegmentOptions = {
  chunkConfig?: ChunkConfig;
};

type ProgressReporterLike = {
  start: (stage: string, payload?: Record<string, unknown>) => void;
  advance: (stage: string, payload?: Record<string, unknown>) => void;
};

type SegmentResult = {
  processedPath: string;
  duration: number;
  chunks: Array<{
    id: string | number;
    index: number;
    path: string;
    start: number;
    end: number;
    duration: number;
    overlap?: number;
    isFullFile: boolean;
  }>;
};

export class AudioChunker {
  private readonly audioProcessor: AudioProcessor;

  constructor(options: { audioProcessor?: AudioProcessor } = {}) {
    this.audioProcessor = options.audioProcessor || new AudioProcessor();
  }

  async segment(
    audioPath: string,
    options: SegmentOptions = {},
    progressReporter?: ProgressReporterLike,
  ): Promise<SegmentResult> {
    if (!audioPath) {
      throw new Error('audioPath is required for segmentation');
    }

    const { chunkConfig = {} } = options;
    const chunkDuration = chunkConfig.chunkSize || chunkConfig.windowSeconds || 30;
    const chunkOverlap = chunkConfig.overlap || chunkConfig.overlapSeconds || 2;

    this.audioProcessor.chunkDuration = chunkDuration;
    this.audioProcessor.chunkOverlap = chunkOverlap;

    progressReporter?.start('preprocessing', {
      audioPath,
      chunkDuration,
      chunkOverlap,
    });

    const processedPath = await this.audioProcessor.preprocessAudio(audioPath, (stage, percent, message) => {
      progressReporter?.advance('preprocessing', { stage, percent, message });
    });

    progressReporter?.advance('analysis', { stage: 'duration' });
    const duration = await this.audioProcessor.getAudioDuration(processedPath);

    progressReporter?.start('chunking', {
      duration,
      chunkDuration,
      chunkOverlap,
    });

    const rawChunks = await this.audioProcessor.createChunks(processedPath, duration, (stage, percent, message) => {
      progressReporter?.advance('chunking', { stage, percent, message });
    });

    const normalized = rawChunks.map((chunk, index) => ({
      id: chunk.id || chunk.index || `chunk-${index}`,
      index: chunk.index ?? index,
      path: chunk.path,
      start:
        typeof chunk.start === 'number'
          ? chunk.start
          : chunk.startTime ?? index * (chunkDuration - chunkOverlap),
      end:
        typeof chunk.end === 'number'
          ? chunk.end
          : (typeof chunk.start === 'number' ? chunk.start : chunk.startTime || 0) + (chunk.duration || chunkDuration),
      duration: chunk.duration || chunkDuration,
      overlap: chunk.overlap ?? chunkOverlap,
      isFullFile: Boolean(chunk.isFullFile),
    }));

    return {
      processedPath,
      duration,
      chunks: normalized,
    };
  }

  async cleanup(segmentResult: { chunks?: Array<{ path: string; isFullFile?: boolean }> }): Promise<void> {
    if (!segmentResult || !segmentResult.chunks) {
      return;
    }
    await this.audioProcessor.cleanup(segmentResult.chunks);
  }
}

export default AudioChunker;
