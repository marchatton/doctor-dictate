type Logger = Pick<Console, 'warn' | 'info' | 'error' | 'debug'>;

type MemoryMonitorOptions = {
  pollingIntervalMs?: number;
  thresholdRatio?: number;
  logger?: Logger;
};

export class MemoryMonitor {
  private readonly pollingIntervalMs: number;

  private readonly thresholdRatio: number;

  private readonly logger: Logger;

  private timer: ReturnType<typeof setInterval> | null = null;

  private limitBytes: number | null = null;

  private peakBytes = 0;

  private nearLimit = false;

  constructor(options: MemoryMonitorOptions = {}) {
    this.pollingIntervalMs = options.pollingIntervalMs ?? 500;
    this.thresholdRatio = options.thresholdRatio ?? 0.9;
    this.logger = options.logger || console;
  }

  startMonitoring(limitMb?: number): void {
    this.stopMonitoring();
    this.limitBytes = typeof limitMb === 'number' && limitMb > 0 ? limitMb * 1024 * 1024 : null;
    this.peakBytes = 0;
    this.nearLimit = false;

    if (this.limitBytes) {
      this.timer = setInterval(() => this.sample(), this.pollingIntervalMs);
    }

    this.sample();
  }

  stopMonitoring(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.limitBytes = null;
  }

  async runWithinBudget<T>(limitMb: number, task: () => Promise<T>): Promise<T> {
    this.startMonitoring(limitMb);
    try {
      return await task();
    } finally {
      this.stopMonitoring();
    }
  }

  isNearLimit(): boolean {
    return this.nearLimit;
  }

  getPeakUsage(): number {
    return Math.round(this.peakBytes / (1024 * 1024));
  }

  async requestTrim(): Promise<void> {
    this.logger.warn('[MemoryMonitor] Memory near limit, attempting to trim');
    if (typeof global.gc === 'function') {
      try {
        global.gc();
      } catch (error) {
        this.logger.debug?.('[MemoryMonitor] GC trim failed', error);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
    this.sample();
  }

  private sample(): void {
    const usage = this.getProcessMemory();
    this.peakBytes = Math.max(this.peakBytes, usage);
    if (this.limitBytes) {
      this.nearLimit = usage >= this.limitBytes * this.thresholdRatio;
      if (this.nearLimit) {
        this.logger.warn(
          `[MemoryMonitor] RSS ${Math.round(usage / (1024 * 1024))}MB approaching limit ${Math.round(
            this.limitBytes / (1024 * 1024),
          )}MB`,
        );
      }
    }
  }

  private getProcessMemory(): number {
    const usage = process.memoryUsage?.();
    return usage?.rss ?? 0;
  }
}

export default MemoryMonitor;
