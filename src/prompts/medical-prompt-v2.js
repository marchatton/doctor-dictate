/**
 * Medical Prompt V2 - Centralized prompt management for medical transcription
 * Version 2.0 - Few-shot learning with comprehensive examples
 */

class MedicalPromptV2 {
    static VERSION = "2.0";
    
    // Test-case derived examples for few-shot learning
    static EXAMPLES = [
        {
            id: 'complex_full',
            input: "Identification comma John Smith is a 14 year old male with a history of ACHD and major depressive disorder period He's in the seventh grade period Chief complaint follow up period Next paragraph Problem list colon ACHD period Improving comma partial control period Two comma major depressive disorder comma stable period Current medications comma Lexapro 20 mg comma one pill per day comma jurn APM comma 60 milli comma qhs period",
            output: `# Identification
John Smith is a 14 year old male with a history of ADHD and major depressive disorder. He's in the seventh grade.

**CC:** Follow-up

## Problem List
1. ADHD: Improving, partial control
2. Major depressive disorder: stable

## Current Medications
1. Lexapro 20mg (daily)
2. {unclear: Journay PM?} 60mg (QHS)`
        },
        {
            id: 'punctuation_quotes',
            input: "Patient reports quote I feel better unquote comma mood quote okay unquote period Assessment colon stable period Plan dash Continue meds semicolon follow up colon 4 weeks period",
            output: `Patient reports "I feel better", mood "okay".

## Assessment
Stable.

## Plan
- Continue meds; follow up: 4 weeks.`
        },
        {
            id: 'fillers_corrections',
            input: "So um the patient is like really improving you know period Diagnosed with ACHD comma MDD comma and GAD period Meds include uh sertraline 50mg qhs for sleep",
            output: `The patient is really improving. Diagnosed with ADHD, MDD, and GAD.

## Current Medications
1. Sertraline 50mg QHS for sleep`
        },
        {
            id: 'numbered_lists',
            input: "Problem list one depression stable two anxiety improving three ACHD partial control",
            output: `## Problem List
1. Depression: stable
2. Anxiety: improving
3. ADHD: partial control`
        }
    ];
    
    // Punctuation rules mapping
    static PUNCTUATION_RULES = {
        "period": ".",
        "comma": ",",
        "colon": ":",
        "semicolon": ";",
        "dash": "-",
        "hyphen": "-",
        "slash": "/",
        "backslash": "/",
        "quote": '"',
        "open quote": '"',
        "unquote": '"',
        "close quote": '"',
        "open paren": "(",
        "close paren": ")",
        "exclamation": "!",
        "new line": "\\n",
        "new paragraph": "\\n\\n",
        "next paragraph": "\\n\\n"
    };
    
    // Medical corrections mapping
    static MEDICAL_CORRECTIONS = {
        'ACHD': 'ADHD',
        'jurn APM': '{unclear: Journay PM?}',
        'jour APM': '{unclear: Journay PM?}',
        'drawn APM': '{unclear: Journay PM?}',
        'journey PM': '{unclear: Journay PM?}',
        'qhs': 'QHS',
        'bid': 'BID', 
        'tid': 'TID',
        'prn': 'PRN',
        'qd': 'daily',
        'q.d.': 'daily',
        'b.i.d.': 'BID',
        't.i.d.': 'TID',
        'p.r.n.': 'PRN'
    };
    
    // Common fillers to remove
    static FILLERS = [
        'uh', 'um', 'uhm', 'umm', 'er', 'ah',
        'you know', 'basically', 'actually', 
        'sort of', 'kind of', 'I mean'
    ];
    
    // Base prompt template
    static BASE_TEMPLATE = `You are a medical transcription formatter. Your ONLY job is to convert dictated text into clean formatted notes.

STRICT RULES - FOLLOW EXACTLY:

1. PUNCTUATION COMMANDS (convert these words to symbols):
{punctuation_rules}

2. FILLER REMOVAL (delete these ONLY when they're fillers):
   - Remove: "uh", "um", "uhm", "yeah", "so" (when filler)
   - Remove: "you know", "like" (EXCEPT in clinical context like "feels like crying")
   - Keep: meaningful uses of these words

3. MEDICAL CORRECTIONS:
{medical_corrections}
   - Flag unusual dosages: Sertraline 1mg → Sertraline 1mg {!dosage: typical 25-200mg}

4. SECTION HEADERS (detect and format):
   - "identification" → # Identification
   - "chief complaint" or "CC" → **CC:**
   - "problem list" → ## Problem List (then number items)
   - "current medications" or "meds" → ## Current Medications (then number items)
   - "assessment" → ## Assessment
   - "plan" → ## Plan

5. NUMBERED LISTS:
   - Convert verbal numbers ("one", "two") to digits (1., 2.)
   - Format medications as: "1. DrugName Dosage (Frequency)"
   - Format problems as: "1. Condition: status"

6. UNCLEAR CONTENT:
   - Mark unclear medications: {unclear: best_guess?}
   - Keep original if completely unintelligible

EXAMPLES SHOWING EXACT FORMATTING:

{examples}

NOW PROCESS THIS TRANSCRIPT:
{input_text}

OUTPUT (follow the examples EXACTLY):`;
    
    static formatPunctuationRules() {
        return Object.entries(this.PUNCTUATION_RULES)
            .map(([key, value]) => `   - "${key}" → ${value}`)
            .join('\n');
    }
    
    static formatMedicalCorrections() {
        return Object.entries(this.MEDICAL_CORRECTIONS)
            .map(([key, value]) => `   - ${key} → ${value}`)
            .join('\n');
    }
    
    static formatExamples() {
        return this.EXAMPLES
            .map((ex, i) => `Example ${i + 1}:\nInput: ${ex.input}\nOutput:\n${ex.output}`)
            .join('\n\n');
    }
    
    static build(text) {
        return this.BASE_TEMPLATE
            .replace('{punctuation_rules}', this.formatPunctuationRules())
            .replace('{medical_corrections}', this.formatMedicalCorrections())
            .replace('{examples}', this.formatExamples())
            .replace('{input_text}', text);
    }
    
    static getMetadata() {
        return {
            version: this.VERSION,
            numExamples: this.EXAMPLES.length,
            numPunctuationRules: Object.keys(this.PUNCTUATION_RULES).length,
            numMedicalCorrections: Object.keys(this.MEDICAL_CORRECTIONS).length
        };
    }
}

module.exports = { MedicalPromptV2 };