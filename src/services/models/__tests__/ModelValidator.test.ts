import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';

import { ModelValidator } from '../ModelValidator';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'model-validator-'));
}

describe('ModelValidator', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('identifies present models with matching checksum', () => {
    const destination = path.join(tmpDir, 'model.bin');
    fs.writeFileSync(destination, 'model-data');
    const checksum = createHash('sha256').update('model-data').digest('hex');

    const validator = new ModelValidator({
      models: [
        {
          key: 'model',
          label: 'Model',
          destination,
          checksum,
          minBytes: 4,
        },
      ],
    });

    const results = validator.validateAll();

    expect(results).toEqual([
      {
        key: 'model',
        valid: true,
        reason: 'ok',
      },
    ]);
  });

  it('flags missing or corrupt models', () => {
    const destination = path.join(tmpDir, 'missing.bin');
    const validator = new ModelValidator({
      models: [
        {
          key: 'missing',
          label: 'Missing Model',
          destination,
          checksum: 'deadbeef',
          minBytes: 10,
        },
      ],
    });

    const results = validator.validateAll();

    expect(results[0]).toMatchObject({
      key: 'missing',
      valid: false,
    });
    expect(results[0]?.reason).toMatch(/missing|checksum/i);
  });
});
