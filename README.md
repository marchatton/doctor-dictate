# DoctorDictate – Local-First Medical Transcription

DoctorDictate is a macOS desktop app for clinicians who need accurate, private, and fast medical dictation. All audio, transcription, and formatting happen locally so protected health information never leaves your device.

## Highlights
- Local Whisper.cpp transcription with no cloud dependencies
- Template-driven formatting that preserves dictated medical terminology
- Dual Fast/Accurate modes with real-time audio waveform feedback
- Built for privacy-first workflows and short turnaround documentation

## Feature Snapshot
- Real-time recording UI with Web Audio API visualization
- Whisper-cli integration (base.en and small.en models)
- Local LLM formatting via Ollama (Qwen 2.5 1.5B or Llama 3.2 3B)
- Dictation command handling ("comma", "colon", etc.)
- Hallucination guardrails: only outputs sections that were spoken
- Export to structured Markdown using medical templates

## Tech Stack
- **UI & Framework**: Electron, React, TypeScript, Tailwind CSS
- **Transcription**: Whisper.cpp (`whisper-cli`)
- **Formatting**: Ollama
- **Audio**: Web Audio API
- **Tooling**: Vite, Jest, ESLint, electron-builder

## Requirements
- macOS (Apple Silicon optimized; Intel supported)
- Node.js 18+ and npm
- Homebrew (recommended), FFmpeg, whisper-cli, Ollama
- ~4 GB disk space and ~4 GB RAM for model workloads
- Microphone access (grant in System Settings)

## Getting Started
1. **Install dependencies**
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   brew install ffmpeg whisper-cpp
   ```
   - Use `scripts/download-whisper-models.sh` or run `whisper-cli-download-ggml base.en` and `whisper-cli-download-ggml small.en`.
   - Manual installs are possible via the FFmpeg and Whisper.cpp repositories if Homebrew is unavailable.

2. **Install Ollama and models**
   ```bash
   # https://ollama.ai
   ollama serve &
   ollama pull qwen2.5:1.5b
   ollama pull llama3.2:latest  # optional, higher quality
   curl http://localhost:11434/api/tags
   ```

3. **Clone and install packages**
   ```bash
   git clone <repository-url>
   cd doctor-dictate
   npm install
   ```

4. **Run the app**
   ```bash
   npm run dev   # Vite renderer + Electron shell
   npm start     # Run against the latest build
   ```

5. **Build distributables**
   ```bash
   npm run build
   npm run dist  # electron-builder packaging
   ```

## Core Scripts
- `npm run dev` – hot reload for renderer + Electron
- `npm start` – launch Electron against built assets
- `npm run build` – build renderer then package with electron-builder
- `npm run dist` – create installers
- `npm test`, `npm run test:watch`, `npm run test:coverage` – Jest suites and coverage
- `npm run lint`, `npm run lint:fix` – ESLint checks
- `npm run build-prompt` – regenerate static prompt artifacts

## Testing & Quality
- Follow the TDD loop (`Red → Green → Refactor`) for every change
- Tests target behavior through public APIs using Jest + React Testing Library
- Maintain coverage with `npm run test:coverage` before submitting changes
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

## Contributing
Contributions are welcome! Review the agent playbook in `AGENTS.md` before opening a PR. The project uses Conventional Commits (e.g., `feat:`, `fix:`) and expects lint, test, and coverage checks with each submission.

## License
MIT License – see `LICENSE`.

## Medical Disclaimer
This software is not FDA approved and must not be the sole system of record. Always verify generated notes; the application runs entirely on your device, and no patient data leaves your environment.

## Support
Open an issue for questions, feedback, or bug reports.

— Built with privacy in mind. Your medical notes never leave your device.
