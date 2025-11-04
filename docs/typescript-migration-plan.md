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
- [ ] Refresh ESLint/Jest settings for TypeScript-first sources; configure `ts-jest` or equivalent. _(Jest already uses `ts-jest`, but `.eslintrc.js` still targets plain JS.)_
- [ ] Replace remaining CommonJS `require` usage with ESM imports. _(Multiple modules under `src/data` and `src/prompts` still call `require()`.)_
- [x] Validate with `pnpm run lint` and `pnpm test` after updates.

## 2. Electron Entrypoints (`src/main`, `src/preload`, renderer bootstrap`) — **Status: In Progress**
- [x] Rename core Electron files to `.ts` and type IPC handler contracts.
- [x] Define and share a `window.electronAPI` interface between preload and renderer.
- [ ] Convert remaining CommonJS exports to ES modules while preserving initialization order. _(Services imported by main still emit CommonJS.)_
- [ ] Extend Jest/e2e suites to import and mock typed Electron modules.

## 3. Renderer UI (React components & hooks) — **Status: In Progress**
- [ ] Migrate renderer components and hooks to `.tsx` with typed props, state, and contexts. _(Primary screens/hooks live in `.tsx`/`.ts`; `components/ui/{button,card,waveform}.js` remain outstanding.)_
- [ ] Centralize shared UI types (variants, contexts) to avoid duplication.
- [ ] Update Storybook/docs references as needed while keeping Tailwind classes intact.
- [ ] Port React Testing Library specs to TypeScript.

## 4. Services: Transcription & Formatting Pipelines — **Status: In Progress**
- [ ] Introduce domain types (e.g., `TranscriptionResult`, `FormattingJob`).
- [ ] Type Whisper/Ollama interactions with explicit interfaces and generics.
- [x] Migrate model asset services (`ModelDownloader`, `ModelValidator`) and tests to `.ts`.
- [ ] Run integration suites (`pnpm test`) to confirm behavior.

## 5. Prompts & Data Modules — **Status: In Progress**
- [ ] Decide on typed JSON exports vs. TypeScript modules for prompt/data assets.
- [ ] Encode prompt section enums and manifest schemas.
- [x] Migrate medical dictionary, dosing patterns, and dictation command processor to `.ts` (ts-nocheck for now) and rewire consumers.

## 6. Testing Infrastructure & Mocks — **Status: In Progress**
- [ ] Convert Jest mocks under `src/__mocks__` to TypeScript or provide `.d.ts` shims.
- [ ] Rename renderer-facing tests to `.test.tsx` / `.test.ts`. _(Multiple suites such as `src/__tests__/app.test.js` and `src/prompts/__tests__/*.test.js` still target JavaScript.)_
- [x] Ensure coverage tooling targets new extensions.

## 7. Build Scripts & Automation — **Status: Todo**
- [ ] Review helper scripts that touch `src` modules and update paths/compilation steps.
- [ ] Confirm Vite/Electron builder entrypoints target compiled TypeScript outputs.
- [ ] Document developer workflow updates in `CLAUDE.md` or related guides once finalized.

## Tracking & Next Steps
- Use this checklist to open focused PRs per section.
- Keep regression tests green (`pnpm run lint`, `pnpm test`, `pnpm run build` for risky refactors).
- Update status indicators above as work progresses.
