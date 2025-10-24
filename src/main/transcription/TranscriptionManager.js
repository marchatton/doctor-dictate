const { FastMode } = require('./modes/FastMode');
const { AccurateMode } = require('./modes/AccurateMode');
const { MemoryMonitor } = require('./utils/MemoryMonitor');
const { ProgressReporter } = require('./utils/ProgressReporter');

class TranscriptionManager {
  constructor(options = {}) {
    const { modes, memoryMonitor, progressReporterFactory } = options;
    this.modes = modes instanceof Map ? modes : this.createDefaultModes();
    this.memoryMonitor = memoryMonitor || new MemoryMonitor();
    this.progressReporterFactory =
      progressReporterFactory || ((context) => new ProgressReporter(context));
  }

  createDefaultModes() {
    const fastMode = new FastMode();
    const accurateMode = new AccurateMode();
    return new Map([
      [fastMode.key, fastMode],
      [accurateMode.key, accurateMode],
    ]);
  }

  listModes() {
    return Array.from(this.modes.values()).map((mode) => ({
      key: mode.key,
      label: mode.label,
      description: mode.description,
      memoryBudget: mode.memoryBudget,
      chunkConfig: mode.chunkConfig,
    }));
  }

  async transcribe({ audioPath, mode = 'accurate', signal, progressReporter: providedReporter }) {
    if (!audioPath) {
      throw new Error('audioPath is required for transcription');
    }

    const selectedMode = this.modes.get(mode) || this.modes.get('accurate');
    if (!selectedMode) {
      throw new Error(`Unknown transcription mode: ${mode}`);
    }

    const engine = selectedMode.createEngine();
    const progressReporter =
      providedReporter ||
      this.progressReporterFactory({
        audioPath,
        mode: selectedMode.key,
      });

    progressReporter.begin({ stage: 'initializing' });

    const executeTranscription = async () => {
      if (typeof engine.initialize === 'function') {
        await engine.initialize(selectedMode);
      }

      try {
        const result = await engine.transcribe(
          {
            audioPath,
            chunkConfig: selectedMode.chunkConfig,
            vadConfig: selectedMode.vadConfig,
            signal,
          },
          progressReporter
        );

        const normalizedResult = this.attachMetadata(result, selectedMode);
        progressReporter.complete(normalizedResult);
        return normalizedResult;
      } catch (error) {
        progressReporter.fail(error);
        throw error;
      }
    };

    return this.memoryMonitor.runWithinBudget(
      selectedMode.memoryBudget,
      executeTranscription
    );
  }

  attachMetadata(result, mode) {
    if (!result || typeof result !== 'object') {
      return {
        raw: '',
        corrected: '',
        formatted: '',
        metadata: { mode: mode.key },
      };
    }

    const metadata = {
      ...(result.metadata || {}),
      mode: mode.key,
    };

    return { ...result, metadata };
  }
}

module.exports = { TranscriptionManager };
