# Performance Optimization Research Prompt for Doctor-Dictate

## Context
I have a medical dictation application that:
- Records audio from doctors dictating patient notes
- Transcribes using OpenAI Whisper (currently using Python implementation)
- Formats the transcription using Ollama LLM (currently using mistral/llama3.2)
- Needs to handle 30+ minute recordings reliably
- Currently causes laptop freezing due to high RAM usage

## Current Implementation Details
- **Whisper**: Python-based, using `small.en` model
- **Audio Processing**: Chunks audio into 30-second segments with 2-second overlap
- **LLM**: Ollama with mistral:latest or llama3.2:latest
- **Prompt Size**: ~10KB medical formatting prompt with few-shot examples
- **Platform**: Electron app with Node.js backend
- **Target**: MacOS (Apple Silicon) and Windows

## Problems
1. Laptop freezes during processing (RAM exhaustion)
2. Ollama times out on 60-second timeout
3. Only getting partial transcription from chunked audio
4. 8-minute recording takes several minutes to process

## Research Areas Needed

### 1. Whisper Alternatives/Optimizations
- **whisper.cpp**: C++ implementation, supposedly faster and lower memory
- **faster-whisper**: CTranslate2-based, claims 4x faster
- **Insanely Fast Whisper**: Uses batching and Flash Attention 2
- **WhisperX**: Includes word-level timestamps and speaker diarization
- **Comparison needed**: Speed, accuracy, memory usage, ease of integration with Node.js

### 2. Ollama Model Selection
Need models that are:
- Small enough to not exhaust RAM (< 4GB ideally)
- Fast inference (< 5 seconds for medical note formatting)
- Good at following structured formatting instructions
- Candidates to research:
  - **phi-2** (2.7B params)
  - **qwen:0.5b** or **qwen2.5:1.5b**
  - **tinyllama** (1.1B)
  - **gemma:2b**
  - **deepseek-coder:1.3b** (might be good at structured output)

### 3. Architecture Optimizations
- Streaming processing vs batch processing
- Optimal chunk size for medical dictation (current 30s might be wrong)
- Parallel vs sequential processing of chunks
- Memory management strategies
- Caching strategies for repeated medical terms

### 4. Quantization & Compression
- 8-bit or 4-bit quantization for models
- Audio compression before processing
- Model pruning techniques
- GGUF format advantages

### 5. Alternative Approaches
- Cloud API fallback for long recordings
- Hybrid local/cloud processing
- Progressive enhancement (quick draft → refined output)
- Specialized medical speech models

## Specific Questions to Answer

1. **Whisper Performance**:
   - What's the actual speed/memory difference between whisper.cpp vs faster-whisper vs Python whisper?
   - Can whisper.cpp or faster-whisper be easily integrated with Node.js/Electron?
   - What's the accuracy trade-off with smaller Whisper models (tiny, base)?
   - Is there a "sweet spot" model size for medical dictation?

2. **Ollama Optimization**:
   - Which small models (< 3B params) are best at following formatting instructions?
   - Can we use specialized prompting techniques to work with smaller models?
   - Is there a way to "fine-tune" or specialize a small model for medical formatting?
   - What's the actual RAM usage of different model sizes?

3. **System Architecture**:
   - Should we process audio in smaller chunks through the full pipeline?
   - Can we use streaming transcription instead of batch?
   - Is there a way to offload processing to GPU on Apple Silicon?
   - Should we separate transcription and formatting into different processes?

4. **Practical Constraints**:
   - What's the minimum acceptable accuracy for medical transcription?
   - Can we sacrifice some formatting quality for 10x speed improvement?
   - Is real-time processing necessary or can we do background processing?
   - What's the typical RAM available on target machines (8GB? 16GB?)

## Success Criteria
- Process 30-minute recording in < 5 minutes
- Use < 4GB RAM peak
- Maintain > 90% transcription accuracy
- Maintain > 80% formatting compliance with template
- No system freezing
- Works on 8GB RAM machines

## Deliverables Needed
1. Comparison table of Whisper alternatives
2. Benchmark results of small Ollama models for medical formatting
3. Recommended architecture changes
4. Implementation plan with specific libraries/tools
5. Trade-off analysis (speed vs accuracy vs memory)
6. Code examples for integration

## Additional Context
- Medical terminology accuracy is critical
- Format structure is more important than perfect grammar
- System needs to be reliable for daily clinical use
- Prefer solutions that work offline
- Cross-platform compatibility is important