#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const https = require('https');

const MODEL_URL =
  'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin?download=1';
const TARGET_DIR = path.resolve(process.cwd(), 'models/whisper');
const TARGET_FILE = path.join(TARGET_DIR, 'ggml-base.en.bin');

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`[setup-whisper-cpp] created directory ${dirPath}`);
  }
}

function downloadFile(url, destination) {
  return new Promise((resolve, reject) => {
    console.log(`[setup-whisper-cpp] downloading model from ${url}`);
    const file = fs.createWriteStream(destination);
    const request = https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Request failed with status ${response.statusCode}`));
        return;
      }

        response.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            console.log(`[setup-whisper-cpp] saved model to ${destination}`);
            resolve();
          });
        });
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
    console.error('[setup-whisper-cpp] Downloads disabled. Set DD_ALLOW_MODEL_DOWNLOADS=1 to proceed.');
    process.exitCode = 1;
    return;
  }
  ensureDirectory(TARGET_DIR);

  if (fs.existsSync(TARGET_FILE)) {
    console.log('[setup-whisper-cpp] whisper.cpp model already present, skipping download');
    return;
  }

  try {
    let attempts = 0;
    let lastError = null;
    while (attempts < 3) {
      try {
        await downloadFile(MODEL_URL, TARGET_FILE);
        lastError = null;
        break;
      } catch (error) {
        attempts += 1;
        lastError = error;
        console.warn(`[setup-whisper-cpp] attempt ${attempts} failed: ${error.message}`);
        if (attempts < 3) {
          console.warn('[setup-whisper-cpp] retrying download...');
        }
      }
    }

    if (lastError) {
      throw lastError;
    }
    console.log('[setup-whisper-cpp] whisper.cpp base.en model ready');
  } catch (error) {
    console.error('[setup-whisper-cpp] failed to download model:', error.message);
    if (fs.existsSync(TARGET_FILE)) {
      fs.unlinkSync(TARGET_FILE);
    }
    console.log('You can download the file manually and place it at', TARGET_FILE);
  }
}

if (require.main === module) {
  main();
}
