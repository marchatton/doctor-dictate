const { AudioProcessor } = require('../../../audio/processor.js');

class ResultMerger {
  constructor(options = {}) {
    this.audioProcessor = options.audioProcessor || new AudioProcessor();
  }

  merge({ chunks, duration, mode, config }) {
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
      corrected: chunkAggregateField(chunks, 'corrected') || text,
      formatted: chunkAggregateField(chunks, 'formatted'),
      segments,
      duration,
      metadata: {
        mode,
        engine: config?.whisper?.implementation,
      },
    };
  }
}

function chunkAggregateField(chunks, field) {
  const values = chunks
    .map((chunk) => chunk[field])
    .filter((value) => typeof value === 'string' && value.trim().length > 0);
  if (values.length === 0) {
    return undefined;
  }
  return values.join(' ');
}

module.exports = { ResultMerger };
