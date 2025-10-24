const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class FasterWhisperBridge {
  constructor(options = {}) {
    this.config = options.config || null;
    this.transcriber = options.transcriber || null;
    this.logger = options.logger || console;
    this.pythonProcess = null;
    this.httpClient = options.httpClient || null;
    this.port = options.port || 8765;
  }

  async initialize(config) {
    this.config = config || this.config;

    if (this.httpClient) {
      await this.httpClient.ensureReady(this.config, this.port);
      return;
    }

    if (this.transcriber?.initializeWhisper) {
      await this.transcriber.initializeWhisper();
      return;
    }

    if (!this.pythonProcess) {
      await this.startPythonBridge();
    }
  }

  async startPythonBridge() {
    const bridgePath = path.resolve(process.cwd(), 'python-bridge/faster_whisper_server.py');
    if (!fs.existsSync(bridgePath)) {
      this.logger.warn('[FasterWhisperBridge] Python bridge not found, falling back to local transcriber');
      return;
    }

    this.pythonProcess = spawn('python3', [
      bridgePath,
      '--port',
      String(this.port),
      '--model',
      this.config?.whisper?.modelPath || '',
    ]);

    this.pythonProcess.stdout.on('data', (data) => {
      this.logger.info('[FasterWhisperBridge] python:', data.toString().trim());
    });
    this.pythonProcess.stderr.on('data', (data) => {
      this.logger.error('[FasterWhisperBridge] python err:', data.toString().trim());
    });
  }

  async transcribeChunk(chunk, context = {}) {
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

    throw new Error('No Faster Whisper backend available');
  }

  async finalize() {
    // No-op
  }

  async cleanup() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
  }
}

module.exports = { FasterWhisperBridge };
