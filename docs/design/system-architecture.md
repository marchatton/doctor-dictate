# DoctorDictate System Architecture

## Overview

DoctorDictate is a privacy-focused medical transcription application that processes audio recordings locally using Whisper for transcription and Ollama for formatting. The system follows a multi-stage pipeline architecture with clear separation of concerns.

## High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend (React + TypeScript)"
        UI[User Interface]
        REC[Recording Component]
        TRANS[Transcript View]
        PROC[Processing Status]
    end

    subgraph "Electron Main Process"
        IPC[IPC Handlers]
        AUDIO[Audio Processor]
        WHISPER[Whisper Transcriber]
        OLLAMA[Ollama Formatter]
        FS[File System]
    end

    subgraph "External Services"
        WCPP[whisper-cli Binary]
        OLLAMASRV[Ollama Server<br/>localhost:11434]
    end

    subgraph "Data Layer"
        DICT[Medical Dictionary]
        TEMPLATES[Templates]
        PROMPTS[Prompt System]
        DOSING[Dosing Patterns]
        COMMANDS[Dictation Commands]
    end

    UI --> |MediaRecorder API| REC
    REC --> |Audio Blob| IPC
    IPC --> |Save Audio| FS
    IPC --> |Process| AUDIO
    AUDIO --> |Audio File| WHISPER
    WHISPER --> |Execute| WCPP
    WHISPER --> |Raw Transcript| OLLAMA
    OLLAMA --> |HTTP API| OLLAMASRV
    OLLAMA --> |Uses| PROMPTS
    PROMPTS --> |References| DICT
    PROMPTS --> |References| TEMPLATES
    PROMPTS --> |References| DOSING
    PROMPTS --> |References| COMMANDS
    OLLAMA --> |Formatted Text| IPC
    IPC --> |Result| TRANS
    PROC --> |Progress Updates| UI
```

## Processing Pipeline

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Electron
    participant WhisperCpp
    participant DictationProcessor
    participant OllamaFormatter
    participant OllamaServer

    User->>Frontend: Start Recording
    Frontend->>Frontend: MediaRecorder captures audio
    User->>Frontend: Stop Recording
    Frontend->>Electron: Send audio blob via IPC
    
    Note over Electron: Stage 1: Audio Processing
    Electron->>Electron: Save audio to temp file
    Electron->>Electron: Convert to WAV if needed
    
    Note over WhisperCpp: Stage 2: Transcription
    Electron->>WhisperCpp: Execute whisper-cli
    WhisperCpp->>WhisperCpp: Transcribe audio
    WhisperCpp-->>Electron: Raw transcript
    
    Note over OllamaFormatter: Stage 3: AI Formatting
    Electron->>OllamaFormatter: Format raw transcript
    OllamaFormatter->>OllamaFormatter: Generate prompt (v7)
    OllamaFormatter->>OllamaServer: POST /api/generate
    OllamaServer->>OllamaServer: Apply LLM formatting
    OllamaServer-->>OllamaFormatter: Formatted response
    OllamaFormatter->>OllamaFormatter: Verify content
    OllamaFormatter-->>Electron: Final formatted text
    
    Electron-->>Frontend: Complete transcript
    Frontend->>User: Display result
```

## Component Architecture

### 1. Frontend Layer (`/src/components/`)

```mermaid
graph LR
    subgraph "React Components"
        App[App.tsx]
        App --> RecordingScreen[RecordingScreen.tsx]
        App --> ProcessingScreen[ProcessingScreen.tsx]
        App --> TranscriptScreen[TranscriptScreen.tsx]
        
        RecordingScreen --> AudioWaveform[AudioWaveform.tsx]
        RecordingScreen --> ToggleSwitch[ToggleSwitch.tsx]
        
        ProcessingScreen --> ProcessingSteps[ProcessingSteps.tsx]
        
        TranscriptScreen --> Modal[Modal.tsx]
    end
```

### 2. Service Layer (`/src/services/`)

```mermaid
graph TB
    subgraph "Audio Services"
        AudioProcessor[processor.js]
        AudioEnhancer[enhancer.js]
    end

    subgraph "Transcription Services"
        WhisperTranscriber[whisper.js]
        WhisperCpp[whisper-cpp.js]
        ProgressTracker[progress-tracker.js]
    end

    subgraph "Formatting Services"
        OllamaFormatter[ollama-formatter.js]
        ContentVerifier[content-verifier.js]
        StructuredParser[structured-response-parser.js]
        StructuredRenderer[structured-renderer.js]
        StructuredNormalizer[structured-normalizer.js]
    end

    subgraph "Processing Services"
        UnifiedProcessor[unified-processor.js]
        ProcessingConfig[processing-config.js]
    end

    UnifiedProcessor --> WhisperCpp
    UnifiedProcessor --> OllamaFormatter
    WhisperTranscriber --> AudioProcessor
    WhisperTranscriber --> ProgressTracker
    OllamaFormatter --> ContentVerifier
    OllamaFormatter --> StructuredParser
    OllamaFormatter --> StructuredRenderer
    StructuredRenderer --> StructuredNormalizer
```

### 3. Prompt System (`/src/prompts/`)

```mermaid
graph TB
    subgraph "Prompt Components"
        Index[index.js]
        MedicalPromptV7[medical-prompt-v7.js]
        SectionDetector[section-detector.js]
        TemplateLoader[Template Loader]
    end

    subgraph "Data Sources"
        MedicalDict[medical-dictionary.js]
        DosingPatterns[dosing-patterns.js]
        DictationCmds[dictation-commands.js]
        Templates[templates/*.json]
    end

    Index --> MedicalPromptV7
    MedicalPromptV7 --> SectionDetector
    MedicalPromptV7 --> TemplateLoader
    MedicalPromptV7 --> MedicalDict
    MedicalPromptV7 --> DosingPatterns
    MedicalPromptV7 --> DictationCmds
    TemplateLoader --> Templates
```

## Data Flow

### Recording to Transcription Flow

```mermaid
flowchart LR
    A[Audio Recording<br/>WebM/Opus] -->|Convert| B[WAV File<br/>16kHz Mono]
    B -->|Whisper.cpp| C[Raw Transcript<br/>with dictation commands]
    C -->|OllamaFormatter| D[Formatted Note<br/>with sections]
    D -->|Display| E[Final Transcript]
```

### Prompt Generation Flow

```mermaid
flowchart TB
    Input[Raw Dictation Text] --> Detect[Section Detection]
    Detect --> Prompt[Generate Prompt v7]
    
    Prompt --> Rules[Global Rules]
    Prompt --> Template[Template Rules]
    Prompt --> Examples[Examples]
    Prompt --> Constraints[Constraints]
    
    Rules --> Final[Complete Prompt]
    Template --> Final
    Examples --> Final
    Constraints --> Final
    
    Final --> Ollama[Send to Ollama]
    Ollama --> Response[Formatted Response]
    Response --> Verify[Content Verification]
    Verify --> Output[Final Output]
```

### Structured Formatting Flow (v7+)

```mermaid
flowchart LR
    Manifest[Section Manifest
(SectionDetector + template)] --> PromptGen[MedicalPromptV7
JSON contract]
    PromptGen --> OllamaJSON[Ollama JSON response]
    OllamaJSON --> Parser[structured-response-parser]
    Parser --> Renderer[structured-renderer]
    Renderer --> Normalizer[structured-normalizer]
    Normalizer --> Markdown[Deterministic Markdown]
    Markdown --> Verifier[ContentVerifier.verifyStructuredNote]
    Verifier --> Result[Verified Output + Report]
```

Formatter logs capture manifest headers, JSON parsing success/failure, deterministic rendering summaries, and verification reports so content gaps are visible during development and support sessions.

## API Interactions

### Ollama API

**Endpoint**: `http://localhost:11434/api/generate`

**Request**:
```json
{
  "model": "llama3.2:latest",
  "prompt": "<<generated prompt from medical-prompt-v7>>",
  "stream": false,
  "options": {
    "temperature": 0.1,
    "num_predict": 4000,
    "num_ctx": 32768
  }
}
```

**Response**:
```json
{
  "response": "<<formatted medical note>>",
  "done": true
}
```

### IPC Communication

**Main Process Handlers** (`main.js`):
- `save-audio-blob`: Save recorded audio
- `transcribe-audio`: Start transcription pipeline
- `set-whisper-model`: Change accuracy level
- `save-transcript`: Export to file system
- `export-pdf`: Generate PDF output

**Renderer → Main**:
```javascript
window.electronAPI.transcribeAudio(filePath)
```

**Main → Renderer**:
```javascript
event.sender.send('transcription-progress', progress)
```

## Configuration

### Processing Modes

```javascript
// processing-config.js
{
  FAST: {
    whisperModel: 'tiny.en',
    ollamaModel: 'llama3.2:3b',
    temperature: 0.1
  },
  ACCURATE: {
    whisperModel: 'small.en',
    ollamaModel: 'llama3.2:latest',
    temperature: 0.1
  }
}
```

### Template Structure

```json
// templates/format/medicine-management.json
{
  "sections": [...],
  "formatting": {
    "medicationFormat": "{Name} {Dosage} ({Frequency})",
    "problemFormat": "{Diagnosis} – {status}",
    "sectionHeaderPrefix": "###"
  },
  "templateSpecificRules": [...]
}
```

Optional sections mark `"autoFill": false` to ensure the formatter never emits default prose when the clinician omits that section in the dictation.

## Error Handling

```mermaid
stateDiagram-v2
    [*] --> Recording
    Recording --> Processing: Stop Recording
    Processing --> Transcribing: Audio Saved
    Transcribing --> Formatting: Transcript Ready
    Formatting --> Complete: Format Success
    
    Transcribing --> Error: Whisper Fails
    Formatting --> Error: Ollama Unavailable
    Error --> Complete: Return Raw Text
    
    Complete --> [*]
```

## Security Considerations

1. **Local Processing**: All audio processing happens locally
2. **No External APIs**: Whisper and Ollama run on localhost
3. **Temporary Files**: Audio files are cleaned up after processing
4. **Content Isolation**: Electron context isolation enabled
5. **Medical Data**: Never leaves the user's machine

## Performance Optimizations

1. **Chunked Transcription**: Long audio split into 30-second chunks
2. **Model Selection**: Auto-select based on file size
3. **Progress Tracking**: Real-time updates during processing
4. **Caching**: Ollama model kept in memory
5. **Parallel Processing**: Where possible (future enhancement)

## File Structure

```
src/
├── components/          # React UI components
├── services/           # Business logic
│   ├── audio/         # Audio processing
│   ├── transcription/ # Whisper integration
│   ├── formatting/    # Ollama integration
│   └── processing/    # Unified pipeline
├── prompts/           # Prompt generation system
├── data/              # Static data files
│   ├── medical-dictionary.js
│   ├── dosing-patterns.js
│   └── dictation-commands.js
├── templates/         # Medical note templates
├── hooks/            # React hooks
├── utils/            # Utility functions
└── __tests__/        # Test files
```

## Testing Strategy

### Unit Tests
- Component rendering tests
- Service function tests
- Prompt generation tests

### Integration Tests
- End-to-end pipeline tests
- Whisper → Ollama flow
- Template application

### Manual Testing
- Real audio recordings
- Various medical scenarios
- Edge cases (unclear speech, background noise)

## Future Enhancements

1. **Multi-language Support**: Extend beyond English
2. **Custom Templates**: User-defined note formats
3. **Cloud Backup**: Optional encrypted backup
4. **Voice Commands**: Control recording with voice
5. **Real-time Transcription**: Stream processing
6. **Mobile App**: iOS/Android versions
7. **Practice Mode**: Training for dictation
8. **Analytics**: Usage patterns (local only)

## Dependencies

### Core Dependencies
- **Electron**: Desktop application framework
- **React**: UI framework
- **TypeScript**: Type safety
- **whisper-cli**: Local transcription (Whisper.cpp)
- **Ollama**: Local LLM formatting

### Key Libraries
- **pdfkit**: PDF generation
- **tailwindcss**: Styling
- **lucide-react**: Icons
- **react-markdown**: Markdown rendering

## Deployment

### Build Process
```bash
npm run build        # Build React app
npm run build:electron # Build Electron app
npm run dist        # Package for distribution
```

### Platform Packages
- **macOS**: .dmg, .app
- **Windows**: .exe installer
- **Linux**: .AppImage, .deb

## Monitoring & Debugging

### Debug Tools
- Chrome DevTools (in development)
- Console logging with categories
- Progress tracking for long operations
- Error boundaries in React

### Performance Metrics
- Transcription time per minute of audio
- Formatting response time
- Memory usage during processing
- Model loading time

---

## Related Documentation

- [`/docs/design/rework-processing.md`](./rework-processing.md) - Detailed processing pipeline
- [`/docs/design/fast-processing-strategy.md`](./fast-processing-strategy.md) - Performance optimizations
- [`/docs/design/user-journey.md`](./user-journey.md) - User experience flow
- [`/CLAUDE.md`](../../CLAUDE.md) - Development guidelines
- [`/tech-stack.md`](../../tech-stack.md) - Technology choices
