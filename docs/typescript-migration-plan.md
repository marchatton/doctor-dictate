# JavaScript → TypeScript Migration Tracker

This document consolidates the outstanding work for migrating the DoctorDictate codebase from JavaScript to TypeScript.

> **Current status (April 2025):** The migration is already underway. The renderer, hooks, and most shared UI utilities are written in TypeScript, and the toolchain (Vite, Jest with `ts-jest`, and the project `tsconfig` presets) compiles `.ts`/`.tsx` sources today. The remaining work focuses on converting the CommonJS Electron entrypoints, service layer, prompt/data modules, and Jest mocks that still rely on JavaScript-only patterns.

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
- [ ] Extend Jest/e2e suites to import and mock typed Electron modules.

## 3. Renderer UI (React components & hooks) — **Status: In Progress**
- [x] Migrate renderer components and hooks to `.tsx` with typed props, state, and contexts. _(Legacy DOM helpers under `src/components/ui` and `src/renderer.ts` have been removed; the active React/Vite renderer is fully typed.)_
- [ ] Centralize shared UI types (variants, contexts) to avoid duplication.
- [ ] Update Storybook/docs references as needed while keeping Tailwind classes intact.
- [ ] Port React Testing Library specs to TypeScript.

## 4. Services: Transcription & Formatting Pipelines — **Status: Done**
- [x] Introduce domain types (e.g., `TranscriptionResult`, `FormattingJob`). _(Structured manifest + prompt template contracts now live in `src/types/medical.ts` and power the formatting pipeline.)_
- [x] Type Whisper/Ollama interactions with explicit interfaces and generics. _(Whisper transcriber already typed; Ollama formatter + structured response parser now in `src/services/formatting/*.ts`.)_
- [x] Migrate model asset services (`ModelDownloader`, `ModelValidator`) and tests to `.ts`.
- [x] Run integration suites (`pnpm test`) to confirm behavior.

## 5. Prompts & Data Modules — **Status: Done**
- [x] Decide on typed JSON exports vs. TypeScript modules for prompt/data assets. _(Prompt index, detector, manifest builder, and static builder now ship as `.ts` and load typed templates.)_
- [x] Encode prompt section enums and manifest schemas. _(Manifest builder + detector consume the shared `SectionManifest` and `PromptTemplate` interfaces.)_
- [x] Migrate medical dictionary, dosing patterns, and dictation command processor to `.ts` and rewire consumers (ts-nocheck removed).

## 6. Testing Infrastructure & Mocks — **Status: In Progress**
- [ ] Convert Jest mocks under `src/__mocks__` to TypeScript or provide `.d.ts` shims.
- [x] Rename renderer-facing tests to `.test.tsx` / `.test.ts`. _(Core Electron/render suites such as `src/__tests__/app.test.ts` and the transcription manager tests now run in TypeScript; remaining legacy suites still need conversion.)_
- [x] Ensure coverage tooling targets new extensions.

## 7. Build Scripts & Automation — **Status: Todo**
- [ ] Review helper scripts that touch `src` modules and update paths/compilation steps.
- [ ] Confirm Vite/Electron builder entrypoints target compiled TypeScript outputs.
- [ ] Document developer workflow updates in `CLAUDE.md` or related guides once finalized.

## Tracking & Next Steps
- Use this checklist to open focused PRs per section.
- Keep regression tests green (`pnpm run lint`, `pnpm test`, `pnpm run build` for risky refactors).
- Update status indicators above as work progresses.
