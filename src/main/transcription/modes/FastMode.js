const { WhisperCppEngine } = require('../engines/WhisperCppEngine');

class FastMode {
  constructor(options = {}) {
    this.key = 'fast';
    this.label = 'Fast (Whisper.cpp)';
    this.description =
      'Optimized for speed using Whisper.cpp with aggressive chunking and VAD.';
    this.memoryBudget = 512; // MB
    this.chunkConfig = {
      windowSeconds: 15,
      overlapSeconds: 1,
      ...(options.chunkConfig || {}),
    };
    this.vadConfig = {
      threshold: 0.6,
      minSpeechMs: 450,
      maxSilenceMs: 800,
      ...(options.vadConfig || {}),
    };
    this.engineFactory = options.engineFactory || null;
    this.engineOptions = options.engineOptions || {};
  }

  createEngine() {
    if (typeof this.engineFactory === 'function') {
      return this.engineFactory();
    }

    return new WhisperCppEngine({
      chunkConfig: this.chunkConfig,
      vadConfig: this.vadConfig,
      ...this.engineOptions,
    });
  }
}

module.exports = { FastMode };
