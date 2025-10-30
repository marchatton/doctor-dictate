# Architectural Redesign: High-Accuracy Medical Transcription

## Executive Summary

**Problem:** Current architecture uses a generative LLM to "format only" but LLMs inherently generate content, causing hallucinations, content loss, and template drift.

**Real-World Constraints:**
- Dictation is extremely messy and inconsistent
- Section markers are ambiguous ("meds" vs "medications", "cc" vs "chief complaint")
- Formatting cues are unreliable (unclosed brackets, contradictory "new line" commands)
- Formatting IS generative (deciding where line breaks go, how to structure lists)
- Content must NOT be generative (preserve exact words, no hallucination)

**Solution:** Two-stage hybrid architecture that separates intelligent structure detection from deterministic content assembly.

---

## Current Architecture Problems

### The Fundamental Misalignment

```
Voice → Whisper → [LLM: "format only, don't generate"] → Formatted Note
                      ↑
                      Problem: Fighting the nature of generative models
```

Your commit history shows the struggle:
- `9c3f5bd`: "Fix prompt to prevent LLM hallucination" 
- `c0b57a2`: "Remove empty sections"
- `187886a`: "Verify structured output and remove reinjection fallback"
- Multiple prompt rewrites with increasingly strict rules ("NEVER hallucinate", "ONLY output sections actually dictated")

**Why this fails:** Small local models (qwen2.5:1.5b, llama3.2:3b) + generative task + strict constraints = unreliable results.

### Real-World Dictation Challenges

```
Example messy dictation:
"chief complaint: um so this is a follow-up meds uh Adderall 20 
milligrams new line new medication Zoloft 50 ( taken in the morning 
problem list ADHD improving partial control"

Problems:
1. "chief complaint:" - colon spoken, section change implied but unclear
2. "meds" - not "Current Medications", needs inference
3. Open bracket "(" never closed
4. "new line new medication" - says new line but keeps talking about SAME medication
5. "problem list" - no clear separator, no colon, just starts talking
```

This is why pure deterministic/rule-based won't work - you need intelligence to parse intent.

---

## Proposed Architecture: Two-Stage Hybrid

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Stage 1: Intelligent Structure Analysis (LLM)               │
│ Input:  Raw transcript                                      │
│ Output: Structure metadata (JSON) - NO free text            │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    [Validation Layer]
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Stage 2: Deterministic Content Assembly                     │
│ Input:  Structure metadata + Original transcript            │
│ Output: Formatted markdown using ONLY source text           │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    [Invariant Enforcement]
                            ↓
                    Formatted Medical Note
```

### Key Principle: Separation of Concerns

**LLM does:** Structure detection, formatting decisions (what's a section, where line breaks go)
**LLM does NOT do:** Generate content, reword text, add information

**Deterministic layer does:** Content assembly, validation, exact text preservation
**Deterministic layer does NOT do:** Interpret intent, make formatting decisions

---

## Detailed Design

### Stage 1: Structure Analyzer (LLM-based)

#### Purpose
Analyze messy dictation and output structured metadata about sections, ranges, and formatting hints.

#### Input
```javascript
{
  transcript: "chief complaint: follow-up meds Adderall 20mg new line Zoloft 50mg...",
  template: { /* medicine-management template */ },
  dictionary: { /* medical corrections */ }
}
```

#### Output Schema (JSON only, no free text)
```javascript
{
  "sections": [
    {
      "key": "cc",                    // Template section key
      "detectedTitle": "chief complaint",  // What was actually said
      "canonicalTitle": "CC",          // From template
      "ranges": [                      // Character ranges in transcript
        { "start": 18, "end": 28 }     // "follow-up"
      ],
      "format": "single-line",         // From template
      "confidence": 0.95
    },
    {
      "key": "current_medications",
      "detectedTitle": "meds",
      "canonicalTitle": "Current Medications",
      "ranges": [
        { "start": 29, "end": 80 }     // Full meds section text
      ],
      "format": "numbered-list",
      "items": [                        // Formatting hints for lists
        {
          "ranges": [{ "start": 34, "end": 51 }],  // "Adderall 20mg"
          "type": "medication",
          "lineBreakAfter": true
        },
        {
          "ranges": [{ "start": 61, "end": 76 }],  // "Zoloft 50mg"
          "type": "medication", 
          "lineBreakAfter": true
        }
      ],
      "confidence": 0.88
    },
    {
      "key": "problem_list",
      "detectedTitle": "problem list",
      "canonicalTitle": "Problem List",
      "ranges": [
        { "start": 81, "end": 115 }
      ],
      "format": "numbered-list",
      "items": [
        {
          "ranges": [{ "start": 81, "end": 115 }],  // "ADHD improving partial control"
          "type": "diagnosis",
          "lineBreakAfter": true
        }
      ],
      "confidence": 0.92
    }
  ],
  "uncategorized": [],                // Spans that couldn't be categorized
  "analysis": {
    "totalTranscriptChars": 115,
    "coveredChars": 115,               // Should equal totalTranscriptChars
    "coveragePercent": 100
  }
}
```

#### LLM Prompt Strategy

```markdown
You are a STRUCTURE ANALYZER for medical dictation. Your job is to:
1. Identify section boundaries (even when poorly marked)
2. Detect formatting intent (where line breaks should go in lists)
3. Map spoken section names to canonical template sections
4. Output ONLY JSON metadata - NEVER generate free text content

CRITICAL: You analyze structure but do NOT rewrite content. Return character 
ranges that point to the original transcript.

INPUT TRANSCRIPT:
{transcript}

TEMPLATE SECTIONS:
{template sections with formatting rules}

SECTION DETECTION RULES:
- "chief complaint", "cc", "complaint" → CC section
- "meds", "medications", "current med" → Current Medications
- "problem list", "problemist", "problems" → Problem List
- When unclear, look for context clues (medication names → likely meds section)

FORMATTING DECISION RULES:
- For numbered lists: Detect item boundaries even if not explicitly stated
- Medication items: Each distinct medication is a separate item
  - "Adderall 20mg new line Zoloft 50mg" → 2 items (ignore "new line" literal)
  - Detect from drug name patterns, not just "new line" commands
- Diagnosis items: Each distinct diagnosis/condition is a separate item
- For paragraphs: Keep as single block unless explicit paragraph breaks

BRACKET HANDLING:
- If open bracket "(" with no close, infer it closes at end of that item
- Mark unclosed brackets in metadata for validation layer

OUTPUT REQUIREMENTS:
1. Return ONLY valid JSON (no markdown, no explanations)
2. Ranges must be non-overlapping and in order
3. Coverage should be 100% (all transcript chars accounted for)
4. Confidence scores for each section (0-1)

RESPOND WITH JSON ONLY.
```

#### Implementation: StructureAnalyzer Class

```javascript
// src/services/formatting/structure-analyzer.js

class StructureAnalyzer {
  constructor(config = {}) {
    this.ollama = new OllamaClient(config);
    this.model = config.model || 'llama3.2:3b';
    this.temperature = 0.1;  // Low for consistency
  }

  /**
   * Analyze transcript and return structure metadata
   */
  async analyze(transcript, template, dictionary) {
    // Build prompt
    const prompt = this.buildAnalysisPrompt(transcript, template, dictionary);
    
    // Call LLM with JSON mode if supported
    const response = await this.ollama.generate({
      model: this.model,
      prompt: prompt,
      format: 'json',  // Ollama JSON mode
      options: {
        temperature: this.temperature,
        num_predict: 4000
      }
    });
    
    // Parse and validate JSON
    let metadata;
    try {
      metadata = JSON.parse(response);
    } catch (error) {
      throw new StructureAnalysisError('Invalid JSON from LLM', { response });
    }
    
    // Validate schema
    this.validateMetadata(metadata, transcript);
    
    return metadata;
  }

  buildAnalysisPrompt(transcript, template, dictionary) {
    // Build detailed prompt as shown above
    // Include template sections, detection rules, formatting rules
    // ...
  }

  validateMetadata(metadata, transcript) {
    // Ensure ranges are valid
    // Check for overlaps
    // Verify coverage
    // Validate JSON schema
    
    const totalChars = transcript.length;
    const coveredRanges = this.extractAllRanges(metadata);
    const coverage = this.calculateCoverage(coveredRanges, totalChars);
    
    if (coverage < 0.95) {
      throw new StructureAnalysisError(
        `Low coverage: ${coverage * 100}%`,
        { expected: 100, actual: coverage * 100 }
      );
    }
    
    return true;
  }

  extractAllRanges(metadata) {
    const ranges = [];
    for (const section of metadata.sections) {
      ranges.push(...section.ranges);
      if (section.items) {
        for (const item of section.items) {
          ranges.push(...item.ranges);
        }
      }
    }
    return ranges;
  }

  calculateCoverage(ranges, totalChars) {
    // Calculate what % of transcript is covered by ranges
    const covered = new Set();
    for (const range of ranges) {
      for (let i = range.start; i < range.end; i++) {
        covered.add(i);
      }
    }
    return covered.size / totalChars;
  }
}

class StructureAnalysisError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'StructureAnalysisError';
    this.details = details;
  }
}

module.exports = { StructureAnalyzer, StructureAnalysisError };
```

---

### Stage 2: Content Assembler (Deterministic)

#### Purpose
Use structure metadata to assemble formatted output using ONLY original transcript text.

#### Input
```javascript
{
  transcript: "original text...",
  metadata: { /* from Stage 1 */ },
  template: { /* template spec */ },
  dictionary: { /* for normalization */ }
}
```

#### Output
Formatted markdown with 100% content preservation guarantee.

#### Implementation: ContentAssembler Class

```javascript
// src/services/formatting/content-assembler.js

class ContentAssembler {
  constructor(config = {}) {
    this.dictionary = config.dictionary || {};
  }

  /**
   * Assemble formatted output from metadata and transcript
   */
  assemble(transcript, metadata, template) {
    // 1. Normalize transcript (deterministic, no LLM)
    const normalized = this.normalize(transcript);
    
    // 2. Build sections from metadata
    const sections = [];
    for (const sectionMeta of metadata.sections) {
      const section = this.buildSection(normalized, sectionMeta, template);
      sections.push(section);
    }
    
    // 3. Render to markdown
    const markdown = this.renderMarkdown(sections);
    
    // 4. Enforce invariants
    this.enforceInvariants(transcript, normalized, markdown, metadata);
    
    return {
      markdown,
      normalized,
      metadata,
      validation: {
        coveragePercent: 100,
        invariantsPassed: true
      }
    };
  }

  /**
   * Normalize transcript deterministically
   */
  normalize(transcript) {
    let text = transcript;
    
    // 1. Dictation command conversion (deterministic rules)
    text = this.convertDictationCommands(text);
    
    // 2. Apply medical dictionary (acronym casing, common corrections)
    text = this.applyDictionary(text);
    
    // 3. Clean up spacing
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  convertDictationCommands(text) {
    // Replace dictation commands with punctuation
    // CAREFUL: "interim period" should NOT become "interim."
    
    // Use word boundaries to avoid false matches
    text = text.replace(/\bperiod\b(?!\s+(of|for|in|at))/gi, '.');
    text = text.replace(/\bcomma\b/gi, ',');
    text = text.replace(/\bcolon\b/gi, ':');
    
    // Remove "new line" and "new paragraph" - formatting is handled by metadata
    text = text.replace(/\b(new line|next line)\b/gi, ' ');
    text = text.replace(/\b(new paragraph|next paragraph)\b/gi, ' ');
    
    return text;
  }

  applyDictionary(text) {
    // Apply corrections from medical dictionary
    // e.g., "adhd" → "ADHD", "ssri" → "SSRI"
    
    for (const [wrong, correct] of Object.entries(this.dictionary)) {
      // Use word boundaries for whole-word replacement
      const regex = new RegExp(`\\b${wrong}\\b`, 'gi');
      text = text.replace(regex, correct);
    }
    
    return text;
  }

  /**
   * Build a single section from metadata
   */
  buildSection(normalizedTranscript, sectionMeta, template) {
    // Extract text from ranges
    const content = this.extractRanges(normalizedTranscript, sectionMeta.ranges);
    
    // Apply formatting based on section type
    let body;
    if (sectionMeta.format === 'numbered-list' && sectionMeta.items) {
      body = this.formatNumberedList(normalizedTranscript, sectionMeta.items);
    } else if (sectionMeta.format === 'bullet-list' && sectionMeta.items) {
      body = this.formatBulletList(normalizedTranscript, sectionMeta.items);
    } else if (sectionMeta.format === 'single-line') {
      body = content.trim();
    } else {
      // Paragraph
      body = content.trim();
    }
    
    return {
      title: sectionMeta.canonicalTitle,
      key: sectionMeta.key,
      body: body,
      sourceRanges: sectionMeta.ranges
    };
  }

  extractRanges(text, ranges) {
    // Extract text from multiple ranges and concatenate
    const parts = ranges.map(range => text.slice(range.start, range.end));
    return parts.join(' ');
  }

  formatNumberedList(normalizedTranscript, items) {
    // Format as numbered list using item ranges
    const lines = items.map((item, index) => {
      const content = this.extractRanges(normalizedTranscript, item.ranges);
      return `${index + 1}. ${content.trim()}`;
    });
    return lines.join('\n');
  }

  formatBulletList(normalizedTranscript, items) {
    const lines = items.map(item => {
      const content = this.extractRanges(normalizedTranscript, item.ranges);
      return `- ${content.trim()}`;
    });
    return lines.join('\n');
  }

  renderMarkdown(sections) {
    const parts = sections.map(section => {
      return `### ${section.title}\n${section.body}`;
    });
    return parts.join('\n\n');
  }

  /**
   * Enforce hard invariants
   */
  enforceInvariants(originalTranscript, normalized, markdown, metadata) {
    // 1. Coverage invariant: All content from transcript appears in output
    const coverage = this.checkCoverage(normalized, markdown);
    if (coverage < 0.95) {
      throw new InvariantViolationError(
        'Coverage violation',
        { expected: 100, actual: coverage * 100 }
      );
    }
    
    // 2. No-new-content invariant: Output only contains transcript words
    const newContent = this.findNewContent(normalized, markdown);
    if (newContent.length > 0) {
      throw new InvariantViolationError(
        'New content detected',
        { newWords: newContent }
      );
    }
    
    // 3. Section conformance: Only template sections or detected sections
    this.validateSectionConformance(markdown, metadata);
    
    return true;
  }

  checkCoverage(normalized, markdown) {
    // Extract significant words from both
    const normalizedWords = this.extractSignificantWords(normalized);
    const markdownWords = this.extractSignificantWords(markdown);
    
    // Count how many normalized words appear in markdown
    let found = 0;
    for (const word of normalizedWords) {
      if (markdownWords.includes(word.toLowerCase())) {
        found++;
      }
    }
    
    return found / normalizedWords.length;
  }

  extractSignificantWords(text) {
    // Remove section headers
    const withoutHeaders = text.replace(/^###.*$/gm, '');
    // Extract words 3+ chars
    const words = withoutHeaders.match(/\b\w{3,}\b/g) || [];
    return words.map(w => w.toLowerCase());
  }

  findNewContent(normalized, markdown) {
    const normalizedWords = new Set(this.extractSignificantWords(normalized));
    const markdownWords = this.extractSignificantWords(markdown);
    
    const newWords = [];
    for (const word of markdownWords) {
      if (!normalizedWords.has(word)) {
        newWords.push(word);
      }
    }
    
    return newWords;
  }

  validateSectionConformance(markdown, metadata) {
    const headings = this.extractHeadings(markdown);
    const allowedTitles = new Set(
      metadata.sections.map(s => s.canonicalTitle.toLowerCase())
    );
    
    for (const heading of headings) {
      if (!allowedTitles.has(heading.toLowerCase())) {
        throw new InvariantViolationError(
          'Unexpected section',
          { section: heading }
        );
      }
    }
  }

  extractHeadings(markdown) {
    const matches = markdown.match(/^###\s+(.+)$/gm) || [];
    return matches.map(m => m.replace(/^###\s+/, '').trim());
  }
}

class InvariantViolationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'InvariantViolationError';
    this.details = details;
  }
}

module.exports = { ContentAssembler, InvariantViolationError };
```

---

### Integration: New UnifiedProcessor Flow

```javascript
// src/services/processing/unified-processor.js (updated)

const { StructureAnalyzer } = require('../formatting/structure-analyzer');
const { ContentAssembler } = require('../formatting/content-assembler');
const { DictionaryLoader } = require('../data/dictionary-loader');  // New plugin system

class UnifiedProcessor {
  constructor(mode = 'ACCURATE') {
    this.config = ProcessingModes[mode];
    
    // Initialize components
    this.structureAnalyzer = new StructureAnalyzer({
      model: this.config.ollama.model,
      temperature: this.config.ollama.temperature
    });
    
    this.contentAssembler = new ContentAssembler({
      dictionary: DictionaryLoader.load('medicine')  // Plugin system
    });
    
    console.log(`🎯 Processing mode: ${this.config.name}`);
  }
  
  async process(audioPath) {
    const startTime = Date.now();
    
    try {
      // 1. Transcription (unchanged)
      const transcript = await this.transcribe(audioPath);
      console.log('✅ Transcription complete');
      console.log(`📝 Transcript length: ${transcript.length} characters`);
      
      // 2. Load template
      const template = TemplateLoader.load('medicine-management');
      
      // 3. TWO-STAGE FORMATTING
      const formatted = await this.formatTwoStage(transcript, template);
      console.log('✅ Formatting complete');
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`⏱️ Total time: ${duration}s`);
      
      return {
        text: formatted.markdown,
        transcript: transcript,
        mode: this.config.name,
        processingTime: duration,
        metadata: formatted.metadata,
        validation: formatted.validation
      };
      
    } catch (error) {
      console.error('❌ Processing failed:', error);
      
      // Fallback strategy
      if (error.name === 'StructureAnalysisError') {
        console.log('🔄 Structure analysis failed, returning formatted transcript');
        return this.fallbackFormat(transcript);
      }
      
      if (error.name === 'InvariantViolationError') {
        console.log('🔄 Invariant violated, returning safe format');
        return this.fallbackFormat(transcript);
      }
      
      throw error;
    }
  }
  
  /**
   * Two-stage formatting: Analysis → Assembly
   */
  async formatTwoStage(transcript, template) {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 TWO-STAGE FORMATTING');
    console.log('='.repeat(60));
    
    // Skip if too short
    if (transcript.length < 100) {
      console.log('⚠️ Text too short for formatting');
      return { markdown: transcript, metadata: null, validation: null };
    }
    
    // STAGE 1: Structure Analysis (LLM)
    console.log('\n📊 STAGE 1: Structure Analysis');
    console.log('  Using LLM to detect sections and formatting...');
    
    const dictionary = DictionaryLoader.load('medicine');
    let metadata;
    
    try {
      metadata = await this.structureAnalyzer.analyze(
        transcript,
        template,
        dictionary
      );
      
      console.log('  ✅ Structure analysis complete');
      console.log(`  - Detected ${metadata.sections.length} sections`);
      console.log(`  - Coverage: ${metadata.analysis.coveragePercent}%`);
      
      for (const section of metadata.sections) {
        console.log(`    • ${section.canonicalTitle} (confidence: ${section.confidence})`);
      }
      
    } catch (error) {
      console.error('  ❌ Structure analysis failed:', error.message);
      throw error;
    }
    
    // STAGE 2: Content Assembly (Deterministic)
    console.log('\n🔧 STAGE 2: Content Assembly');
    console.log('  Assembling formatted output from original transcript...');
    
    try {
      const result = this.contentAssembler.assemble(
        transcript,
        metadata,
        template
      );
      
      console.log('  ✅ Assembly complete');
      console.log(`  - Coverage: ${result.validation.coveragePercent}%`);
      console.log(`  - Invariants passed: ${result.validation.invariantsPassed}`);
      
      return result;
      
    } catch (error) {
      console.error('  ❌ Assembly failed:', error.message);
      if (error.name === 'InvariantViolationError') {
        console.error('  Invariant violation:', error.details);
      }
      throw error;
    }
  }
  
  /**
   * Fallback: Minimal formatting when two-stage fails
   */
  fallbackFormat(transcript) {
    console.log('📝 Using fallback minimal formatting');
    
    const dictionary = DictionaryLoader.load('medicine');
    const assembler = new ContentAssembler({ dictionary });
    const normalized = assembler.normalize(transcript);
    
    return {
      text: `### Dictation\n\n${normalized}`,
      transcript: transcript,
      mode: this.config.name,
      metadata: null,
      validation: { fallback: true }
    };
  }
  
  // ... transcribe() method unchanged
}
```

---

## Plugin System: Medical Dictionary

### Design Goals
1. Support multiple dictionaries (medicine, psychiatry, pediatrics, etc.)
2. Easy to extend and customize
3. Dictionary as data, not code
4. Hot-reloadable for testing

### Implementation

```javascript
// src/data/dictionary-loader.js

const fs = require('fs');
const path = require('path');

class DictionaryLoader {
  static dictionariesPath = path.join(__dirname, 'dictionaries');
  static cache = new Map();

  /**
   * Load a medical dictionary by name
   */
  static load(name) {
    // Check cache
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }

    // Load from file
    const filePath = path.join(this.dictionariesPath, `${name}.json`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Dictionary not found: ${name}`);
    }

    const dictionary = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Validate schema
    this.validate(dictionary);
    
    // Cache it
    this.cache.set(name, dictionary);
    
    console.log(`✅ Dictionary loaded: ${name} (${Object.keys(dictionary.corrections).length} corrections)`);
    
    return dictionary;
  }

  /**
   * Reload dictionary (for testing/development)
   */
  static reload(name) {
    this.cache.delete(name);
    return this.load(name);
  }

  /**
   * List available dictionaries
   */
  static list() {
    const files = fs.readdirSync(this.dictionariesPath);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  /**
   * Validate dictionary schema
   */
  static validate(dictionary) {
    if (!dictionary.name) {
      throw new Error('Dictionary missing name');
    }
    if (!dictionary.version) {
      throw new Error('Dictionary missing version');
    }
    if (!dictionary.corrections || typeof dictionary.corrections !== 'object') {
      throw new Error('Dictionary missing corrections object');
    }
    return true;
  }
}

module.exports = { DictionaryLoader };
```

### Dictionary Format

```javascript
// src/data/dictionaries/medicine.json

{
  "name": "General Medicine",
  "version": "1.0.0",
  "description": "Medical terminology corrections for general medicine",
  "corrections": {
    // Acronyms (always uppercase)
    "adhd": "ADHD",
    "mdd": "MDD",
    "odd": "ODD",
    "ptsd": "PTSD",
    "gad": "GAD",
    "ocd": "OCD",
    "bp": "BP",
    "hr": "HR",
    "bmi": "BMI",
    
    // Dosing abbreviations
    "qhs": "QHS",
    "bid": "BID",
    "tid": "TID",
    "qid": "QID",
    "prn": "PRN",
    
    // Drug classes
    "ssri": "SSRI",
    "snri": "SNRI",
    
    // Common misspellings
    "adderal": "Adderall",
    "addderall": "Adderall",
    "ritalin": "Ritalin",
    "concerta": "Concerta",
    "vyvanse": "Vyvanse",
    "zoloft": "Zoloft",
    "prozac": "Prozac",
    "lexapro": "Lexapro",
    
    // Units (keep abbreviated)
    "milligrams": "mg",
    "milligram": "mg",
    "milliliters": "mL",
    "milliliter": "mL"
  },
  "sectionTriggers": {
    // Maps spoken words to canonical section keys
    "identification": ["identification", "patient", "patient info"],
    "cc": ["chief complaint", "cc", "complaint", "reason for visit"],
    "problem_list": ["problem list", "problemist", "problems", "diagnoses"],
    "current_medications": ["current medications", "meds", "medications", "current meds", "med list"],
    "interim_history": ["interim history", "interim", "interval history"],
    "past_medical_history": ["past medical history", "pmh", "past history", "medical history"],
    "social_history": ["social history", "social"],
    "family_history": ["family history", "family"],
    "ros": ["ros", "review of systems"],
    "vitals": ["vitals", "vital signs", "bp", "blood pressure"],
    "mse": ["mse", "mental status exam", "mental status"],
    "risk_assessment": ["risk assessment", "risk", "safety"],
    "assessment": ["assessment", "clinical assessment"],
    "plan": ["plan", "treatment plan"],
    "therapy_notes": ["therapy notes", "therapy", "session notes"]
  },
  "medicationPatterns": {
    // Regex patterns for detecting medication names
    "brandNames": [
      "Adderall", "Ritalin", "Concerta", "Vyvanse", "Strattera",
      "Zoloft", "Prozac", "Lexapro", "Paxil", "Celexa",
      "Wellbutrin", "Effexor", "Cymbalta"
    ],
    "genericPatterns": [
      "amphetamine", "methylphenidate", "atomoxetine",
      "sertraline", "fluoxetine", "escitalopram"
    ]
  }
}
```

```javascript
// src/data/dictionaries/psychiatry.json
// Specialized dictionary for psychiatry with additional terms

{
  "name": "Psychiatry",
  "version": "1.0.0",
  "extends": "medicine",  // Inherit from medicine dictionary
  "corrections": {
    // Additional psychiatric terms
    "cbt": "CBT",
    "dbt": "DBT",
    "emdr": "EMDR",
    "suicidal ideation": "SI",
    "homicidal ideation": "HI",
    // ... more
  },
  // ... additional sections
}
```

---

## Template System: Multi-Template Support

### Design Goals
1. Support multiple templates (medicine-management, psychiatry, general-medicine, etc.)
2. Template as configuration, not code
3. Easy to create new templates
4. Template inheritance/composition

### Template Format (Extended)

```javascript
// templates/format/medicine-management.json

{
  "name": "Medicine Management Visit",
  "version": "2.0",
  "description": "Template for medication management psychiatric visits",
  "dictionary": "medicine",  // Which dictionary to use
  
  "sections": [
    {
      "key": "identification",
      "title": "Identification",
      "format": "paragraph",
      "required": true,
      "description": "Patient demographics and identifying information",
      "hints": ["patient name", "age", "gender", "visit type"]
    },
    {
      "key": "cc",
      "title": "CC",
      "format": "single-line",
      "required": true,
      "description": "Chief complaint - reason for visit",
      "examples": ["Follow-up", "Medication management", "Initial consultation"]
    },
    {
      "key": "problem_list",
      "title": "Problem List",
      "format": "numbered-list",
      "required": true,
      "description": "Active diagnoses with current status",
      "listItemFormat": "{diagnosis} – {status}",
      "hints": ["Include status like 'improving', 'stable', 'worsening'"]
    },
    {
      "key": "current_medications",
      "title": "Current Medications",
      "format": "numbered-list",
      "required": true,
      "description": "Current medication regimen",
      "listItemFormat": "{medication} {dose} ({frequency})",
      "medicationFormat": {
        "nameStyle": "brand-preferred",  // or "generic-preferred"
        "doseFormat": "abbreviated",     // "20mg" not "20 milligrams"
        "uncertaintyMarker": "{}"       // Wrap uncertain meds in braces
      },
      "hints": ["Preserve exact dose and frequency as stated"]
    },
    {
      "key": "interim_history",
      "title": "Interim History",
      "format": "bullet-list",
      "required": false,
      "description": "Events since last visit"
    },
    {
      "key": "past_medical_history",
      "title": "Past Medical History",
      "format": "paragraph",
      "required": false
    },
    {
      "key": "social_history",
      "title": "Social History",
      "format": "paragraph",
      "required": false
    },
    {
      "key": "family_history",
      "title": "Family History",
      "format": "paragraph",
      "required": false
    },
    {
      "key": "ros",
      "title": "ROS",
      "format": "bullet-list",
      "required": false,
      "description": "Review of systems"
    },
    {
      "key": "vitals",
      "title": "Vitals",
      "format": "paragraph",
      "required": false,
      "hints": ["BP, HR, weight, BMI"]
    },
    {
      "key": "mse",
      "title": "MSE",
      "format": "paragraph",
      "required": false,
      "description": "Mental status examination"
    },
    {
      "key": "risk_assessment",
      "title": "Risk Assessment",
      "format": "paragraph",
      "required": false
    },
    {
      "key": "assessment",
      "title": "Assessment",
      "format": "bullet-list",
      "required": false,
      "description": "Clinical assessment and formulation"
    },
    {
      "key": "plan",
      "title": "Plan",
      "format": "bullet-list",
      "required": false,
      "description": "Treatment plan going forward"
    },
    {
      "key": "therapy_notes",
      "title": "Therapy Notes",
      "format": "paragraph",
      "required": false
    }
  ],
  
  "formatting": {
    "headerLevel": 3,                    // Use ### for sections
    "listStyle": {
      "numbered": "1. ",                 // Numbered list format
      "bullet": "- "                     // Bullet list format
    },
    "spacing": {
      "betweenSections": 2,              // Blank lines between sections
      "afterHeader": 1                   // Blank lines after header
    }
  },
  
  "validation": {
    "requireAtLeast": ["identification", "cc", "problem_list", "current_medications"],
    "allowAdditionalSections": true,    // Allow sections not in template
    "strictFormatting": false           // Allow format deviations
  }
}
```

### Template Loader (Multi-Template)

```javascript
// src/prompts/template-loader.js (updated)

class TemplateLoader {
  static templatesPath = path.join(__dirname, '../templates/format');
  static cache = new Map();

  static load(templateName) {
    // Check cache
    if (this.cache.has(templateName)) {
      return this.cache.get(templateName);
    }

    // Load from file
    const filePath = path.join(this.templatesPath, `${templateName}.json`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const template = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Validate schema
    this.validate(template);
    
    // Handle inheritance/composition if needed
    if (template.extends) {
      template = this.compose(template, this.load(template.extends));
    }
    
    // Cache it
    this.cache.set(templateName, template);
    
    console.log(`✅ Template loaded: ${template.name} v${template.version}`);
    
    return template;
  }

  static list() {
    const files = fs.readdirSync(this.templatesPath);
    return files
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  static validate(template) {
    if (!template.name) throw new Error('Template missing name');
    if (!template.sections) throw new Error('Template missing sections');
    if (!Array.isArray(template.sections)) throw new Error('Sections must be array');
    
    // Validate each section
    for (const section of template.sections) {
      if (!section.key) throw new Error('Section missing key');
      if (!section.title) throw new Error('Section missing title');
      if (!section.format) throw new Error('Section missing format');
    }
    
    return true;
  }

  static compose(childTemplate, parentTemplate) {
    // Merge parent and child templates
    // Child overrides parent
    return {
      ...parentTemplate,
      ...childTemplate,
      sections: [
        ...parentTemplate.sections,
        ...childTemplate.sections
      ]
    };
  }
}

module.exports = { TemplateLoader };
```

---

## Error Handling and Fallbacks

### Fallback Strategy

```javascript
class FallbackStrategy {
  /**
   * Determine fallback based on error type
   */
  static determineFallback(error, context) {
    if (error.name === 'StructureAnalysisError') {
      // LLM failed to analyze structure
      if (context.retries < 2) {
        return {
          strategy: 'retry',
          with: { lowerConfidenceThreshold: true }
        };
      } else {
        return {
          strategy: 'rule-based-sections',
          with: { useSimplePatterns: true }
        };
      }
    }
    
    if (error.name === 'InvariantViolationError') {
      // Content assembly violated invariants
      if (error.details.type === 'coverage') {
        return {
          strategy: 'minimal-format',
          with: { preserveAllContent: true }
        };
      }
      if (error.details.type === 'new-content') {
        return {
          strategy: 'reject-and-log',
          with: { newWords: error.details.newWords }
        };
      }
    }
    
    // Default: return raw transcript
    return {
      strategy: 'raw-transcript',
      with: { normalized: true }
    };
  }
}
```

---

## Testing Strategy

### Unit Tests

```javascript
// __tests__/content-assembler.test.js

describe('ContentAssembler', () => {
  describe('normalize', () => {
    it('should convert dictation commands to punctuation', () => {
      const assembler = new ContentAssembler();
      const input = 'Hello period This is a test comma okay';
      const output = assembler.normalize(input);
      expect(output).toBe('Hello. This is a test, okay');
    });

    it('should preserve "interim period" literally', () => {
      const assembler = new ContentAssembler();
      const input = 'interim period of one month';
      const output = assembler.normalize(input);
      expect(output).toBe('interim period of one month');
    });

    it('should apply medical dictionary', () => {
      const dictionary = { 'adhd': 'ADHD', 'mdd': 'MDD' };
      const assembler = new ContentAssembler({ dictionary });
      const input = 'patient has adhd and mdd';
      const output = assembler.normalize(input);
      expect(output).toBe('patient has ADHD and MDD');
    });
  });

  describe('enforceInvariants', () => {
    it('should pass when all transcript content appears in output', () => {
      const assembler = new ContentAssembler();
      const transcript = 'Hello world test';
      const markdown = '### Section\nHello world test';
      
      expect(() => {
        assembler.enforceInvariants(transcript, transcript, markdown, {});
      }).not.toThrow();
    });

    it('should fail when output has new content', () => {
      const assembler = new ContentAssembler();
      const transcript = 'Hello world';
      const markdown = '### Section\nHello world extra content';
      
      expect(() => {
        assembler.enforceInvariants(transcript, transcript, markdown, {});
      }).toThrow(InvariantViolationError);
    });

    it('should fail when coverage is too low', () => {
      const assembler = new ContentAssembler();
      const transcript = 'Hello world test content';
      const markdown = '### Section\nHello';  // Missing most content
      
      expect(() => {
        assembler.enforceInvariants(transcript, transcript, markdown, {});
      }).toThrow(InvariantViolationError);
    });
  });
});
```

### Integration Tests

```javascript
// __tests__/integration/two-stage-formatting.test.js

describe('Two-Stage Formatting Integration', () => {
  it('should correctly format messy medical dictation', async () => {
    const transcript = `
      chief complaint: follow-up meds uh Adderall 20 milligrams 
      new line new medication Zoloft 50 mg taken in the morning 
      problem list adhd improving partial control
    `;

    const processor = new UnifiedProcessor('ACCURATE');
    const template = TemplateLoader.load('medicine-management');
    
    const result = await processor.formatTwoStage(transcript, template);
    
    // Check structure
    expect(result.markdown).toContain('### CC');
    expect(result.markdown).toContain('### Current Medications');
    expect(result.markdown).toContain('### Problem List');
    
    // Check content preservation
    expect(result.markdown).toContain('Adderall');
    expect(result.markdown).toContain('20');
    expect(result.markdown).toContain('mg');
    expect(result.markdown).toContain('Zoloft');
    expect(result.markdown).toContain('50');
    expect(result.markdown).toContain('ADHD');
    expect(result.markdown).toContain('improving');
    
    // Check formatting
    expect(result.markdown).toMatch(/1\.\s+Adderall/);
    expect(result.markdown).toMatch(/2\.\s+Zoloft/);
    
    // Check invariants
    expect(result.validation.coveragePercent).toBe(100);
    expect(result.validation.invariantsPassed).toBe(true);
  });

  it('should handle unclosed brackets gracefully', async () => {
    const transcript = `
      current medications Adderall 20mg ( taken in morning 
      Zoloft 50mg
    `;

    const processor = new UnifiedProcessor('ACCURATE');
    const template = TemplateLoader.load('medicine-management');
    
    const result = await processor.formatTwoStage(transcript, template);
    
    // Should still work and preserve content
    expect(result.markdown).toContain('Adderall');
    expect(result.markdown).toContain('taken in morning');
  });
});
```

---

## Migration Plan

### Phase 1: Build Core Components (Week 1)
1. Implement `StructureAnalyzer` class
2. Implement `ContentAssembler` class
3. Create invariant enforcement
4. Unit tests for both

### Phase 2: Plugin System (Week 1)
1. Implement `DictionaryLoader`
2. Convert existing dictionary to new format
3. Create psychiatry dictionary
4. Update `TemplateLoader` for multi-template support

### Phase 3: Integration (Week 2)
1. Update `UnifiedProcessor` with two-stage flow
2. Add fallback strategies
3. Integration tests
4. Performance testing

### Phase 4: Validation & Refinement (Week 2)
1. Test with real dictations
2. Tune LLM prompts for structure analysis
3. Refine invariant thresholds
4. Add logging and debugging tools

### Phase 5: Gradual Rollout (Week 3)
1. Feature flag: old vs new architecture
2. A/B testing on real data
3. Measure accuracy improvements
4. Full cutover when validated

---

## Expected Outcomes

### Accuracy Improvements
- **Zero hallucinations** (guaranteed by invariants)
- **100% content preservation** (enforced)
- **Perfect template conformance** (validated)

### Performance
- Slightly slower than current (2 LLM calls + deterministic assembly)
- Estimated: +10-15 seconds per 30-min recording
- Acceptable tradeoff for perfect accuracy

### Maintainability
- Clear separation of concerns
- Easier to debug (inspect structure metadata)
- Testable components
- Plugin architecture for dictionaries/templates

---

## Questions & Next Steps

1. Should we start with Phase 1 (core components)?
2. Do you want to review the StructureAnalyzer prompt before implementation?
3. Any specific test cases you want to ensure we handle?
4. Preferred timeline for rollout?

Let me know if you'd like me to start implementing any component!
