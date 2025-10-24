const { FasterWhisperBridge } = require('../engines/FasterWhisperBridge');

class AccurateMode {
  constructor(options = {}) {
    this.key = 'accurate';
    this.label = 'Accurate (Faster Whisper)';
    this.description =
      'High accuracy transcription using the Python Faster Whisper bridge with conservative segmentation.';
    this.memoryBudget = 1536; // MB
    this.chunkConfig = {
      windowSeconds: 30,
      overlapSeconds: 3,
      ...(options.chunkConfig || {}),
    };
    this.vadConfig = {
      threshold: 0.5,
      minSpeechMs: 350,
      maxSilenceMs: 1200,
      ...(options.vadConfig || {}),
    };
    this.engineFactory = options.engineFactory || null;
    this.engineOptions = options.engineOptions || {};
  }

  createEngine() {
    if (typeof this.engineFactory === 'function') {
      return this.engineFactory();
    }

    return new FasterWhisperBridge({
      chunkConfig: this.chunkConfig,
      vadConfig: this.vadConfig,
      ...this.engineOptions,
    });
  }
}

module.exports = { AccurateMode };
