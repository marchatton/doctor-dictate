import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';

import { ModelDownloader } from '../ModelDownloader';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'model-downloader-'));
}

describe('ModelDownloader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = createTempDir();
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('downloads missing models using provided fetch implementation', async () => {
    const destination = path.join(tmpDir, 'test-model.bin');
    const models = [
      {
        key: 'test-model',
        label: 'Test Model',
        url: 'https://example.com/model.bin',
        destination,
      },
    ];

    const fetchMock = jest.fn(async () => ({
      ok: true,
      arrayBuffer: async () => Buffer.from('mock-model'),
    }));

    const downloader = new ModelDownloader({ models, fetch: fetchMock as unknown as typeof fetch });

    const results = await downloader.ensureModels();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fs.existsSync(destination)).toBe(true);
    expect(fs.readFileSync(destination, 'utf8')).toBe('mock-model');
    expect(results[0]).toMatchObject({
      key: 'test-model',
      status: 'downloaded',
    });
  });

  it('skips download when checksum matches existing file', async () => {
    const destination = path.join(tmpDir, 'cached-model.bin');
    fs.writeFileSync(destination, 'cached-model');
    const checksum = createHash('sha256').update('cached-model').digest('hex');

    const models = [
      {
        key: 'cached-model',
        label: 'Cached Model',
        url: 'https://example.com/model.bin',
        destination,
        checksum,
      },
    ];

    const fetchMock = jest.fn();

    const downloader = new ModelDownloader({ models, fetch: fetchMock as unknown as typeof fetch });
    const results = await downloader.ensureModels();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(results[0]).toMatchObject({
      key: 'cached-model',
      status: 'skipped',
      reason: 'up-to-date',
    });
  });
});
