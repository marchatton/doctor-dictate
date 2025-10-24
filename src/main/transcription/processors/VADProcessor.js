class VADProcessor {
  constructor(options = {}) {
    this.options = options;
  }

  configure(vadConfig = {}) {
    this.vadConfig = { ...vadConfig };
  }

  async apply(chunks) {
    return chunks;
  }
}

module.exports = { VADProcessor };
