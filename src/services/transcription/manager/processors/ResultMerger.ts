import AudioProcessor from '../../../audio/processor';

type ChunkSummary = {
  text?: string;
  chunk?: { overlap?: number; index?: number };
  index?: number;
  corrected?: string;
  formatted?: string;
  segments?: Array<Record<string, unknown>>;
};

type MergePayload = {
  chunks: ChunkSummary[];
  duration?: number;
  mode?: string;
  config?: { whisper?: { implementation?: string } };
};

export class ResultMerger {
  private readonly audioProcessor: AudioProcessor;

  constructor(options: { audioProcessor?: AudioProcessor } = {}) {
    this.audioProcessor = options.audioProcessor || new AudioProcessor();
  }

  merge({ chunks, duration, mode, config }: MergePayload) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return { text: '', segments: [], duration: duration || 0, metadata: { mode } };
    }

    const transcriptionInputs = chunks.map((chunk) => ({
      text: chunk.text || '',
      overlap: chunk.chunk?.overlap || 0,
      index: chunk.index ?? chunk.chunk?.index ?? 0,
    }));

    const text = (this.audioProcessor.combineTranscriptions(transcriptionInputs) || '').trim();
    const segments = chunks.flatMap((chunk) => chunk.segments || []);

    return {
      text,
      raw: text,
      corrected: aggregateField(chunks, 'corrected') || text,
      formatted: aggregateField(chunks, 'formatted'),
      segments,
      duration,
      metadata: {
        mode,
        engine: config?.whisper?.implementation,
      },
    };
  }
}

export default ResultMerger;

function aggregateField(chunks: ChunkSummary[], field: 'corrected' | 'formatted'): string | undefined {
  const values = chunks
    .map((chunk) => chunk[field])
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  return values.length > 0 ? values.join(' ') : undefined;
}
