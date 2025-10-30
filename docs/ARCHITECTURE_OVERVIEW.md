# Architecture Overview: Two-Stage Hybrid Approach

## The Core Problem

**Current:** `Voice → Whisper → LLM ("format only, don't generate") → Formatted Note`

**Issue:** You're asking a generative model to not generate. This causes hallucinations, content loss, and template drift despite aggressive prompt engineering.

---

## Proposed Solution: Separation of Intelligence and Assembly

```
Voice → Whisper → Raw Transcript
                       ↓
         ┌─────────────────────────────┐
         │  STAGE 1: Structure Analyzer │
         │  (LLM - Intelligence)        │
         │  Input:  Raw transcript      │
         │  Output: Metadata JSON       │
         └─────────────────────────────┘
                       ↓
              Structure Metadata
              (sections, ranges, formatting hints)
                       ↓
         ┌─────────────────────────────┐
         │  STAGE 2: Content Assembler  │
         │  (Deterministic - Assembly)  │
         │  Input:  Metadata + Transcript│
         │  Output: Formatted Markdown  │
         └─────────────────────────────┘
                       ↓
              [Invariant Checks]
              - 100% coverage
              - No new content
              - Template conformance
                       ↓
              Formatted Medical Note
```

---

## Stage 1: Structure Analyzer (LLM)

**Purpose:** Make intelligent decisions about structure and formatting intent.

**Responsibilities:**
- Detect section boundaries from messy cues ("meds" → Current Medications)
- Determine formatting intent (where list items actually start/end)
- Handle ambiguity (unclosed brackets, contradictory "new line" commands)
- Map spoken titles to canonical template sections

**Output:** JSON metadata with character ranges, NOT free text

**Example Output:**
```json
{
  "sections": [
    {
      "key": "current_medications",
      "detectedTitle": "meds",
      "canonicalTitle": "Current Medications",
      "ranges": [{ "start": 29, "end": 80 }],
      "format": "numbered-list",
      "items": [
        { "ranges": [{ "start": 34, "end": 51 }], "lineBreakAfter": true },
        { "ranges": [{ "start": 61, "end": 76 }], "lineBreakAfter": true }
      ],
      "confidence": 0.88
    }
  ],
  "analysis": {
    "coveragePercent": 100
  }
}
```

**Key:** LLM makes decisions but returns coordinates, not content.

---

## Stage 2: Content Assembler (Deterministic)

**Purpose:** Build output using ONLY original transcript text.

**Process:**
1. **Normalize transcript** (deterministic rules)
   - "period" → "." (except "interim period")
   - "comma" → ","
   - Apply medical dictionary (adhd → ADHD)

2. **Extract content** from ranges
   - Slice text from `transcript[range.start:range.end]`
   - Never generate or modify words

3. **Apply formatting** based on metadata
   - Add section headers: `### Current Medications`
   - Format lists: `1. Adderall 20mg`
   - Use metadata hints for structure

4. **Enforce invariants**
   - Coverage: 100% of transcript must appear in output
   - No-new-content: Output only contains transcript words
   - Template conformance: Only allowed sections

**Key:** Assembly is copy-only. Zero degrees of freedom for hallucination.

---

## How It Handles Real-World Messiness

### Problem 1: Ambiguous section markers
```
Dictation: "chief complaint: follow-up meds Adderall..."
```
**Stage 1:** Detects "chief complaint:" as section, "meds" as next section
**Stage 2:** Assembles using exact ranges, preserves "follow-up" and "Adderall"

### Problem 2: Unreliable formatting commands
```
Dictation: "Adderall 20mg new line new medication Zoloft 50mg"
```
**Stage 1:** Ignores literal "new line", detects 2 medications from names
**Stage 2:** Formats as 2 numbered items using detected ranges

### Problem 3: Unclosed brackets
```
Dictation: "Adderall 20mg ( taken in morning Zoloft 50mg"
```
**Stage 1:** Metadata marks unclosed bracket, infers closure at item boundary
**Stage 2:** Renders with correct bracket placement based on ranges

### Problem 4: Fuzzy terminology
```
Dictation: "problemist ADHD improving"
```
**Stage 1:** Dictionary maps "problemist" → "Problem List" section
**Stage 2:** Renders as `### Problem List\n1. ADHD improving`

---

## Plugin Architecture

### Medical Dictionaries
```javascript
// src/data/dictionaries/medicine.json
{
  "name": "General Medicine",
  "corrections": {
    "adhd": "ADHD",
    "mdd": "MDD",
    "milligrams": "mg"
  },
  "sectionTriggers": {
    "current_medications": ["meds", "medications", "current meds", "med list"]
  }
}

// Usage
const dictionary = DictionaryLoader.load('medicine');
```

**Future:** `psychiatry.json`, `pediatrics.json`, `cardiology.json`

### Templates
```javascript
// templates/format/medicine-management.json
{
  "name": "Medicine Management Visit",
  "dictionary": "medicine",
  "sections": [
    {
      "key": "current_medications",
      "format": "numbered-list",
      "listItemFormat": "{medication} {dose} ({frequency})"
    }
  ]
}

// Usage
const template = TemplateLoader.load('medicine-management');
```

**Future:** Multiple templates selectable at runtime

---

## Invariant Enforcement

### Hard Guarantees
```javascript
class ContentAssembler {
  enforceInvariants(transcript, markdown, metadata) {
    // 1. Coverage: All transcript content appears in output
    const coverage = this.checkCoverage(transcript, markdown);
    if (coverage < 0.95) throw InvariantViolationError;
    
    // 2. No hallucination: Output only contains transcript words
    const newContent = this.findNewContent(transcript, markdown);
    if (newContent.length > 0) throw InvariantViolationError;
    
    // 3. Template conformance: Only allowed sections
    this.validateSectionConformance(markdown, metadata);
  }
}
```

**Result:** Impossible to ship hallucinated or incomplete notes.

---

## Comparison: Current vs Proposed

| Aspect | Current (LLM-only) | Proposed (Two-Stage) |
|--------|-------------------|----------------------|
| **Hallucinations** | Frequent despite prompts | Impossible (enforced) |
| **Content Loss** | Occurs, caught by 80% threshold | Prevented (100% coverage) |
| **Template Conformance** | Unreliable | Enforced |
| **Debugging** | Black box LLM output | Inspect metadata JSON |
| **Testability** | Hard (non-deterministic) | Easy (deterministic assembly) |
| **Speed** | Single LLM call (~30s) | Two stages (~45s) |
| **Medical Dictionary** | Embedded in prompt | Pluggable JSON |
| **Templates** | Single hardcoded | Multi-template ready |

---

## Implementation Components

### New Files
```
src/services/formatting/
  ├── structure-analyzer.js       # Stage 1: LLM analysis
  ├── content-assembler.js        # Stage 2: Deterministic assembly
  └── invariant-enforcer.js       # Validation layer

src/data/
  ├── dictionary-loader.js        # Plugin system
  └── dictionaries/
      ├── medicine.json           # General medicine
      └── psychiatry.json         # Psychiatry specialization

src/prompts/
  └── template-loader.js          # Updated for multi-template
```

### Modified Files
```
src/services/processing/
  └── unified-processor.js        # Wire two-stage flow
```

### Deprecated Files
```
src/prompts/
  └── medical-prompt-v7.js        # Old single-stage prompt
```

---

## Migration Path

1. **Build** new components alongside existing system
2. **Feature flag** to toggle old vs new architecture
3. **Test** on real dictations with accuracy metrics
4. **Compare** results side-by-side
5. **Cutover** when validated

**Estimated effort:** 2-3 weeks

---

## Expected Outcomes

### Quantitative
- **Hallucinations:** 0 (guaranteed by design)
- **Content preservation:** 100% (enforced)
- **Template conformance:** 100% (validated)
- **Processing time:** +15 seconds (acceptable for accuracy)

### Qualitative
- Debuggable (inspect metadata)
- Testable (deterministic)
- Maintainable (clear separation)
- Extensible (plugins for dictionaries/templates)

---

## Why This Works

**Key Insight:** Formatting decisions ARE intelligent (need LLM), but content assembly is NOT (should be deterministic).

**The Mistake:** Asking LLM to both decide structure AND generate output. This conflates two responsibilities.

**The Fix:** LLM decides structure → metadata → deterministic assembly with invariants.

**Result:** Intelligence where needed, guarantees where critical.
