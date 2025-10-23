# CLAUDE.md (DoctorDictate)

**Purpose:** Guardrails for Claude Code within DoctorDictate. Emphasise local-only processing, strict TypeScript, and test-first changes. Defaults: **pnpm**, Electron main + React renderer, Jest, Tailwind. In all interactions and comment messages, be extremely concise and sacrifice grammar for the sake of concision.

**Claude-critical overlays:**
- Start by reading relevant files, then outline a plan before editing or running commands.
- Keep `.claude/settings.json` limited to `Edit` and vetted `Bash(...)` calls; no unchecked external scripts.
- Clear prior context between tasks and maintain scratch notes in-branch if workflows span sessions.
- Prefer scripted automation (`pnpm run …`) over ad-hoc commands; when unsure, ask before acting.
- Long refactors should land in stages with tests proving each behavioral change.

---

## 0) Engineering Principles

- **TDD**: begin with a failing Jest/RTL spec for new behavior or regressions.
- **Local-first privacy**: never add network calls or external services—dictation may contain PHI.
- **KISS & YAGNI**: implement the simplest approach that satisfies current requirements; defer speculative hooks until confirmed.
- **DRY**: extend existing dictionaries/prompts/templates rather than duplicating rules.

---

## 1) Project Profile & Non-negotiables

- **Electron shell:** `src/main.js` (IPC + window lifecycle), `src/preload.js` (contextBridge API surface).
- **Renderer:** React 18 via Vite entry point (`src/index.tsx`, `src/App.tsx`), styled with Tailwind utilities.
- **Domain services:** Local Whisper.cpp integration (`src/services/transcription`), audio preprocessing (`src/services/audio`), Ollama formatter (`src/services/formatting`).
- **Testing:** Jest + Testing Library (`pnpm test`, colocated `__tests__/`). Aim to maintain coverage (`pnpm run test:coverage`).
- **Package manager:** `pnpm`; keep lockfile tidy and prefer `pnpm` equivalents over npm.
- **TypeScript:** strict configuration; avoid `any`/type assertions, favor pure data flows.
- **Security:** maintain context isolation; any new IPC handler needs explicit validation and renderer-safe exposure.

---

## 2) Structure & Security Boundaries

**Key directories**

```
src/
  main.js                 # Electron main process
  preload.js              # limited IPC bridge
  App.tsx / index.tsx     # renderer entry + flow coordinator
  components/             # UI pieces (Recording, Processing, Transcript screens)
  services/               # audio/transcription/formatting pipeline
  data/                   # medical dictionary & dictation commands
  prompts/                # prompt builders + compiled prompt artefacts
  templates/              # structured note templates
  utils/                  # renderer helpers/filters
```

**Rules to enforce**

- Renderer must go through `window.electronAPI`; no direct `fs`/`path` imports.
- IPC handlers require validation, error handling, and fallbacks (especially around Whisper/Ollama availability).
- Keep template/prompt generation deterministic; regenerate compiled prompts when inputs change.
- Log sparingly to avoid leaking PHI; scrub or summarise sensitive data.

---

## 3) Do / Don’t (Repo-specific)

**Do**

- Use `pnpm` scripts for dev/test/build; document any new script additions.
- Add or update tests alongside feature work; aim for deterministic fixtures when mocking transcription.
- Preserve verbatim dictation through transformations; any correction logic belongs in `src/data` or dedicated services.
- Note meaningful operational findings in `CLAUDE.md` or `docs/` after validation.
- Keep PRs focused—tests, implementation, and documentation for one concern at a time.

**Don’t**

- Introduce outbound networking or third-party telemetry.
- Expand preload exposure without matching secure handling in the main process.
- Commit failing tests, lint errors, or type errors.
- Duplicate template or prompt logic—extend shared modules instead.

---

## 4) Commands (pnpm)

```bash
# Dev loop (Vite + Electron)
pnpm run dev

# Electron packaged shell
pnpm start

# Build renderer bundle
pnpm run react:build

# Full build with electron-builder
pnpm run build

# Tests / coverage
pnpm test
pnpm run test:watch
pnpm run test:coverage

# Lint & format
pnpm run lint
pnpm run lint:fix

# Rebuild compiled prompts after edits
pnpm run build-prompt
```

---

## 5) Git & Workflow

- Follow Conventional Commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `improvement:`).
- Bundle failing test + fix together; keep refactors separate from behavior changes when possible.
- Run `pnpm run test:coverage` and `pnpm run lint` locally before opening or updating PRs.
- Include validation notes in PR descriptions, especially for audio/transcription changes.

---

## 6) Lint / Format / Checks

- Rely on `pnpm run lint` (ESLint) for TypeScript + React + Tailwind conventions.
- Prettier runs via ESLint config; keep className ordering consistent.
- Use `pnpm run build` for higher-risk refactors to ensure the packaged app still builds.
- Manual diligence required for dead code—no automated ast-grep/knip in this repo yet.

---

## 7) Testing Expectations

- Co-locate unit/component tests with modules under `__tests__/`.
- For renderer flows, use Testing Library; mock IPC via window stubs where necessary.
- Integration scripts under `test/` should be updated when workflows change.
- Regression bugs must gain a failing test reproducing the issue before the fix.
- Whisper/Ollama variability: isolate deterministic stages, inject seams for mocking, and document any manual validation steps.

---

Architectural refactors are in motion—prefer current source code over legacy diagrams (`docs/design/system-architecture.md`, README) when resolving ambiguities.
