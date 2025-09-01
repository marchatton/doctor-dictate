# Simplified Performance Architecture

## Core Principle: KISS (Keep It Simple, Stupid)

### Single Pipeline, Progressive Enhancement

```
Audio → VAD → Whisper.cpp → Chunked Formatting → Merge
         ↓
    (Remove silence)
```

### Technology Stack (Simplified)

1. **Transcription**: whisper.cpp with base.en model
   - Pure C++ implementation, no Python
   - Node.js bindings via whisper-cpp-node
   - 500MB model size, 1GB RAM usage

2. **Formatting**: Ollama with qwen2.5:0.5b-q4_K_M
   - 500MB model, aggressive quantization
   - 2048 token context (sufficient for medical notes)
   - Streaming responses to prevent timeouts

3. **Audio Processing**: Built-in Node.js
   - VAD using webrtcvad or simple amplitude detection
   - 30-second chunks with 5-second overlap
   - Process chunks sequentially, not parallel

### Memory Management Strategy

```javascript
class MemoryAwareProcessor {
  async processWithMemoryLimit(audioPath) {
    const memLimit = 4 * 1024 * 1024 * 1024; // 4GB hard limit
    
    // Monitor memory before processing
    if (process.memoryUsage().heapUsed > memLimit * 0.7) {
      await this.cleanupMemory();
    }
    
    // Process in chunks with explicit cleanup
    const chunks = await this.splitAudio(audioPath);
    const results = [];
    
    for (const chunk of chunks) {
      const result = await this.processSingleChunk(chunk);
      results.push(result);
      
      // Force cleanup after each chunk
      chunk.cleanup();
      if (global.gc) global.gc();
      
      // Pause if memory pressure
      const usage = process.memoryUsage().heapUsed;
      if (usage > memLimit * 0.8) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    return this.mergeResults(results);
  }
}
```

### Implementation Timeline

**Phase 1 (3 days): Core Integration**
- Install whisper.cpp via Homebrew
- Create Node.js wrapper using child_process
- Test with 5-minute recordings

**Phase 2 (3 days): Memory Optimization**
- Implement VAD for silence removal
- Add chunking with overlap
- Test with 30-minute recordings

**Phase 3 (2 days): Formatting**
- Switch to qwen2.5:0.5b quantized
- Implement streaming formatter
- Add content verification

**Phase 4 (2 days): Polish**
- Progress indicators
- Error recovery
- Performance metrics

### Performance Expectations (Realistic)

For 30-minute recording on 8GB M1 MacBook:
- **Processing time**: 6-8 minutes
- **Memory usage**: 3.5-4.5GB peak
- **Transcription accuracy**: 90% (base.en model)
- **Formatting compliance**: 85% (smaller model trade-off)

### What We're NOT Doing

❌ Python subprocess for faster-whisper
❌ Dual-mode system (Fast/Accurate)
❌ Complex pipeline orchestration
❌ WebAssembly experiments
❌ Cloud API fallbacks
❌ Real-time processing

### Immediate Next Steps

```bash
# 1. Install dependencies
brew install whisper-cpp
npm install node-whisper-cpp child_process

# 2. Download optimized model
whisper-cpp-download-model base.en

# 3. Pull quantized Ollama model
ollama pull qwen2.5:0.5b-q4_K_M

# 4. Test basic pipeline
node test-simple-pipeline.js
```

### Risk Mitigation

1. **If whisper.cpp fails**: Fall back to OpenAI Whisper API (temporary)
2. **If Ollama times out**: Increase timeout to 120s, reduce chunk size
3. **If memory exhausted**: Implement disk-based chunking
4. **If accuracy too low**: Upgrade to small.en model (1GB)

### Success Metrics

- [ ] Process 30-min recording without freezing
- [ ] Stay under 5GB RAM usage
- [ ] Complete in under 10 minutes
- [ ] Maintain 85% format compliance
- [ ] Zero data loss (content verification)