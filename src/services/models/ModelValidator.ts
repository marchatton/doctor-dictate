import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

import { DEFAULT_MODELS, ModelSpec } from './ModelDownloader';

type ValidationResult = {
  key?: string;
  valid: boolean;
  reason: string;
  size?: number;
};

type ModelValidatorOptions = {
  models?: ModelSpec[];
  fs?: Pick<typeof fs, 'existsSync' | 'statSync' | 'readFileSync'>;
  hash?: (buffer: Buffer) => string;
};

export class ModelValidator {
  private readonly models: ModelSpec[];
  private readonly fsImpl: ModelValidatorOptions['fs'];
  private readonly hashImpl: (buffer: Buffer) => string;

  constructor(options: ModelValidatorOptions = {}) {
    this.models = options.models ?? DEFAULT_MODELS;
    this.fsImpl = options.fs ?? fs;
    this.hashImpl = options.hash ?? ((buffer) => createHash('sha256').update(buffer).digest('hex'));
  }

  validateAll(models: ModelSpec[] = this.models): ValidationResult[] {
    return models.map((model) => this.validate(model));
  }

  validate(model: ModelSpec): ValidationResult {
    const destination = model.destination ?? (model.path ? path.resolve(process.cwd(), model.path) : undefined);
    if (!destination) {
      return { key: model.key, valid: false, reason: 'missing-destination' };
    }

    if (!this.fsImpl!.existsSync(destination)) {
      return { key: model.key, valid: false, reason: 'missing' };
    }

    const stats = this.fsImpl!.statSync(destination);
    if (model.minBytes && stats.size < model.minBytes) {
      return { key: model.key, valid: false, reason: 'size-mismatch', size: stats.size };
    }

    if (model.checksum) {
      const fileBuffer = this.fsImpl!.readFileSync(destination);
      const digest = this.hashImpl(fileBuffer);
      if (digest !== model.checksum) {
        return { key: model.key, valid: false, reason: 'checksum-mismatch' };
      }
    }

    return { key: model.key, valid: true, reason: 'ok' };
  }

  getMissing(models: ModelSpec[] = this.models): ValidationResult[] {
    return this.validateAll(models).filter((result) => !result.valid);
  }
}
