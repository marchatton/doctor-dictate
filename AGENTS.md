# AGENTS.md (DoctorDictate)

**Purpose:** Repo-specific guardrails for Codex when working on DoctorDictate. Keep guidance practical and tied to the local-first Electron + React stack. Defaults: **pnpm**, Vite React renderer + Electron main process, TypeScript strict mode, Jest, Tailwind. In all interactions and comment messages, be extremely concise and sacrifice grammar for the sake of concision.

---

## 0) Engineering Principles

- **TDD**: write a failing Jest/RTL spec before modifying behavior; refactor only once tests are green.
- **Local-first privacy**: no new network calls or cloud dependencies. All PHI stays on-device.
- **KISS**: prefer straightforward pipelines; revisit complexity after correctness.
- **YAGNI**: implement only what the current workflow requires.
- **DRY**: keep medical rules, prompts, and templates in their single sources of truth (`src/data`, `src/prompts`, `src/templates`).
- **Define shared contracts first**: add/extend shared TS interfaces/enums under `src/types/**` before touching consumers so every PR reuses the same shapes.
- **Convert source + colocated tests together**: when a module migrates to TS, migrate its `__tests__` sibling too (or add `.d.ts` shims) so ts-jest never falls back to `any`.
- **Scripts are first-class**: decide if each script runs via ts-node or compiled outputs, document that choice (e.g., `CLAUDE.md`), and keep helper scripts aligned with the build pipeline.
- **Verify after each chunk**: run `pnpm run lint` + `pnpm test` after every sizeable change (renderer/services/mocks/docs) so regressions surface immediately.

---

## 1) Project Profile & Non-negotiables

- **App shell:** Electron main process (`src/main.js`) + preload bridge (`src/preload.js`).
- **Renderer:** React 18 via Vite (`src/index.tsx`, `src/App.tsx`) with Tailwind styling.
- **Services:** Local Whisper.cpp transcription, Ollama formatting, audio preprocessing under `src/services`.
- **Testing:** Jest + Testing Library (`npm run test`, colocated `__tests__/`). Aim to add coverage with every change.
- **Package manager:** `pnpm` (lockfile checked in). Use `pnpm run …` for scripts.
- **TypeScript:** strict; avoid `any`, assertions, and mutation-heavy patterns.
- **Data sensitivity:** never transmit dictation off-device; respect sandboxed IPC boundaries (expose only vetted handlers under `src/preload.js`).

---

## 2) Structure & Security Boundaries

**Repo roots**

```
/
  src/                    # Electron + React source
    main.js               # Electron main process
    preload.js            # contextBridge surface (keep minimal)
    App.tsx               # renderer orchestrator
    components/           # React UI components
    services/             # audio/transcription/formatting pipeline
    data/                 # medical dictionary & command models
    prompts/              # prompt builders + static prompt assets
    templates/            # note templates (JSON)
    utils/                # renderer helpers
  docs/                   # human-authored documentation
  test/                   # integration and sample workflows
  scripts/                # utilities (e.g., whisper downloads)
```

**Boundaries to respect**

- Renderer code must not reach into Node APIs directly; interact via `window.electronAPI` only.
- IPC additions require matching handlers in `src/main.js` + secure exposure in `src/preload.js`.
- Never mutate shared singleton state in services without guarding for concurrent runs; reset after errors.
- Templates/prompts are canonical—update via `pnpm run build-prompt` when they change.

---

## 3) Do / Don’t (Repo-specific)

**Do**

- Use `pnpm` scripts (`pnpm run dev`, `pnpm run test`, etc.).
- Keep diffs small and focused; update tests + docs alongside code.
- Preserve raw dictation text through every stage; avoid lossy transforms.
- Log sensitive data sparingly (mask PHI in new logs).
- Regenerate prompts (`pnpm run build-prompt`) when editing prompt builders or templates.
- Document new operational learnings in `CLAUDE.md` or relevant docs once validated.

**Don’t**

- Introduce network dependencies, cloud APIs, or telemetry.
- Bypass tests, lint, or type checks; never commit red CI.
- Touch Electron security defaults (contextIsolation, nodeIntegration) without consulting maintainers.
- Duplicate medical correction logic—extend `src/data/medical-dictionary.js` instead.

---

## 4) Commands (pnpm)

```bash
# Dev shell (Electron + Vite)
pnpm run dev

# Packaged Electron shell
pnpm start

# Renderer build bundle
pnpm run react:build

# Full build (renderer + electron-builder packaging)
pnpm run build

# Tests (single run or watch)
pnpm test
pnpm run test:watch
pnpm run test:coverage     # keep coverage steady

# Lint & formatting
pnpm run lint
pnpm run lint:fix

# Prompt regeneration after edits
pnpm run build-prompt
```

---

## 5) Git & Workflow

- **Conventional commits**: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, `improvement:`.
- Always stage failing test → fix → green in the same PR.
- Verify `pnpm run test:coverage` + `pnpm run lint` locally before pushing significant changes.
- If touching sensitive pipelines, add notes to the PR on expected user impact and validation steps.

---

## 6) Lint / Format / Checks

- **ESLint** (configured via `pnpm run lint`) enforces TypeScript + React best practices.
- **Prettier/Tailwind** handled through ESLint rules; keep class ordering consistent.
- No automated ast-grep/knip here—manual diligence required when pruning dead code.
- Run `pnpm run build` before shipping higher-risk refactors to ensure electron-builder still packages.

---

## 7) Testing Expectations

- Unit/component tests: Jest + Testing Library; co-locate under `__tests__/` near source.
- Integration flows: keep `test/` scripts up to date (mock audio when feasible to stay deterministic).
- For regression risk (transcription, formatting), create fixtures and compare structured outputs.
- Bug fixes require a reproducing test case that fails before the fix.
- When Whisper/Ollama involvement makes deterministic testing hard, isolate logic behind injectable interfaces and add contract tests for the deterministic portions.

---

Stay mindful that major architecture/pipeline refactors are underway—cross-check assumptions against current code rather than legacy diagrams.
