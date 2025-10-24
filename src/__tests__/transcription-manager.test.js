const path = require('path');

const mockMemoryMonitor = {
  runWithinBudget: jest.fn(async (_budget, task) => task()),
};

const progressInstances = [];
const mockProgressReporterFactory = jest.fn(() => {
  const instance = {
    begin: jest.fn(),
    reportStage: jest.fn(),
    complete: jest.fn(),
    fail: jest.fn(),
  };
  progressInstances.push(instance);
  return instance;
});

jest.mock('../main/transcription/utils/MemoryMonitor', () => ({
  MemoryMonitor: jest.fn(() => mockMemoryMonitor),
}));

jest.mock('../main/transcription/utils/ProgressReporter', () => ({
  ProgressReporter: mockProgressReporterFactory,
}));

jest.mock('../main/transcription/modes/FastMode', () => ({
  FastMode: class {
    constructor() {
      this.key = 'fast';
      this.memoryBudget = 256;
    }

    createEngine() {
      return {
        initialize: jest.fn().mockResolvedValue(undefined),
        transcribe: jest
          .fn()
          .mockResolvedValue({ raw: 'hello world', corrected: 'hello world', metadata: { engine: 'fast' } }),
      };
    }
  },
}));

describe('TranscriptionManager', () => {
  let TranscriptionManager;

  beforeEach(() => {
    jest.resetModules();
    mockMemoryMonitor.runWithinBudget.mockClear();
    mockProgressReporterFactory.mockClear();
    progressInstances.splice(0, progressInstances.length);

    TranscriptionManager = require('../main/transcription/TranscriptionManager').TranscriptionManager;
  });

  it('runs transcription using injected fast mode engine', async () => {
    const manager = new TranscriptionManager();

    const result = await manager.transcribe({
      audioPath: path.join(__dirname, 'fixtures', 'sample.wav'),
      mode: 'fast',
    });

    expect(mockMemoryMonitor.runWithinBudget).toHaveBeenCalledWith(256, expect.any(Function));
    expect(mockProgressReporterFactory).toHaveBeenCalled();
    expect(progressInstances[0].complete).toHaveBeenCalledWith(result);
    expect(result).toMatchObject({
      raw: 'hello world',
      corrected: 'hello world',
      metadata: expect.objectContaining({ engine: 'fast', mode: 'fast' }),
    });
  });
});
