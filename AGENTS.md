# Repository Guidelines

## Project Structure & Module Organization
Source lives in `src/`: the Electron main process (`main.js`, `preload.js`, `ipc/`) and the React renderer (`index.tsx`, `App.tsx`). UI components sit in `src/components`, shared hooks in `src/hooks`, and domain services in `src/services` alongside supporting data, prompts, and templates. Unit tests reside in module-level `__tests__/` folders, with integration workflows gathered in `test/`.

## Build, Test, and Development Commands
Run `npm run dev` for combined Vite + Electron development and `npm start` to replay the packaged shell. `npm run react:build` produces the renderer bundle; `npm run build` extends it with `electron-builder`. Begin each change with a failing Jest spec (`npm test` or `npm run test:watch`), drive it green, then refactor. Maintain coverage through `npm run test:coverage` and mirror CI with `npm run test:ci`. Lint via `npm run lint` or `npm run lint:fix`, and regenerate prompts after edits using `npm run build-prompt`.

## Coding Style & Naming Conventions
TypeScript strict mode is mandatory—avoid `any`, assertions, and mutation. Favor pure functions, immutable updates, and early returns. Components use `PascalCase`, hooks use `camelCase` with a `use` prefix, and service or data modules follow `kebab-case`. Prefer the Vite `@/` alias for cross-module imports, isolate renderer code from Electron internals, and let naming carry intent instead of comments.

## Testing Guidelines
Work within the `Red → Green → Refactor` loop. Target behaviors through Jest or Testing Library specs against public APIs, colocated with the module or the closest `__tests__/` directory. Build fixtures with shared schema factories rather than redefining types. Preserve the current coverage bar by running `npm run test:coverage` before handoff and documenting justified gaps.

## Commit & Pull Request Guidelines
Use Conventional Commit prefixes (`feat:`, `fix:`, `docs:`, `refactor:`, `improvement:`) and ship the proving test with the change. For pull requests, confirm lint and test runs, summarize motivation and user impact, link issues, and attach screenshots or logs for UI or processing changes.

## Security & Local Data Practices
Process medical data locally. Fetch Whisper and Ollama assets via `scripts/download-whisper-models.sh`, keep large recordings out of Git, and avoid external APIs for PHI. Preserve dictation verbatim through the pipeline (Audio → Whisper → Ollama → verification). Expose only vetted IPC handlers in `src/ipc/` and capture new operational insights in `CLAUDE.md`.

## Core Engineering Principles
- **SOLID**: Keep responsibilities focused, extend without edits, honor contracts, split interfaces, depend on abstractions.
- **DRY**: Maintain a single source of truth; eliminate duplicate logic and knowledge.
- **KISS**: Prefer straightforward solutions; revisit complexity if it creeps in.
- **YAGNI**: Ship only what the story demands today; defer hypotheticals.
- **Convention over Configuration**: Follow shared defaults before adding knobs.
- **Composition over Inheritance**: Assemble behavior from collaborators instead of deep hierarchies.
- **Law of Demeter**: Talk to immediate neighbors; avoid long call chains.
