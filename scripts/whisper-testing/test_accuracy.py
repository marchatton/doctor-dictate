#!/usr/bin/env python3
"""
Whisper Accuracy Testing Script for Psychiatric Terminology
Tests transcription accuracy on medication names and dosages
"""

import json
import difflib
import re
from typing import List, Tuple, Dict

def extract_medications(text: str) -> List[str]:
    """Extract medication names and dosages from text"""
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
            # Extract dosage pattern (number + mg/milligrams)
            pattern = rf'{med}\s+(\d+(?:\.\d+)?)\s*(mg|milligrams?)'
            matches = re.findall(pattern, text_lower)
            if matches:
                for dose, unit in matches:
                    found_meds.append(f"{med} {dose} {unit}")
            else:
                found_meds.append(med)
    
    return found_meds

def calculate_accuracy(original: str, transcribed: str) -> Dict:
    """Calculate accuracy metrics"""
    original_meds = extract_medications(original)
    transcribed_meds = extract_medications(transcribed)
    
    # Word-level accuracy
    original_words = original.lower().split()
    transcribed_words = transcribed.lower().split()
    
    # Use difflib to find matching sequences
    matcher = difflib.SequenceMatcher(None, original_words, transcribed_words)
    matches = sum(triple.size for triple in matcher.get_matching_blocks())
    word_accuracy = (matches / len(original_words)) * 100 if original_words else 0
    
    # Medication accuracy
    med_correct = sum(1 for med in original_meds if med in transcribed_meds)
    med_accuracy = (med_correct / len(original_meds)) * 100 if original_meds else 0
    
    return {
        'word_accuracy': round(word_accuracy, 2),
        'medication_accuracy': round(med_accuracy, 2),
        'total_medications': len(original_meds),
        'correct_medications': med_correct,
        'original_medications': original_meds,
        'transcribed_medications': transcribed_meds,
        'word_error_rate': round(100 - word_accuracy, 2)
    }

def analyze_transcription(original_file: str, transcribed_file: str) -> Dict:
    """Analyze transcription accuracy"""
    try:
        with open(original_file, 'r') as f:
            original = f.read()
        
        with open(transcribed_file, 'r') as f:
            transcribed = f.read()
        
        return calculate_accuracy(original, transcribed)
    
    except FileNotFoundError as e:
        return {'error': f'File not found: {e}'}
    except Exception as e:
        return {'error': f'Analysis failed: {e}'}

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) != 3:
        print("Usage: python test_accuracy.py <original_file> <transcribed_file>")
        sys.exit(1)
    
    original_file = sys.argv[1]
    transcribed_file = sys.argv[2]
    
    results = analyze_transcription(original_file, transcribed_file)
    
    if 'error' in results:
        print(f"Error: {results['error']}")
        sys.exit(1)
    
    print("=== WHISPER ACCURACY ANALYSIS ===")
    print(f"Word Accuracy: {results['word_accuracy']}%")
    print(f"Word Error Rate: {results['word_error_rate']}%")
    print(f"Medication Accuracy: {results['medication_accuracy']}%")
    print(f"Medications Found: {results['correct_medications']}/{results['total_medications']}")
    
    print("\nOriginal Medications:")
    for med in results['original_medications']:
        print(f"  - {med}")
    
    print("\nTranscribed Medications:")
    for med in results['transcribed_medications']:
        indicator = "✓" if med in results['original_medications'] else "✗"
        print(f"  {indicator} {med}")
    
    # Save detailed results
    with open('accuracy_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nDetailed results saved to accuracy_results.json")
    
    # Success criteria from PRD
    if results['word_accuracy'] >= 95 and results['medication_accuracy'] >= 95:
        print("\n🎉 SUCCESS: Whisper meets accuracy requirements!")
        print("✅ Word Error Rate < 5%")
        print("✅ Medication Accuracy > 95%")
    else:
        print(f"\n⚠️  REQUIREMENTS NOT MET:")
        if results['word_accuracy'] < 95:
            print(f"❌ Word accuracy {results['word_accuracy']}% < 95%")
        if results['medication_accuracy'] < 95:
            print(f"❌ Medication accuracy {results['medication_accuracy']}% < 95%")