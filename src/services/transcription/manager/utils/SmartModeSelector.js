const fs = require('fs');
const os = require('os');
const { AudioProcessor } = require('../../../audio/processor.js');

class SmartModeSelector {
  constructor(options = {}) {
    this.modes = options.modes || null;
    this.audioProcessor = options.audioProcessor || new AudioProcessor();
    this.thresholds = {
      longDurationSeconds: 1800,
      mediumDurationSeconds: 1200,
      shortDurationSeconds: 900,
      largeFileBytes: 200 * 1024 * 1024,
      lowMemoryMB: 8192,
      lowFreeMemoryMB: 2048,
      ...options.thresholds,
    };
    this.audioInsights =
      options.audioInsights || ((audioPath) => this.collectAudioInsights(audioPath));
    this.systemInsights = options.systemInsights || (() => this.collectSystemInsights());
    this.onDecision = typeof options.onDecision === 'function' ? options.onDecision : null;
  }

  async decide({ requestedMode, audioPath, metadata = {}, availableModes }) {
    const modes = availableModes instanceof Map ? availableModes : this.modes;
    const fallbackKey = this.resolveFallbackKey(modes);

    if (requestedMode && requestedMode !== 'auto') {
      if (modes?.has(requestedMode)) {
        return {
          mode: requestedMode,
          reason: 'explicit',
          heuristics: { audio: metadata.audio || {}, system: metadata.system || {} },
        };
      }
      return { mode: fallbackKey, reason: 'unknown-mode', heuristics: {} };
    }

    const heuristics = {
      audio: { ...(metadata.audio || {}) },
      system: metadata.system || {},
      overrides: {},
    };

    if (metadata.preferredMode && modes?.has(metadata.preferredMode)) {
      heuristics.overrides.preferredMode = metadata.preferredMode;
      const decision = {
        mode: metadata.preferredMode,
        reason: 'preferred-mode',
        heuristics,
      };
      this.emitDecision(decision);
      return decision;
    }

    if (!heuristics.audio.durationSeconds || heuristics.audio.durationSeconds <= 0) {
      const audioMetrics = await this.safeCollectAudio(audioPath);
      Object.assign(heuristics.audio, audioMetrics);
    }

    if (!Object.keys(heuristics.system).length) {
      heuristics.system = await this.safeCollectSystem();
    }

    let resolved = modes?.has('accurate') ? 'accurate' : fallbackKey;
    let reason = 'default-accurate';

    const duration = heuristics.audio.durationSeconds || 0;
    const fileSize = heuristics.audio.fileSizeBytes || 0;
    const totalMem = heuristics.system.totalMemMB || 0;
    const freeMem = heuristics.system.freeMemMB || 0;

    if (heuristics.overrides?.preferredMode) {
      resolved = heuristics.overrides.preferredMode;
      reason = 'preferred-mode';
    } else if (duration >= this.thresholds.longDurationSeconds) {
      resolved = 'fast';
      reason = 'long-duration';
    } else if (fileSize >= this.thresholds.largeFileBytes) {
      resolved = 'fast';
      reason = 'large-file';
    } else if (duration >= this.thresholds.mediumDurationSeconds && totalMem < this.thresholds.lowMemoryMB) {
      resolved = 'fast';
      reason = 'duration-memory';
    } else if (totalMem && totalMem < this.thresholds.lowMemoryMB) {
      resolved = 'fast';
      reason = 'limited-memory';
    } else if (freeMem && freeMem < this.thresholds.lowFreeMemoryMB) {
      resolved = 'fast';
      reason = 'low-free-memory';
    } else if (duration > 0 && duration <= this.thresholds.shortDurationSeconds) {
      resolved = 'accurate';
      reason = 'short-audio';
    }

    const modeKey = modes?.has(resolved) ? resolved : fallbackKey;
    const decision = {
      mode: modeKey,
      reason,
      heuristics,
    };
    this.emitDecision(decision);
    return decision;
  }

  resolveFallbackKey(modes) {
    if (modes instanceof Map && modes.size > 0) {
      if (modes.has('accurate')) {
        return 'accurate';
      }
      return modes.keys().next().value;
    }
    return 'accurate';
  }

  async safeCollectAudio(audioPath) {
    if (!audioPath) {
      return {};
    }
    try {
      return await this.audioInsights(audioPath);
    } catch (error) {
      console.warn('[SmartModeSelector] audio insight failed:', error?.message || error);
      return {};
    }
  }

  async safeCollectSystem() {
    try {
      return await this.systemInsights();
    } catch (error) {
      console.warn('[SmartModeSelector] system insight failed:', error?.message || error);
      return {};
    }
  }

  async collectAudioInsights(audioPath) {
    const metrics = {};
    if (!audioPath) {
      return metrics;
    }

    try {
      const stat = await fs.promises.stat(audioPath);
      metrics.fileSizeBytes = stat.size;
    } catch (error) {
      console.warn('[SmartModeSelector] file stat failed:', error?.message || error);
    }

    try {
      const duration = await this.audioProcessor.getAudioDuration(audioPath);
      if (Number.isFinite(duration) && duration > 0) {
        metrics.durationSeconds = duration;
      }
    } catch (error) {
      console.warn('[SmartModeSelector] duration probe failed:', error?.message || error);
    }

    return metrics;
  }

  collectSystemInsights() {
    const totalMem = os.totalmem() / (1024 * 1024);
    const freeMem = os.freemem() / (1024 * 1024);
    const cpuCount = os.cpus()?.length || 1;
    return {
      totalMemMB: Math.round(totalMem),
      freeMemMB: Math.round(freeMem),
      cpuCount,
    };
  }

  emitDecision(decision) {
    if (this.onDecision) {
      try {
        this.onDecision(decision);
      } catch (error) {
        console.warn('[SmartModeSelector] decision listener failed:', error?.message || error);
      }
    }
  }
}

module.exports = { SmartModeSelector };
