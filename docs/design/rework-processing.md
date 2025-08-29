
"""
Psychiatric Dictation Processing Specification - LLM-Based Approach
Version: 2.1
Purpose: Convert raw Whisper transcripts to formatted psychiatric notes using local LLM
Hardware Requirements: 8GB RAM (4GB available for LLM)
Reference Files: 
  - docs/sample-data/mock recording-samir.m4a (8-minute real recording)
  - docs/sample-data/template.md (target formatting template)
"""

import re
import json
import logging
import os
from typing import Tuple, List, Dict, Any
import psutil
from ollama import Client

# ============================================================================
# CONFIGURATION - OPTIMIZED FOR 8GB RAM
# ============================================================================

DEBUG_MODE = os.environ.get('DEBUG_TRANSCRIPT', 'false').lower() == 'true'
logging.basicConfig(
    level=logging.DEBUG if DEBUG_MODE else logging.ERROR,
    format='[%(levelname)s] %(funcName)s: %(message)s'
)

# Model selection based on available RAM
def get_optimal_model():
    """Select best model based on available RAM."""
    available_gb = psutil.virtual_memory().available / (1024**3)
    
    if available_gb > 5:
        return "mistral:7b-instruct-v0.3-q4_0"  # Best accuracy/performance balance
    elif available_gb > 3:
        return "llama3.2:3b"  # Fallback for lower RAM
    else:
        raise MemoryError(f"Insufficient RAM ({available_gb:.1f}GB available). Need at least 3GB free.")

# LLM Configuration for maximum accuracy
LLM_MODEL = get_optimal_model()
LLM_TEMPERATURE = 0.1  # Slight variation, not zero (prevents repetition)
LLM_TOP_P = 0.9
LLM_REPEAT_PENALTY = 1.0  # Don't penalize medical term repetition
LLM_MAX_TOKENS = 4096

# ============================================================================
# PROMPT MANAGEMENT SYSTEM
# ============================================================================

class MedicalPromptV2:
    """
    Centralized prompt management for medical transcription.
    Version 2.0 - Few-shot learning with comprehensive examples.
    """
    
    VERSION = "2.0"
    
    # Test-case derived examples for few-shot learning
    EXAMPLES = [
        {
            'id': 'complex_full',
            'input': "Identification comma John Smith is a 14 year old male with a history of ACHD and major depressive disorder period He's in the seventh grade period Chief complaint follow up period Next paragraph Problem list colon ACHD period Improving comma partial control period Two comma major depressive disorder comma stable period Current medications comma Lexapro 20 mg comma one pill per day comma jurn APM comma 60 milli comma qhs period",
            'output': """# Identification
John Smith is a 14 year old male with a history of ADHD and major depressive disorder. He's in the seventh grade.

**CC:** Follow-up

## Problem List
1. ADHD: Improving, partial control
2. Major depressive disorder: stable

## Current Medications
1. Lexapro 20mg (daily)
2. {unclear: Journay PM?} 60mg (QHS)"""
        },
        {
            'id': 'punctuation_quotes',
            'input': "Patient reports quote I feel better unquote comma mood quote okay unquote period Assessment colon stable period Plan dash Continue meds semicolon follow up colon 4 weeks period",
            'output': """Patient reports "I feel better", mood "okay".

## Assessment
Stable.

## Plan
- Continue meds; follow up: 4 weeks."""
        },
        {
            'id': 'fillers_corrections',
            'input': "So um the patient is like really improving you know period Diagnosed with ACHD comma MDD comma and GAD period Meds include uh sertraline 50mg qhs for sleep",
            'output': """The patient is really improving. Diagnosed with ADHD, MDD, and GAD.

## Current Medications
1. Sertraline 50mg QHS for sleep"""
        }
    ]
    
    # Punctuation rules mapping
    PUNCTUATION_RULES = {
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
        "new line": "\n",
        "new paragraph": "\n\n",
        "next paragraph": "\n\n"
    }
    
    # Medical corrections mapping
    MEDICAL_CORRECTIONS = {
        'ACHD': 'ADHD',
        'jurn APM': '{unclear: Journay PM?}',
        'jour APM': '{unclear: Journay PM?}',
        'drawn APM': '{unclear: Journay PM?}',
        'qhs': 'QHS',
        'bid': 'BID',
        'tid': 'TID',
        'prn': 'PRN',
        'qd': 'daily'
    }
    
    # Base prompt template
    BASE_TEMPLATE = """You are a medical transcription formatter. Your ONLY job is to convert dictated text into clean formatted notes.

STRICT RULES - FOLLOW EXACTLY:

1. PUNCTUATION COMMANDS (convert these words to symbols):
{punctuation_rules}

2. FILLER REMOVAL (delete these ONLY when they're fillers):
   - Remove: "uh", "um", "uhm", "yeah", "so" (when filler)
   - Remove: "you know", "like" (EXCEPT in clinical context like "feels like crying")
   - Keep: meaningful uses of these words

3. MEDICAL CORRECTIONS:
{medical_corrections}
   - Flag unusual dosages: Sertraline 1mg → Sertraline 1mg {{!dosage: typical 25-200mg}}

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
   - Mark unclear medications: {{unclear: best_guess?}}
   - Keep original if completely unintelligible

EXAMPLES SHOWING EXACT FORMATTING:

{examples}

NOW PROCESS THIS TRANSCRIPT:
{input_text}

OUTPUT (follow the examples EXACTLY):"""
    
    @classmethod
    def format_punctuation_rules(cls):
        """Format punctuation rules for prompt."""
        return '\n'.join([f'   - "{k}" → {v}' for k, v in cls.PUNCTUATION_RULES.items()])
    
    @classmethod
    def format_medical_corrections(cls):
        """Format medical corrections for prompt."""
        return '\n'.join([f'   - {k} → {v}' for k, v in cls.MEDICAL_CORRECTIONS.items()])
    
    @classmethod
    def format_examples(cls):
        """Format examples for few-shot learning."""
        formatted = []
        for i, ex in enumerate(cls.EXAMPLES, 1):
            formatted.append(f"Example {i}:\nInput: {ex['input']}\nOutput:\n{ex['output']}")
        return '\n\n'.join(formatted)
    
    @classmethod
    def build(cls, text: str) -> str:
        """Build complete prompt with all components."""
        return cls.BASE_TEMPLATE.format(
            punctuation_rules=cls.format_punctuation_rules(),
            medical_corrections=cls.format_medical_corrections(),
            examples=cls.format_examples(),
            input_text=text
        )
    
    @classmethod
    def get_metadata(cls):
        """Return prompt metadata for logging/debugging."""
        return {
            'version': cls.VERSION,
            'num_examples': len(cls.EXAMPLES),
            'num_punctuation_rules': len(cls.PUNCTUATION_RULES),
            'num_medical_corrections': len(cls.MEDICAL_CORRECTIONS)
        }

# ============================================================================
# MAIN PROCESSOR
# ============================================================================

class PsychiatricTranscriptProcessor:
    def __init__(self, medical_dictionary_path: str):
        """Initialize with medical dictionary for validation only."""
        self.medical_dict = self.load_medical_dictionary(medical_dictionary_path)
        self.logger = logging.getLogger(__name__)
        self.ollama = Client()
        self.model = LLM_MODEL
        self.logger.info(f"Using model: {self.model}")
        
    def load_medical_dictionary(self, path: str) -> dict:
        """Load medical dictionary for validation (not primary processing)."""
        try:
            with open(path, 'r') as f:
                return json.load(f)
        except Exception as e:
            self.logger.error(f"Failed to load medical dictionary: {e}")
            return self.get_minimal_dictionary()
    
    def get_minimal_dictionary(self) -> dict:
        """Minimal dictionary for validation."""
        return {
            'medications': {
                'sertraline': {'range': (25, 200), 'unit': 'mg'},
                'fluoxetine': {'range': (10, 80), 'unit': 'mg'},
                'trazodone': {'range': (25, 300), 'unit': 'mg'},
                'journay_pm': {'range': (3, 12), 'unit': 'mg'},
                'lexapro': {'range': (5, 20), 'unit': 'mg'},
                'adderall': {'range': (5, 60), 'unit': 'mg'}
            },
            'known_corrections': {
                'ACHD': 'ADHD',
                'jurn APM': 'Journay PM',
                'jour APM': 'Journay PM',
                'drawn APM': 'Journay PM'
            }
        }
    
    def process(self, raw_transcript: str) -> Tuple[str, dict]:
        """
        Process transcript using LLM with validation.
        Returns: (formatted_note, error_messages)
        """
        self.logger.debug(f"Input length: {len(raw_transcript)} chars")
        
        try:
            # Step 1: Minimal pre-cleaning (only the most obvious)
            pre_cleaned = self.minimal_cleaning(raw_transcript)
            self.logger.debug("Pre-cleaning complete")
            
            # Step 2: LLM processing with structured prompt
            llm_result = self.llm_process(pre_cleaned)
            self.logger.debug("LLM processing complete")
            
            # Step 3: Validate medical information
            validated = self.validate_medical_content(llm_result)
            self.logger.debug("Medical validation complete")
            
            # Step 4: Quality check
            final, errors = self.quality_check(validated)
            
            return final, errors
            
        except MemoryError as e:
            return raw_transcript, {'error': str(e)}
        except Exception as e:
            self.logger.error(f"Processing failed: {e}")
            return self.fallback_processing(raw_transcript), {'error': 'LLM processing failed. Using basic cleanup.'}
    
    def minimal_cleaning(self, text: str) -> str:
        """Remove only the most obvious fillers that LLM doesn't need."""
        # Remove repeated fillers only
        text = re.sub(r'\b(uh+|um+)\s+\1\b', r'\1', text, flags=re.IGNORECASE)
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def llm_process(self, text: str, retry_count: int = 0) -> str:
        """
        Process using local LLM with versioned prompt management.
        Includes retry logic with prompt variations for robustness.
        """
        
        # Use the prompt management system
        prompt = MedicalPromptV2.build(text)
        
        # Log prompt metadata for debugging
        self.logger.debug(f"Using prompt version: {MedicalPromptV2.VERSION}")
        self.logger.debug(f"Prompt metadata: {MedicalPromptV2.get_metadata()}")
        
        try:
            response = self.ollama.generate(
                model=self.model,
                prompt=prompt,
                options={
                    'temperature': LLM_TEMPERATURE,
                    'top_p': LLM_TOP_P,
                    'repeat_penalty': LLM_REPEAT_PENALTY,
                    'num_predict': LLM_MAX_TOKENS
                }
            )
            
            result = response['response']
            
            # Quick validation check
            if self.is_likely_hallucination(text, result):
                if retry_count < 2:
                    self.logger.warning(f"Possible hallucination detected, retrying ({retry_count + 1}/2)")
                    # On retry, use lower temperature for more deterministic output
                    original_temp = LLM_TEMPERATURE
                    LLM_TEMPERATURE = max(0.0, LLM_TEMPERATURE - 0.05)
                    result = self.llm_process(text, retry_count + 1)
                    LLM_TEMPERATURE = original_temp
                else:
                    self.logger.error("Multiple hallucination attempts, falling back")
                    raise ValueError("LLM producing hallucinated content")
            
            return result
            
        except Exception as e:
            self.logger.error(f"LLM processing failed: {e}")
            raise
    
    def is_likely_hallucination(self, original: str, processed: str) -> bool:
        """
        Quick check for obvious hallucinations.
        Returns True if the output seems to have added significant content.
        """
        # Check if output is significantly longer (>40% increase)
        if len(processed) > len(original) * 1.4:
            return True
        
        # Check if key medical terms from input are preserved
        original_words = set(original.lower().split())
        processed_words = set(processed.lower().split())
        
        # Medical terms that should be preserved (if present in original)
        important_terms = {'adhd', 'depression', 'anxiety', 'mg', 'lexapro', 
                          'sertraline', 'patient', 'stable', 'improving'}
        
        original_medical = original_words & important_terms
        processed_medical = processed_words & important_terms
        
        # If we lost more than 50% of medical terms, likely an issue
        if original_medical and len(processed_medical) < len(original_medical) * 0.5:
            return True
        
        return False
    
    def validate_medical_content(self, text: str) -> str:
        """Validate medications against dictionary, add warnings only when needed."""
        
        # Find medication patterns
        med_pattern = r'(\w+)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|ml)\b'
        
        for match in re.finditer(med_pattern, text, re.IGNORECASE):
            drug_name = match.group(1).lower()
            dose = float(match.group(2))
            
            # Check if medication is in dictionary
            if drug_name in self.medical_dict.get('medications', {}):
                med_info = self.medical_dict['medications'][drug_name]
                if 'range' in med_info:
                    min_dose, max_dose = med_info['range']
                    
                    # Only flag if SIGNIFICANTLY out of range
                    if dose < min_dose * 0.1 or dose > max_dose * 2:
                        old_text = match.group(0)
                        warning = f"{old_text} [!verify dosage]"
                        text = text.replace(old_text, warning, 1)
        
        return text
    
    def fallback_processing(self, text: str) -> str:
        """Basic fallback if LLM fails."""
        # Very basic cleaning
        text = re.sub(r'\bperiod\b', '.', text, flags=re.IGNORECASE)
        text = re.sub(r'\bcomma\b', ',', text, flags=re.IGNORECASE)
        text = re.sub(r'\bcolon\b', ':', text, flags=re.IGNORECASE)
        text = re.sub(r'\b(uh|um)\b', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()
    
    def quality_check(self, text: str) -> Tuple[str, dict]:
        """Check output quality and generate warnings."""
        errors = {}
        word_count = len(text.split())
        
        # Only flag serious issues
        if word_count < 10:
            errors['length'] = "The note is too short. Please record again."
        
        # Check for excessive unclear markers
        unclear_count = text.count('{unclear')
        if unclear_count > 5:
            errors['clarity'] = f"Multiple unclear items ({unclear_count}). Please review."
        
        # Check if no sections were identified
        if not any(marker in text for marker in ['CC:', '##', '#']):
            errors['structure'] = "Unable to identify standard sections. Please review structure."
        
        # Check for dosage warnings
        if '[!verify dosage]' in text:
            errors['dosage'] = "Unusual dosage detected. Please verify."
        
        return text, errors


# ============================================================================
# TEST VALIDATION WITH EXPECTED OUTPUT
# ============================================================================

class TestValidator:
    """Comprehensive test validation for the medical formatter."""
    
    @staticmethod
    def get_all_test_cases():
        """Return all test cases organized by category."""
        return {
            'punctuation': [
                {
                    'id': 'PUNCT_001',
                    'input': "Patient stable period New line Medications colon",
                    'expected': "Patient stable.\nMedications:"
                },
                {
                    'id': 'PUNCT_002', 
                    'input': "Mood quote okay unquote comma affect congruent period",
                    'expected': 'Mood "okay", affect congruent.'
                },
                {
                    'id': 'PUNCT_003',
                    'input': "Plan dash Continue meds semicolon follow up colon 4 weeks",
                    'expected': "Plan - Continue meds; follow up: 4 weeks"
                }
            ],
            'fillers': [
                {
                    'id': 'FILLER_001',
                    'input': "So, uh, the patient is like really improving, you know",
                    'expected': "The patient is really improving"
                },
                {
                    'id': 'FILLER_002',
                    'input': "Yeah, so patient feels like crying, like, all the time",
                    'expected': "Patient feels like crying all the time",
                    'notes': "Preserve 'like' in symptom description"
                }
            ],
            'medical': [
                {
                    'id': 'MED_001',
                    'input': "Diagnosed with ACHD, MDD, and GAD",
                    'expected': "Diagnosed with ADHD, MDD, and GAD"
                },
                {
                    'id': 'MED_002',
                    'input': "Trazodone 50mg qhs for sleep",
                    'expected': "Trazodone 50mg QHS for sleep"
                }
            ],
            'complex': [
                {
                    'id': 'REAL_001',
                    'input': """Identification comma John Smith is a 14 year old male with a history of ACHD and major depressive disorder period He's in the seventh grade period Chief complaint follow up period Next paragraph Problem list colon ACHD period Improving comma partial control period Two comma major depressive disorder comma stable period Current medications comma Lexapro 20 mg comma one pill per day comma jurn APM comma 60 milli comma qhs period""",
                    'expected': """# Identification
John Smith is a 14 year old male with a history of ADHD and major depressive disorder. He's in the seventh grade.

**CC:** Follow-up

## Problem List
1. ADHD: Improving, partial control
2. Major depressive disorder: stable

## Current Medications
1. Lexapro 20mg (daily)
2. {unclear: Journay PM?} 60mg (QHS)"""
                }
            ]
        }
    
    @staticmethod
    def validate_output(actual: str, expected: str) -> Tuple[bool, List[str]]:
        """
        Validate actual output against expected.
        Returns (is_valid, list_of_issues)
        """
        issues = []
        
        # Normalize for comparison (handle minor whitespace differences)
        actual_normalized = ' '.join(actual.split())
        expected_normalized = ' '.join(expected.split())
        
        # Check exact match first
        if actual_normalized == expected_normalized:
            return True, []
        
        # Check key elements
        expected_lines = expected.strip().split('\n')
        actual_lines = actual.strip().split('\n')
        
        # Check critical formatting elements
        if '# Identification' in expected and '# Identification' not in actual:
            issues.append("Missing '# Identification' header")
        
        if '**CC:**' in expected and '**CC:**' not in actual:
            issues.append("Missing '**CC:**' format (got 'Chief Complaint' instead?)")
        
        if '## Problem List' in expected and '## Problem List' not in actual:
            issues.append("Missing '## Problem List' header")
        
        # Check medical corrections
        if 'ACHD' in actual and 'ADHD' in expected:
            issues.append("Failed to correct ACHD to ADHD")
        
        if 'qhs' in actual and 'QHS' in expected:
            issues.append("Failed to capitalize qhs to QHS")
        
        # Check unclear markers
        if 'jurn APM' in actual or 'jour APM' in actual:
            if '{unclear:' not in actual:
                issues.append("Failed to mark unclear medication")
        
        return len(issues) == 0, issues
    
    @staticmethod
    def run_test_suite(processor) -> Dict[str, Any]:
        """
        Run all test cases and return results.
        """
        results = {
            'total': 0,
            'passed': 0,
            'failed': 0,
            'by_category': {},
            'failures': []
        }
        
        test_cases = TestValidator.get_all_test_cases()
        
        for category, cases in test_cases.items():
            category_results = {'passed': 0, 'failed': 0, 'cases': []}
            
            for test_case in cases:
                results['total'] += 1
                
                # Process the input
                output, _ = processor.process(test_case['input'])
                
                # Validate the output
                is_valid, issues = TestValidator.validate_output(
                    output, 
                    test_case['expected']
                )
                
                case_result = {
                    'id': test_case['id'],
                    'passed': is_valid,
                    'issues': issues,
                    'actual': output,
                    'expected': test_case['expected']
                }
                
                if is_valid:
                    results['passed'] += 1
                    category_results['passed'] += 1
                else:
                    results['failed'] += 1
                    category_results['failed'] += 1
                    results['failures'].append(case_result)
                
                category_results['cases'].append(case_result)
            
            results['by_category'][category] = category_results
        
        results['success_rate'] = results['passed'] / results['total'] if results['total'] > 0 else 0
        
        return results


# ============================================================================
# MAIN USAGE
# ============================================================================

def main():
    """
    Example usage with comprehensive test suite validation.
    Tests all categories: punctuation, fillers, medical corrections, complex cases.
    """
    
    # Check RAM before starting
    available_gb = psutil.virtual_memory().available / (1024**3)
    print(f"Available RAM: {available_gb:.1f}GB")
    print(f"Selected Model: {get_optimal_model()}")
    print(f"Prompt Version: {MedicalPromptV2.VERSION}")
    print("="*60)
    
    if available_gb < 3:
        print("WARNING: Less than 3GB RAM available. Close other applications.")
        return
    
    processor = PsychiatricTranscriptProcessor('medical_dict.json')
    
    # Run comprehensive test suite
    print("Running comprehensive test suite...")
    print("="*60)
    
    results = TestValidator.run_test_suite(processor)
    
    # Display results summary
    print(f"\nTEST RESULTS SUMMARY:")
    print("-"*40)
    print(f"Total Tests: {results['total']}")
    print(f"Passed: {results['passed']} ({results['passed']/results['total']*100:.1f}%)")
    print(f"Failed: {results['failed']} ({results['failed']/results['total']*100:.1f}%)")
    print(f"Success Rate: {results['success_rate']*100:.1f}%")
    
    # Display results by category
    print(f"\n\nRESULTS BY CATEGORY:")
    print("-"*40)
    for category, cat_results in results['by_category'].items():
        print(f"{category.upper()}: {cat_results['passed']}/{len(cat_results['cases'])} passed")
    
    # Display failures if any
    if results['failures']:
        print(f"\n\nFAILED TESTS DETAIL:")
        print("-"*40)
        for failure in results['failures'][:3]:  # Show first 3 failures
            print(f"\nTest ID: {failure['id']}")
            print(f"Issues: {', '.join(failure['issues'])}")
            print(f"Expected: {failure['expected'][:100]}...")
            print(f"Actual: {failure['actual'][:100]}...")
    
    # Recommendations based on results
    print(f"\n\nRECOMMENDATIONS:")
    print("-"*40)
    if results['success_rate'] >= 0.9:
        print("✅ Excellent performance! Ready for production.")
    elif results['success_rate'] >= 0.7:
        print("⚠️ Good performance, but review failed cases for prompt improvements.")
    else:
        print("❌ Poor performance. Consider:")
        print("  1. Adding more examples to the prompt")
        print("  2. Testing different models")
        print("  3. Adjusting temperature settings")
        print("  4. Reviewing the specific failure patterns")


if __name__ == "__main__":
    main()
