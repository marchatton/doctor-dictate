# DoctorDictate – Local-First Medical Transcription

DoctorDictate is a macOS desktop app for clinicians who need accurate, private, and fast medical dictation. All audio, transcription, and formatting happen locally so protected health information never leaves your device.

## Core Capabilities
- Local Whisper.cpp transcription with no cloud dependencies
- Template-driven formatting that preserves dictated medical terminology
- Dual Fast/Accurate modes with real-time waveform feedback in the recorder UI
- Dictation command handling ("comma", "colon", etc.) for hands-free editing
- Manifest-guided JSON-first formatting that renders deterministic Markdown
- Hallucination guardrails that only emit sections present in the dictation
- Local LLM formatting via Ollama (Qwen 2.5 1.5B or Llama 3.2 3B)

## Tech Stack
- **UI & Framework**: Electron, React, TypeScript, Tailwind CSS
- **Transcription**: Whisper.cpp (`whisper-cli`)
- **Formatting**: Ollama
- **Audio**: Web Audio API
- **Tooling**: Vite, Jest, ESLint, electron-builder

## Prerequisites
- macOS (Apple Silicon optimized; Intel supported)
- Node.js 18+ and npm
- Homebrew (recommended) with FFmpeg and Whisper.cpp CLI support
- Ollama runtime with at least one local model (Qwen 2.5 1.5B or Llama 3.2 3B)
- pnpm 10.17+ (global installation for dependency management)
- ~4 GB disk space and ~4 GB RAM for model workloads
- Microphone access (grant in System Settings)

## Setup
1. **Install Homebrew tooling** (skip if already installed)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   brew install ffmpeg whisper-cpp
   ```
   Whisper models can be fetched via `scripts/download-whisper-models.sh` or
   `whisper-cli-download-ggml base.en` and `whisper-cli-download-ggml small.en`.

2. **Install Ollama and seed models**
   ```bash
   # https://ollama.ai
   ollama serve &
   ollama pull qwen2.5:1.5b
   ollama pull llama3.2:latest  # optional, higher quality
   curl http://localhost:11434/api/tags
   ```

3. **Clone the repo and install packages**
   ```bash
   git clone <repository-url>
   cd doctor-dictate
   pnpm install
   ```
   Dependencies are stored in a shared pnpm content-addressable cache at
   `~/Library/pnpm/store` to minimize duplicate downloads across projects.

4. **Run the app**
   ```bash
   pnpm run dev   # Vite renderer + Electron shell
   pnpm start     # Run against the latest build
   ```

5. **Build distributables**
   ```bash
   pnpm run build
   pnpm run dist  # electron-builder packaging
   ```

## Core Scripts
- `pnpm run dev` – hot reload for renderer + Electron
- `pnpm start` – launch Electron against built assets
- `pnpm run build` – build renderer then package with electron-builder
- `pnpm run dist` – create installers
- `pnpm test`, `pnpm run test:watch`, `pnpm run test:coverage` – Jest suites and coverage
- `pnpm run lint`, `pnpm run lint:fix` – ESLint checks
- `pnpm run build-prompt` – regenerate static prompt artifacts
- `RUN_FULL_PIPELINE=true pnpm test` – opt-in to full pipeline tests (whisper/ollama integration)

## Testing & Quality
- Follow the TDD loop (`Red → Green → Refactor`) for every change
- Tests target behavior through public APIs using Jest + React Testing Library
- Maintain coverage with `pnpm run test:coverage` before submitting changes, and run the prompt/parser/renderer/verifier suites when updating formatting logic
- Reference `AGENTS.md` for agent workflows and strict TypeScript/immutability rules

## Project Layout
```
src/
├── main.js, preload.js, ipc/      # Electron main process & bridges
├── index.tsx, App.tsx             # React entry
├── components/, hooks/            # UI and shared hooks
├── services/                      # Audio, transcription, formatting logic
├── prompts/, templates/, data/    # Domain assets
└── __tests__/ and test/           # Unit and integration suites
scripts/                           # Tooling and helpers
docs/                              # Architecture and setup references
dist*/                             # Build artifacts
```

## Performance Modes
- **Fast**: Whisper base.en + Qwen 2.5 1.5B (~3–4 min for 30 min audio, ~2–3 GB RAM)
- **Accurate**: Whisper small.en + Qwen 2.5 or Llama 3.2 (~6–8 min, ~3.5–4.5 GB RAM)

## Operations & Troubleshooting
- **FFmpeg not found**: `brew install ffmpeg` or download binaries and add to `PATH`.
- **Whisper models missing**: ensure files exist at `~/.whisper-cpp/models/ggml-*.bin`.
- **Ollama offline**: `ollama serve` then verify with `curl http://localhost:11434/api/tags`.
- **Microphone denied**: System Settings → Privacy & Security → Microphone → enable for Terminal/Electron.
- **High memory usage**: close other apps or switch to Fast mode.

## Security & Privacy
- Context isolation and vetted IPC handlers protect renderer access (`src/ipc/`).
- No external API calls—audio, transcription, and formatting stay on-device.
- Store large recordings outside Git and keep `.env` files local only.
- Formatter logs include manifest summaries, structured-response parsing status, and content-verifier reports to surface potential gaps quickly.

## Contributing
Contributions are welcome! Review the agent playbook in `AGENTS.md` before opening a PR. The project uses Conventional Commits (e.g., `feat:`, `fix:`) and expects lint, test, and coverage checks with each submission.

## License
MIT License – see `LICENSE`.

## Medical Disclaimer
This software is not FDA approved and must not be the sole system of record. Always verify generated notes; the application runs entirely on your device, and no patient data leaves your environment.

## Support
Open an issue for questions, feedback, or bug reports.

— Built with privacy in mind. Your medical notes never leave your device.
