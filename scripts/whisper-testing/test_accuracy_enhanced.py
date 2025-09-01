#!/usr/bin/env python3
"""
Enhanced Whisper Accuracy Testing with Medical Dictionary Post-Processing
Tests transcription accuracy with error correction using local medical dictionary
"""

import json
import difflib
import re
import sys
import os
from typing import List, Tuple, Dict

# Add path to medical dictionary
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src', 'data'))

# Import medical dictionary data (simulated - will implement JS reading)
MEDICAL_CORRECTIONS = {
    # From medical-dictionary.js commonErrors
    'surgery line': 'sertraline',
    'sertralene': 'sertraline',
    'surtraline': 'sertraline',
    'certralean': 'sertraline',
    'sertralin': 'sertraline',
    'zertraline': 'sertraline',
    
    'fluoxitine': 'fluoxetine',
    'fluoxetene': 'fluoxetine',
    'fluoxetin': 'fluoxetine',
    'prozak': 'fluoxetine',
    'fluoxeteen': 'fluoxetine',
    
    'metasopene': 'mirtazapine',
    'tumour tazepine': 'mirtazapine',
    'mirtazapin': 'mirtazapine',
    
    'area pippula': 'aripiprazole',
    'arypiprazol': 'aripiprazole',
    'aripiprazol': 'aripiprazole',
    'abilify': 'aripiprazole',
    'abilifi': 'aripiprazole',
    
    'at-emoxeteen': 'atomoxetine',
    'atomoxetin': 'atomoxetine',
    
    'l-prasilum': 'alprazolam',
    'alprazolim': 'alprazolam',
    
    'trasodone': 'trazodone',
    
    'prazes in': 'prazosin',
    'prasas in': 'prazosin',
    
    'nepazel': 'donepezil',
    'denepazol': 'donepezil',
    
    'bupropian': 'bupropion',
    'bipropion': 'bupropion',
    'bupropin': 'bupropion',
    'wellbutrin': 'bupropion',
    
    'quesia peen': 'quetiapine',
    'quisiopine': 'quetiapine',
    'quetiapin': 'quetiapine',
    'seroquel': 'quetiapine',
    
    'devil proxodium': 'divalproex',
    'divalprog': 'divalproex',
    'depakote': 'divalproex',
    
    'clonazepen': 'clonazepam',
    
    'duoxeteen': 'duloxetine',
    'duloxetin': 'duloxetine',
    'cymbalta': 'duloxetine',
    
    'limotrigine': 'lamotrigine',
    'lamotrigin': 'lamotrigine',
    'lamictal': 'lamotrigine',
    
    # Common dosage unit corrections
    'mgs': 'mg',
    "mg's": 'mg',
    'milligrams': 'mg',
    'milligram': 'mg'
}

def apply_medical_corrections(text: str) -> str:
    """Apply medical dictionary corrections to transcribed text"""
    corrected_text = text
    corrections_made = []
    
    for error_term, correct_term in MEDICAL_CORRECTIONS.items():
        if error_term.lower() in corrected_text.lower():
            # Use word boundary matching to avoid partial replacements
            pattern = r'\b' + re.escape(error_term) + r'\b'
            matches = re.findall(pattern, corrected_text, re.IGNORECASE)
            if matches:
                corrected_text = re.sub(pattern, correct_term, corrected_text, flags=re.IGNORECASE)
                corrections_made.extend([(match, correct_term) for match in matches])
    
    return corrected_text, corrections_made

def extract_medications_enhanced(text: str, apply_corrections: bool = True) -> List[str]:
    """Extract medication names and dosages from text with optional corrections"""
    
    if apply_corrections:
        text, corrections = apply_medical_corrections(text)
    
    # Common psychiatric medications to look for
    medications = [
        'sertraline', 'fluoxetine', 'mirtazapine', 'lamotrigine', 'atomoxetine',
        'alprazolam', 'aripiprazole', 'trazodone', 'gabapentin', 'prazosin',
        'donepezil', 'bupropion', 'quetiapine', 'lithium', 'divalproex',
        'clonazepam', 'duloxetine', 'ziprasidone', 'buspirone'
    ]
    
    found_meds = []
    text_lower = text.lower()
    
    for med in medications:
        if med in text_lower:
            # Extract dosage pattern (number + mg/milligrams/milligram)
            patterns = [
                rf'{med}\s+(\d+(?:\.\d+)?)\s*(mg|milligrams?|milligram)\b',
                rf'(\d+(?:\.\d+)?)\s*(mg|milligrams?|milligram)\s+{med}\b',
                rf'{med}\s+(\d+(?:\.\d+)?)\s*(mg|milligrams?|milligram)',
                rf'(\d+(?:\.\d+)?)\s*-?\s*(mg|milligrams?|milligram)\s*{med}'
            ]
            
            dosage_found = False
            for pattern in patterns:
                matches = re.findall(pattern, text_lower)
                if matches:
                    for dose, unit in matches:
                        # Normalize unit to 'mg'
                        unit_normalized = 'mg' if unit.startswith('mg') or 'milligram' in unit else unit
                        found_meds.append(f"{med} {dose} {unit_normalized}")
                        dosage_found = True
                    break
            
            if not dosage_found:
                found_meds.append(med)
    
    return found_meds

def calculate_accuracy_enhanced(original: str, transcribed: str) -> Dict:
    """Calculate accuracy metrics with and without medical corrections"""
    
    # Original accuracy (without corrections)
    original_meds = extract_medications_enhanced(original, apply_corrections=False)
    transcribed_meds_raw = extract_medications_enhanced(transcribed, apply_corrections=False)
    
    # Enhanced accuracy (with corrections)
    transcribed_corrected, corrections_made = apply_medical_corrections(transcribed)
    transcribed_meds_corrected = extract_medications_enhanced(transcribed_corrected, apply_corrections=True)
    
    # Word-level accuracy (original)
    original_words = original.lower().split()
    transcribed_words = transcribed.lower().split()
    matcher = difflib.SequenceMatcher(None, original_words, transcribed_words)
    matches = sum(triple.size for triple in matcher.get_matching_blocks())
    word_accuracy_raw = (matches / len(original_words)) * 100 if original_words else 0
    
    # Word-level accuracy (corrected)
    transcribed_corrected_words = transcribed_corrected.lower().split()
    matcher_corrected = difflib.SequenceMatcher(None, original_words, transcribed_corrected_words)
    matches_corrected = sum(triple.size for triple in matcher_corrected.get_matching_blocks())
    word_accuracy_corrected = (matches_corrected / len(original_words)) * 100 if original_words else 0
    
    # Medication accuracy (original)
    med_correct_raw = sum(1 for med in original_meds if med in transcribed_meds_raw)
    med_accuracy_raw = (med_correct_raw / len(original_meds)) * 100 if original_meds else 0
    
    # Medication accuracy (corrected)
    med_correct_corrected = sum(1 for med in original_meds if med in transcribed_meds_corrected)
    med_accuracy_corrected = (med_correct_corrected / len(original_meds)) * 100 if original_meds else 0
    
    return {
        'raw_results': {
            'word_accuracy': round(word_accuracy_raw, 2),
            'medication_accuracy': round(med_accuracy_raw, 2),
            'word_error_rate': round(100 - word_accuracy_raw, 2),
            'correct_medications': med_correct_raw,
            'transcribed_medications': transcribed_meds_raw
        },
        'corrected_results': {
            'word_accuracy': round(word_accuracy_corrected, 2),
            'medication_accuracy': round(med_accuracy_corrected, 2),
            'word_error_rate': round(100 - word_accuracy_corrected, 2),
            'correct_medications': med_correct_corrected,
            'transcribed_medications': transcribed_meds_corrected
        },
        'improvements': {
            'word_accuracy_gain': round(word_accuracy_corrected - word_accuracy_raw, 2),
            'medication_accuracy_gain': round(med_accuracy_corrected - med_accuracy_raw, 2),
            'additional_medications_found': med_correct_corrected - med_correct_raw
        },
        'corrections_applied': corrections_made,
        'total_medications': len(original_meds),
        'original_medications': original_meds,
        'transcribed_corrected_text': transcribed_corrected
    }

def analyze_transcription_enhanced(original_file: str, transcribed_file: str) -> Dict:
    """Analyze transcription accuracy with enhanced medical corrections"""
    try:
        with open(original_file, 'r') as f:
            original = f.read()
        
        with open(transcribed_file, 'r') as f:
            transcribed = f.read()
        
        return calculate_accuracy_enhanced(original, transcribed)
    
    except FileNotFoundError as e:
        return {'error': f'File not found: {e}'}
    except Exception as e:
        return {'error': f'Analysis failed: {e}'}

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python test_accuracy_enhanced.py <original_file> <transcribed_file>")
        sys.exit(1)
    
    original_file = sys.argv[1]
    transcribed_file = sys.argv[2]
    
    results = analyze_transcription_enhanced(original_file, transcribed_file)
    
    if 'error' in results:
        print(f"Error: {results['error']}")
        sys.exit(1)
    
    print("=== ENHANCED WHISPER ACCURACY ANALYSIS ===")
    print("\n📊 RAW WHISPER RESULTS (No Corrections)")
    print(f"Word Accuracy: {results['raw_results']['word_accuracy']}%")
    print(f"Word Error Rate: {results['raw_results']['word_error_rate']}%") 
    print(f"Medication Accuracy: {results['raw_results']['medication_accuracy']}%")
    print(f"Medications Found: {results['raw_results']['correct_medications']}/{results['total_medications']}")
    
    print("\n🔧 ENHANCED RESULTS (With Medical Dictionary)")
    print(f"Word Accuracy: {results['corrected_results']['word_accuracy']}%")
    print(f"Word Error Rate: {results['corrected_results']['word_error_rate']}%")
    print(f"Medication Accuracy: {results['corrected_results']['medication_accuracy']}%")
    print(f"Medications Found: {results['corrected_results']['correct_medications']}/{results['total_medications']}")
    
    print("\n📈 IMPROVEMENTS")
    print(f"Word Accuracy Gain: +{results['improvements']['word_accuracy_gain']}%")
    print(f"Medication Accuracy Gain: +{results['improvements']['medication_accuracy_gain']}%")
    print(f"Additional Medications Found: +{results['improvements']['additional_medications_found']}")
    
    print(f"\n🔄 CORRECTIONS APPLIED ({len(results['corrections_applied'])})")
    for error, correction in results['corrections_applied']:
        print(f"  '{error}' → '{correction}'")
    
    print("\nOriginal Medications:")
    for med in results['original_medications']:
        print(f"  - {med}")
    
    print(f"\nRaw Transcribed Medications:")
    for med in results['raw_results']['transcribed_medications']:
        indicator = "✓" if med in results['original_medications'] else "✗"
        print(f"  {indicator} {med}")
    
    print(f"\nCorrected Transcribed Medications:")
    for med in results['corrected_results']['transcribed_medications']:
        indicator = "✓" if med in results['original_medications'] else "✗"
        print(f"  {indicator} {med}")
    
    # Save detailed results
    output_file = f'enhanced_accuracy_results_{transcribed_file.split(".")[0].split("/")[-1]}.json'
    with open(output_file, 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nDetailed results saved to {output_file}")
    
    # Success criteria evaluation
    corrected_word_acc = results['corrected_results']['word_accuracy']
    corrected_med_acc = results['corrected_results']['medication_accuracy']
    
    if corrected_word_acc >= 95 and corrected_med_acc >= 95:
        print("\n🎉 SUCCESS: Enhanced Whisper meets accuracy requirements!")
        print("✅ Word Error Rate < 5%")
        print("✅ Medication Accuracy > 95%")
        print("\n💡 RECOMMENDATION: PROCEED with medical dictionary post-processing!")
    elif corrected_med_acc >= 90:  # Lower threshold for promising results
        print(f"\n⚠️  PROMISING: Significant improvement but not quite meeting full requirements")
        print(f"{'✅' if corrected_word_acc >= 95 else '❌'} Word accuracy {corrected_word_acc}% {'≥' if corrected_word_acc >= 95 else '<'} 95%")
        print(f"{'✅' if corrected_med_acc >= 95 else '❌'} Medication accuracy {corrected_med_acc}% {'≥' if corrected_med_acc >= 95 else '<'} 95%")
        print(f"\n💡 RECOMMENDATION: Consider proceeding with enhanced error correction")
    else:
        print(f"\n⚠️  REQUIREMENTS STILL NOT MET:")
        if corrected_word_acc < 95:
            print(f"❌ Word accuracy {corrected_word_acc}% < 95%")
        if corrected_med_acc < 95:
            print(f"❌ Medication accuracy {corrected_med_acc}% < 95%")
        print(f"\n💡 RECOMMENDATION: Additional improvements needed")