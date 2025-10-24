class VADProcessor {
  constructor(options = {}) {
    this.logger = options.logger || console;
  }

  configure(vadConfig = {}) {
    this.vadConfig = { ...vadConfig };
  }

  async apply(chunks, vadConfig = {}, progressReporter) {
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return chunks || [];
    }

    const config = { ...(this.vadConfig || {}), ...vadConfig };
    if (config.enabled === false) {
      return chunks;
    }

    const minSpeechSeconds = (config.minSpeechDurationMs || 0) / 1000;
    const minSilenceSeconds = (config.minSilenceDurationMs || 0) / 1000;

    const filtered = [];
    for (let index = 0; index < chunks.length; index += 1) {
      const chunk = chunks[index];
      const duration = chunk.duration ?? Math.max(0, (chunk.end || 0) - (chunk.start || 0));
      const shouldKeep = duration >= minSpeechSeconds;

      progressReporter?.advance('vad', {
        processed: index + 1,
        total: chunks.length,
        dropped: shouldKeep ? 0 : 1,
      });

      if (!shouldKeep) {
        this.logger.debug?.(
          '[VAD] Dropping chunk below speech threshold',
          { index, duration, minSpeechSeconds }
        );
        continue;
      }

      filtered.push({
        ...chunk,
        vad: {
          included: true,
          minSilenceSeconds,
          minSpeechSeconds,
        },
      });
    }

    if (filtered.length === 0) {
      this.logger.warn?.('[VAD] All chunks filtered; returning original segments');
      return chunks;
    }

    return filtered;
  }
}

module.exports = { VADProcessor };
