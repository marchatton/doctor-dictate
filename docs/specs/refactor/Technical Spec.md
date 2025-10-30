# PMX‑lite Technical Specification v1.3
**@doctor‑dicate** — *Local‑first, zero‑hallucination note formatting with minimal scope*

> This spec captures the 3–5 day PMX‑lite build: token pointers, conservative filler removal, Ajv‑gated JSON, dual‑coverage verification, bracket balancing, and lossless fallback. Micro‑manifest and retry‑once are included; everything else is deferred.

---

## 1) Goals & Non‑Goals

### Goals
- **No hallucinations:** LLM returns **structure only** (token index ranges).  
- **Copy‑only assembly:** Assembler copies dictated tokens, formatting only.  
- **Conservative disfluency:** remove only obvious fillers; keep everything else.  
- **Fast to ship:** minimal moving parts; no multi‑pass voting or heavy infra.

### Non‑Goals (this iteration)
- Handling false starts or corrections (“scratch that”).  
- Removing “like” as filler.  
- Circuit breakers, job bus refactors, deep audit artifacts, raw coverage floor alerts.

---

## 2) Functional Requirements

- FR‑1: Accept audio → Whisper → text.
- FR‑2: Produce a formatted note under a chosen template.
- FR‑3: **Micro‑manifest**: detect simple sections (`chief_complaint`, `current_meds`, `assessment`, `plan`) or fall back to `unsectioned`.
- FR‑4: **Analyzer** returns token‑index ranges per section/item (JSON).
- FR‑5: **Conservative filler tagger** marks tokens (`uh/um/ah/er/eh/hmm`, `you know`, `i mean`) as `FILLER`; assembler **skips** them by default.
- FR‑6: **Ajv schema gate** for analyzer JSON; **retry‑once** on failure; otherwise **lossless fallback**.
- FR‑7: **Verification**: gate on **contentCoverage ≥ 0.98**; report rawCoverage.
- FR‑8: **Bracket balancing** per item (append `)`/`]` if opener was present).
- FR‑9: UI toggle **Show fillers**.

---

## 3) Non‑Functional Requirements
- Local‑only processing; no external APIs.
- Latency: reasonable on modern Apple Silicon for small local models (7–8B quant).  
- Minimal logs; no PHI exfiltration. (Optional tiny trace behind a dev flag.)

---

## 4) Data Model (lite)

```ts
type Token = {
  id: number;
  text: string;
  charStart: number;
  charEnd: number;
  tag?: 'FILLER'; // only conservative fillers in this iteration
};

type ManifestEntryKey = 'chief_complaint'|'current_meds'|'assessment'|'plan'|'unsectioned';

type ManifestEntry = { key: ManifestEntryKey; tokenStart: number; tokenEnd: number };
type Manifest = { entries: ManifestEntry[] };

type Span = { start: number; end: number }; // token indices (start inclusive, end exclusive)
type Item = { tokenRanges: Span[] };
type Section = { key: ManifestEntryKey; items: Item[] };
type Structure = { sections: Section[] };

type Coverage = { content: number; raw: number };
```

---

## 5) Preprocessing (lite)
- **Conservative filler tagging**:
  - Singles: `uh, um, ah, er, eh, hmm`
  - Phrases: `you know`, `i mean`
  - Full‑word matches only; small whitelist for meaningful terms (`uh‑oh`, `mm‑hmm`, `uh‑huh`) if necessary.
  - We **tag**, not delete; indices remain stable.
- Optional spoken punctuation mapping (`colon/comma/period`) behind a flag; if enabled, record an intent for audit.

---

## 6) Micro‑Manifest (rules, lite)
- Scan tokens to detect obvious headers and synonyms; otherwise produce a single `unsectioned` entry covering all tokens.
- Purpose: **constrain keys & preserve order**, not to decide items.

---

## 7) Structure Analyzer (local LLM)
- Prompt lists allowed keys (from the micro‑manifest), includes the token list `[id]"text"`.
- Output **JSON** only: `Structure` as above.
- **temp=0**; **retry‑once** if schema fails.
- No majority voting in this iteration.

**Prompt excerpt (lite):**
```
Return ONLY JSON matching the schema.
Use only these section keys: chief_complaint, current_meds, assessment, plan, unsectioned.
Each item is a list of token index ranges [{start,end}], start inclusive, end exclusive.
Do not invent words or keys.
```

---

## 8) Schema Gate (Ajv)
- `sections[].key` ∈ allowed keys (enum).
- Each `start,end` within `[0..tokens.length]` and `start < end`.
- On failure: retry once; if still failing → fallback.

---

## 9) Assembler (copy‑only)
- For each section in manifest order, print `### {Title}` then each item line:
  - Join the exact tokens for each range.
  - **Skip tokens with `tag==='FILLER'`**.
  - Apply list markers per template.
- **Bracket balancing**: if `(` or `[` appears without a closer before item end, append `)`/`]`.

**Renderer whitelist (lite):**
- Allowed insertions: `###` headers, list markers (`1.`, `-`), and balancing closers `)`/`]`.  
- (If you enable spoken punctuation mapping, permit intent‑backed `: , .` as well.)  
- No other insertions.

---

## 10) Verification & Fallback
- Compute:
  - `contentCoverage = usedTokens / (totalTokens - fillerTokens)`
  - `rawCoverage = usedTokens / totalTokens`
- **Gate** on `contentCoverage ≥ 0.98`. If fail (or schema fails twice) → **lossless Unsectioned** render.
- No rawCoverage floor in this iteration (we still display the number for visibility).

---

## 11) Configuration
- `pmxLite.enabled = true`
- `pmxLite.conservativeFillers = ["uh","um","ah","er","eh","hmm","you know","i mean"]`
- `pmxLite.contentGate = 0.98`
- `pmxLite.retryOnce = true`
- `pmxLite.enableSpokenPunct = false` (optional)

---

## 12) Testing (lite)
- Golden tests:
  1) Run‑on meds list → two items, bracket balance.
  2) Fillers everywhere → removed in output, `contentCoverage` ≥ 0.98.
  3) No headers → Unsectioned path works.
- Negative test: invalid analyzer JSON → retry once → else fallback.

---

## 13) Rollout
- Feature flag `pmxLite.enabled`.  
- Side‑by‑side render (legacy vs PMX‑lite) on a small set of real dictations.  
- Collect clinician feedback; add deferred features only if needed.

---

## 14) Future Enhancements (deferred)
- N=3 voting; false‑start/correction window; “like” heuristics.  
- Raw coverage floor + alert; small JSON trace/audit.  
- Circuit breaker; token budgeting; worker/job bus refactor.