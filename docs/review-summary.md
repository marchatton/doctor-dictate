# DoctorDictate Review Summary

## Codebase Overview
- Electron main process (`src/main.js`) drives audio capture, Whisper-based transcription, and downstream formatting through IPC handlers.
- Whisper pipeline (`src/services/transcription/whisper.js`, `src/services/audio/processor.js`) pre-processes audio with ffmpeg, chunks recordings, feeds Whisper.cpp, applies dictionary corrections, and post-processes results.
- Dictation processing (`src/data/dictation-commands.js`) converts spoken commands to punctuation, invokes the Ollama formatter, and returns formatted notes with metadata.
- Prompt and templating system (`src/prompts`, `src/templates/format/medicine-management.json`) defines structured section manifests and instructions intended to align formatted output with clinical note templates.
- Renderer (`src/App.tsx`, `src/components`) orchestrates recording, processing feedback, and transcript display, relying on `window.electronAPI` bridges from `src/preload.js`.

## Recent Activity
- `README.md` expanded to document stack, setup, and workflows (commit `e17358c`).
- Contributor guidance in `AGENTS.md` and roadmap updates in `tasks/tasks-prd.md` refined (commit `5a299ab`).
- pnpm tooling hardened via timeout script and `.npmrc` tweak (commit `545f423`).
- Repository migrated from npm to pnpm with lockfile/regeneration and documentation cleanup (commit `72c2c36`).
- Documentation and historical test artifacts regrouped under `docs/` (commit `7432fe9`).

## Identified Issues
- `src/services/formatting/content-verifier.js` results are computed but ignored in the happy path (`src/services/formatting/ollama-formatter.js:300`), so hallucinated or truncated sections reach the UI unchecked.
- The Ollama call inside `processMedicalNote` (`src/data/dictation-commands.js:271`) runs on the Electron main thread, blocking the UI for long-formatting operations.
- Structured manifest support exists but is never enabled; no manifest is produced before calling the formatter (`src/services/formatting/ollama-formatter.js:229`), forfeiting deterministic section control.
- The static prompt injects the entire corrections table and full dictation (`src/prompts/medical-prompt-v7.js:50`), inflating context and encouraging filler when input is short.
- Renderer trusts backend output without fallback; missing/failed sections still advance to the transcript screen (`src/App.tsx:54` and `src/components/TranscriptScreen.tsx:33`).
- `src/preload.js` exposes IPC methods (recording controls, settings, notifications) lacking main-process implementations, widening the surface with dead endpoints.
- The renderer loads a remote background asset (`src/App.tsx:84`), conflicting with the local-first privacy goal.

## Recommendations
- Offload Ollama formatting to a worker/utility process and stream progress back so the main process remains responsive and timeouts can be enforced.
- Integrate `SectionManifestBuilder` ahead of formatting, require per-section JSON from the LLM, run `ContentVerifier`, and reject or repair outputs that fall below coverage thresholds.
- Prune prompt context: ship only critical correction mappings, consider glossary-style guidance, and add unit tests that diff dictation vs. formatted output to catch hallucinations.
- Surface verification status to the renderer, fall back to raw transcripts when confidence is low, and log structured failures for operator review.
- Remove or secure unused IPC bridges and replace remote UI assets with packaged local resources.
