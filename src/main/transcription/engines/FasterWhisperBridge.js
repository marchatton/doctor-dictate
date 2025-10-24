const { AudioChunker } = require('../processors/AudioChunker');
const { VADProcessor } = require('../processors/VADProcessor');
const { ResultMerger } = require('../processors/ResultMerger');
const { WhisperTranscriber } = require('../../../services/transcription/whisper.js');

class FasterWhisperBridge {
  constructor(options = {}) {
    this.chunkConfig = options.chunkConfig || { windowSeconds: 30, overlapSeconds: 3 };
    this.vadConfig = options.vadConfig || { threshold: 0.5 };
    this.audioChunker = options.audioChunker || new AudioChunker({ chunkConfig: this.chunkConfig });
    this.vadProcessor = options.vadProcessor || new VADProcessor({ vadConfig: this.vadConfig });
    this.resultMerger = options.resultMerger || new ResultMerger();
    this.transcriber = options.transcriber || new WhisperTranscriber();
    this.bridgeReady = false;
  }

  async initialize(mode) {
    if (mode && mode.chunkConfig) {
      this.audioChunker.configure(mode.chunkConfig);
    }
    if (mode && mode.vadConfig && typeof this.vadProcessor.configure === 'function') {
      this.vadProcessor.configure(mode.vadConfig);
    }

    if (!this.bridgeReady && typeof this.transcriber.initializeWhisper === 'function') {
      await this.transcriber.initializeWhisper();
      this.bridgeReady = true;
    }
  }

  async transcribe(context, reporter) {
    const { audioPath } = context;

    try {
      const transcription = await this.transcriber.transcribeAudio(audioPath, (progress) => {
        if (!reporter || !progress) {
          return;
        }
        const stage = progress.stage || progress.stageName || progress.phase || 'transcribing';
        const percent =
          progress.percent !== undefined
            ? progress.percent
            : progress.progress !== undefined
            ? progress.progress
            : progress.value !== undefined
            ? progress.value
            : 0;
        reporter.reportStage(stage, {
          percent,
          rawProgress: progress,
          message: progress.message,
          stages: progress.stages,
          isComplete: progress.isComplete,
          showSpinner: progress.showSpinner,
        });
      });

      const metadata = {
        ...(transcription && transcription.metadata ? transcription.metadata : {}),
        engine: 'faster-whisper',
      };

      return { ...transcription, metadata };
    } catch (error) {
      if (typeof this.transcriber.resetProcessingState === 'function') {
        this.transcriber.resetProcessingState();
      }
      throw error;
    }
  }
}

module.exports = { FasterWhisperBridge };
