# Technology Stack

## Core Technologies

### Frontend
- **React 18.3** - UI framework with hooks and functional components
- **TypeScript 5.5** - Type-safe JavaScript with strict mode
- **Vite 5.2** - Fast build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **React Router 6.26** - Client-side routing

### Desktop Framework
- **Electron 37.3** - Cross-platform desktop application framework
- **Electron Store 8.1** - Local settings persistence
- **IPC** - Inter-process communication between main and renderer

### Audio Processing
- **Whisper.cpp** - Local speech-to-text transcription
  - Models: tiny.en (fast), base.en (accurate), small.en (fallback)
  - No cloud API - runs entirely on device
- **FFmpeg** - Audio format conversion (m4a → WAV)
- **Web Audio API** - Real-time audio visualization

### Medical Formatting
- **Ollama** - Local LLM for medical note formatting
  - Models: qwen2.5:0.5b (fast), qwen2.5:1.5b (accurate)
  - Runs locally - no external API calls
- **Template System** - JSON-based medical note templates
- **Content Verification** - Custom verification with 80% threshold

### UI Components
- **Lucide React** - Icon library
- **Class Variance Authority (CVA)** - Component variant management
- **clsx + tailwind-merge** - Conditional className utilities
- **React Markdown** - Markdown rendering for formatted notes

## Development Tools

### Build & Bundle
- **Vite** - Development server with HMR
- **Electron Builder 25.1** - Electron app packaging
- **PostCSS + Autoprefixer** - CSS processing
- **TypeScript Compiler** - Type checking and compilation

### Testing
- **Jest 29.7** - Test framework
- **React Testing Library 16.3** - Component testing
- **ts-jest** - TypeScript support for Jest

### Code Quality
- **ESLint 8.57** - JavaScript/TypeScript linting
- **TypeScript Strict Mode** - Enhanced type safety
- **Prettier** (via ESLint) - Code formatting

### Development Workflow
- **Concurrently 8.2** - Run multiple dev processes
- **Nodemon 3.1** - Auto-restart on file changes
- **Wait-on 8.0** - Wait for dev server before starting Electron

## Data Management

### Local Storage
- **Electron Store** - Application settings
- **File System** - Temporary audio files
- **Local Templates** - Medical note format definitions

### Data Processing
- **Custom Parsers** - Medical dictation parsing
- **Section Detection** - Smart pattern matching for medical sections
- **Dictation Commands** - Voice command to text conversion

## Architecture Patterns

### Frontend Architecture
- **Component-Based** - Reusable React components
- **Hooks-Based State** - useState, useEffect, useRef
- **Functional Components** - No class components

### Backend Architecture
- **Service Layer** - Whisper, Ollama service wrappers
- **Processor Pattern** - UnifiedProcessor with mode switching
- **Factory Pattern** - ProcessorFactory for mode selection

### Data Flow
- **Unidirectional** - Audio → Transcription → Formatting → Output
- **Immutable Updates** - No data mutation
- **Pure Functions** - Predictable transformations

## External Dependencies

### Required Local Services
- **Ollama Server** - Must be running locally on port 11434
- **Whisper Models** - Must be downloaded to ~/.whisper-cpp/models/
- **FFmpeg** - Required for audio format conversion

### NPM Dependencies
See `package.json` for complete list. Key production dependencies:
- react, react-dom
- electron
- whisper-node (wrapper for whisper.cpp)
- No cloud service SDKs (intentionally local-first)

## Performance Targets

### Processing Speed
- **Fast Mode**: ~5 seconds for 8-minute audio
- **Accurate Mode**: ~10 seconds for 8-minute audio
- **Real-time Factor**: 60-100x faster than real-time

### Memory Usage
- **Whisper**: ~500MB-1GB depending on model
- **Ollama**: ~1-2GB depending on model
- **Electron App**: ~200MB baseline

### Accuracy Targets
- **Transcription**: 85% (fast) to 95% (accurate)
- **Content Preservation**: 100% (mandatory)
- **Format Compliance**: 100% template match

## Security & Privacy

### Data Protection
- **No Cloud Processing** - All data stays on device
- **No External APIs** - No data transmission
- **Temporary Files** - Cleaned up after processing
- **No Analytics** - No usage tracking

### Compliance Considerations
- **HIPAA-Ready** - Local processing supports compliance
- **No Third-Party Processing** - Maintains data sovereignty
- **Audit Trail** - Local logs only

## Platform Support

### Operating Systems
- **macOS** - Primary development platform
- **Windows** - Supported via Electron
- **Linux** - Supported via Electron

### Hardware Requirements
- **CPU**: Apple Silicon or Intel x64
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 5GB for models and application
- **Microphone**: Required for audio recording