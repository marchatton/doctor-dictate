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
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      })
      .on('error', (error) => {
        fs.unlink(destination, () => reject(error));
      });
  });
}

async function main() {
  for (const entry of DOWNLOADS) {
    ensureDestination(entry.destination);
    if (fs.existsSync(entry.destination)) {
      console.log(`[download-models] skipping ${entry.label}, already present`);
      continue;
    }

    console.log(`[download-models] downloading ${entry.label}`);
    try {
      await download(entry.url, entry.destination);
      console.log(`[download-models] saved ${entry.label}`);
    } catch (error) {
      console.error(`[download-models] failed to download ${entry.label}:`, error.message);
      console.log('You can manually download the asset and place it at', entry.destination);
    }
  }
}

if (require.main === module) {
  main();
}
