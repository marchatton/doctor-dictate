# Project Folder Structure

## Root Structure

```
doctor-dictate/
├── src/                    # Application source code
│   ├── main.js            # Electron main process entry
│   ├── preload.js         # Electron preload script
│   ├── index.tsx          # React app entry point
│   ├── App.tsx            # Main React component
│   ├── components/        # Frontend React components
│   ├── services/          # Backend service layer
│   ├── prompts/           # Medical prompt system
│   ├── data/              # Static data and dictionaries
│   ├── templates/         # Medical note templates
│   ├── utils/             # Shared utilities
│   └── __tests__/         # Test files
├── test/                   # Additional test suites
├── docs/                   # Documentation
├── scripts/                # Build and utility scripts
├── public/                 # Static assets
└── dist/                   # Build output (generated)
```

## Frontend Structure

### `/src/components/` - React UI Components

```
components/
├── AudioWaveform.tsx       # Real-time audio visualization
├── RecordingScreen.tsx     # Main recording interface
├── ProcessingStatus.tsx    # Progress indicators
├── TranscriptView.tsx      # Display transcribed text
├── SettingsPanel.tsx       # User preferences
├── ToggleSwitch.tsx        # Reusable toggle component
└── ui/                     # Shared UI primitives
    ├── Button.tsx
    ├── Card.tsx
    └── Alert.tsx
```

### `/src/hooks/` - Custom React Hooks

```
hooks/
├── useAudioRecorder.ts     # Audio recording logic
├── useProcessingState.ts   # Processing status management
├── useSettings.ts          # User settings hook
└── useElectronAPI.ts       # IPC communication wrapper
```

### `/src/styles/` - Styling

```
styles/
├── globals.css             # Global styles and Tailwind imports
├── components/             # Component-specific styles
└── themes/                 # Theme configurations
```

## Backend Structure

### `/src/services/` - Core Business Logic

```
services/
├── audio/
│   ├── recorder.js         # Audio recording service
│   ├── converter.js        # Audio format conversion (FFmpeg)
│   └── stream-handler.js   # Audio stream processing
├── transcription/
│   ├── whisper-cpp.js      # Whisper.cpp integration
│   ├── transcriber.js      # Main transcription service
│   └── chunk-processor.js  # Audio chunking logic
├── formatting/
│   ├── ollama-formatter.js # Ollama LLM integration
│   ├── content-verifier.js # Content preservation checks
│   └── simple-formatter.js # Fallback formatter
└── processing/
    ├── unified-processor.js # Main processing pipeline
    ├── processing-config.js # Mode configurations
    └── processor-factory.js # Processor creation
```

### `/src/prompts/` - Prompt Management

```
prompts/
├── medical-prompt-v7.js    # Current prompt system
├── section-detector.js     # Smart section detection
└── __tests__/              # Prompt-specific tests
```

### `/src/data/` - Data Sources

```
data/
├── medical-dictionary.js   # Medical corrections and terms
├── dictation-commands.js   # Voice command mappings
├── dosing-patterns.js      # Medication dosing preservation
└── abbreviations.js        # Medical abbreviations
```

### `/src/templates/` - Medical Templates

```
templates/
├── format/                 # Template definitions (JSON)
│   ├── medicine-management.json
│   ├── initial-evaluation.json
│   └── progress-note.json
└── example/                # Example outputs (Markdown)
    ├── medicine-management.md
    ├── initial-evaluation.md
    └── progress-note.md
```

## Electron Structure

### Main Process Files

```
src/
├── main.js                 # Electron main process
├── preload.js              # Preload script for IPC
├── ipc/                    # IPC handlers
│   ├── audio-handlers.js   # Audio-related IPC
│   ├── file-handlers.js    # File system IPC
│   └── service-handlers.js # Service communication
└── electron/
    ├── menu.js             # Application menu
    ├── window.js           # Window management
    └── updater.js          # Auto-update logic
```

## Test Structure

```
src/__tests__/              # Unit tests
├── components/             # Component tests
├── services/               # Service tests
├── dual-mode.test.js       # Core system tests
└── e2e-workflow.test.js    # End-to-end tests

test/                       # Integration tests
├── medical-prompt.test.js
└── dual-mode.test.js
```

## Documentation

```
docs/
├── design/                 # Architecture and design docs
│   ├── rework-processing.md
│   └── performance-refactor-spec.md
├── sample-data/            # Test data and examples
│   ├── mock-recording.m4a
│   └── expected-output.md
└── guides/                 # User and developer guides
    ├── TEST_GUIDE.md
    └── setup.md
```

## Configuration Files

```
Root/
├── package.json            # NPM dependencies and scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite bundler config
├── tailwind.config.js      # Tailwind CSS config
├── jest.config.js          # Jest test config
├── .eslintrc.js            # ESLint rules
├── electron-builder.yml    # Electron build config
├── CLAUDE.md              # AI assistant guidelines
├── tech-stack.md          # Technology documentation
└── folder-structure.md    # This file
```

## Scripts and Utilities

```
scripts/
├── download-whisper-models.sh  # Model download script
├── run-tests.sh                # Test runner with checks
└── build-release.sh            # Production build script
```

## Build Output

```
dist/                       # Generated - not in version control
├── mac/                    # macOS build
├── win/                    # Windows build
├── linux/                  # Linux build
└── unpacked/              # Unpacked Electron app
```

## File Naming Conventions

### Components
- React components: `PascalCase.tsx` (e.g., `RecordingScreen.tsx`)
- Hooks: `camelCase.ts` starting with `use` (e.g., `useAudioRecorder.ts`)

### Services
- Service files: `kebab-case.js` (e.g., `whisper-cpp.js`)
- Utilities: `kebab-case.js` (e.g., `content-verifier.js`)

### Tests
- Test files: `*.test.js` or `*.test.ts`
- Located next to tested code or in `__tests__/` folder

### Data Files
- Static data: `kebab-case.js` (e.g., `medical-dictionary.js`)
- Templates: `kebab-case.json` (e.g., `medicine-management.json`)

## Import Path Conventions

```typescript
// External packages
import React from 'react';
import { ipcRenderer } from 'electron';

// Absolute imports from src
import { ProcessorFactory } from '@/services/processing/processor-factory';
import { RecordingScreen } from '@/components/RecordingScreen';

// Relative imports within module
import { formatDate } from './utils';
import type { ProcessingOptions } from './types';
```

## Key Architectural Boundaries

### Frontend (Renderer Process)
- All files in `/src/components/`
- React hooks in `/src/hooks/`
- UI state management
- User interaction handling
- Display logic

### Backend (Main Process + Services)
- All files in `/src/services/`
- Electron main process files
- Audio processing
- Transcription services
- Medical formatting
- File system operations

### Shared
- `/src/data/` - Read by both frontend and backend
- `/src/templates/` - Used by formatting services, displayed in UI
- `/src/utils/` - Pure utility functions

### Communication
- IPC (Inter-Process Communication) bridges frontend and backend
- No direct imports between frontend components and backend services
- Type definitions shared via `/src/types/`

## Module Boundaries

Each major directory should be treated as a module with clear boundaries:

1. **Components** - Only import from other components, hooks, and types
2. **Services** - Can import from data, templates, and other services
3. **Prompts** - Can import from data and templates
4. **Data** - No imports (leaf module)
5. **Templates** - No imports (leaf module)

This structure ensures clean separation of concerns and maintainable code organization.