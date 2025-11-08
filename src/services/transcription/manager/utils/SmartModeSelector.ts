import fs from 'fs';
import os from 'os';

import AudioProcessor from '../../../audio/processor';

type AudioInsights = {
  fileSizeBytes?: number;
  durationSeconds?: number;
};

type SystemInsights = {
  totalMemMB?: number;
  freeMemMB?: number;
  cpuCount?: number;
};

export type ModeDecision = {
  mode: string;
  reason: string;
  heuristics: {
    audio: AudioInsights;
    system: SystemInsights;
    overrides: Record<string, unknown>;
  };
};

type SmartModeSelectorOptions = {
  modes?: Map<string, { key: string }>;
  audioProcessor?: AudioProcessor;
  thresholds?: Partial<{
    longDurationSeconds: number;
    mediumDurationSeconds: number;
    shortDurationSeconds: number;
    largeFileBytes: number;
    lowMemoryMB: number;
    lowFreeMemoryMB: number;
  }>;
  audioInsights?: (audioPath: string) => Promise<AudioInsights>;
  systemInsights?: () => Promise<SystemInsights>;
  onDecision?: (decision: ModeDecision) => void;
};

export class SmartModeSelector {
  modes?: Map<string, { key: string }>;

  private readonly audioProcessor: AudioProcessor;

  readonly thresholds: Required<NonNullable<SmartModeSelectorOptions['thresholds']>>;

  private readonly audioInsights: (audioPath: string) => Promise<AudioInsights>;

  private readonly systemInsights: () => Promise<SystemInsights>;

  private readonly onDecision?: (decision: ModeDecision) => void;

  constructor(options: SmartModeSelectorOptions = {}) {
    this.modes = options.modes;
    this.audioProcessor = options.audioProcessor || new AudioProcessor();
    this.thresholds = {
      longDurationSeconds: 1800,
      mediumDurationSeconds: 1200,
      shortDurationSeconds: 900,
      largeFileBytes: 200 * 1024 * 1024,
      lowMemoryMB: 8192,
      lowFreeMemoryMB: 2048,
      ...options.thresholds,
    } as Required<NonNullable<SmartModeSelectorOptions['thresholds']>>;
    this.audioInsights = options.audioInsights || ((audioPath) => this.collectAudioInsights(audioPath));
    this.systemInsights = options.systemInsights || (() => this.collectSystemInsights());
    this.onDecision = options.onDecision;
  }

  async decide({
    requestedMode,
    audioPath,
    metadata = {},
    availableModes,
  }: {
    requestedMode?: string;
    audioPath?: string;
    metadata?: { preferredMode?: string; audio?: AudioInsights; system?: SystemInsights };
    availableModes?: Map<string, { key: string }>;
  }): Promise<ModeDecision> {
    const modes = availableModes instanceof Map ? availableModes : this.modes;
    const fallbackKey = this.resolveFallbackKey(modes);

    if (requestedMode && requestedMode !== 'auto') {
      if (modes?.has(requestedMode)) {
        return this.emitDecision({
          mode: requestedMode,
          reason: 'explicit',
          heuristics: { audio: metadata.audio || {}, system: metadata.system || {}, overrides: {} },
        });
      }
      return this.emitDecision({ mode: fallbackKey, reason: 'unknown-mode', heuristics: { audio: {}, system: {}, overrides: {} } });
    }

    const heuristics = {
      audio: { ...(metadata.audio || {}) },
      system: metadata.system || {},
      overrides: {} as Record<string, unknown>,
    };

    if (metadata.preferredMode && modes?.has(metadata.preferredMode)) {
      heuristics.overrides.preferredMode = metadata.preferredMode;
      return this.emitDecision({ mode: metadata.preferredMode, reason: 'preferred-mode', heuristics });
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

    if (heuristics.overrides.preferredMode) {
      resolved = heuristics.overrides.preferredMode as string;
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
    return this.emitDecision({ mode: modeKey, reason, heuristics });
  }

  private resolveFallbackKey(modes?: Map<string, { key: string }>): string {
    if (modes instanceof Map && modes.size > 0) {
      if (modes.has('accurate')) {
        return 'accurate';
      }
      const first = modes.keys().next();
      if (!first.done && first.value) {
        return first.value;
      }
    }
    return 'accurate';
  }

  private async safeCollectAudio(audioPath?: string): Promise<AudioInsights> {
    if (!audioPath) {
      return {};
    }
    try {
      return await this.audioInsights(audioPath);
    } catch (error) {
      console.warn('[SmartModeSelector] audio insight failed:', (error as Error)?.message || error);
      return {};
    }
  }

  private async safeCollectSystem(): Promise<SystemInsights> {
    try {
      return await this.systemInsights();
    } catch (error) {
      console.warn('[SmartModeSelector] system insight failed:', (error as Error)?.message || error);
      return {};
    }
  }

  private async collectAudioInsights(audioPath: string): Promise<AudioInsights> {
    const metrics: AudioInsights = {};
    if (!audioPath) {
      return metrics;
    }

    try {
      const stat = await fs.promises.stat(audioPath);
      metrics.fileSizeBytes = stat.size;
    } catch (error) {
      console.warn('[SmartModeSelector] file stat failed:', (error as Error)?.message || error);
    }

    try {
      const duration = await this.audioProcessor.getAudioDuration(audioPath);
      if (Number.isFinite(duration) && duration > 0) {
        metrics.durationSeconds = duration;
      }
    } catch (error) {
      console.warn('[SmartModeSelector] duration probe failed:', (error as Error)?.message || error);
    }

    return metrics;
  }

  private collectSystemInsights(): SystemInsights {
    const totalMem = os.totalmem() / (1024 * 1024);
    const freeMem = os.freemem() / (1024 * 1024);
    const cpuCount = os.cpus()?.length || 1;
    return {
      totalMemMB: Math.round(totalMem),
      freeMemMB: Math.round(freeMem),
      cpuCount,
    };
  }

  private emitDecision(decision: ModeDecision): ModeDecision {
    this.onDecision?.(decision);
    return decision;
  }
}

export default SmartModeSelector;
