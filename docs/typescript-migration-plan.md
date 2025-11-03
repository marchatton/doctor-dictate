# JavaScript → TypeScript Migration Tracker

This document consolidates the outstanding work for migrating the DoctorDictate codebase from JavaScript to TypeScript.

> **Current status (April 2025):** The migration is still **blocked**. None of the scope below has been executed because the existing Electron build relies on CommonJS entrypoints and JavaScript-only test scaffolding. Converting those foundations requires a large sequencing effort (tooling first, then Electron shell, renderer, services, and supporting mocks). Until that groundwork is delivered, we cannot start checking off the individual tasks below.

## Status Legend
- **Todo** – not yet started
- **In Progress** – actively being implemented
- **Blocked** – requires prerequisite work or investigation
- **Done** – completed and merged

All items below are currently **Todo** unless marked otherwise.

## 1. Tooling & Configuration — **Status: Blocked**
- [ ] Harden TypeScript coverage in `tsconfig.json`/`tsconfig.node.json`, Jest, and Vite configs.
- [ ] Add ambient declarations for preload bridges, assets, and Tailwind modules.
- [ ] Refresh ESLint/Jest settings for TypeScript-first sources; configure `ts-jest` or equivalent.
- [ ] Replace remaining CommonJS `require` usage with ESM imports.
- [ ] Validate with `pnpm run lint` and `pnpm test` after updates.

## 2. Electron Entrypoints (`src/main`, `src/preload`, renderer bootstrap`) — **Status: Blocked**
- [ ] Rename core Electron files to `.ts` and type IPC handler contracts.
- [ ] Define and share a `window.electronAPI` interface between preload and renderer.
- [ ] Convert remaining CommonJS exports to ES modules while preserving initialization order.
- [ ] Extend Jest/e2e suites to import and mock typed Electron modules.

## 3. Renderer UI (React components & hooks) — **Status: Blocked**
- [ ] Migrate renderer components and hooks to `.tsx` with typed props, state, and contexts.
- [ ] Centralize shared UI types (variants, contexts) to avoid duplication.
- [ ] Update Storybook/docs references as needed while keeping Tailwind classes intact.
- [ ] Port React Testing Library specs to TypeScript.

## 4. Services: Transcription & Formatting Pipelines — **Status: Blocked**
- [ ] Introduce domain types (e.g., `TranscriptionResult`, `FormattingJob`).
- [ ] Type Whisper/Ollama interactions with explicit interfaces and generics.
- [ ] Migrate service implementations and related tests to `.ts`.
- [ ] Run integration suites (`pnpm test`) to confirm behavior.

## 5. Prompts & Data Modules — **Status: Blocked**
- [ ] Decide on typed JSON exports vs. TypeScript modules for prompt/data assets.
- [ ] Encode prompt section enums and manifest schemas.
- [ ] Update downstream imports in services/tests to consume typed exports.

## 6. Testing Infrastructure & Mocks — **Status: Blocked**
- [ ] Convert Jest mocks under `src/__mocks__` to TypeScript or provide `.d.ts` shims.
- [ ] Rename all `.test.js` files to `.test.ts`/`.test.tsx` and tighten typings.
- [ ] Ensure coverage tooling targets new extensions.

## 7. Build Scripts & Automation — **Status: Blocked**
- [ ] Review helper scripts that touch `src` modules and update paths/compilation steps.
- [ ] Confirm Vite/Electron builder entrypoints target compiled TypeScript outputs.
- [ ] Document developer workflow updates in `CLAUDE.md` or related guides once finalized.

## Tracking & Next Steps
- Use this checklist to open focused PRs per section.
- Keep regression tests green (`pnpm run lint`, `pnpm test`, `pnpm run build` for risky refactors).
- Update status indicators above as work progresses.
