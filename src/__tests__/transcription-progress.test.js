const { TranscriptionProgress } = require('../services/transcription/progress-tracker.js');

describe('TranscriptionProgress', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('tracks deterministic stage progress using elapsed time', () => {
    const tracker = new TranscriptionProgress(30);

    tracker.nextStage('preparing');

    jest.advanceTimersByTime(1000);

    const progress = tracker.getProgress();
    const totalDuration = tracker.getTotalExpectedDuration();

    expect(progress.progress.stageId).toBe('preparing');
    expect(progress.progress.elapsedSeconds).toBe(1);
    expect(progress.progress.stagePercent).toBeCloseTo(50, 1);
    expect(progress.progress.percent).toBeCloseTo((1 / totalDuration) * 100, 1);
    expect(progress.stages.find(stage => stage.id === 'preparing')?.status).toBe('active');
  });

  it('computes overall percent with whisper progress during transcription', () => {
    const tracker = new TranscriptionProgress(45);

    tracker.nextStage('preparing');
    tracker.nextStage('transcribing');

    const transcribingStage = tracker.getActiveStage();
    const completedDuration = tracker.stages.find(stage => stage.id === 'preparing').duration;
    const expectedPercent = ((completedDuration + (transcribingStage.duration * 0.4)) /
      tracker.getTotalExpectedDuration()) * 100;

    const progress = tracker.getProgress('transcribing', 40);

    expect(progress.progress.stageId).toBe('transcribing');
    expect(progress.progress.stagePercent).toBeCloseTo(40, 1);
    expect(progress.progress.percent).toBeCloseTo(expectedPercent, 1);
    expect(progress.showSpinner).toBe(false);
  });

  it('marks completion with full progress metadata', () => {
    const tracker = new TranscriptionProgress(60);

    tracker.nextStage('preparing');
    tracker.nextStage('transcribing');
    tracker.nextStage('medical');
    jest.advanceTimersByTime(3000);

    const final = tracker.complete();

    expect(final.isComplete).toBe(true);
    expect(final.progress.percent).toBe(100);
    expect(final.progress.stageId).toBe('finalizing');
    expect(final.progress.estimatedRemainingSeconds).toBe(0);
    expect(final.progress.elapsedSeconds).toBe(3);
    expect(final.stages.every(stage => stage.status === 'completed')).toBe(true);
  });
});
