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
    this.host = options.host || '127.0.0.1';
    this.fetchImpl = options.fetchImpl || null;
  }

  async initialize(config) {
    this.config = config || this.config;

    if (this.transcriber?.initializeWhisper) {
      await this.transcriber.initializeWhisper();
      return;
    }

    if (this.httpClient) {
      await this.httpClient.ensureReady(this.config, this.port);
      return;
    }

    this.applyBridgeOverrides();

    if (!this.pythonProcess) {
      await this.startPythonBridge();
    }

    await this.waitForBridge();
  }

  applyBridgeOverrides() {
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

  async startPythonBridge() {
    const bridgePath = path.resolve(process.cwd(), 'python-bridge/faster_whisper_server.py');
    if (!fs.existsSync(bridgePath)) {
      this.logger.warn('[FasterWhisperBridge] Python bridge not found, falling back to local transcriber');
      return;
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

    this.pythonProcess = spawn('python3', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    this.pythonProcess.stdout.on('data', (data) => {
      this.logger.info('[FasterWhisperBridge] python:', data.toString().trim());
    });
    this.pythonProcess.stderr.on('data', (data) => {
      this.logger.error('[FasterWhisperBridge] python err:', data.toString().trim());
    });
    this.pythonProcess.on('exit', (code, signal) => {
      this.logger.info('[FasterWhisperBridge] python exited', code, signal);
      this.pythonProcess = null;
    });
  }

  async waitForBridge(timeoutMs = 5000) {
    const fetch = await this.resolveFetch();
    const deadline = Date.now() + timeoutMs;
    const url = new URL('/health', `http://${this.host}:${this.port}`);

    while (Date.now() < deadline) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return;
        }
      } catch (error) {
        this.logger.debug?.('[FasterWhisperBridge] waiting for bridge', error?.message || error);
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    throw new Error('Faster-Whisper bridge not reachable');
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

    const response = await this.invokeBridge(chunk.path, this.config);
    const segments = (response.segments || []).map((segment, index) => ({
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

  async finalize() {
    // No-op
  }

  async cleanup() {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
  }

  async resolveFetch() {
    if (this.fetchImpl) {
      return this.fetchImpl;
    }

    if (typeof fetch !== 'function') {
      throw new Error('Fetch API is unavailable in this Node runtime');
    }

    this.fetchImpl = fetch.bind(globalThis);
    return this.fetchImpl;
  }

  async invokeBridge(audioPath, config) {
    await this.waitForBridge();
    const fetch = await this.resolveFetch();
    const url = new URL('/transcribe', `http://${this.host}:${this.port}`);
    const controller = new AbortController();
    const timeout = config?.llm?.timeout || 45000;
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_path: audioPath,
          settings: this.normalizeSettings(config?.whisper?.settings || {}),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await response.text().catch(() => response.statusText);
        throw new Error(`Bridge request failed: ${message}`);
      }

      const body = await response.json();
      if (body.success === false) {
        throw new Error(body.error || 'Bridge returned error');
      }

      return body;
    } finally {
      clearTimeout(timer);
    }
  }

  normalizeSettings(settings) {
    const keyMap = {
      beamSize: 'beam_size',
      computeType: 'compute_type',
      conditionOnPreviousText: 'condition_on_previous_text',
      compressionRatioThreshold: 'compression_ratio_threshold',
      logProbThreshold: 'log_prob_threshold',
      noSpeechThreshold: 'no_speech_threshold',
      wordTimestamps: 'word_timestamps',
      prependPunctuations: 'prepend_punctuations',
      appendPunctuations: 'append_punctuations',
    };

    const normalized = {};
    for (const [key, value] of Object.entries(settings || {})) {
      if (value === undefined || value === null) {
        continue;
      }

      const mappedKey = keyMap[key] || key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      normalized[mappedKey] = value;
    }

    return normalized;
  }

  resolveModelPath(modelPath) {
    if (!modelPath) {
      return null;
    }

    if (path.isAbsolute(modelPath)) {
      return modelPath;
    }

    return path.resolve(process.cwd(), modelPath);
  }
}

module.exports = { FasterWhisperBridge };
