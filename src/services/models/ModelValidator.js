const fs = require('fs');
const path = require('path');
const { createHash } = require('crypto');

const { DEFAULT_MODELS } = require('./ModelDownloader');

class ModelValidator {
  constructor(options = {}) {
    this.models = options.models || DEFAULT_MODELS;
    this.fs = options.fs || fs;
    this.hash = options.hash || ((buffer) => createHash('sha256').update(buffer).digest('hex'));
  }

  validateAll(models = this.models) {
    return models.map((model) => this.validate(model));
  }

  validate(model) {
    const destination = model.destination || path.resolve(process.cwd(), model.path || '');
    if (!destination) {
      return { key: model.key, valid: false, reason: 'missing-destination' };
    }

    if (!this.fs.existsSync(destination)) {
      return { key: model.key, valid: false, reason: 'missing' };
    }

    const stats = this.fs.statSync(destination);
    if (model.minBytes && stats.size < model.minBytes) {
      return { key: model.key, valid: false, reason: 'size-mismatch', size: stats.size };
    }

    if (model.checksum) {
      const fileBuffer = this.fs.readFileSync(destination);
      const digest = this.hash(fileBuffer);
      if (digest !== model.checksum) {
        return { key: model.key, valid: false, reason: 'checksum-mismatch' };
      }
    }

    return { key: model.key, valid: true, reason: 'ok' };
  }

  getMissing(models = this.models) {
    return this.validateAll(models).filter((result) => !result.valid);
  }
}

module.exports = { ModelValidator };
