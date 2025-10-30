const fs = require('fs');
const path = require('path');
const https = require('https');
const { createHash } = require('crypto');

const DEFAULT_MODELS = [
  {
    key: 'whisper-base',
    label: 'Whisper.cpp base.en',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin?download=1',
    destination: path.resolve(process.cwd(), 'models/whisper/ggml-base.en.bin'),
    checksum: null,
  },
  {
    key: 'faster-whisper-small',
    label: 'Faster-Whisper small.en',
    url: 'https://huggingface.co/guillaumekln/faster-whisper/resolve/main/faster-whisper-small.en-q5_1.bin?download=1',
    destination: path.resolve(process.cwd(), 'models/faster-whisper/small.en.bin'),
    checksum: null,
  },
];

class ModelDownloader {
  constructor(options = {}) {
    this.models = options.models || DEFAULT_MODELS;
    this.fetchImpl = options.fetch || null;
    this.fs = options.fs || fs;
    this.https = options.https || https;
    this.hash = options.hash || ((data) => createHash('sha256').update(data).digest('hex'));
  }

  async ensureModels(models = this.models) {
    const results = [];
    for (const model of models) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.ensureModel(model);
      results.push(result);
    }
    return results;
  }

  async ensureModel(model) {
    const destination = model.destination || path.resolve(process.cwd(), model.path || '');
    if (!destination) {
      throw new Error(`Model ${model.key || model.label} is missing a destination path`);
    }

    this.ensureDirectory(path.dirname(destination));

    if (this.isUpToDate(destination, model.checksum)) {
      return { key: model.key, status: 'skipped', reason: 'up-to-date', path: destination };
    }

    await this.download(model.url, destination);

    if (model.checksum) {
      const fileBuffer = this.fs.readFileSync(destination);
      const hash = this.hash(fileBuffer);
      if (hash !== model.checksum) {
        throw new Error(`Checksum mismatch for ${model.label || model.key}`);
      }
    }

    return { key: model.key, status: 'downloaded', path: destination };
  }

  ensureDirectory(dirPath) {
    if (!this.fs.existsSync(dirPath)) {
      this.fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  isUpToDate(destination, checksum) {
    if (!this.fs.existsSync(destination)) {
      return false;
    }

    if (!checksum) {
      return true;
    }

    const current = this.hash(this.fs.readFileSync(destination));
    return current === checksum;
  }

  async download(url, destination) {
    if (!url) {
      throw new Error('Download URL is required');
    }

    if (this.fetchImpl || typeof fetch === 'function') {
      await this.downloadWithFetch(url, destination);
      return;
    }

    await this.downloadWithHttps(url, destination);
  }

  async downloadWithFetch(url, destination) {
    const fetcher = this.fetchImpl || fetch.bind(globalThis);
    const response = await fetcher(url);
    if (!response.ok) {
      throw new Error(`Failed to download model: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    this.fs.writeFileSync(destination, Buffer.from(arrayBuffer));
  }

  async downloadWithHttps(url, destination) {
    await new Promise((resolve, reject) => {
      const file = this.fs.createWriteStream(destination);
      this.https
        .get(url, (res) => {
          if (res.statusCode !== 200) {
            reject(new Error(`Failed to download model: HTTP ${res.statusCode}`));
            return;
          }
          res.pipe(file);
          file.on('finish', () => {
            file.close(resolve);
          });
        })
        .on('error', (error) => {
          this.fs.unlink(destination, () => reject(error));
        });
    });
  }
}

module.exports = { ModelDownloader, DEFAULT_MODELS };
