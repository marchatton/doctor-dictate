#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

const { TranscriptionManager } = require('../src/services/transcription/manager/TranscriptionManager');
const { FastMode } = require('../src/services/transcription/manager/modes/FastMode');
const { AccurateMode } = require('../src/services/transcription/manager/modes/AccurateMode');
const { WhisperTranscriber } = require('../src/services/transcription/whisper.js');
const { WhisperCppEngine } = require('../src/services/transcription/manager/engines/WhisperCppEngine');
const { FasterWhisperBridge } = require('../src/services/transcription/manager/engines/FasterWhisperBridge');

function resolveModes(selected, available) {
  if (!Array.isArray(selected) || selected.length === 0) {
    return available;
  }
  const normalized = new Set(selected.map((entry) => String(entry)));
  return available.filter((mode) => normalized.has(mode));
}

function parseArgs(argv) {
  const options = {
    audio: null,
    modes: [],
    repeat: 1,
    skipFormatting: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    const [flag, value] = token.split('=');
    switch (flag) {
      case '--audio':
        options.audio = value || argv[++index];
        break;
      case '--mode':
        (value || argv[++index] || '')
          .split(',')
          .filter(Boolean)
          .forEach((entry) => options.modes.push(entry));
        break;
      case '--repeat': {
        const repeatValue = Number(value || argv[++index]);
        if (!Number.isNaN(repeatValue) && repeatValue > 0) {
          options.repeat = repeatValue;
        }
        break;
      }
      case '--skip-formatting':
        options.skipFormatting = true;
        break;
      default:
        console.warn(`[benchmark] ignoring unknown flag ${token}`);
        break;
    }
  }

  return options;
}

async function main() {
  const argv = parseArgs(process.argv.slice(2));
  if (!argv.audio) {
    console.error('[benchmark] --audio <path> is required');
    process.exit(1);
  }

  const audioPath = path.resolve(process.cwd(), argv.audio);
  if (!fs.existsSync(audioPath)) {
    console.error('[benchmark] audio file not found:', audioPath);
    process.exit(1);
  }

  const sharedTranscriber = new WhisperTranscriber();
  const fastMode = new FastMode({
    engineFactory: (config) => new WhisperCppEngine({ config, transcriber: sharedTranscriber }),
  });
  const accurateMode = new AccurateMode({
    engineFactory: (config) => new FasterWhisperBridge({ config, transcriber: sharedTranscriber }),
  });

  let formattingManager = null;
  if (!argv.skipFormatting) {
    try {
      // Lazy require to avoid eager Ollama dependency when skipped
      // eslint-disable-next-line global-require
      const { FormattingManager } = require('../src/services/formatting/manager/FormattingManager');
      formattingManager = new FormattingManager();
    } catch (error) {
      console.warn('[benchmark] Failed to load formatting manager, continuing without formatting:', error.message);
    }
  }

  const manager = new TranscriptionManager({
    modes: new Map([
      [fastMode.key, fastMode],
      [accurateMode.key, accurateMode],
    ]),
    formattingManager,
  });

  const availableModes = ['fast', 'accurate'];
  const targetModes = resolveModes(argv.modes, availableModes);
  const results = [];

  for (const modeKey of targetModes) {
    for (let iteration = 0; iteration < argv.repeat; iteration += 1) {
      const started = performance.now();
      try {
        const result = await manager.transcribe({ audioPath, mode: modeKey });
        const elapsedMs = performance.now() - started;
        const formatting = result.metadata?.formatting;
        const cacheHits = formatting?.cacheHits ?? 0;
        const cacheMisses = formatting?.cacheMisses ?? 0;
        const cacheTotal = cacheHits + cacheMisses;
        const cacheHitRate = cacheTotal > 0 ? Number((cacheHits / cacheTotal).toFixed(2)) : null;

        results.push({
          mode: modeKey,
          iteration: iteration + 1,
          processingMs: Math.round(elapsedMs),
          audioSeconds: Math.round((result.duration || 0) * 10) / 10,
          peakMemoryMB: result.metadata?.peakMemoryMB || 0,
          cacheHits,
          cacheMisses,
          cacheHitRate,
        });
      } catch (error) {
        console.error(`[benchmark] ${modeKey} run failed:`, error.message);
        results.push({
          mode: modeKey,
          iteration: iteration + 1,
          error: error.message,
        });
      }
    }
  }

  if (results.length === 0) {
    console.warn('[benchmark] no runs executed');
    return;
  }

  console.table(results);

  const summary = results.reduce((acc, entry) => {
    if (entry.error) {
      acc[entry.mode] = acc[entry.mode] || { runs: 0, errors: 0, totalMs: 0, peakMemory: 0, cacheHits: 0, cacheMisses: 0 };
      acc[entry.mode].errors += 1;
      return acc;
    }
    const bucket = (acc[entry.mode] = acc[entry.mode] || { runs: 0, errors: 0, totalMs: 0, peakMemory: 0, cacheHits: 0, cacheMisses: 0 });
    bucket.runs += 1;
    bucket.totalMs += entry.processingMs;
    bucket.peakMemory = Math.max(bucket.peakMemory, entry.peakMemoryMB || 0);
    bucket.cacheHits += entry.cacheHits || 0;
    bucket.cacheMisses += entry.cacheMisses || 0;
    return acc;
  }, {});

  console.log('\nSummary:');
  console.table(
    Object.entries(summary).map(([mode, data]) => {
      const totalRuns = data.runs || 1;
      const cacheTotal = data.cacheHits + data.cacheMisses;
      return {
        mode,
        runs: data.runs,
        errors: data.errors,
        avgMs: Math.round(data.totalMs / totalRuns),
        peakMemoryMB: data.peakMemory,
        cacheHits: data.cacheHits,
        cacheMisses: data.cacheMisses,
        cacheHitRate: cacheTotal > 0 ? Number((data.cacheHits / cacheTotal).toFixed(2)) : null,
      };
    })
  );
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[benchmark] fatal error:', error.message);
    process.exit(1);
  });
}
