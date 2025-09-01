# Repository Refactoring Plan

## Executive Summary

Based on the analysis of the current structure against `CLAUDE.md` and `tech-stack.md` guidelines, the repository needs significant reorganization. The main issues are:

1. **Service files scattered in src root** instead of organized in `src/services/`
2. **Missing organized service subdirectories** for audio, transcription, and formatting
3. **Outdated prompt versions** cluttering the prompts directory
4. **Inconsistent file naming** (mix of kebab-case and camelCase)
5. **Missing hooks directory** despite having custom React hooks
6. **Test files mixed** between `__tests__` and `test/` directories

## Current Problems

### 1. Service Layer Disorganization
**Current:** 12+ service files dumped in `src/` root
```
src/
├── audio-processor.js
├── content-verifier.js
├── medical-formatter.js
├── ollama-formatter.js
├── processing-config.js
├── transcription-progress.js
├── unified-processor.js
├── whisper-cpp.js
├── whisper.js
└── (mixed with main.js, preload.js, renderer.js)
```

**Expected (per folder-structure.md):**
```
src/services/
├── audio/
├── transcription/
├── formatting/
└── processing/
```

### 2. Outdated Files
- Multiple old prompt versions (v2-v6) when only v7 is used
- Duplicate test files for same functionality
- Orphaned mock files

### 3. Missing Structure
- No `src/hooks/` directory for custom React hooks
- No `src/ipc/` directory for IPC handlers
- No `src/electron/` directory for Electron-specific code
- No clear separation between main and renderer process files

## Refactoring Plan

### Phase 1: Create Proper Service Structure

#### 1.1 Audio Services
**Move to `src/services/audio/`:**
- `src/audio-processor.js` → `src/services/audio/processor.js`
- Create `src/services/audio/recorder.js` (extract from RecordingScreen.tsx)
- Create `src/services/audio/converter.js` (FFmpeg operations)
- Create `src/services/audio/stream-handler.js` (audio streaming)

#### 1.2 Transcription Services
**Move to `src/services/transcription/`:**
- `src/whisper-cpp.js` → `src/services/transcription/whisper-cpp.js`
- `src/whisper.js` → `src/services/transcription/whisper.js` (consider removing if duplicate)
- `src/transcription-progress.js` → `src/services/transcription/progress-tracker.js`
- Create `src/services/transcription/transcriber.js` (main service)
- Create `src/services/transcription/chunk-processor.js`

#### 1.3 Formatting Services
**Move to `src/services/formatting/`:**
- `src/ollama-formatter.js` → `src/services/formatting/ollama-formatter.js`
- `src/medical-formatter.js` → `src/services/formatting/medical-formatter.js` (consider removing if obsolete)
- `src/content-verifier.js` → `src/services/formatting/content-verifier.js`
- Create `src/services/formatting/simple-formatter.js` (fallback)

#### 1.4 Processing Services
**Move to `src/services/processing/`:**
- `src/unified-processor.js` → `src/services/processing/unified-processor.js`
- `src/processing-config.js` → `src/services/processing/processing-config.js`
- Create `src/services/processing/processor-factory.js`

### Phase 2: Organize Electron Architecture

#### 2.1 Main Process Files
**Move to proper locations:**
- `src/main.js` → stays (entry point)
- `src/preload.js` → stays (preload script)
- Create `src/ipc/` directory:
  - `src/ipc/audio-handlers.js`
  - `src/ipc/file-handlers.js`
  - `src/ipc/service-handlers.js`
- Create `src/electron/` directory:
  - `src/electron/menu.js`
  - `src/electron/window.js`
  - `src/electron/updater.js`

#### 2.2 Renderer Process Files
- `src/renderer.js` → remove if obsolete (using index.tsx)
- Keep `src/index.tsx` as React entry point

### Phase 3: Clean Up Prompts Directory

**Current:**
```
src/prompts/
├── medical-prompt-v2.js
├── medical-prompt-v3.js
├── medical-prompt-v4.js
├── medical-prompt-v5.js
├── medical-prompt-v6.js
├── medical-prompt-v7.js (current)
└── section-detector.js
```

**Action:**
- Archive old versions: Create `src/prompts/archive/` and move v2-v6
- Keep only `medical-prompt-v7.js` as `medical-prompt.js`
- Keep `section-detector.js`

### Phase 4: Create Hooks Directory

Extract hooks from components:
- Create `src/hooks/useAudioRecorder.ts` (from RecordingScreen.tsx)
- Create `src/hooks/useProcessingState.ts`
- Create `src/hooks/useSettings.ts`
- Create `src/hooks/useElectronAPI.ts`

### Phase 5: Consolidate Tests

**Current:** Tests scattered in `src/__tests__/`, `test/`, and component `__tests__/`

**Proposed structure:**
```
src/__tests__/
├── components/       # Component tests
├── services/        # Service tests
├── integration/     # Integration tests
└── e2e/            # End-to-end tests

test/               # Remove and consolidate into src/__tests__/
```

### Phase 6: Fix File Naming Conventions

Per `folder-structure.md`:
- **Services:** kebab-case.js (✓ mostly correct)
- **Components:** PascalCase.tsx (✓ correct)
- **Hooks:** camelCase.ts starting with 'use' (needs creation)
- **Data files:** kebab-case.js (✓ correct)

**Files to rename:**
- `src/dictation-commands.js` → Move to `src/data/dictation-commands.js`

### Phase 7: Clean Up Root Files

**Move to proper locations:**
- `.claude/CLAUDE.md` → Keep duplicate but ensure root CLAUDE.md is primary
- `guidelines/folder-structure.md` → Remove duplicate
- `docs/specs/` → Consolidate specs into `docs/design/`

## Implementation Order

1. **Create directory structure** (non-breaking)
   ```bash
   mkdir -p src/services/{audio,transcription,formatting,processing}
   mkdir -p src/hooks
   mkdir -p src/ipc
   mkdir -p src/electron
   mkdir -p src/prompts/archive
   ```

2. **Move service files** (update imports)
   - Start with least dependent files
   - Update all import statements
   - Run tests after each move

3. **Extract and create new modules**
   - Extract hooks from components
   - Create IPC handlers
   - Create missing service modules

4. **Archive old files**
   - Move old prompt versions
   - Remove duplicate tests
   - Clean up obsolete files

5. **Update documentation**
   - Update import examples in CLAUDE.md
   - Ensure folder-structure.md reflects new structure

## Files to Delete

After careful review and testing:
- `src/renderer.js` (if using index.tsx)
- `src/medical-formatter.js` (if replaced by template system)
- `src/whisper.js` (if duplicate of whisper-cpp.js)
- Old prompt versions (after archiving)
- Duplicate documentation in subdirectories

## Testing Strategy

After each phase:
1. Run `npm test` to ensure nothing breaks
2. Run `npm run dev` to test application
3. Run `npm run lint` to check for issues
4. Commit changes with clear message

## Risk Mitigation

- **Create backup branch** before starting
- **Move files incrementally** with testing between moves
- **Update imports immediately** after each move
- **Keep old files temporarily** until confirmed working
- **Document any discovered dependencies** in CLAUDE.md

## Expected Benefits

1. **Clearer architecture** matching documented structure
2. **Easier navigation** for new developers
3. **Better separation of concerns**
4. **Reduced cognitive load** from clutter
5. **Consistent with TDD principles** in CLAUDE.md
6. **Proper module boundaries** as specified

## Notes

- This refactoring is purely organizational - no functional changes
- All tests should continue passing without modification (just import updates)
- The refactoring follows the principle of "changing internal structure without changing external behavior"
- Each phase can be done independently and committed separately