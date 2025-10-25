const { VADProcessor } = require('../VADProcessor');

describe('VADProcessor', () => {
  it('filters chunks below minimum speech duration', async () => {
    const processor = new VADProcessor({ logger: { debug: jest.fn(), warn: jest.fn() } });
    const reporter = { advance: jest.fn() };
    const chunks = [
      { id: 'a', start: 0, end: 0.4, duration: 0.4 },
      { id: 'b', start: 0.4, end: 2.0, duration: 1.6 },
    ];

    const filtered = await processor.apply(chunks, { minSpeechDurationMs: 600 }, reporter);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('b');
    expect(reporter.advance).toHaveBeenCalledWith('vad', expect.objectContaining({ processed: 1 }));
  });

  it('returns original chunks when config disables vad', async () => {
    const processor = new VADProcessor();
    const chunks = [{ id: 'a', duration: 0.2 }];
    const filtered = await processor.apply(chunks, { enabled: false });
    expect(filtered).toBe(chunks);
  });
});
