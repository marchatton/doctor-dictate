# Technical Specification: Doctor-Dictate Performance Optimization

## 1. Executive Summary

This specification outlines the implementation of a dual-mode transcription system for the Doctor-Dictate application, replacing the current resource-intensive pipeline with optimized alternatives that prevent system freezing while maintaining medical transcription quality.

## 2. Problem Statement

### Current Issues
- 8-minute recordings take several minutes to process
- 30+ minute recordings cause laptop freezing due to RAM exhaustion
- Ollama times out on 60-second timeout
- Only partial transcription retrieved from chunked audio
- Current stack (Python Whisper + Ollama with Mistral/Llama3.2) uses 8GB+ RAM

### Success Criteria
- Process 30-minute recording in < 5 minutes (Higher Accuracy mode)
- Process 30-minute recording in < 2 minutes (Fast mode)
- Peak RAM usage < 4GB (ideally ≤2GB for Fast mode)
- Maintain > 90% transcription accuracy
- Maintain > 80% formatting compliance
- Zero system freezing events
- Support both macOS (Apple Silicon) and Windows

## 3. Assumptions & Constraints

### Assumptions
- Users have minimum 8GB RAM systems
- macOS users primarily on Apple Silicon (M1/M2)
- Single-user desktop application (no concurrent processing required)
- Audio input is primarily English medical dictation
- Internet connectivity not guaranteed (local-first requirement)
- Users can install Node.js native dependencies
- Python 3.8+ available for Faster-Whisper bridge

### Constraints
- Must maintain existing Electron/Node.js architecture
- Cannot require GPU (must work on CPU-only systems)
- Must preserve existing audio recording functionality
- 10KB medical formatting prompt must be retained
- Cannot use cloud APIs for primary processing
- Must support `.wav`, `.mp3`, `.m4a` audio formats
- Maximum file size: 2GB (~3 hours of audio)

### Out of Scope
- Multi-language support (English only for v1)
- Real-time streaming transcription during recording
- Speaker diarization
- Training custom models
- Windows-specific optimizations beyond basic compatibility

## 4. Technical Architecture

### 4.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Electron Main Process                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │Audio Handler│  │Transcription │  │  Formatting  │       │
│  │             │→ │   Manager    │→ │   Manager    │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│         ↓                ↓                   ↓               │
│  ┌─────────────────────────────────────────────────┐       │
│  │            Processing Pipeline                    │       │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐│       │
│  │  │  VAD   │→ │Chunker │→ │Whisper │→ │  LLM   ││       │
│  │  └────────┘  └────────┘  └────────┘  └────────┘│       │
│  └─────────────────────────────────────────────────┘       │
│                                                               │
│  ┌─────────────────────────────────────────────────┐       │
│  │              Mode Configuration                   │       │
│  │  ┌──────────────┐        ┌──────────────┐      │       │
│  │  │  Fast Mode   │        │Accurate Mode │      │       │
│  │  └──────────────┘        └──────────────┘      │       │
│  └─────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Component Specifications

#### 4.2.1 Fast Mode Configuration

```typescript
interface FastModeConfig {
  whisper: {
    implementation: 'whisper.cpp';
    model: 'base.en';
    modelPath: './models/ggml-base.en.bin';
    settings: {
      beamSize: 1;
      temperature: 0.0;
      language: 'en';
      threads: number; // CPU cores - 1
      processors: number; // 1 for sequential
      maxContext: -1;
      maxLen: 0;
      splitOnWord: true;
      noFallback: false;
      suppressBlank: true;
      suppressNonSpeechTokens: true;
    };
  };
  
  chunking: {
    chunkSize: 15; // seconds
    overlap: 0.5; // seconds
    maxBufferSize: 30; // seconds
    method: 'fixed'; // 'fixed' | 'vad'
  };
  
  vad: {
    enabled: true;
    minSilenceDurationMs: 800;
    minSpeechDurationMs: 250;
    speechPadMs: 100;
  };
  
  llm: {
    model: 'tinyllama:1.1b';
    endpoint: 'http://localhost:11434';
    settings: {
      temperature: 0.1;
      maxTokens: 500;
      numCtx: 2048;
      numPredict: 500;
      topK: 40;
      topP: 0.9;
      repeatPenalty: 1.0;
      seed: 42; // Deterministic
    };
    timeout: 30000; // 30 seconds
  };
  
  performance: {
    maxMemoryMB: 2048;
    targetProcessingRatio: 0.05; // 5% of audio duration
    maxRetries: 2;
  };
}
```

#### 4.2.2 Higher Accuracy Mode Configuration

```typescript
interface AccurateModeConfig {
  whisper: {
    implementation: 'faster-whisper';
    model: 'small.en';
    modelPath: './models/faster-whisper-small-en';
    settings: {
      device: 'cpu';
      computeType: 'int8';
      beamSize: 3;
      temperature: 0.0;
      language: 'en';
      conditionOnPreviousText: true;
      compressionRatioThreshold: 2.4;
      logProbThreshold: -1.0;
      noSpeechThreshold: 0.6;
      wordTimestamps: true;
      prependPunctuations: '"\'"¿([{-';
      appendPunctuations: '"\'.。,，!！?？:：")]}、';
    };
  };
  
  chunking: {
    chunkSize: 30; // seconds
    overlap: 2; // seconds
    maxBufferSize: 30; // seconds
    method: 'vad'; // Use VAD-based chunking
  };
  
  vad: {
    enabled: true;
    minSilenceDurationMs: 500;
    minSpeechDurationMs: 250;
    speechPadMs: 200;
    method: 'silero'; // Integrated in faster-whisper
  };
  
  llm: {
    model: 'qwen2.5:1.5b'; // or 'gemma:2b'
    endpoint: 'http://localhost:11434';
    settings: {
      temperature: 0.3;
      maxTokens: 1000;
      numCtx: 4096;
      numPredict: 1000;
      topK: 40;
      topP: 0.95;
      repeatPenalty: 1.1;
      seed: null; // Allow variation
    };
    timeout: 45000; // 45 seconds
  };
  
  performance: {
    maxMemoryMB: 3584; // 3.5GB
    targetProcessingRatio: 0.15; // 15% of audio duration
    maxRetries: 3;
  };
}
```

## 5. Implementation Plan

### 5.1 Module Structure

```
doctor-dictate/
├── src/
│   ├── main/
│   │   ├── transcription/
│   │   │   ├── TranscriptionManager.ts
│   │   │   ├── modes/
│   │   │   │   ├── FastMode.ts
│   │   │   │   └── AccurateMode.ts
│   │   │   ├── engines/
│   │   │   │   ├── WhisperCpp.ts
│   │   │   │   └── FasterWhisperBridge.ts
│   │   │   ├── processors/
│   │   │   │   ├── AudioChunker.ts
│   │   │   │   ├── VADProcessor.ts
│   │   │   │   └── ResultMerger.ts
│   │   │   └── utils/
│   │   │       ├── MemoryMonitor.ts
│   │   │       └── ProgressReporter.ts
│   │   ├── formatting/
│   │   │   ├── FormattingManager.ts
│   │   │   ├── OllamaClient.ts
│   │   │   ├── PromptManager.ts
│   │   │   └── MedicalTermCache.ts
│   │   └── models/
│   │       ├── downloader/
│   │       │   └── ModelDownloader.ts
│   │       └── validator/
│   │           └── ModelValidator.ts
│   └── renderer/
│       └── components/
│           ├── TranscriptionMode.tsx
│           └── ProgressIndicator.tsx
├── scripts/
│   ├── setup-whisper-cpp.js
│   ├── setup-faster-whisper.py
│   └── download-models.js
├── models/
│   ├── whisper/
│   └── ollama/
└── python-bridge/
    ├── faster_whisper_server.py
    └── requirements.txt
```

### 5.2 Core Components

#### 5.2.1 TranscriptionManager

```typescript
class TranscriptionManager {
  private mode: 'fast' | 'accurate';
  private engine: WhisperEngine;
  private memoryMonitor: MemoryMonitor;
  private progressReporter: ProgressReporter;
  
  constructor(mode: 'fast' | 'accurate' = 'fast') {
    this.mode = mode;
    this.engine = this.initializeEngine(mode);
    this.memoryMonitor = new MemoryMonitor(
      mode === 'fast' ? 2048 : 3584
    );
  }
  
  async transcribe(audioPath: string): Promise<TranscriptionResult> {
    // Pre-flight checks
    await this.validateAudioFile(audioPath);
    this.memoryMonitor.startMonitoring();
    
    try {
      // Step 1: Preprocess audio
      const preprocessed = await this.preprocessAudio(audioPath);
      
      // Step 2: Apply VAD if enabled
      const vadProcessed = this.mode === 'fast' 
        ? preprocessed 
        : await this.applyVAD(preprocessed);
      
      // Step 3: Chunk audio
      const chunks = await this.chunkAudio(vadProcessed);
      
      // Step 4: Process chunks
      const results = await this.processChunks(chunks);
      
      // Step 5: Merge results
      const merged = await this.mergeResults(results);
      
      return {
        text: merged.text,
        segments: merged.segments,
        metadata: {
          mode: this.mode,
          duration: merged.duration,
          processingTime: Date.now() - startTime,
          peakMemoryMB: this.memoryMonitor.getPeakUsage()
        }
      };
    } finally {
      this.memoryMonitor.stopMonitoring();
      await this.cleanup();
    }
  }
  
  private async processChunks(chunks: AudioChunk[]): Promise<ChunkResult[]> {
    const results: ChunkResult[] = [];
    
    for (let i = 0; i < chunks.length; i++) {
      // Check memory before processing
      if (this.memoryMonitor.isNearLimit()) {
        await this.freeMemory();
      }
      
      // Process chunk
      const result = await this.engine.transcribe(chunks[i]);
      results.push(result);
      
      // Report progress
      this.progressReporter.update({
        current: i + 1,
        total: chunks.length,
        estimatedTimeRemaining: this.estimateTimeRemaining(i, chunks.length)
      });
      
      // Free memory after each chunk in fast mode
      if (this.mode === 'fast') {
        await this.freeMemory();
      }
    }
    
    return results;
  }
}
```

#### 5.2.2 WhisperCpp Engine

```typescript
class WhisperCppEngine implements WhisperEngine {
  private whisper: any; // whisper-node binding
  private modelPath: string;
  private config: FastModeConfig['whisper'];
  
  constructor(config: FastModeConfig['whisper']) {
    this.config = config;
    this.modelPath = config.modelPath;
  }
  
  async initialize(): Promise<void> {
    // Load whisper-node
    const whisperNode = await import('whisper-node');
    this.whisper = whisperNode.default;
    
    // Validate model exists
    if (!fs.existsSync(this.modelPath)) {
      throw new Error(`Model not found: ${this.modelPath}`);
    }
  }
  
  async transcribe(chunk: AudioChunk): Promise<ChunkResult> {
    const options = {
      modelPath: this.modelPath,
      whisperOptions: {
        language: this.config.settings.language,
        word_timestamps: false, // Disabled for speed
        temperature: this.config.settings.temperature,
        beam_size: this.config.settings.beamSize,
        suppress_blank: this.config.settings.suppressBlank,
        suppress_non_speech_tokens: this.config.settings.suppressNonSpeechTokens,
        threads: os.cpus().length - 1,
      }
    };
    
    // Create temporary file for chunk
    const tempPath = await this.saveChunkToTemp(chunk);
    
    try {
      const result = await this.whisper(tempPath, options);
      
      return {
        text: result.map(s => s.speech).join(' '),
        segments: result,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        confidence: this.calculateConfidence(result)
      };
    } finally {
      // Clean up temp file
      await fs.unlink(tempPath);
    }
  }
}
```

#### 5.2.3 FasterWhisper Bridge

```typescript
class FasterWhisperBridge implements WhisperEngine {
  private pythonProcess: ChildProcess | null = null;
  private config: AccurateModeConfig['whisper'];
  private port: number = 8765;
  
  async initialize(): Promise<void> {
    // Start Python server
    this.pythonProcess = spawn('python', [
      path.join(__dirname, '../../../python-bridge/faster_whisper_server.py'),
      '--port', this.port.toString(),
      '--model', this.config.model,
      '--device', this.config.settings.device,
      '--compute_type', this.config.settings.computeType
    ]);
    
    // Wait for server to be ready
    await this.waitForServer();
  }
  
  async transcribe(chunk: AudioChunk): Promise<ChunkResult> {
    const formData = new FormData();
    formData.append('audio', chunk.buffer, {
      filename: 'chunk.wav',
      contentType: 'audio/wav'
    });
    
    formData.append('config', JSON.stringify({
      beam_size: this.config.settings.beamSize,
      language: this.config.settings.language,
      temperature: this.config.settings.temperature,
      condition_on_previous_text: this.config.settings.conditionOnPreviousText,
      word_timestamps: this.config.settings.wordTimestamps,
      vad_filter: true,
      vad_parameters: {
        min_silence_duration_ms: 500,
        speech_pad_ms: 200
      }
    }));
    
    const response = await fetch(`http://localhost:${this.port}/transcribe`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async cleanup(): Promise<void> {
    if (this.pythonProcess) {
      this.pythonProcess.kill();
      this.pythonProcess = null;
    }
  }
}
```

#### 5.2.4 Python Bridge Server

```python
# python-bridge/faster_whisper_server.py
from flask import Flask, request, jsonify
from faster_whisper import WhisperModel
import numpy as np
import io
import json
import argparse
import gc

app = Flask(__name__)
model = None

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        # Get audio data
        audio_file = request.files['audio']
        config = json.loads(request.form['config'])
        
        # Load audio
        audio_data = np.frombuffer(audio_file.read(), dtype=np.float32)
        
        # Transcribe
        segments, info = model.transcribe(
            audio_data,
            beam_size=config.get('beam_size', 3),
            language=config.get('language', 'en'),
            temperature=config.get('temperature', 0.0),
            condition_on_previous_text=config.get('condition_on_previous_text', True),
            word_timestamps=config.get('word_timestamps', True),
            vad_filter=config.get('vad_filter', True),
            vad_parameters=config.get('vad_parameters', None)
        )
        
        # Convert generator to list
        segment_list = []
        for segment in segments:
            segment_dict = {
                'start': segment.start,
                'end': segment.end,
                'text': segment.text,
                'avg_logprob': segment.avg_logprob,
                'compression_ratio': segment.compression_ratio,
                'no_speech_prob': segment.no_speech_prob
            }
            
            if config.get('word_timestamps'):
                segment_dict['words'] = [
                    {
                        'start': word.start,
                        'end': word.end,
                        'word': word.word,
                        'probability': word.probability
                    }
                    for word in segment.words
                ]
            
            segment_list.append(segment_dict)
        
        # Force garbage collection
        gc.collect()
        
        return jsonify({
            'text': ' '.join([s['text'] for s in segment_list]),
            'segments': segment_list,
            'language': info.language,
            'language_probability': info.language_probability
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ready', 'model': args.model})

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--model', type=str, default='small.en')
    parser.add_argument('--device', type=str, default='cpu')
    parser.add_argument('--compute_type', type=str, default='int8')
    
    args = parser.parse_args()
    
    # Initialize model
    model = WhisperModel(
        args.model,
        device=args.device,
        compute_type=args.compute_type,
        download_root='./models/faster-whisper'
    )
    
    app.run(host='127.0.0.1', port=args.port)
```

#### 5.2.5 Formatting Manager

```typescript
class FormattingManager {
  private ollamaClient: OllamaClient;
  private promptManager: PromptManager;
  private cache: MedicalTermCache;
  private config: FastModeConfig['llm'] | AccurateModeConfig['llm'];
  
  constructor(mode: 'fast' | 'accurate') {
    this.config = mode === 'fast' 
      ? fastModeConfig.llm 
      : accurateModeConfig.llm;
    
    this.ollamaClient = new OllamaClient(this.config.endpoint);
    this.promptManager = new PromptManager(mode);
    this.cache = new MedicalTermCache();
  }
  
  async format(transcription: string): Promise<FormattedResult> {
    // Check cache for similar transcriptions
    const cachedFormat = this.cache.checkSimilar(transcription);
    if (cachedFormat) {
      return cachedFormat;
    }
    
    // Prepare prompt with medical context
    const prompt = this.promptManager.buildPrompt(transcription);
    
    // Split into manageable chunks if needed
    const chunks = this.splitForLLM(transcription);
    const formattedChunks: string[] = [];
    
    for (const chunk of chunks) {
      const response = await this.ollamaClient.generate({
        model: this.config.model,
        prompt: this.promptManager.buildPrompt(chunk),
        options: {
          temperature: this.config.settings.temperature,
          num_predict: this.config.settings.maxTokens,
          num_ctx: this.config.settings.numCtx,
          top_k: this.config.settings.topK,
          top_p: this.config.settings.topP,
          repeat_penalty: this.config.settings.repeatPenalty,
          seed: this.config.settings.seed
        }
      });
      
      formattedChunks.push(response.response);
    }
    
    const result = {
      formatted: formattedChunks.join('\n\n'),
      confidence: this.assessFormatQuality(formattedChunks),
      medicalTerms: this.extractMedicalTerms(formattedChunks)
    };
    
    // Cache the result
    this.cache.store(transcription, result);
    
    return result;
  }
  
  private splitForLLM(text: string): string[] {
    const maxChunkSize = this.config.settings.numCtx * 0.6; // Leave room for prompt
    const chunks: string[] = [];
    
    // Split on sentence boundaries
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxChunkSize) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += ' ' + sentence;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }
    
    return chunks;
  }
}
```

## 6. Installation & Setup

### 6.1 Prerequisites Installation Script

```javascript
// scripts/setup-dependencies.js
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

async function setupDependencies() {
  console.log('Setting up Doctor-Dictate dependencies...');
  
  // 1. Check Python
  const pythonVersion = await checkPython();
  if (!pythonVersion) {
    console.error('Python 3.8+ is required. Please install Python.');
    process.exit(1);
  }
  
  // 2. Install Python dependencies
  console.log('Installing Python dependencies...');
  await execAsync('pip install -r python-bridge/requirements.txt');
  
  // 3. Install whisper-node
  console.log('Installing whisper-node...');
  await execAsync('npm install whisper-node');
  
  // 4. Download Whisper models
  console.log('Downloading Whisper models...');
  await downloadWhisperModels();
  
  // 5. Setup Ollama models
  console.log('Setting up Ollama models...');
  await setupOllamaModels();
  
  console.log('Setup complete!');
}

async function downloadWhisperModels() {
  const models = [
    {
      name: 'base.en',
      url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
      path: './models/whisper/ggml-base.en.bin'
    },
    {
      name: 'small.en',
      url: 'https://huggingface.co/Systran/faster-whisper-small.en',
      path: './models/faster-whisper/small.en'
    }
  ];
  
  for (const model of models) {
    if (!fs.existsSync(model.path)) {
      console.log(`Downloading ${model.name}...`);
      await downloadFile(model.url, model.path);
    }
  }
}

async function setupOllamaModels() {
  const models = ['tinyllama:1.1b', 'qwen2.5:1.5b'];
  
  for (const model of models) {
    console.log(`Pulling ${model}...`);
    await execAsync(`ollama pull ${model}`);
  }
}
```

### 6.2 Model Requirements

| Component | Model | Size | Download Command |
|-----------|-------|------|------------------|
| **Fast Mode Whisper** | base.en | 142MB | `bash ./models/download-ggml-model.sh base.en` |
| **Accurate Mode Whisper** | small.en | 488MB | `pip install faster-whisper && ct2-transformers-converter --model openai/whisper-small.en` |
| **Fast Mode LLM** | tinyllama:1.1b | 640MB | `ollama pull tinyllama:1.1b` |
| **Accurate Mode LLM** | qwen2.5:1.5b | 934MB | `ollama pull qwen2.5:1.5b` |

## 7. Testing Strategy

### 7.1 Performance Benchmarks

```typescript
interface BenchmarkSuite {
  tests: [
    {
      name: 'Short recording - Fast mode',
      audioFile: 'test-5min.wav',
      mode: 'fast',
      expectedDuration: '<15s',
      maxRAM: '1.5GB',
      minAccuracy: 0.90
    },
    {
      name: 'Long recording - Fast mode',
      audioFile: 'test-30min.wav',
      mode: 'fast',
      expectedDuration: '<90s',
      maxRAM: '2GB',
      minAccuracy: 0.88
    },
    {
      name: 'Long recording - Accurate mode',
      audioFile: 'test-30min.wav',
      mode: 'accurate',
      expectedDuration: '<240s',
      maxRAM: '3.5GB',
      minAccuracy: 0.95
    },
    {
      name: 'Medical terminology test',
      audioFile: 'test-medical-terms.wav',
      mode: 'accurate',
      expectedDuration: '<60s',
      maxRAM: '3GB',
      minAccuracy: 0.93
    }
  ]
}
```

### 7.2 Medical Accuracy Validation

```typescript
const medicalTestCases = [
  {
    input: "Patient prescribed metformin 500mg twice daily",
    expectedTerms: ["metformin", "500mg", "twice daily"],
    criticalAccuracy: true
  },
  {
    input: "Blood pressure 120 over 80",
    expectedFormat: "BP: 120/80",
    criticalAccuracy: true
  },
  {
    input: "Auscultation reveals bilateral crackles",
    expectedTerms: ["auscultation", "bilateral", "crackles"],
    criticalAccuracy: false
  }
];
```

## 8. Migration Plan

### Phase 1: Fast Mode Implementation 
- [ ] Implement WhisperCpp engine
- [ ] Setup TinyLlama with Ollama
- [ ] Create basic chunking pipeline
- [ ] Add memory monitoring
- [ ] Basic UI mode selector

### Phase 2: Accurate Mode Implementation 
- [ ] Setup Python bridge for Faster-Whisper
- [ ] Implement VAD processing
- [ ] Add Qwen2.5 model support
- [ ] Implement result merging with overlap handling
- [ ] Add progress reporting

### Phase 3: Optimization & Polish 
- [ ] Add medical term caching
- [ ] Implement smart mode selection
- [ ] Add comprehensive error handling
- [ ] Performance profiling and optimization
- [ ] Complete testing suite

## 9. Monitoring & Metrics

### 9.1 Key Performance Indicators

```typescript
interface PerformanceMetrics {
  transcriptionMetrics: {
    processingTime: number; // milliseconds
    audioLength: number; // seconds
    processingRatio: number; // processing_time / audio_length
    wordErrorRate: number; // WER percentage
    characterErrorRate: number; // CER percentage
  };
  
  systemMetrics: {
    peakRAMUsage: number; // MB
    avgCPUUsage: number; // percentage
    modelLoadTime: number; // milliseconds
    chunkProcessingTimes: number[]; // milliseconds per chunk
  };
  
  qualityMetrics: {
    formattingCompliance: number; // percentage
    medicalTermAccuracy: number; // percentage
    confidenceScore: number; // 0-1
    userCorrections: number; // count
  };
}
```

### 9.2 Error Tracking

```typescript
enum ErrorType {
  MEMORY_EXHAUSTION = 'MEMORY_EXHAUSTION',
  MODEL_LOADING_FAILED = 'MODEL_LOADING_FAILED',
  TRANSCRIPTION_TIMEOUT = 'TRANSCRIPTION_TIMEOUT',
  FORMATTING_FAILED = 'FORMATTING_FAILED',
  AUDIO_PROCESSING_ERROR = 'AUDIO_PROCESSING_ERROR'
}

interface ErrorReport {
  type: ErrorType;
  mode: 'fast' | 'accurate';
  timestamp: Date;
  audioLength: number;
  systemRAM: number;
  errorMessage: string;
  stackTrace?: string;
  recovery: 'retry' | 'fallback' | 'failed';
}
```

## 10. Rollback Strategy

If issues occur post-deployment:

1. **Immediate Rollback**: Revert to previous version via Electron auto-updater
2. **Hybrid Mode**: Keep old pipeline as fallback, use new system optionally
3. **Progressive Rollout**: Enable for subset of users initially
4. **Feature Flag**: Add remote toggle to disable new pipeline without update

## 11. Success Metrics

### Minimum Viable Success (Week 1)
- Fast mode processes 30-min audio in <2 minutes
- No system freezing on 8GB RAM machines
- 85% user acceptance rate

### Target Success (Month 1)
- Both modes fully operational
- 95% reduction in freeze incidents
- 80% of users prefer new system
- Average processing time reduced by 75%

### Stretch Goals (Month 3)
- Real-time preview during recording
- Custom medical dictionary
- Cloud fallback for ultra-long recordings
- Windows-specific optimizations

## 12. Appendix

### A. Dependencies

```json
{
  "dependencies": {
    "whisper-node": "^1.1.1",
    "node-wav": "^0.0.2",
    "ollama": "^0.5.0",
    "systeminformation": "^5.21.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  },
  "python-requirements": {
    "faster-whisper": "^1.0.0",
    "flask": "^3.0.0",
    "numpy": "^1.24.0",
    "pyav": "^11.0.0"
  }
}
```

### B. Hardware Requirements

**Minimum Requirements:**
- CPU: 4 cores, 2.5GHz+
- RAM: 8GB
- Storage: 2GB for models
- OS: macOS 11+ (Apple Silicon) or Windows 10+

**Recommended Requirements:**
- CPU: 8 cores, 3.0GHz+ (Apple M1/M2 preferred)
- RAM: 16GB
- Storage: 5GB for models
- OS: macOS 12+ (Apple Silicon)

This specification provides a complete blueprint for implementing the dual-mode transcription system with clear success criteria, technical details, and rollout strategy.