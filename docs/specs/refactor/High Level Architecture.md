# PMX‑lite Architecture
**Token pointers, conservative disfluency, and minimal safety rails**  
*(Designed to be shippable in 3–5 days for @doctor‑dicate)*

> **Core principle:** The model never writes content. It only **points** to spans of the original transcript (by **token index**). The assembler **copies** those tokens into the template. Hallucinations are structurally impossible in the shipping path.

---

## 1) What’s In vs. Deferred (this iteration)

**In (Now):**
- **Token‑based pointers** (LLM returns token indices, not characters).
- **Conservative disfluency**: tag obvious fillers only (`uh/um/ah/er/eh/hmm`, `you know`, `i mean`); no “like”, no false‑starts, no corrections.
- **Assembler skips fillers** (default hidden) with a **“Show fillers”** toggle.
- **Minimal micro‑manifest** (pushback): detect 4–6 canonical sections via simple rules & synonyms (`chief complaint`, `meds/medications/med list`, `assessment`, `plan`). If none → **Unsectioned**.
- **Ajv schema gate** on analyzer JSON.
- **Dual coverage**: gate on **contentCoverage ≥ 0.98** (ignores fillers). Raw coverage is reported but not gated.
- **Lossless fallback** to Unsectioned if schema fails or contentCoverage < threshold.
- **Retry‑once** if schema fails (same prompt, temp=0).

**Deferred (Add later if data shows need):**
- N=3 majority voting for pointers.
- False‑starts (“we … we”), “scratch that” correction window.
- “like” heuristics.
- Raw coverage floor alerts, circuit breakers, full audit artifacts & deep observability.
- Token‑budgeting, job bus refactor, advanced renderer stats.

---

## 2) High‑Level Flow (PMX‑lite)

```
Audio → Whisper → Raw transcript
        ↓
[Preprocessor]
• conservative filler tagging (tag only; keep tokens)
• minimal spoken punctuation mapping (optional, intent‑logged if enabled)
        ↓
[Tokenize]
• tokens { id, text, charStart/End }
        ↓
[Micro‑Manifest (rules)]
• detect simple headers & synonyms; else Unsectioned
        ↓
[Structure Analyzer (local LLM)]
• returns token‑index ranges per section/item (JSON)
• temp=0; retry‑once on schema failure
        ↓
[Schema Gate (Ajv)]
• keys ∈ manifest keys; ranges in‑bounds
        ↓
[Assembler (copy‑only)]
• copy tokens in ranges; **skip fillers by default**
• apply headers & list markers; balance `)`/`]` per item
        ↓
[Verification]
• compute contentCoverage (ignore fillers) and rawCoverage
• if contentCoverage < 0.98 → **lossless fallback**
        ↓
[Renderer + UI]
• “Show fillers” toggle; sectioned output in template order
```

---

## 3) Why Token Pointers (not char ranges)
- Stable under any whitespace/punctuation cleanup.
- Simpler for the LLM to emit (just indices).
- Trivial to skip fillers (check `token.tag === "FILLER"`).
- Coverage math is easy and robust.

---

## 4) Minimal Micro‑Manifest (why keep it)
A tiny, rule‑based manifest gives you **ordering + key whitelist** with near‑zero cost and prevents analyzer drift:
- Keys: `chief_complaint`, `current_meds`, `assessment`, `plan`, `unsectioned`.
- Synonyms: `meds|medications|med list` → `current_meds`.
- If nothing detected, emit a single `unsectioned` entry spanning all tokens.

---

## 5) Verification & Safety (lite)
- **contentCoverage ≥ 0.98** (gate).  
- rawCoverage reported for visibility (no gating in this iteration).  
- Assembler never inserts clinical words; only list markers, `###` headers, and bracket closers when needed.
- If schema fails or contentCoverage misses, switch to **lossless Unsectioned** render.

---

## 6) What We Don’t Do (Now)
- No false‑start or “scratch that” logic.
- No “like” heuristics.
- No majority voting, circuit breakers, or heavy audits.
- No auto‑correction of drug names (detect/flag only).

---

## 7) Growth path
If usage shows instability or clinician demand:
- Add N=3 majority vote; raw coverage floor + alert; correction window; “like” heuristics; circuit breaker & lightweight trace/audit.