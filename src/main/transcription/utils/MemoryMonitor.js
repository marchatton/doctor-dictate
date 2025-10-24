class MemoryMonitor {
  constructor(options = {}) {
    this.pollingIntervalMs = options.pollingIntervalMs || 500;
    this.logger = options.logger || console;
    this.thresholdRatio = options.thresholdRatio || 0.9;
    this._timer = null;
    this._limitBytes = null;
    this._peakBytes = 0;
    this._nearLimit = false;
  }

  startMonitoring(limitMb) {
    this.stopMonitoring();
    this._limitBytes = typeof limitMb === 'number' && limitMb > 0 ? limitMb * 1024 * 1024 : null;
    this._peakBytes = 0;
    this._nearLimit = false;

    if (this._limitBytes) {
      this._timer = setInterval(() => this.sample(), this.pollingIntervalMs);
    }

    this.sample();
  }

  stopMonitoring() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this._limitBytes = null;
  }

  async runWithinBudget(limitMb, task) {
    this.startMonitoring(limitMb);
    try {
      return await task();
    } finally {
      this.stopMonitoring();
    }
  }

  isNearLimit() {
    return this._nearLimit;
  }

  getPeakUsage() {
    return Math.round(this._peakBytes / (1024 * 1024));
  }

  async requestTrim() {
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

  sample() {
    const usage = this.getProcessMemory();
    this._peakBytes = Math.max(this._peakBytes, usage);
    if (this._limitBytes) {
      this._nearLimit = usage >= this._limitBytes * this.thresholdRatio;
      if (this._nearLimit) {
        this.logger.warn(
          `[MemoryMonitor] RSS ${Math.round(usage / (1024 * 1024))}MB approaching limit ${Math.round(
            this._limitBytes / (1024 * 1024)
          )}MB`
        );
      }
    }
  }

  getProcessMemory() {
    const usage = process.memoryUsage?.();
    return usage && usage.rss ? usage.rss : 0;
  }
}

module.exports = { MemoryMonitor };
