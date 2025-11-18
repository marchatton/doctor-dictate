const { SmartModeSelector } = require('../SmartModeSelector');

const buildModes = () =>
  new Map([
    ['fast', { key: 'fast' }],
    ['accurate', { key: 'accurate' }],
  ]);

describe('SmartModeSelector', () => {
  it('prefers accurate mode for short recordings on capable machines', async () => {
    const selector = new SmartModeSelector({
      audioInsights: jest.fn().mockResolvedValue({ durationSeconds: 480, fileSizeBytes: 40 * 1024 * 1024 }),
      systemInsights: jest.fn().mockResolvedValue({ totalMemMB: 16384, freeMemMB: 8192, cpuCount: 8 }),
    });

    const decision = await selector.decide({
      requestedMode: 'auto',
      audioPath: '/tmp/check.wav',
      availableModes: buildModes(),
    });

    expect(decision.mode).toBe('accurate');
    expect(decision.reason).toBe('short-audio');
    expect(decision.heuristics.audio.durationSeconds).toBe(480);
  });

  it('switches to fast mode when audio is long or system memory constrained', async () => {
    const selector = new SmartModeSelector({
      audioInsights: jest.fn().mockResolvedValue({ durationSeconds: 2400, fileSizeBytes: 400 * 1024 * 1024 }),
      systemInsights: jest.fn().mockResolvedValue({ totalMemMB: 6144, freeMemMB: 2048, cpuCount: 4 }),
    });

    const decision = await selector.decide({
      requestedMode: 'auto',
      audioPath: '/tmp/long.wav',
      availableModes: buildModes(),
    });

    expect(decision.mode).toBe('fast');
    expect(decision.reason).toBe('long-duration');
  });
});
import { SmartModeSelector } from '../SmartModeSelector';

const buildModes = () =>
  new Map([
    ['fast', { key: 'fast' }],
    ['accurate', { key: 'accurate' }],
  ]);

describe('SmartModeSelector', () => {
  it('prefers accurate mode for short recordings on capable machines', async () => {
    const selector = new SmartModeSelector({
      audioInsights: jest.fn().mockResolvedValue({ durationSeconds: 480, fileSizeBytes: 40 * 1024 * 1024 }),
      systemInsights: jest.fn().mockResolvedValue({ totalMemMB: 16_384, freeMemMB: 8192, cpuCount: 8 }),
    });

    const decision = await selector.decide({
      requestedMode: 'auto',
      audioPath: '/tmp/check.wav',
      availableModes: buildModes(),
    });

    expect(decision.mode).toBe('accurate');
    expect(decision.reason).toBe('short-audio');
    expect(decision.heuristics?.audio?.durationSeconds).toBe(480);
  });

  it('switches to fast mode when audio is long or system memory constrained', async () => {
    const selector = new SmartModeSelector({
      audioInsights: jest.fn().mockResolvedValue({ durationSeconds: 2400, fileSizeBytes: 400 * 1024 * 1024 }),
      systemInsights: jest.fn().mockResolvedValue({ totalMemMB: 6144, freeMemMB: 2048, cpuCount: 4 }),
    });

    const decision = await selector.decide({
      requestedMode: 'auto',
      audioPath: '/tmp/long.wav',
      availableModes: buildModes(),
    });

    expect(decision.mode).toBe('fast');
    expect(decision.reason).toBe('long-duration');
  });
});
