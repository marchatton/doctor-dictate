const { AudioChunker } = require('../AudioChunker');

describe('AudioChunker', () => {
  let audioProcessor;
  let chunker;
  let reporter;

  beforeEach(() => {
    audioProcessor = {
      preprocessAudio: jest.fn().mockResolvedValue('/tmp/processed.wav'),
      getAudioDuration: jest.fn().mockResolvedValue(32),
      createChunks: jest.fn().mockResolvedValue([
        { index: 0, path: '/tmp/chunk-0.wav', start: 0, duration: 15 },
        { index: 1, path: '/tmp/chunk-1.wav', start: 14.5, duration: 15 },
      ]),
      cleanup: jest.fn().mockResolvedValue(undefined),
    };
    reporter = {
      start: jest.fn(),
      advance: jest.fn(),
    };
    chunker = new AudioChunker({ audioProcessor });
  });

  it('segments audio using provided processor and config', async () => {
    const result = await chunker.segment('/tmp/input.wav', {
      chunkConfig: { chunkSize: 15, overlap: 0.5 },
    }, reporter);

    expect(audioProcessor.preprocessAudio).toHaveBeenCalledWith(
      '/tmp/input.wav',
      expect.any(Function)
    );
    expect(audioProcessor.getAudioDuration).toHaveBeenCalledWith('/tmp/processed.wav');
    expect(audioProcessor.createChunks).toHaveBeenCalledWith(
      '/tmp/processed.wav',
      32,
      expect.any(Function)
    );
    expect(result.chunks).toHaveLength(2);
    expect(result.chunks[0]).toEqual(
      expect.objectContaining({ id: 'chunk-0', start: 0, duration: 15, path: '/tmp/chunk-0.wav' })
    );
    expect(reporter.start).toHaveBeenCalledWith('preprocessing', expect.any(Object));
    expect(reporter.start).toHaveBeenCalledWith('chunking', expect.any(Object));
  });

  it('cleans up chunks when requested', async () => {
    const segmentResult = { chunks: [{ path: '/tmp/chunk-0.wav', isFullFile: false }] };
    await chunker.cleanup(segmentResult);
    expect(audioProcessor.cleanup).toHaveBeenCalledWith(segmentResult.chunks);
  });

  it('throws when audio path missing', async () => {
    await expect(chunker.segment()).rejects.toThrow(/audioPath/);
  });
});
