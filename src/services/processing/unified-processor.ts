import fs from 'fs';

import { ProcessingModes, type ProcessingMode } from './processing-config';
import WhisperCpp from '../transcription/whisper-cpp';
import { WhisperTranscriber } from '../transcription/whisper';
import { OllamaFormatter } from '../formatting/ollama-formatter';

type ProcessResult = {
  text: string;
  transcript: string;
  mode: string;
  processingTime: number;
  metadata: {
    whisperModel: string;
    ollamaModel: string;
  };
};

export class UnifiedProcessor {
  private config: ProcessingMode;

  constructor(mode: keyof typeof ProcessingModes = 'ACCURATE') {
    const selected = ProcessingModes[mode];
    if (!selected) {
      throw new Error(`Invalid mode: ${mode}. Use FAST or ACCURATE`);
    }
    this.config = selected;
  }

  async process(audioPath: string): Promise<ProcessResult> {
    const startTime = Date.now();
    try {
      let processedAudio = audioPath;
      if (this.config.vad.enabled) {
        processedAudio = await this.removeSlience(audioPath);
      }

      const transcript = await this.transcribe(processedAudio);
      const formatted = await this.format(transcript);
      const duration = (Date.now() - startTime) / 1000;

      return {
        text: formatted,
        transcript,
        mode: this.config.name,
        processingTime: duration,
        metadata: {
          whisperModel: this.config.whisper.model,
          ollamaModel: this.config.ollama.model,
        },
      };
    } catch (error) {
      if (this.config.name === 'High Accuracy') {
        this.config = ProcessingModes.FAST;
        return this.process(audioPath);
      }
      throw error;
    }
  }

  private async transcribe(audioPath: string): Promise<string> {
    const whisperCpp = new WhisperCpp(this.config.whisper);
    const isAvailable = await whisperCpp.isAvailable();
    if (isAvailable) {
      return whisperCpp.transcribe(audioPath);
    }

    const transcriber = new WhisperTranscriber();
    const result = await transcriber.transcribeAudio(audioPath);
    return typeof result === 'string' ? result : result.text || '';
  }

  private async format(text: string): Promise<string> {
    if (text.length < 100) {
      return text;
    }

    const formatter = new OllamaFormatter({
      model: this.config.ollama.model,
      temperature: this.config.ollama.temperature,
    });

    const available = await formatter.isOllamaAvailable();
    if (!available) {
      return text;
    }

    const result = await formatter.formatMedicalDictation(text, {
      temperature: this.config.ollama.temperature,
      num_predict: this.config.ollama.numPredict,
      num_ctx: this.config.ollama.numCtx,
      timeout: this.config.ollama.timeout,
    });

    return result.success ? result.formatted : text;
  }

  private async removeSlience(audioPath: string): Promise<string> {
    // TODO: hook up actual VAD for preprocessing; currently passthrough
    return audioPath;
  }
}

export class ProcessorFactory {
  static create(recordingPath: string): UnifiedProcessor {
    const stats = fs.statSync(recordingPath);
    const estimatedMinutes = stats.size / (1024 * 1024 * 1.5);
    if (estimatedMinutes > 20) {
      return new UnifiedProcessor('FAST');
    }
    return new UnifiedProcessor('ACCURATE');
  }

  static createFast(): UnifiedProcessor {
    return new UnifiedProcessor('FAST');
  }

  static createAccurate(): UnifiedProcessor {
    return new UnifiedProcessor('ACCURATE');
  }
}
