import path from 'path';

type TranscriptionManagerCtor = typeof import('../services/transcription/manager/TranscriptionManager').TranscriptionManager;
type FastModeCtor = typeof import('../services/transcription/manager/modes/FastMode').FastMode;

type ChunkDescriptor = {
  id: string;
  path: string;
  start: number;
  end: number;
  duration: number;
};

type ChunkResult = {
  text: string;
  segments: Array<{ start: number; end: number; text: string }>;
  start: number;
  end: number;
};

type ProgressReporterMock = {
  start: jest.Mock<void, [string | undefined, Record<string, unknown>?]>;
  advance: jest.Mock<void, [string | undefined, Record<string, unknown>?]>;
  chunkProgress: jest.Mock<void, [Record<string, unknown>?]>;
  complete: jest.Mock<void, [unknown?]>;
  fail: jest.Mock<void, [unknown?]>;
  updateContext?: jest.Mock<void, [Record<string, unknown>]>;
};

type MemoryMonitorMock = {
  startMonitoring: jest.Mock<void, [number | undefined]>;
  stopMonitoring: jest.Mock<void, []>;
  getPeakUsage: jest.Mock<number, []>;
  isNearLimit: jest.Mock<boolean, []>;
  requestTrim: jest.Mock<void, []>;
};

type ChunkerMock = {
  segment: jest.Mock<
    Promise<{ processedPath: string; chunks: ChunkDescriptor[]; duration: number }>,
    [string, Record<string, unknown>, ProgressReporterMock]
  >;
  cleanup: jest.Mock<Promise<void>, []>;
};

type VadProcessorMock = {
  apply: jest.Mock<Promise<ChunkDescriptor[]>, [ChunkDescriptor[], Record<string, unknown>, ProgressReporterMock]>;
};

type ResultMergerMock = {
  merge: jest.Mock<
    {
      text: string;
      segments: Array<{ start: number; end: number; text: string }>;
      duration: number;
    },
    [Record<string, unknown>]
  >;
};

type ModeSelectorMock = {
  decide: jest.Mock;
};

type EngineMock = {
  initialize: jest.Mock<Promise<void>, [Record<string, unknown>?]>;
  transcribeChunk: jest.Mock<Promise<ChunkResult>, [ChunkDescriptor, Record<string, unknown>]>;
  finalize: jest.Mock<Promise<void>, [ChunkResult[], Record<string, unknown>]>;
  cleanup: jest.Mock<Promise<void>, []>;
};

describe('TranscriptionManager', () => {
  let TranscriptionManager: TranscriptionManagerCtor;
  let FastMode: FastModeCtor;
  let mockMemoryMonitor: MemoryMonitorMock;
  let mockProgressReporterFactory: jest.Mock<ProgressReporterMock, [Record<string, unknown>]>;
  let progressInstances: ProgressReporterMock[];
  let mockChunker: ChunkerMock;
  let mockVadProcessor: VadProcessorMock;
  let mockResultMerger: ResultMergerMock;
  let mockModeSelector: ModeSelectorMock;
  let engine: EngineMock;

  beforeEach(async () => {
    jest.resetModules();
    progressInstances = [];

    mockMemoryMonitor = {
      startMonitoring: jest.fn<void, [number | undefined]>(),
      stopMonitoring: jest.fn(),
      getPeakUsage: jest.fn<number, []>(() => 512),
      isNearLimit: jest.fn<boolean, []>(() => false),
      requestTrim: jest.fn(),
    };

    jest.doMock('../services/transcription/manager/utils/MemoryMonitor', () => ({
      MemoryMonitor: jest.fn(() => mockMemoryMonitor),
    }));

    mockProgressReporterFactory = jest.fn<ProgressReporterMock, [Record<string, unknown>]>((context) => {
      const reporter: ProgressReporterMock = {
        start: jest.fn(),
        advance: jest.fn(),
        chunkProgress: jest.fn(),
        complete: jest.fn(),
        fail: jest.fn(),
        updateContext: jest.fn(),
      };
      reporter.updateContext?.(context);
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

    TranscriptionManager = (await import('../services/transcription/manager/TranscriptionManager')).TranscriptionManager;
    FastMode = (await import('../services/transcription/manager/modes/FastMode')).FastMode;

    mockChunker = {
      segment: jest.fn<
        Promise<{ processedPath: string; chunks: ChunkDescriptor[]; duration: number }>,
        [string, Record<string, unknown>, ProgressReporterMock]
      >(),
      cleanup: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
    };
    mockVadProcessor = {
      apply: jest.fn<Promise<ChunkDescriptor[]>, [ChunkDescriptor[], Record<string, unknown>, ProgressReporterMock]>(),
    };
    mockResultMerger = {
      merge: jest.fn<
        {
          text: string;
          segments: Array<{ start: number; end: number; text: string }>;
          duration: number;
        },
        [Record<string, unknown>]
      >(),
    };

    engine = {
      initialize: jest.fn<Promise<void>, [Record<string, unknown>?]>().mockResolvedValue(undefined),
      transcribeChunk: jest.fn<
        Promise<ChunkResult>,
        [ChunkDescriptor, Record<string, unknown>]
      >(),
      finalize: jest.fn<Promise<void>, [ChunkResult[], Record<string, unknown>]>().mockResolvedValue(undefined),
      cleanup: jest.fn<Promise<void>, []>().mockResolvedValue(undefined),
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
