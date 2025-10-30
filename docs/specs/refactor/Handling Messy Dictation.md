# Handling Messy Dictation (PMX‑lite): Expected Behaviors & Edges

This guide explains how the PMX‑lite pipeline turns messy speech into a clean, templated note **without generating new content**. It reflects the **lite** scope: conservative filler removal and minimal structure rules.

---

## 1) What is cleaned now (and what is not)

**Cleaned now (conservative):**
- Fillers: `uh, um, ah, er, eh, hmm` and the phrases `you know`, `i mean`.
- Optional spoken punctuation mapping for `colon/comma/period` (if enabled).

**Not cleaned yet (deferred):**
- “like” when used as filler (ambiguous).
- False starts (`we … we`) and corrections (“scratch that”).
- Advanced phrase hygiene and complex disfluencies.

All dictated medical words remain **as said**. We never paraphrase or add clinical content.

---

## 2) Signals we use
- **Lexical triggers** (micro‑manifest): `chief complaint`, `meds|medications|med list`, `assessment`, `plan`.  
  Otherwise everything is kept under **Unsectioned**.
- **Medication patterns** help split items (Name + Dose + Unit [+ Frequency]) even if “next line” wasn’t spoken.
- **Conservative disfluency tags** mark tokens as `FILLER`; they are **skipped** when rendering (toggle “Show fillers” to reveal).

---

## 3) Scenarios (lite)

### A) Run‑on medication list (no “next line” spoken)
**Input:** “meds adderall 20 mg each morning zoloft 50 mg at night”  
**Output:**
```
### Current Medications
1. Adderall 20 mg (each morning)
2. Zoloft 50 mg (at night)
```
*Words are copied; only headers, list markers, and parentheses are added.*

---

### B) No “next section” but clear header
**Input:** “chief complaint follow up meds adderall 20 mg …”  
**Output:**
```
### Chief Complaint
follow up

### Current Medications
1. Adderall 20 mg …
```

---

### C) Fillers removed (conservative only)
**Input:** “Chief complaint uh follow up, I mean mostly meds um Adderall 20 mg …”  
**Output:** fillers removed; everything else copied. UI shows “Show fillers” to restore.

---

### D) Unclosed bracket
**Input:** “adderall 20 mg (each morning zoloft 50 mg at night”  
**Output:**
```
### Current Medications
1. Adderall 20 mg (each morning)
2. Zoloft 50 mg (at night)
```
*Balancing `)` is added at item end; flagged internally as a balancing closer.*

---

### E) What **doesn’t** get cleaned in PMX‑lite
- “like” as filler remains.
- “we we discussed” stays as said.
- “scratch that …” keeps both phrases (no auto‑erase).

These are deliberate deferrals to reduce complexity. If clinicians ask for them, we’ll add targeted logic later.

---

## 4) Verification & fallback (lite)
- We compute:
  - **contentCoverage** = usedTokens / (totalTokens − fillerTokens)  
  - **rawCoverage** = usedTokens / totalTokens
- We **gate** on `contentCoverage ≥ 0.98`.  
- If the gate fails or analyzer JSON is invalid → **lossless Unsectioned** render (copy of the original tokens with minimal formatting).

---

## 5) User experience
- **Show fillers** toggle to reveal removed fillers inline (dimmed styling).  
- Section order is dictated by the micro‑manifest or falls back to Unsectioned.  
- No hallucinated text; every word (except conservative fillers and balancing closers) came from your dictation.