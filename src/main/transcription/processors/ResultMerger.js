const { AudioProcessor } = require('../../../services/audio/processor.js');

class ResultMerger {
  constructor(options = {}) {
    this.audioProcessor = options.audioProcessor || new AudioProcessor();
  }

  merge(chunks) {
    return this.audioProcessor.combineTranscriptions(chunks);
  }
}

module.exports = { ResultMerger };
