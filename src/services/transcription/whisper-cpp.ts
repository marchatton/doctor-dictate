import { spawn } from 'child_process';
import type { SpawnOptionsWithoutStdio } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

export type WhisperCppConfig = {
  model?: string;
  threads?: number;
  chunkSize?: number;
  overlap?: number;
  vad?: {
    enabled?: boolean;
    threshold?: number;
  };
};

export class WhisperCpp {
  private readonly model: string;

  private readonly threads: number;

  private readonly chunkSize: number;

  private readonly overlap: number;

  private readonly config: WhisperCppConfig;

  private readonly whisperPath: string;

  private readonly modelsPath: string;

  constructor(config: WhisperCppConfig = {}) {
    this.model = config.model || 'base.en';
    this.threads = Math.max(1, Math.min(4, config.threads || os.cpus().length - 1));
    this.chunkSize = config.chunkSize || 30;
    this.overlap = config.overlap || 5;
    this.config = config;
    this.whisperPath = this.findWhisperExecutable();
    this.modelsPath = path.join(os.homedir(), '.whisper-cpp', 'models');
  }

  async isAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const check = spawn('which', ['whisper-cli']);
      check.on('close', (code) => resolve(code === 0));
      check.on('error', () => resolve(false));
    });
  }

  async ensureModel(): Promise<string> {
    const modelFile = path.join(this.modelsPath, `ggml-${this.model}.bin`);
    if (!fs.existsSync(modelFile)) {
      throw new Error(`Whisper model not found: ${modelFile}`);
    }
    return modelFile;
  }

  async convertToWav(audioPath: string): Promise<{ wavPath: string; isTemp: boolean }> {
    const ext = path.extname(audioPath).toLowerCase();
    if (ext === '.wav') {
      return { wavPath: audioPath, isTemp: false };
    }

    const wavPath = audioPath.replace(ext, '-temp.wav');
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', audioPath,
        '-ar', '16000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        wavPath,
        '-y',
      ]);
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg failed with code ${code}`));
        }
      });
      ffmpeg.on('error', (error) => reject(new Error(`FFmpeg error: ${error.message}`)));
    });

    return { wavPath, isTemp: true };
  }

  async transcribe(audioPath: string, options: SpawnOptionsWithoutStdio = {}): Promise<string> {
    const modelPath = await this.ensureModel();
    const { wavPath, isTemp } = await this.convertToWav(audioPath);

    try {
      const args = [
        '-m',
        modelPath,
        '-f',
        wavPath,
        '-t',
        String(this.threads),
        '-l',
        'en',
        '--no-timestamps',
        '-otxt',
      ];

      if (this.config.vad?.enabled && this.config.vad.threshold) {
        args.push('--vad-thold', String(this.config.vad.threshold));
      }

      const text = await this.runProcess(args, options);
      return text.trim();
    } finally {
      if (isTemp && fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath);
      }
    }
  }

  private findWhisperExecutable(): string {
    const possiblePaths = [
      '/opt/homebrew/bin/whisper-cli',
      '/usr/local/bin/whisper-cli',
      '/opt/homebrew/bin/whisper',
      '/usr/local/bin/whisper',
      'whisper-cli',
    ];

    for (const execPath of possiblePaths) {
      if (fs.existsSync(execPath)) {
        return execPath;
      }
    }

    return 'whisper-cli';
  }

  private runProcess(args: string[], options: SpawnOptionsWithoutStdio = {}): Promise<string> {
    return new Promise((resolve, reject) => {
      const whisper = spawn(this.whisperPath, args, options);

      let output = '';
      let errorOutput = '';

      whisper.stdout.on('data', (data) => {
        output += data.toString();
      });

      whisper.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      whisper.on('close', (code) => {
        if (code === 0) {
          resolve(output.trim());
        } else {
          reject(new Error(`Whisper failed: ${errorOutput || `code ${code}`}`));
        }
      });

      whisper.on('error', (error) => reject(error));
    });
  }
}
export default WhisperCpp;
