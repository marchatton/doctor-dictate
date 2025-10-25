const { ProgressReporter } = require('../ProgressReporter');

describe('ProgressReporter', () => {
  it('emits events through provided emitter', () => {
    const emitter = { emit: jest.fn() };
    const reporter = new ProgressReporter({ mode: 'fast' }, { emitter });

    reporter.start('chunking', { total: 5 });
    reporter.advance('vad', { processed: 1 });
    reporter.chunkProgress({ current: 1, total: 5 });
    reporter.complete({ text: 'done' });
    reporter.fail(new Error('oops'));

    expect(emitter.emit).toHaveBeenCalledWith(
      'stage',
      expect.objectContaining({ stage: 'chunking', status: 'start', context: { mode: 'fast' } })
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      'stage',
      expect.objectContaining({ stage: 'vad', status: 'progress' })
    );
    expect(emitter.emit).toHaveBeenCalledWith(
      'chunk',
      expect.objectContaining({ current: 1, total: 5 })
    );
    expect(emitter.emit).toHaveBeenCalledWith('complete', expect.objectContaining({ result: { text: 'done' } }));
    expect(emitter.emit).toHaveBeenCalledWith('error', expect.objectContaining({ error: expect.any(Error) }));
  });

  it('updates context when requested', () => {
    const emitter = { emit: jest.fn() };
    const reporter = new ProgressReporter({ mode: 'fast' }, { emitter });
    reporter.updateContext({ decision: { reason: 'short-audio' } });
    reporter.start('init');
    expect(emitter.emit).toHaveBeenCalledWith(
      'stage',
      expect.objectContaining({ context: expect.objectContaining({ decision: { reason: 'short-audio' } }) })
    );
  });
});
