const { MemoryMonitor } = require('../MemoryMonitor');

describe('MemoryMonitor', () => {
  const originalMemoryUsage = process.memoryUsage;
  const originalGc = global.gc;

  afterEach(() => {
    process.memoryUsage = originalMemoryUsage;
    if (originalGc) {
      global.gc = originalGc;
    } else {
      delete global.gc;
    }
    jest.useRealTimers();
  });

  it('tracks peak usage and near limit', () => {
    jest.useFakeTimers();
    const readings = [
      { rss: 100 * 1024 * 1024 },
      { rss: 210 * 1024 * 1024 },
    ];
    let index = 0;
    process.memoryUsage = () => readings[Math.min(index++, readings.length - 1)];

    const monitor = new MemoryMonitor({ pollingIntervalMs: 5, thresholdRatio: 0.9 });
    monitor.startMonitoring(200);
    jest.advanceTimersByTime(20);

    expect(monitor.isNearLimit()).toBe(true);
    expect(monitor.getPeakUsage()).toBeGreaterThanOrEqual(210);
    monitor.stopMonitoring();
  });

  it('invokes gc when requesting trim', async () => {
    const spy = jest.fn();
    global.gc = spy;
    const monitor = new MemoryMonitor();
    process.memoryUsage = () => ({ rss: 150 * 1024 * 1024 });

    await monitor.requestTrim();
    expect(spy).toHaveBeenCalled();
  });
});
