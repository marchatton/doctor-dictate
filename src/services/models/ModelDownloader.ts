import fs from 'fs';
import path from 'path';
import https from 'https';
import { createHash } from 'crypto';

export type ModelSpec = {
  key: string;
  label?: string;
  url?: string;
  destination?: string;
  path?: string;
  checksum?: string | null;
  minBytes?: number;
};

export type ModelDownloaderOptions = {
  models?: ModelSpec[];
  fetch?: typeof fetch;
  fs?: Pick<typeof fs, 'existsSync' | 'mkdirSync' | 'readFileSync' | 'writeFileSync' | 'createWriteStream' | 'unlink'>;
  https?: typeof https;
  hash?: (data: Buffer) => string;
};

export const DEFAULT_MODELS: ModelSpec[] = [
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

export class ModelDownloader {
  public readonly models: ModelSpec[];
  private readonly fetchImpl: typeof fetch | null;
  private readonly fsImpl: ModelDownloaderOptions['fs'];
  private readonly httpsImpl: typeof https;
  private readonly hashImpl: (data: Buffer) => string;

  constructor(options: ModelDownloaderOptions = {}) {
    this.models = options.models ?? DEFAULT_MODELS;
    this.fetchImpl = options.fetch ?? null;
    this.fsImpl = options.fs ?? fs;
    this.httpsImpl = options.https ?? https;
    this.hashImpl = options.hash ?? ((data) => createHash('sha256').update(data).digest('hex'));
  }

  async ensureModels(models: ModelSpec[] = this.models): Promise<Array<{ key?: string; status: string; reason?: string; path?: string }>> {
    const results: Array<{ key?: string; status: string; reason?: string; path?: string }> = [];
    for (const model of models) {
      // eslint-disable-next-line no-await-in-loop
      const result = await this.ensureModel(model);
      results.push(result);
    }
    return results;
  }

  async ensureModel(model: ModelSpec): Promise<{ key?: string; status: string; reason?: string; path?: string }> {
    const destination = model.destination ?? (model.path ? path.resolve(process.cwd(), model.path) : null);
    if (!destination) {
      throw new Error(`Model ${model.key ?? model.label ?? 'unknown'} is missing a destination path`);
    }

    this.ensureDirectory(path.dirname(destination));

    if (this.isUpToDate(destination, model.checksum ?? undefined)) {
      return { key: model.key, status: 'skipped', reason: 'up-to-date', path: destination };
    }

    await this.download(model.url, destination);

    if (model.checksum) {
      const fileBuffer = this.fsImpl!.readFileSync(destination);
      const hash = this.hashImpl(fileBuffer);
      if (hash !== model.checksum) {
        throw new Error(`Checksum mismatch for ${model.label ?? model.key}`);
      }
    }

    return { key: model.key, status: 'downloaded', path: destination };
  }

  ensureDirectory(dirPath: string): void {
    if (!this.fsImpl!.existsSync(dirPath)) {
      this.fsImpl!.mkdirSync(dirPath, { recursive: true });
    }
  }

  isUpToDate(destination: string, checksum?: string | null): boolean {
    if (!this.fsImpl!.existsSync(destination)) {
      return false;
    }

    if (!checksum) {
      return true;
    }

    const current = this.hashImpl(this.fsImpl!.readFileSync(destination));
    return current === checksum;
  }

  async download(url: string | undefined, destination: string): Promise<void> {
    if (!url) {
      throw new Error('Download URL is required');
    }

    if (this.fetchImpl || typeof fetch === 'function') {
      await this.downloadWithFetch(url, destination);
      return;
    }

    await this.downloadWithHttps(url, destination);
  }

  private async downloadWithFetch(url: string, destination: string): Promise<void> {
    const fetcher = this.fetchImpl ?? fetch.bind(globalThis);
    const response = await fetcher(url);
    if (!response.ok) {
      throw new Error(`Failed to download model: HTTP ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    this.fsImpl!.writeFileSync(destination, Buffer.from(arrayBuffer));
  }

  private async downloadWithHttps(url: string, destination: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const file = this.fsImpl!.createWriteStream(destination);
      this.httpsImpl
        .get(url, (res) => {
          if (res.statusCode !== 200 || !res.pipe) {
            reject(new Error(`Failed to download model: HTTP ${res.statusCode}`));
            return;
          }
          res.pipe(file);
          file.on('finish', () => {
            file.close((closeErr) => {
              if (closeErr) {
                reject(closeErr);
                return;
              }
              resolve();
            });
          });
        })
        .on('error', (error) => {
          this.fsImpl!.unlink(destination, (unlinkErr) => {
            if (unlinkErr) {
              reject(unlinkErr);
              return;
            }
            reject(error);
          });
        });
    });
  }
}
