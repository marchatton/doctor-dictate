import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';

import type { WhisperTranscriber } from '../../transcription/whisper';

type BridgeConfig = Record<string, any>;

type HttpClientLike = {
  ensureReady: (config: BridgeConfig | null, port: number) => Promise<void>;
  transcribeChunk: (chunk: any, config: BridgeConfig | null, port: number) => Promise<any>;
};

type FetchLike = typeof fetch;

type FasterWhisperBridgeOptions = {
  config?: BridgeConfig | null;
  transcriber?: Partial<WhisperTranscriber> | null;
  logger?: Pick<Console, 'info' | 'error' | 'warn' | 'debug'>;
  httpClient?: HttpClientLike | null;
  port?: number;
  host?: string;
  fetchImpl?: FetchLike | null;
};

export class FasterWhisperBridge {
  private config: BridgeConfig | null;

  private readonly transcriber: Partial<WhisperTranscriber> | null;

  private readonly logger: Pick<Console, 'info' | 'error' | 'warn' | 'debug'>;

  private pythonProcess: ChildProcess | null = null;

  private bridgeReady: Promise<void> | null = null;

  private readonly httpClient: HttpClientLike | null;

  private port: number;

  private host: string;

  private fetchImpl: FetchLike | null;

  constructor(options: FasterWhisperBridgeOptions = {}) {
    this.config = options.config || null;
    this.transcriber = options.transcriber || null;
    this.logger = options.logger || console;
    this.httpClient = options.httpClient || null;
    this.port = options.port || 8765;
    this.host = options.host || '127.0.0.1';
    this.fetchImpl = options.fetchImpl || null;
  }

  async initialize(config?: BridgeConfig): Promise<void> {
    this.config = config || this.config;

    if (this.transcriber?.initializeWhisper) {
      await this.transcriber.initializeWhisper();
      return;
    }

    if (this.httpClient) {
      await this.httpClient.ensureReady(this.config, this.port);
      return;
    }

    this.applyOverrides();

    if (!this.pythonProcess) {
      await this.startPythonBridge();
    }

    await this.waitForBridge();
  }

  async transcribeChunk(chunk: any): Promise<any> {
    if (!chunk || !chunk.path) {
      throw new Error('Chunk path is required for FasterWhisperBridge');
    }

    if (this.httpClient) {
      return this.httpClient.transcribeChunk(chunk, this.config, this.port);
    }

    if (this.transcriber?.runWhisper) {
      const text = await this.transcriber.runWhisper(chunk.path);
      return {
        text: text.trim(),
        segments: [
          {
            start: chunk.start ?? 0,
            end: chunk.end ?? (chunk.start ?? 0) + (chunk.duration || 0),
            text: text.trim(),
          },
        ],
        start: chunk.start ?? 0,
        end: chunk.end ?? (chunk.start ?? 0) + (chunk.duration || 0),
        metadata: {
          engine: 'faster-whisper',
          model: this.config?.whisper?.model,
        },
      };
    }

    const response = await this.invokeBridge(chunk.path, this.config);
    const segments = (response.segments || []).map((segment: any, index: number) => ({
      start: segment.start ?? chunk.start ?? 0,
      end: segment.end ?? chunk.end ?? (chunk.start ?? 0) + (chunk.duration || 0),
      text: segment.text || '',
      index,
    }));

    const text = response.text || segments.map((segment) => segment.text).join(' ');

    return {
      text: text.trim(),
      segments,
      start: chunk.start ?? 0,
      end: chunk.end ?? (chunk.start ?? 0) + (chunk.duration || 0),
      metadata: {
        engine: 'faster-whisper',
        model: this.config?.whisper?.model,
      },
    };
  }

  async finalize(): Promise<void> {
    // no-op
  }

  async cleanup(): Promise<void> {
    // no-op
  }

  normalizeSettings(settings: Record<string, unknown>): Record<string, unknown> {
    return Object.entries(settings || {}).reduce<Record<string, unknown>>((acc, [key, value]) => {
      const snakeKey = key.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`);
      acc[snakeKey] = value;
      return acc;
    }, {});
  }

  private applyOverrides(): void {
    if (!this.config) {
      return;
    }

    const bridge = this.config.bridge || {};
    if (bridge.port) {
      this.port = bridge.port;
    }
    if (bridge.host) {
      this.host = bridge.host;
    }
  }

  private async startPythonBridge(): Promise<void> {
    const bridgePath = path.resolve(process.cwd(), 'python-bridge/faster_whisper_server.py');
    if (!fs.existsSync(bridgePath)) {
      this.logger.warn('[FasterWhisperBridge] Python bridge not found, falling back to local transcriber');
      return;
    }

    if (this.bridgeReady) {
      return this.bridgeReady;
    }

    const args = [bridgePath, '--port', String(this.port), '--host', this.host];

    const modelPath = this.resolveModelPath(this.config?.whisper?.modelPath);
    if (modelPath) {
      args.push('--model', modelPath);
    }

    const device = this.config?.whisper?.settings?.device;
    if (device) {
      args.push('--device', device);
    }

    const computeType = this.config?.whisper?.settings?.computeType;
    if (computeType) {
      args.push('--compute-type', computeType);
    }

    const pythonExecutable = this.config?.bridge?.pythonPath || process.env.DD_PYTHON || 'python3';

    this.bridgeReady = new Promise((resolve, reject) => {
      try {
        this.pythonProcess = spawn(pythonExecutable, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (error) {
        this.pythonProcess = null;
        this.bridgeReady = null;
        reject(new Error(`[FasterWhisperBridge] failed to spawn ${pythonExecutable}: ${(error as Error).message}`));
        return;
      }

      let lastError = '';

      this.pythonProcess?.stdout?.on('data', (data) => {
        this.logger.info('[FasterWhisperBridge] python:', data.toString().trim());
      });
      this.pythonProcess?.stderr?.on('data', (data) => {
        const message = data.toString().trim();
        lastError = message || lastError;
        this.logger.error('[FasterWhisperBridge] python err:', message);
      });
      this.pythonProcess?.once('error', (error) => {
        this.logger.error('[FasterWhisperBridge] bridge process error:', error);
        this.bridgeReady = null;
        this.pythonProcess = null;
        reject(new Error(`[FasterWhisperBridge] bridge process error: ${error.message}`));
      });
      this.pythonProcess?.once('spawn', () => resolve());
      this.pythonProcess?.on('exit', (code, signal) => {
        this.logger.info('[FasterWhisperBridge] python exited', code, signal);
        this.pythonProcess = null;
        this.bridgeReady = null;
        if (code !== 0 && lastError) {
          this.logger.error('[FasterWhisperBridge] bridge exited with error:', lastError);
        }
      });
    });
  }

  private async waitForBridge(timeoutMs = 5000): Promise<void> {
    const fetchImpl = await this.resolveFetch();
    const deadline = Date.now() + timeoutMs;
    const url = new URL('/health', `http://${this.host}:${this.port}`);

    while (Date.now() < deadline) {
      try {
        const response = await fetchImpl(url);
        if (response.ok) {
          return;
        }
      } catch (error) {
        this.logger.debug?.('[FasterWhisperBridge] waiting for bridge', (error as Error)?.message || error);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error('Faster-Whisper bridge not reachable');
  }

  private async resolveFetch(): Promise<FetchLike> {
    if (this.fetchImpl) {
      return this.fetchImpl;
    }
    if (typeof fetch === 'function') {
      this.fetchImpl = fetch.bind(globalThis);
      return this.fetchImpl;
    }
    const { default: nodeFetch } = await import('node-fetch');
    this.fetchImpl = nodeFetch as FetchLike;
    return this.fetchImpl;
  }

  private async invokeBridge(chunkPath: string, config: BridgeConfig | null) {
    const fetchImpl = await this.resolveFetch();
    const formData = new FormData();
    formData.append('file', fs.createReadStream(chunkPath) as any);
    formData.append('config', JSON.stringify(config));

    const response = await fetchImpl(new URL('/transcribe', `http://${this.host}:${this.port}`), {
      method: 'POST',
      body: formData as any,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`Bridge request failed: ${response.status} ${body}`);
    }

    return response.json();
  }

  resolveModelPath(modelPath?: string): string | null {
    if (!modelPath) {
      return null;
    }
    if (path.isAbsolute(modelPath)) {
      return modelPath;
    }
    return path.resolve(process.cwd(), modelPath);
  }
}

export default FasterWhisperBridge;
