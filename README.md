# DoctorDictate - Local-First Medical Transcription

A desktop application for medical professionals that accurately transcribes clinical dictation locally, optimized for medical terminology.

## 🎯 Project Overview

DoctorDictate addresses the documentation burden faced by medical professionals by providing:
- **Local transcription** using Whisper AI (no cloud processing)
- **Medical accuracy** optimized for medical terminology
- **Privacy-first** approach with all data staying on your device
- **Simple workflow** for quick note-taking during or after patient sessions

## 🔒 Privacy First
- **All processing happens on your Mac** - no cloud services or external APIs
- **Your patient data never leaves your device** - complete local control
- **No internet connection required** for transcription
- **Built with privacy in mind** from the ground up

## 🛠️ Technology Stack

- **Frontend**: Electron + React + TypeScript + Tailwind CSS
- **AI Transcription**: whisper-cli (base.en/small.en models)
- **AI Formatting**: Ollama with Qwen 2.5 (1.5B model) or Llama 3.2 (3B model)
- **Audio**: Web Audio API with real-time visualization
- **Architecture**: Template-driven medical note formatting
- **Security**: Context isolation, secure IPC, local-only processing
- **Platform**: macOS (optimized for Apple Silicon)

## 📋 Prerequisites

### Required Software
- **Node.js 18+** and npm
- **macOS** (optimized for Apple Silicon, Intel also supported)
- **Homebrew** - Package manager for macOS
- **FFmpeg** - For audio format conversion
- **Ollama** - For local AI medical text formatting
- **whisper-cli** - For fast local transcription (Whisper.cpp)

### System Requirements
- Microphone access
- ~4GB free disk space (for AI models)
- ~4GB RAM for processing
- Internet connection (only for initial setup)

## 🚀 Quick Start

### 1. Install System Dependencies

#### macOS (with Homebrew)
```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install FFmpeg for audio processing
brew install ffmpeg

# Install whisper-cli (Whisper.cpp) for transcription
brew install whisper-cpp

# Download Whisper models
# Note: whisper-cli replaces the deprecated whisper-cpp command
# For FAST mode:
whisper-cli-download-ggml base.en
# For ACCURATE mode:
whisper-cli-download-ggml small.en
```

#### macOS (without Homebrew)
If Homebrew is not available, you can:
1. Download FFmpeg from https://ffmpeg.org/download.html
2. Build Whisper.cpp from source: https://github.com/ggerganov/whisper.cpp
3. Add binaries to your PATH

### 2. Clone and Install
```bash
git clone <repository-url>
cd doctor-dictate
npm install
```

### 3. Install Ollama and Models
```bash
# Install Ollama from https://ollama.ai
# Start Ollama service
ollama serve

# In a new terminal, pull recommended models
ollama pull qwen2.5:1.5b  # Faster, lightweight model
ollama pull llama3.2:latest  # More capable model (optional)

# Verify installation
curl http://localhost:11434/api/tags
```

### 4. Development Mode
```bash
npm run dev
```

### 5. Build Application
```bash
npm run build
npm run dist  # Create distributable
```

## 📁 Project Structure

```
src/
├── main.js                    # Electron main process
├── preload.js                 # Secure IPC bridge
├── App.tsx                    # React main component
├── components/                # React components
│   ├── AudioRecorder.tsx      # Recording interface
│   ├── AudioWaveform.tsx      # Real-time visualization
│   └── TranscriptionDisplay.tsx
├── services/                  # Core services
│   ├── processing/            # Audio processing pipeline
│   │   ├── unified-processor.js
│   │   └── processing-config.js
│   ├── transcription/         # Whisper integration
│   │   ├── whisper-cpp.js
│   │   └── whisper.js
│   └── formatting/            # LLM formatting
│       └── ollama-formatter.js
├── prompts/                   # Medical prompt system
│   ├── medical-prompt-v7.js  # Optimized prompt (90 lines)
│   └── section-detector.js
├── templates/                 # Medical note templates
│   └── format/
│       └── medicine-management.json
└── data/                      # Medical knowledge base
    ├── medical-dictionary.js
    └── dictation-commands.js
```

## 🔧 Development Scripts

- `npm start` - Launch application
- `npm run dev` - Development mode with hot reload
- `npm run build` - Build application
- `npm run dist` - Create distributable package
- `npm test` - Run test suite
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - ESLint code quality check
- `npm run typecheck` - TypeScript type checking

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode for development
npm run test:watch

# Generate coverage report
npm run test -- --coverage
```

## 🔒 Security Features

- Context isolation enabled
- Secure IPC communication via preload script
- No external network access
- Local file processing only

## 🆕 Recent Improvements (V1.1)

- **No More Hallucinations**: LLM now only outputs sections that were actually dictated
- **Smart Section Matching**: Handles misheard words intelligently (e.g., "problemist" → "Problem List")
- **Improved Punctuation**: Better handling of dictation commands like "period", "comma", "colon"
- **73% Smaller Prompts**: Reduced from 339 to 90 lines while maintaining accuracy
- **Faster Processing**: 43% reduction in prompt size for quicker responses
- **No Preprocessing**: Direct dictation-to-formatting pipeline

## 📱 Features

### Current (V1.1)
- ✅ React/TypeScript modern UI
- ✅ Real-time audio waveform visualization
- ✅ whisper-cli integration for fast transcription
- ✅ Ollama LLM integration for medical formatting
- ✅ Template-driven note structure
- ✅ Dual processing modes (Fast/Accurate)
- ✅ Medical dictionary with corrections
- ✅ Dictation command processing
- ✅ Export to formatted markdown
- ✅ Smart section detection

### Processing Modes

**Fast Mode** (3-4 min for 30-min audio)
- Whisper base.en model (141 MB)
- Qwen 2.5 (1.5B) formatting
- 85% accuracy
- 2-3GB RAM usage
- Best for quick drafts

**Accurate Mode** (6-8 min for 30-min audio)
- Whisper small.en model (244 MB)
- Qwen 2.5 (1.5B) or Llama 3.2 (3B) formatting
- 95% accuracy
- 3.5-4.5GB RAM usage
- Best for final documentation

## 🔧 Troubleshooting

### Common Issues

#### FFmpeg not found error
```bash
# macOS with Homebrew
brew install ffmpeg

# macOS without Homebrew
# Download from https://ffmpeg.org/download.html
# Add to PATH: export PATH="/path/to/ffmpeg/bin:$PATH"
```

#### Whisper models not found
```bash
# Create models directory
mkdir -p ~/.whisper-cpp/models

# Download models manually if whisper-cli-download-ggml fails
cd ~/.whisper-cpp/models
curl -L -o ggml-base.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin
curl -L -o ggml-small.en.bin https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin
```

#### Ollama connection error
```bash
# Ensure Ollama is running
ollama serve

# Check if Ollama is accessible
curl http://localhost:11434/api/tags

# If port 11434 is blocked, check firewall settings
```

#### Microphone access denied
1. Go to System Preferences → Security & Privacy → Privacy → Microphone
2. Ensure Terminal/Electron has microphone access
3. Restart the application after granting permission

## 🤝 Contributing

Contributions are welcome! The project follows a clean architecture with:
- Separated concerns (transcription, formatting, templates)
- Template-driven configuration
- Local-first privacy approach
- Comprehensive error handling

For agent workflows and detailed conventions, check `AGENTS.md`.

## 📄 License

MIT License - see LICENSE file for details.

## ⚠️ Medical Disclaimer

**This software is not FDA approved and should not be used as the sole method for maintaining medical records. Always verify transcriptions for accuracy. All processing happens locally on your device - no patient data is transmitted to external services.**

## 🎯 Performance Metrics

- **Transcription Accuracy**: 95% on medical terminology
- **Processing Speed**: 3-8 minutes for 30-minute recordings
- **Memory Usage**: <2GB typical, 4.5GB peak
- **Prompt Efficiency**: 43% reduction in size (7.2KB from 12.8KB)
- **Code Optimization**: 73% reduction in prompt generator (90 lines from 339)

## 🏗️ Architecture

### Processing Pipeline
1. **Audio Recording** → Web Audio API with visualization
2. **Transcription** → Whisper.cpp (or Python Whisper fallback)
3. **Preprocessing** → Dictation command conversion
4. **Formatting** → Ollama LLM with medical prompt
5. **Post-processing** → Section validation and cleanup
6. **Export** → Formatted markdown output

### Template System
- JSON-based medical note templates
- Configurable sections (required/optional)
- Format types: paragraph, numbered-list, bullet-list
- Smart section detection and organization

## 🔧 Troubleshooting

### Ollama Not Available
```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# Start Ollama if not running
ollama serve
```

### Model Not Found
```bash
# List available models
ollama list

# Pull required model
ollama pull llama3.2:latest
```

### High Memory Usage
- Use Fast mode for longer recordings
- Close other applications
- Consider using smaller Whisper model (tiny.en)

### Punctuation Issues in Output
- The system automatically converts dictation commands
- Say "period" clearly at sentence ends
- "Interim period" and "school period" are preserved correctly

## 📞 Support

For questions or feedback, please open an issue in the repository.

---

**Built with privacy in mind - Your medical notes never leave your device**

