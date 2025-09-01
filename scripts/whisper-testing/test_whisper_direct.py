#!/usr/bin/env python3
"""
Direct Whisper API test to bypass ffmpeg requirement
"""

import whisper
import time
import json

def test_whisper_model(audio_file, model_name="base"):
    """Test Whisper transcription directly via Python API"""
    print(f"Loading Whisper {model_name} model...")
    start_time = time.time()
    
    try:
        model = whisper.load_model(model_name)
        load_time = time.time() - start_time
        print(f"Model loaded in {load_time:.2f} seconds")
        
        print(f"Transcribing {audio_file}...")
        transcribe_start = time.time()
        
        result = model.transcribe(audio_file, language="en")
        
        transcribe_time = time.time() - transcribe_start
        print(f"Transcription completed in {transcribe_time:.2f} seconds")
        
        return {
            'model': model_name,
            'audio_file': audio_file,
            'load_time': load_time,
            'transcribe_time': transcribe_time,
            'text': result['text'],
            'segments': result['segments']
        }
        
    except Exception as e:
        print(f"Error with {model_name} model: {e}")
        return None

def main():
    audio_files = [
        'test-psychiatric-dictation.m4a',
        'mock-recording-samir.m4a'
    ]
    
    # Test different models as per PRD requirements
    models = ['base', 'small.en', 'medium.en']  # Skip large-v3 for now due to size
    
    results = []
    
    for audio_file in audio_files:
        print(f"\n{'='*60}")
        print(f"Testing audio file: {audio_file}")
        print(f"{'='*60}")
        
        for model_name in models:
            print(f"\n--- Testing {model_name} model ---")
            result = test_whisper_model(audio_file, model_name)
            
            if result:
                results.append(result)
                print(f"Transcription: {result['text'][:200]}...")
                
                # Save individual result
                output_file = f"{audio_file}_{model_name}_result.txt"
                with open(output_file, 'w') as f:
                    f.write(result['text'])
                print(f"Full transcription saved to: {output_file}")
    
    # Save all results
    with open('whisper_test_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\nAll results saved to: whisper_test_results.json")
    
    # Performance summary
    print(f"\n{'='*60}")
    print("PERFORMANCE SUMMARY")
    print(f"{'='*60}")
    for result in results:
        print(f"{result['model']} on {result['audio_file'][:20]}... - {result['transcribe_time']:.2f}s")

if __name__ == "__main__":
    main()