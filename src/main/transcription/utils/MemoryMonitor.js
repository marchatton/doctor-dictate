class MemoryMonitor {
  constructor(options = {}) {
    this.pollingIntervalMs = options.pollingIntervalMs || 500;
    this.logger = options.logger || console;
  }

  async runWithinBudget(budgetMb, task) {
    if (typeof task !== 'function') {
      throw new Error('MemoryMonitor requires a task function');
    }

    const limitBytes = typeof budgetMb === 'number' && budgetMb > 0 ? budgetMb * 1024 * 1024 : null;
    let monitorTimer = null;
    let exceeded = false;

    if (limitBytes) {
      monitorTimer = setInterval(() => {
        const usage = this.getProcessMemory();
        if (usage > limitBytes) {
          exceeded = true;
          this.logger.warn(
            `[MemoryMonitor] RSS ${Math.round(usage / (1024 * 1024))}MB exceeded budget of ${budgetMb}MB`
          );
        }
      }, this.pollingIntervalMs);
    }

    try {
      const result = await task({ exceeded });
      if (exceeded) {
        this.logger.warn('[MemoryMonitor] Task completed after exceeding memory budget');
      }
      return result;
    } finally {
      if (monitorTimer) {
        clearInterval(monitorTimer);
      }
    }
  }

  getProcessMemory() {
    const usage = process.memoryUsage();
    return usage && usage.rss ? usage.rss : 0;
  }
}

module.exports = { MemoryMonitor };
