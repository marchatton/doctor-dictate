/**
 * Unified processor that uses different configs
 * Same code, different models
 */

const { ProcessingModes } = require('./processing-config');
const { WhisperCpp } = require('../transcription/whisper-cpp');
const { OllamaFormatter } = require('../formatting/ollama-formatter');
const { WhisperTranscriber } = require('../transcription/whisper');
const fs = require('fs');
const path = require('path');

class UnifiedProcessor {
  constructor(mode = 'ACCURATE') {
    this.config = ProcessingModes[mode];
    if (!this.config) {
      throw new Error(`Invalid mode: ${mode}. Use FAST or ACCURATE`);
    }
    
    console.log(`🎯 Processing mode: ${this.config.name}`);
    console.log(`📊 Expected: ${this.config.expected.speed}, ${this.config.expected.accuracy} accuracy`);
  }
  
  async process(audioPath) {
    const startTime = Date.now();
    
    try {
      // 1. Same VAD step, different threshold
      let processedAudio = audioPath;
      if (this.config.vad.enabled) {
        processedAudio = await this.removeSlience(audioPath);
        console.log('✅ VAD complete - removed silence');
      }
      
      // 2. Same transcription step, different model
      const transcript = await this.transcribe(processedAudio);
      console.log('✅ Transcription complete');
      console.log(`📝 Transcript length: ${transcript.length} characters`);
      
      // 3. Same formatting step, different model
      const formatted = await this.format(transcript);
      console.log('✅ Formatting complete');
      
      const duration = (Date.now() - startTime) / 1000;
      console.log(`⏱️ Total time: ${duration}s`);
      
      return {
        text: formatted,
        transcript: transcript, // Include raw transcript for debugging
        mode: this.config.name,
        processingTime: duration,
        metadata: {
          whisperModel: this.config.whisper.model,
          ollamaModel: this.config.ollama.model
        }
      };
      
    } catch (error) {
      console.error('❌ Processing failed:', error);
      
      // Automatic fallback
      if (this.config.name === 'High Accuracy') {
        console.log('🔄 Falling back to Fast mode...');
        this.config = ProcessingModes.FAST;
        return this.process(audioPath);
      }
      
      throw error;
    }
  }
  
  async transcribe(audioPath) {
    // Try whisper.cpp first, fallback to Python whisper if not available
    const whisperCpp = new WhisperCpp(this.config.whisper);
    const isWhisperCppAvailable = await whisperCpp.isAvailable();
    
    if (isWhisperCppAvailable) {
      console.log(`✅ Using whisper.cpp with ${this.config.whisper.model} model`);
      return whisperCpp.transcribe(audioPath);
    } else {
      console.log('⚠️ Whisper.cpp not found, using Python whisper');
      // Fallback to existing Python whisper
      const transcriber = new WhisperTranscriber();
      const modelName = this.config.whisper.model.replace('.en', ''); // Remove .en suffix for Python
      
      // Use the transcribeAudio method
      const result = await transcriber.transcribeAudio(audioPath);
      
      return result.text || result;
    }
  }
  
  async format(text) {
    // Skip formatting for very short texts
    if (text.length < 100) {
      console.log('⚠️ Text too short for formatting, returning as-is');
      return text;
    }
    
    const formatter = new OllamaFormatter({
      model: this.config.ollama.model,
      temperature: this.config.ollama.temperature,
      timeout: this.config.ollama.timeout
    });
    
    const available = await formatter.isOllamaAvailable();
    if (!available) {
      console.log('❌ Ollama not available, returning raw transcript');
      return text;
    }
    
    const result = await formatter.formatMedicalDictation(text, {
      temperature: this.config.ollama.temperature,
      numPredict: this.config.ollama.numPredict,
      numCtx: this.config.ollama.numCtx
    });
    
    if (result.success) {
      return result.formatted;
    } else {
      console.error('❌ Formatting failed:', result.error);
      return text; // Return raw transcript on failure
    }
  }
  
  async removeSlience(audioPath) {
    // Simple VAD implementation placeholder
    // In production, use webrtcvad or ffmpeg with silenceremove filter
    console.log(`🔇 VAD: Would remove silence (threshold: ${this.config.vad.threshold})`);
    
    // For now, return original path
    // TODO: Implement actual VAD with ffmpeg
    return audioPath;
  }
}

// Convenience factory
class ProcessorFactory {
  static create(recordingPath) {
    // Auto-select mode based on file size/duration
    const stats = fs.statSync(recordingPath);
    const estimatedMinutes = stats.size / (1024 * 1024 * 1.5);  // Rough estimate
    
    if (estimatedMinutes > 20) {
      console.log('📏 Long recording detected - using Fast mode');
      return new UnifiedProcessor('FAST');
    } else {
      console.log('📏 Short recording - using Accurate mode');
      return new UnifiedProcessor('ACCURATE');
    }
  }
  
  static createFast() {
    return new UnifiedProcessor('FAST');
  }
  
  static createAccurate() {
    return new UnifiedProcessor('ACCURATE');
  }
}

module.exports = { UnifiedProcessor, ProcessorFactory };