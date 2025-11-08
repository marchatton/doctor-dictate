type Logger = Pick<Console, 'debug' | 'warn'>;

type ChunkSummary = {
  duration?: number;
  start?: number;
  end?: number;
  overlap?: number;
  [key: string]: unknown;
};

type VADConfig = {
  enabled?: boolean;
  minSpeechDurationMs?: number;
  minSilenceDurationMs?: number;
};

type ProgressReporterLike = {
  advance: (stage: string, payload: Record<string, unknown>) => void;
};

export class VADProcessor {
  private readonly logger: Logger;

  private config: VADConfig = {};

  constructor(options: { logger?: Logger } = {}) {
    this.logger = options.logger || console;
  }

  configure(config: VADConfig = {}): void {
    this.config = { ...config };
  }

  async apply(
    chunks: ChunkSummary[],
    overrideConfig: VADConfig = {},
    progressReporter?: ProgressReporterLike,
  ): Promise<ChunkSummary[]> {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return chunks || [];
    }

    const config = { ...this.config, ...overrideConfig };
    if (config.enabled === false) {
      return chunks;
    }

    const minSpeechSeconds = (config.minSpeechDurationMs || 0) / 1000;
    const minSilenceSeconds = (config.minSilenceDurationMs || 0) / 1000;
    const filtered: ChunkSummary[] = [];

    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const duration = chunk.duration ?? Math.max(0, (Number(chunk.end) || 0) - (Number(chunk.start) || 0));
      const shouldKeep = duration >= minSpeechSeconds;

      progressReporter?.advance('vad', {
        processed: index + 1,
        total: chunks.length,
        dropped: shouldKeep ? 0 : 1,
      });

      if (!shouldKeep) {
        this.logger.debug?.('[VAD] Dropping chunk below speech threshold', {
          index,
          duration,
          minSpeechSeconds,
        });
        continue;
      }

      filtered.push({
        ...chunk,
        vad: {
          included: true,
          minSilenceSeconds,
          minSpeechSeconds,
        },
      });
    }

    if (filtered.length === 0) {
      this.logger.warn?.('[VAD] All chunks filtered; returning original segments');
      return chunks;
    }

    return filtered;
  }
}

export default VADProcessor;
