# Section Manifest & Structured Rendering PRD

## Objective
Deliver a fault-tolerant formatting pipeline that preserves every dictated word while enforcing template-driven structure. The system must honor speaker-improvised sections, maintain dictated order, and surface uncertain terminology without hallucinating defaults.

## Background & Pain Points
- **Section drift**: Ollama receives the full template catalogue and emits empty sections (e.g., "ROS" placeholders) despite guidance in `src/prompts/medical-prompt-v7.js:26-66` and `docs/design/system-architecture.md:188-199`.
- **Order loss**: The renderer accepts headings in the order Ollama returns them, so dictation order shifts when the model reorganizes output.
- **Dictionary underuse**: `src/data/medical-dictionary.js:17-70` defines corrections, yet medication names like "Jordan Apm" slip through because corrections are not applied post-format.
- **Template defaults**: Optional sections in `src/templates/format/medicine-management.json:66-160` carry default prose that encourages hallucinated content.
- **Verification gap**: `src/services/formatting/content-verifier.js:20-109` checks word coverage but not extra sections, missing modifiers, or casing rules.

## Target Experience
1. **Section Manifest with Unknown Support**
   - Detect sections (known + smart) once, producing an ordered manifest containing: `id` (if known), `title`, `start/end` positions, `confidence`, and `contentSpan`.
   - Manifest ordering mirrors dictation chronology; unknown sections retain dictated titles to avoid data loss.
   - Prompt and renderer operate solely on this manifest; extra sections are blocked unless the manifest marks them optional.

2. **Structured LLM Contract**
   - Prompt requests JSON: `{ "sections": [{ "id"?, "title", "body", "confidence"? }] }`.
   - Known sections use template IDs; unknown sections rely on manifest titles.
   - Empty bodies result in omitted headers, ensuring "show only when content exists".

3. **Deterministic Renderer**
   - Translate structured responses into Markdown using template metadata (`sectionHeaderPrefix`, `problemFormat`, `medicationFormat`).
   - Enforce list and casing rules, guarantee single header per manifest entry, and preserve order.
   - Unknown sections render with dictated titles but still respect Markdown conventions.

4. **Dictionary-Guided Normalization**
   - Apply corrections post-render: canonical casing for abbreviations, medication spelling fixes, and unit normalization (mg, ml).
   - Wrap unrecognized/high-entropy medication tokens in braces (e.g., `{Journay PM}`) to flag human review while retaining original phrasing.

5. **Enhanced Verification & Recovery**
   - Confirm one-to-one mapping between manifest entries and rendered sections.
   - Validate key phrases (e.g., modifiers like "partial control") remain.
   - Flag or append raw dictation for any section failing coverage/format checks.

## Architecture & Refactors
- Extract a `SectionManifestBuilder` from `section-detector.js` to output structured metadata consumed by both prompt and renderer.
- Introduce a `StructuredFormatter` service layered atop Ollama integration, isolating prompt generation, response parsing, rendering, normalization, and verification.
- Deprecate template `default` strings in favor of explicit metadata flags (e.g., `autoFill: false`).
- Centralize dictionary access in the formatter to uphold DRY.

## Implementation Tasks & Tests

| Task | Description | Acceptance Criteria | Tests |
|------|-------------|---------------------|-------|
| T1. Manifest Builder | Build a manifest generator that wraps existing detection rules, captures order, and labels unknown sections. | Manifest preserves dictation order and includes all headings encountered (known + smart). | Unit tests for manifest extraction; integration test feeding sample transcript with novel sections. |
| T2. Prompt Contract | Update prompt generator to accept manifest, expose only detected sections, and request JSON output. | Prompt lists sections in manifest order; JSON schema documented and validated on response. | Unit tests for prompt assembly; mocked Ollama response parsing tests. |
| T3. Structured Renderer | Render JSON into Markdown using template metadata, skipping empty bodies. | Output matches template rules for known sections; unknown sections render with dictated titles and bodies only when non-empty. | Unit tests for renderer formatting scenarios; snapshot tests for sample transcripts. |
| T4. Dictionary Normalization | Apply post-render corrections; bracket uncertain medications/conditions. | Known meds/abbreviations normalized; uncertain tokens wrapped; no alteration to non-medical text. | Unit tests covering casing, bracket insertion, and idempotence; integration test verifying "Jordan Apm" → `{Jornay PM}`. |
| T5. Verification Enhancements | Extend `ContentVerifier` to enforce manifest consistency, modifier retention, and format compliance. | Failing checks append raw dictation to output and raise warning; success path confirms 100% significant-word coverage and no extra sections. | Unit tests for verification scenarios; integration test with expected vs. actual transcripts. |
| T6. Template Cleanup | Remove default prose and add metadata indicating optional sections. | Optional sections no longer auto-populate; renderer omits headers when body empty. | Unit tests ensuring templates load with new metadata; regression test verifying optional sections vanish when omitted. |
| T7. Documentation & Instrumentation | Update `AGENTS.md`, `CLAUDE.md`, README, and architecture docs; add logging for manifest → renderer pipeline. | Docs describe new flow; logging highlights unknown sections and uncertainty brackets. | Documentation review; smoke test verifying logs in dev mode. |

## Test Strategy
- **Unit**: Jest suites for manifest builder, JSON parsing, renderer, normalization, and verifier (T1–T5).
- **Integration**: End-to-end test that feeds sample dictations (expected vs. actual) through the pipeline, asserting identical content and ordered sections.
- **Regression**: Snapshot tests comparing current fast/accurate sample outputs to ensure improved fidelity without losing sections.
- **Manual**: QA checklist covering improvised headings, mispronounced medications, and template-sparse dictations.

## Risks & Mitigations
- **LLM JSON drift**: Implement JSON repair or retry logic; log fallback to raw transcript if repair fails.
- **Detector misses novel phrasing**: Track low-confidence detections and temporarily classify as unknown sections so content still surfaces.
- **Performance overhead**: Structured parsing/normalization runs locally; ensure steps are linear in transcript size.

## Open Questions
- Should uncertainty brackets trigger UI highlighting for manual review? You can add a simple annotation (colour etc) on the UI as, long as its straighforward.
- Do we need clinician-configurable mappings for frequently mispronounced medications beyond the dictionary scope? Not yet
- How should we store manifest metadata if downstream export formats (PDF) require the same structure? I dont know what do you think is best
