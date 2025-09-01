/**
 * Simple dual-mode configuration
 * Same pipeline, different models
 */

const os = require('os');

const ProcessingModes = {
  FAST: {
    name: 'Fast',
    description: 'Quick draft - 3-4 minutes for 30-min audio',
    
    whisper: {
      model: 'tiny.en',
      threads: os.cpus().length - 2,
      parallel: 4,
      chunkSize: 15,  // seconds
      overlap: 2
    },
    
    ollama: {
      model: 'qwen2.5:0.5b',  // 397MB model - fastest
      temperature: 0.1,
      numPredict: 256,
      numCtx: 1024,
      timeout: 30000
    },
    
    vad: {
      enabled: true,
      threshold: 0.6,  // Aggressive silence removal
      debounce: 500
    },
    
    expected: {
      speed: '7-10x real-time',
      accuracy: '85%',
      ramUsage: '2-3GB',
      formatCompliance: '80%'
    }
  },
  
  ACCURATE: {
    name: 'High Accuracy',
    description: 'Best quality - 6-8 minutes for 30-min audio',
    
    whisper: {
      model: 'base.en',  // Or small.en if RAM allows
      threads: os.cpus().length - 2,
      parallel: 2,       // Less parallel for stability
      chunkSize: 30,     // Larger chunks for context
      overlap: 5
    },
    
    ollama: {
      model: 'qwen2.5:1.5b',  // 990MB model - good balance
      temperature: 0.3,
      numPredict: 512,
      numCtx: 2048,
      timeout: 60000
    },
    
    vad: {
      enabled: true,
      threshold: 0.4,  // Keep more audio
      debounce: 1000
    },
    
    expected: {
      speed: '3-5x real-time',
      accuracy: '95%',
      ramUsage: '3.5-4.5GB',
      formatCompliance: '90%'
    }
  }
};

// Usage modes based on recording length
const AutoModeSelector = {
  selectMode(recordingDuration) {
    if (recordingDuration < 300) {  // < 5 minutes
      return ProcessingModes.ACCURATE;  // Can afford accuracy
    } else if (recordingDuration > 1800) {  // > 30 minutes
      return ProcessingModes.FAST;  // Need speed
    } else {
      // Ask user or use default
      return ProcessingModes.ACCURATE;
    }
  }
};

module.exports = { ProcessingModes, AutoModeSelector };