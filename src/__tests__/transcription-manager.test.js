const path = require('path');

describe('TranscriptionManager', () => {
  let TranscriptionManager;
  let FastMode;
  let mockMemoryMonitor;
  let mockProgressReporterFactory;
  let progressInstances;
  let mockChunker;
  let mockVadProcessor;
  let mockResultMerger;
  let mockModeSelector;
  let engine;

  beforeEach(() => {
    jest.resetModules();
    progressInstances = [];

    mockMemoryMonitor = {
      startMonitoring: jest.fn(),
      stopMonitoring: jest.fn(),
      getPeakUsage: jest.fn(() => 512),
      isNearLimit: jest.fn(() => false),
      requestTrim: jest.fn(),
    };

    jest.doMock('../services/transcription/manager/utils/MemoryMonitor', () => ({
      MemoryMonitor: jest.fn(() => mockMemoryMonitor),
    }));

    mockProgressReporterFactory = jest.fn(() => {
      const reporter = {
        start: jest.fn(),
        advance: jest.fn(),
        chunkProgress: jest.fn(),
        complete: jest.fn(),
        fail: jest.fn(),
      };
      progressInstances.push(reporter);
      return reporter;
    });

    jest.doMock('../services/transcription/manager/utils/ProgressReporter', () => ({
      ProgressReporter: mockProgressReporterFactory,
    }));

    mockModeSelector = {
      decide: jest.fn(),
    };

    jest.doMock('../services/transcription/manager/utils/SmartModeSelector', () => ({
      SmartModeSelector: jest.fn(() => mockModeSelector),
    }));

    ({ TranscriptionManager } = require('../services/transcription/manager/TranscriptionManager'));
    ({ FastMode } = require('../services/transcription/manager/modes/FastMode'));

    mockChunker = {
      segment: jest.fn(),
      cleanup: jest.fn(),
    };
    mockVadProcessor = {
      apply: jest.fn(),
    };
    mockResultMerger = {
      merge: jest.fn(),
    };

    engine = {
      initialize: jest.fn().mockResolvedValue(undefined),
      transcribeChunk: jest.fn(),
      finalize: jest.fn().mockResolvedValue(undefined),
      cleanup: jest.fn().mockResolvedValue(undefined),
    };
  });

  it('processes audio through chunking pipeline and merges results', async () => {
    const fakeChunks = [
      { id: 'chunk-0', path: '/tmp/chunk-0.wav', start: 0, end: 15, duration: 15 },
      { id: 'chunk-1', path: '/tmp/chunk-1.wav', start: 14.5, end: 30, duration: 15 },
    ];

    mockChunker.segment.mockResolvedValue({
      processedPath: '/tmp/preprocessed.wav',
      chunks: fakeChunks,
      duration: 30,
    });

    mockVadProcessor.apply.mockResolvedValue(fakeChunks);

    engine.transcribeChunk
      .mockResolvedValueOnce({
        text: 'first piece',
        segments: [{ start: 0, end: 15, text: 'first piece' }],
        start: 0,
        end: 15,
      })
      .mockResolvedValueOnce({
        text: 'second piece',
        segments: [{ start: 15, end: 30, text: 'second piece' }],
        start: 15,
        end: 30,
      });

    mockResultMerger.merge.mockReturnValue({
      text: 'first piece second piece',
      segments: [
        { start: 0, end: 15, text: 'first piece' },
        { start: 15, end: 30, text: 'second piece' },
      ],
      duration: 30,
    });

    const fastMode = new FastMode({
      engineFactory: () => engine,
    });

    const manager = new TranscriptionManager({
      modes: new Map([[fastMode.key, fastMode]]),
      processors: {
        audioChunker: mockChunker,
        vadProcessor: mockVadProcessor,
        resultMerger: mockResultMerger,
      },
    });

    const result = await manager.transcribe({
      audioPath: path.join(__dirname, 'fixtures', 'sample.wav'),
      mode: 'fast',
    });

    expect(mockMemoryMonitor.startMonitoring).toHaveBeenCalledWith(2048);
    expect(mockChunker.segment).toHaveBeenCalledWith(
      expect.stringContaining('sample.wav'),
      expect.objectContaining({
        chunkConfig: expect.objectContaining({ chunkSize: 15, overlap: 0.5 }),
      }),
      progressInstances[0]
    );
    expect(mockVadProcessor.apply).toHaveBeenCalledWith(fakeChunks, fastMode.config.vad, progressInstances[0]);
    expect(engine.initialize).toHaveBeenCalledWith(fastMode.config);
    expect(engine.transcribeChunk).toHaveBeenCalledTimes(2);
    expect(mockResultMerger.merge).toHaveBeenCalledWith({
      chunks: expect.arrayContaining([
        expect.objectContaining({ text: 'first piece' }),
        expect.objectContaining({ text: 'second piece' }),
      ]),
      duration: 30,
      mode: 'fast',
      config: fastMode.config,
    });
    expect(result).toMatchObject({
      text: 'first piece second piece',
      segments: expect.any(Array),
      duration: 30,
      metadata: expect.objectContaining({
        mode: 'fast',
        engine: 'whisper.cpp',
      }),
    });
    expect(progressInstances[0].chunkProgress).toHaveBeenCalledTimes(2);
    expect(progressInstances[0].complete).toHaveBeenCalledWith(result);
    expect(mockMemoryMonitor.stopMonitoring).toHaveBeenCalled();
  });

  it('delegates auto mode to smart selector and annotates decision', async () => {
    const fastMode = new FastMode({
      engineFactory: () => engine,
    });

    const manager = new TranscriptionManager({
      modes: new Map([[fastMode.key, fastMode]]),
      processors: {
        audioChunker: mockChunker,
        vadProcessor: mockVadProcessor,
        resultMerger: mockResultMerger,
      },
    });

    mockModeSelector.decide.mockResolvedValue({
      mode: 'fast',
      reason: 'long-duration',
      heuristics: { audio: { durationSeconds: 2000 } },
    });

    mockChunker.segment.mockResolvedValue({
      processedPath: '/tmp/preprocessed.wav',
      chunks: [],
      duration: 2000,
    });

    mockResultMerger.merge.mockReturnValue({
      text: 'merged',
      segments: [],
      duration: 2000,
    });

    const result = await manager.transcribe({
      audioPath: path.join(__dirname, 'fixtures', 'auto.wav'),
      mode: 'auto',
    });

    expect(mockModeSelector.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedMode: 'auto',
        audioPath: expect.stringContaining('auto.wav'),
      })
    );
    expect(result.metadata.mode).toBe('fast');
    expect(result.metadata.modeDecision).toEqual(
      expect.objectContaining({
        mode: 'fast',
        reason: 'long-duration',
      })
    );
  });
});
