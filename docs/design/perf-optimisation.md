I need to set up faster-whisper for local audio transcription on my MacBook optimized for 30-MINUTE audio files. Please help me:

1. Install faster-whisper and all necessary dependencies with performance optimizations

2. Create a Python script optimized for 30-minute transcription with:
   - TWO MODES via toggle: 
     * **High Accuracy mode**: Whisper Small model (244M params)
     * **Low Accuracy mode**: Whisper Base model (74M params)
   - FIXED CHUNKING: 15-second chunks with 2-second overlap
   - Dynamic resource management for extended processing times
   - CPU optimization for MacBook (detect Intel vs Apple Silicon)
   - Memory management to prevent system overload

3. Chunking implementation (use these fixed parameters):
   - **Chunk size**: 15 seconds
   - **Overlap**: 2 seconds 
   - **Estimated chunks**: ~120 chunks for 30-minute file
   - **Memory-aware batching**: Process 8-10 chunks at once, then clear memory
   - **Sequential processing**: Prevent memory accumulation during long sessions

4. Performance expectations:
   - **High Accuracy (Small)**: 8-15 minutes processing time, higher CPU usage
   - **Low Accuracy (Base)**: 4-8 minutes processing time, lighter system load
   - **Memory monitoring**: Track RAM usage, auto-adjust if >80% usage
   - **Progress tracking**: Show chunks completed (e.g., "Chunk 45/120, 37% complete")
   - **Real-time metrics**: Current RTF, average RTF, ETA, memory usage %

5. The script should handle:
   - Audio formats (mp3, wav, m4a, mp4) up to 30 minutes
   - **Detailed progress display**:
     ```
     Processing: audio.mp3 (30:24 duration)
     Mode: High Accuracy (Small) | Chunk 45/120 (37%) | Speed: 2.3x RTF | ETA: 6:42 | RAM: 68%
     ```
   - Save timestamped SRT and clean text versions
   - Comprehensive error handling and recovery
   - Performance logging with metrics

6. Command-line interface:
   ```bash
   python transcribe.py audio.mp3 --mode high    # High accuracy (Small model)
   python transcribe.py audio.mp3 --mode low     # Low accuracy (Base model)
   python transcribe.py audio.mp3 --resume       # Resume interrupted processing

7. Optimizations for 30-minute processing:

Memory cleanup: Clear processed chunks immediately
Batch processing: Process 8-10 chunks per batch for optimal memory usage
Resume capability: Save state every 25 chunks for crash recovery
Resource monitoring: Pause if system overheats or memory exceeds limits


8. Documentation:

Installation steps for Intel and Apple Silicon Macs
Expected processing times by MacBook model and mode
Memory requirements (Base: 2GB+, Small: 4GB+ recommended)
Accuracy vs speed trade-offs between Base and Small models
Troubleshooting guide for 30-minute processing



9. Requirements:

Fixed models: Base (low accuracy) and Small (high accuracy)
Fixed 15s/2s chunking strategy
Robust memory management for 30-minute sessions
Detailed progress tracking and ETA
Recovery mechanisms for long processing
Optimized specifically for MacBook hardware