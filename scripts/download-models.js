#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const https = require('https');

const DOWNLOADS = [
  {
    label: 'whisper.cpp base.en',
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin?download=1',
    destination: path.resolve(process.cwd(), 'models/whisper/ggml-base.en.bin'),
  },
  {
    label: 'faster-whisper small.en',
    url: 'https://huggingface.co/guillaumekln/faster-whisper/resolve/main/faster-whisper-small-en-q5_1.bin?download=1',
    destination: path.resolve(process.cwd(), 'models/faster-whisper/small.en.bin'),
  },
];

function ensureDestination(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[download-models] created ${dir}`);
  }
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);
    const request = https.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      });

    request.on('timeout', () => {
      request.destroy(new Error('Request timed out'));
    });

    request.on('error', (error) => {
      fs.unlink(destination, () => reject(error));
    });

    request.setTimeout(30_000);
  });
}

async function main() {
  if (process.env.DD_ALLOW_MODEL_DOWNLOADS !== '1') {
    console.error('[download-models] Downloads are disabled. Set DD_ALLOW_MODEL_DOWNLOADS=1 to proceed.');
    process.exitCode = 1;
    return;
  }

  for (const entry of DOWNLOADS) {
    ensureDestination(entry.destination);
    if (fs.existsSync(entry.destination)) {
      console.log(`[download-models] skipping ${entry.label}, already present`);
      continue;
    }

    console.log(`[download-models] downloading ${entry.label}`);
    try {
      let attempts = 0;
      let lastError = null;
      while (attempts < 3) {
        try {
          await download(entry.url, entry.destination);
          lastError = null;
          break;
        } catch (error) {
          attempts += 1;
          lastError = error;
          console.warn(`[download-models] attempt ${attempts} failed for ${entry.label}:`, error.message);
          if (attempts < 3) {
            console.warn('[download-models] retrying...');
          }
        }
      }

      if (lastError) {
        throw lastError;
      }
      console.log(`[download-models] saved ${entry.label}`);
    } catch (error) {
      console.error(`[download-models] failed to download ${entry.label}:`, error.message);
      if (fs.existsSync(entry.destination)) {
        fs.unlinkSync(entry.destination);
      }
      console.log('You can manually download the asset and place it at', entry.destination);
    }
  }
}

if (require.main === module) {
  main();
}
