# JavaScript → TypeScript Migration Tracker

This document consolidates the outstanding work for migrating the DoctorDictate codebase from JavaScript to TypeScript.

> **Current status (November 2025):** Renderer, hooks, shared UI utilities, prompts/data, and the audio/transcription/formatting services now run in TypeScript. The dual-mode processing pipeline (processing-config + UnifiedProcessor) was converted in November with new Jest coverage. Remaining work is concentrated on Electron/E2E harnesses, renderer documentation + remaining JS tests, and build scripts that still assume `.js` entrypoints.

## Status Legend
- **Todo** – not yet started
- **In Progress** – actively being implemented
- **Blocked** – requires prerequisite work or investigation
- **Done** – completed and merged

All items below are currently **Todo** unless marked otherwise.

## 1. Tooling & Configuration — **Status: In Progress**
- [x] Harden TypeScript coverage in `tsconfig.json`/`tsconfig.node.json`, Jest, and Vite configs.
- [x] Add ambient declarations for preload bridges, assets, and Tailwind modules. _(New `src/types/global.d.ts` + IPC typings.)_
- [x] Refresh ESLint/Jest settings for TypeScript-first sources; configure `ts-jest` or equivalent. _(.eslintrc now uses `@typescript-eslint`, React, hooks, a11y, import, and Jest/testing-library plugins with TypeScript resolver + overrides.)_
- [x] Replace remaining CommonJS `require` usage with ESM imports. _(Transcription manager, engines, modes, processors, and audio pipeline now run as TypeScript/ESM; remaining `require()` usage is confined to legacy renderer/tests.)_
- [x] Validate with `pnpm run lint` and `pnpm test` after updates.

## 2. Electron Entrypoints (`src/main`, `src/preload`, renderer bootstrap`) — **Status: In Progress**
- [x] Rename core Electron files to `.ts` and type IPC handler contracts.
- [x] Define and share a `window.electronAPI` interface between preload and renderer.
- [x] Convert remaining CommonJS exports to ES modules while preserving initialization order. _(Main process now consumes the typed transcription manager stack directly.)_
- [ ] Extend Jest/e2e suites (`src/__tests__/main.test.js`, `src/__tests__/e2e-workflow.test.js`, `test/test-dual-mode.js`, etc.) to import the typed modules instead of the legacy `.js` entrypoints.

## 3. Renderer UI (React components & hooks) — **Status: In Progress**
- [x] Migrate renderer components and hooks to `.tsx` with typed props, state, and contexts. _(Legacy DOM helpers under `src/components/ui` and `src/renderer.ts` have been removed; the active React/Vite renderer is fully typed.)_
- [ ] Centralize shared UI types (variants, contexts) to avoid duplication. _(e.g., consolidate button/intensity/alert variant unions that currently live in `TranscriptionModeSelector`, `RecordingScreen`, and `components/ui` helpers.)_
- [ ] Update renderer-facing documentation/examples (README quickstart, `docs/renderer.md`, onboarding snippets) so every code sample uses the strict TypeScript APIs.
- [ ] Port the remaining React Testing Library specs under `src/components/__tests__` from `.test.js[x]` to TypeScript.

## 4. Services: Transcription & Formatting Pipelines — **Status: Done**
- [x] Introduce domain types (e.g., `TranscriptionResult`, `FormattingJob`). _(Structured manifest + prompt template contracts now live in `src/types/medical.ts` and power the formatting pipeline.)_
- [x] Type Whisper/Ollama interactions with explicit interfaces and generics. _(Whisper transcriber already typed; Ollama formatter + structured response parser now in `src/services/formatting/*.ts`.)_
- [x] Migrate model asset services (`ModelDownloader`, `ModelValidator`) and tests to `.ts`.
- [x] Run integration suites (`pnpm test`) to confirm behavior.
- [x] Convert dual-mode processing config + `UnifiedProcessor` orchestration to `.ts` with Jest coverage for the Whisper fallback + Ollama formatting flow.

## 5. Prompts & Data Modules — **Status: Done**
- [x] Decide on typed JSON exports vs. TypeScript modules for prompt/data assets. _(Prompt index, detector, manifest builder, and static builder now ship as `.ts` and load typed templates.)_
- [x] Encode prompt section enums and manifest schemas. _(Manifest builder + detector consume the shared `SectionManifest` and `PromptTemplate` interfaces.)_
- [x] Migrate medical dictionary, dosing patterns, and dictation command processor to `.ts` and rewire consumers (ts-nocheck removed).

## 6. Testing Infrastructure & Mocks — **Status: In Progress**
- [x] Convert Jest mocks under `src/__mocks__` to TypeScript or provide `.d.ts` shims. _(Electron, file, and style mocks now export typed `.ts` stubs and are referenced via `jest.config.js` mappers.)_
- [x] Rename renderer-facing tests to `.test.tsx` / `.test.ts`. _(Core Electron/render suites such as `src/__tests__/app.test.ts` and the transcription manager tests now run in TypeScript; remaining legacy suites still need conversion.)_
- [x] Ensure coverage tooling targets new extensions.
- [ ] Convert the remaining JS-only suites (`src/__tests__/dual-mode.test.js`, `src/__tests__/e2e-workflow.test.js`, `src/services/formatting/**/__tests__/*.test.js`, `src/services/transcription/**/__tests__/*.test.js`, `src/prompts/__tests__/*.test.js`, etc.) or supply `.d.ts` shims so ts-jest doesn’t fall back to `any`.

## 7. Build Scripts & Automation — **Status: Todo**
- [ ] Review helper scripts that touch `src` modules and update paths/compilation steps. _(Notably `scripts/test-runners/*.js`, `scripts/setup-ollama-models.js`, and the packaging helpers still import `.js` sources under `src/`.)_
- [ ] Confirm Vite/Electron builder entrypoints target compiled TypeScript outputs. _(Ensure `electron-builder` uses `dist-electron/*.js` rather than raw `src/main.ts`, and document the exact build order.)_
- [ ] Document developer workflow updates in `CLAUDE.md` or related guides once finalized. _(Add a “TypeScript-first workflow” section covering pnpm commands, mock conventions, and script expectations.)_

## Remaining Focus Areas (snapshot)
- **Electron suites**: Extend Jest/e2e harnesses (`src/__tests__/main.test.js`, `src/__tests__/e2e-workflow.test.js`, `test/test-dual-mode.js`) to import the typed `main`/`preload` modules instead of the legacy CommonJS builds (Section 2).
- **Renderer docs/testing**: Centralize shared UI types, refresh README/onboarding docs, and finish porting RTL specs in `src/components/__tests__` from JS to TS (Section 3).
- **Test doubles**: Convert the remaining JS-based suites (formatting/transcription/prompts tests, legacy dual-mode harness) or supply `.d.ts` shims so ts-jest keeps full typing coverage (Section 6).
- **Automation**: Update helper scripts + builder entrypoints to point at compiled `.ts` outputs and document the workflow in `CLAUDE.md` once validated (Section 7).

## Completion Checklist (blocking items)
1. **Electron coverage**
   - [ ] Convert `src/__tests__/main.test.js` to `.ts` and import the typed IPC contracts.
   - [ ] Modernize `src/__tests__/e2e-workflow.test.js` + `test/test-dual-mode.js` so they spin up the TS build artifacts (or add `.d.ts` shims if they must stay JS).
2. **Renderer consolidation**
   - [ ] Extract shared variant/intent enums into `src/types/ui.ts` and refactor `RecordingScreen`, `TranscriptionModeSelector`, `ProcessingScreen`, etc. to consume them.
   - [ ] Refresh README + `docs/renderer.md` snippets to reflect strict TS usage (no `any`, no deprecated props).
   - [ ] Port the straggling RTL suites (`src/components/__tests__/AudioWaveform.test.tsx` is done; remaining JS specs listed via `rg --files src/components/__tests__ -g '*.test.js*'`) to `.test.tsx`.
3. **Test doubles + fixtures**
   - [ ] Convert formatting/transcription/prompt suites under `src/services/**/__tests__/*.test.js` and `src/prompts/__tests__/*.test.js` to TypeScript, or add module shims so ts-jest stops falling back to `any`.
   - [ ] Ensure fixtures/mocks live under `src/__mocks__` or typed helper modules (no inline `any` assertions).
4. **Automation + scripts**
   - [ ] Update every script in `scripts/test-runners/` and `scripts/setup-*.js` to consume compiled outputs (or run via ts-node with explicit configs).
   - [ ] Document the TS-first workflow in `CLAUDE.md` (how to run scripts, regenerate prompts, run lint/tests/build).
   - [ ] Verify `pnpm run build` + `electron-builder` operate solely on compiled artifacts (`dist-react`, `dist-electron`).

## Tracking & Next Steps
- Use this checklist to open focused PRs per section.
- Keep regression tests green (`pnpm run lint`, `pnpm test`, `pnpm run build` for risky refactors).
- Update status indicators above as work progresses.
