#!/usr/bin/env node
/* eslint-disable no-console */
const { spawn } = require('child_process');

const REQUIRED_MODELS = [
  'tinyllama:1.1b',
  'qwen2.5:0.5b',
  'qwen2.5:1.5b',
  'qwen2.5:3b',
];

function run(command, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`));
      }
    });
  });
}

async function listModels() {
  try {
    const buffers = [];
    await new Promise((resolve, reject) => {
      const child = spawn('ollama', ['list'], { stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.on('data', (data) => buffers.push(data));
      child.stderr.on('data', (data) => buffers.push(data));
      child.on('error', reject);
      child.on('close', () => resolve());
    });
    const output = Buffer.concat(buffers).toString('utf8');
    return output.split('\n').map((line) => line.split(/[\s]+/)[0]).filter(Boolean);
  } catch (error) {
    console.warn('[setup-ollama-models] Unable to list models:', error.message);
    return [];
  }
}

async function ensureModel(model) {
  const installed = await listModels();
  if (installed.includes(model)) {
    console.log(`[setup-ollama-models] ${model} already present`);
    return;
  }

  console.log(`[setup-ollama-models] pulling ${model}`);
  await run('ollama', ['pull', model]);
}

async function main() {
  if (process.env.DD_ALLOW_OLLAMA_PULL !== '1') {
    console.error('[setup-ollama-models] Set DD_ALLOW_OLLAMA_PULL=1 to allow model downloads.');
    process.exitCode = 1;
    return;
  }

  try {
    await run('ollama', ['--version']);
  } catch (error) {
    console.error('[setup-ollama-models] Ollama CLI not found. Install from https://ollama.com/download');
    process.exitCode = 1;
    return;
  }

  for (const model of REQUIRED_MODELS) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await ensureModel(model);
    } catch (error) {
      console.error(`[setup-ollama-models] Failed to pull ${model}:`, error.message);
    }
  }
}

if (require.main === module) {
  main();
}
