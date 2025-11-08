import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

type ProgressCallback = (stage: string, percent?: number, message?: string) => void;

type Chunk = {
  path: string;
  start: number;
  duration: number;
  index: number;
  overlap?: number;
  isFullFile: boolean;
};

type ProcessAudioResult = {
  processedPath: string;
  chunks: Chunk[];
  duration: number;
};

export class AudioProcessor {
  chunkDuration: number;

  chunkOverlap: number;

  readonly targetSampleRate: number;

  constructor() {
    this.chunkDuration = 30;
    this.chunkOverlap = 2;
    this.targetSampleRate = 16000;
  }

  async processAudio(inputPath: string, onProgress: ProgressCallback = () => {}): Promise<ProcessAudioResult> {
    onProgress('preprocessing', 0, 'Starting audio preprocessing...');

    const preprocessedPath = await this.preprocessAudio(inputPath, onProgress);
    const duration = await this.getAudioDuration(preprocessedPath);
    const chunks = await this.createChunks(preprocessedPath, duration, onProgress);

    return {
      processedPath: preprocessedPath,
      chunks,
      duration,
    };
  }

  async preprocessAudio(inputPath: string, onProgress: ProgressCallback): Promise<string> {
    return new Promise((resolve) => {
      const outputPath = path.join(os.tmpdir(), `preprocessed-${Date.now()}.wav`);

      onProgress('preprocessing', 25, 'Converting to optimal format...');

      const ffmpeg = spawn('ffmpeg', [
        '-i', inputPath,
        '-ar', String(this.targetSampleRate),
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        '-y',
        outputPath,
      ]);

      let errorOutput = '';

      ffmpeg.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        const progress = this.parseFFmpegProgress(text);
        if (progress) {
          onProgress('preprocessing', 25 + progress * 0.5, 'Converting audio...');
        }
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          onProgress('preprocessing', 75, 'Audio preprocessing complete');
          resolve(outputPath);
        } else {
          if (errorOutput.trim().length > 0) {
            console.warn('FFmpeg preprocessing failed, using original file. Details:', errorOutput.trim());
          } else {
            console.warn('FFmpeg preprocessing failed, using original file');
          }
          resolve(inputPath);
        }
      });

      ffmpeg.on('error', (error) => {
        console.warn('FFmpeg not available, using original file:', error.message);
        resolve(inputPath);
      });
    });
  }

  async getAudioDuration(audioPath: string): Promise<number> {
    return new Promise((resolve) => {
      const ffprobe = spawn('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'json', audioPath]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            const duration = parseFloat(result.format?.duration ?? '0');
            resolve(Number.isFinite(duration) ? duration : 0);
          } catch {
            resolve(0);
          }
        } else {
          resolve(0);
        }
      });

      ffprobe.on('error', () => resolve(0));
    });
  }

  async createChunks(audioPath: string, duration: number, onProgress: ProgressCallback): Promise<Chunk[]> {
    if (duration <= this.chunkDuration || duration === 0) {
      return [
        {
          path: audioPath,
          start: 0,
          duration: duration || this.chunkDuration,
          index: 0,
          isFullFile: true,
        },
      ];
    }

    const chunks: Chunk[] = [];
    const effectiveChunkDuration = this.chunkDuration;
    const step = effectiveChunkDuration - this.chunkOverlap;
    const numChunks = Math.ceil(duration / step);

    onProgress('chunking', 0, `Splitting audio into ${numChunks} chunks...`);

    for (let i = 0; i < numChunks; i += 1) {
      const start = i * step;
      const chunkDuration = Math.min(effectiveChunkDuration, duration - start);
      const chunkPath = path.join(os.tmpdir(), `chunk-${Date.now()}-${i}.wav`);

      await this.extractChunk(audioPath, chunkPath, start, chunkDuration);

      chunks.push({
        path: chunkPath,
        start,
        duration: chunkDuration,
        index: i,
        overlap: i > 0 ? this.chunkOverlap : 0,
        isFullFile: false,
      });

      const progress = ((i + 1) / numChunks) * 100;
      onProgress('chunking', progress, `Created chunk ${i + 1} of ${numChunks}`);
    }

    return chunks;
  }

  async extractChunk(inputPath: string, outputPath: string, start: number, duration: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', ['-i', inputPath, '-ss', String(start), '-t', String(duration), '-c', 'copy', '-y', outputPath]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(outputPath);
        } else {
          reject(new Error(`Failed to extract chunk at ${start}s`));
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  parseFFmpegProgress(output: string): number | null {
    const timeMatch = output.match(/time=(\d{2}):(\d{2}):(\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = parseInt(timeMatch[3], 10);
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      return Math.min(totalSeconds / 10, 1);
    }
    return null;
  }

  combineTranscriptions(transcriptions: Array<{ text: string; overlap?: number }>): string {
    if (transcriptions.length === 0) return '';
    if (transcriptions.length === 1) return transcriptions[0].text;

    let combined = transcriptions[0].text;

    for (let i = 1; i < transcriptions.length; i += 1) {
      const current = transcriptions[i];

      if (current.overlap && current.overlap > 0 && combined.length > 0) {
        const overlapText = this.findOverlapPoint(combined, current.text);
        if (overlapText) {
          const cleanText = current.text.substring(overlapText.length);
          combined += ` ${cleanText}`;
        } else {
          combined += ` ${current.text}`;
        }
      } else {
        combined += ` ${current.text}`;
      }
    }

    return combined.trim();
  }

  findOverlapPoint(endText: string, startText: string): string | null {
    const endWords = endText.split(' ').slice(-10);
    const startWords = startText.split(' ').slice(0, 10);

    for (let i = Math.min(5, startWords.length); i > 0; i -= 1) {
      const startSequence = startWords.slice(0, i).join(' ');
      const endSequence = endWords.slice(-i).join(' ');
      if (endSequence === startSequence) {
        return startSequence;
      }
    }

    return null;
  }

  async cleanup(chunks: Array<{ path: string; isFullFile?: boolean }>): Promise<void> {
    for (const chunk of chunks) {
      if (!chunk.isFullFile && fs.existsSync(chunk.path)) {
        try {
          fs.unlinkSync(chunk.path);
        } catch (error) {
          console.warn(`Failed to cleanup chunk file: ${chunk.path}`, error);
        }
      }
    }
  }
}

export default AudioProcessor;
