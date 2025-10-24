const { AudioProcessor } = require('../../../services/audio/processor.js');

class AudioChunker {
  constructor(options = {}) {
    this.audioProcessor = options.audioProcessor || new AudioProcessor();
    this.configure(options.chunkConfig || {});
  }

  configure(config = {}) {
    this.chunkConfig = {
      windowSeconds: config.windowSeconds || this.audioProcessor.chunkDuration || 30,
      overlapSeconds: config.overlapSeconds || this.audioProcessor.chunkOverlap || 2,
    };

    if (typeof config.windowSeconds === 'number') {
      this.audioProcessor.chunkDuration = config.windowSeconds;
    }

    if (typeof config.overlapSeconds === 'number') {
      this.audioProcessor.chunkOverlap = config.overlapSeconds;
    }
  }

  async chunk(audioPath, onProgress) {
    return this.audioProcessor.processAudio(audioPath, (stage, percent, message) => {
      if (onProgress) {
        onProgress({ stage, percent, message });
      }
    });
  }

  async cleanup(chunks) {
    return this.audioProcessor.cleanup(chunks);
  }
}

module.exports = { AudioChunker };
