# Project Folder Structure

## Root Overview

```
doctor-dictate/
├── src/                    # Application source code
│   ├── main.js            # Electron main process entry
│   ├── preload.js         # Electron preload script
│   ├── index.tsx          # React renderer entry
│   ├── App.tsx            # Main React component
│   ├── components/        # UI components
│   ├── services/          # Audio, transcription, formatting logic
│   ├── prompts/           # Manifest + prompt system
│   ├── data/              # Dictionaries and static data
│   ├── templates/         # Medical note templates
│   └── __tests__/         # Unit tests colocated with source
├── docs/                  # Architecture, analyses, test artifacts
├── scripts/               # Build and maintenance scripts
├── test/                  # Integration/legacy tests
└── dist*/                 # Generated build outputs
```

## Frontend Highlights (`src/components/`, `src/hooks/`, `src/styles/`)

```
components/
├── RecordingScreen.tsx     # Main recording interface
├── ProcessingScreen.tsx    # Structured progress view
├── TranscriptScreen.tsx    # Results display
└── ui/                     # Shared primitives (Button, Card, etc.)

hooks/
├── useAudioRecorder.ts     # Recorder lifecycle
└── useElectronAPI.ts       # IPC bridge helpers

styles/
├── globals.css             # Tailwind base imports
└── components/             # Component-specific overrides
```

## Services (`src/services/`)

```
services/
├── audio/                  # Capture and preprocessing
├── transcription/          # Whisper orchestration
├── formatting/             # Ollama + structured pipeline
│   ├── ollama-formatter.js
│   ├── structured-response-parser.js
│   ├── structured-renderer.js
│   ├── structured-normalizer.js
│   └── content-verifier.js
└── processing/             # Unified workflow (fast/accurate)
```

## Prompts & Templates

- `src/prompts/medical-prompt-v7.js` – manifest-aware JSON contract generation.
- `src/prompts/section-detector.js` – maps dictation cues to template sections.
- `src/templates/format/` – JSON templates with `autoFill` metadata; optional sections never emit filler text by default.
- `src/templates/example/` – example outputs for documentation or QA.

## Documentation Layout (`docs/`)

- `docs/design/` – system architecture, tech stack, folder structure.
- `docs/analysis/` – investigations (e.g., redundant file reviews, failure analyses).
- `docs/test-artifacts/` – historical prompt outputs and benchmark transcripts.
- `docs/sample-data/raw/` – raw dictation or transcript snippets used for validation.

This consolidation keeps the repository root clean while centralising reference material for onboarding and investigations.
