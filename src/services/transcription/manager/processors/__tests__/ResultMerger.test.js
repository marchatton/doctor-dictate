const { ResultMerger } = require('../ResultMerger');

describe('ResultMerger', () => {
  it('combines chunk text using audio processor overlap logic', () => {
    const audioProcessor = {
      combineTranscriptions: jest.fn(() => 'hello world second'),
    };
    const merger = new ResultMerger({ audioProcessor });

    const chunks = [
      {
        text: 'hello world',
        chunk: { overlap: 0, index: 0 },
        segments: [{ start: 0, end: 5, text: 'hello' }],
        corrected: 'hello world',
      },
      {
        text: 'world second',
        chunk: { overlap: 0.5, index: 1 },
        segments: [{ start: 5, end: 10, text: 'world second' }],
        formatted: 'WORLD SECOND',
      },
    ];

    const result = merger.merge({
      chunks,
      duration: 10,
      mode: 'accurate',
      config: { whisper: { implementation: 'faster-whisper' } },
    });

    expect(audioProcessor.combineTranscriptions).toHaveBeenCalledWith([
      { text: 'hello world', overlap: 0, index: 0 },
      { text: 'world second', overlap: 0.5, index: 1 },
    ]);
    expect(result.text).toBe('hello world second');
    expect(result.formatted).toBe('WORLD SECOND');
    expect(result.metadata).toEqual(
      expect.objectContaining({ mode: 'accurate', engine: 'faster-whisper' })
    );
  });

  it('returns empty result when no chunks provided', () => {
    const merger = new ResultMerger({ audioProcessor: { combineTranscriptions: jest.fn(() => '') } });
    const result = merger.merge({ chunks: [], duration: 0, mode: 'fast', config: {} });
    expect(result.text).toBe('');
    expect(result.segments).toEqual([]);
  });
});
