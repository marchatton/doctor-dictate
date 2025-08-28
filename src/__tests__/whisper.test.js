/**
 * Tests for Whisper AI Integration
 * Simple tests focusing on core functionality without complex mocking
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('path');

// Mock the dependency modules
jest.mock('../data/medical-dictionary.js', () => ({
  medicalTerms: ['sertraline', 'lamotrigine', 'anxiety'],
  correctTerm: jest.fn((term) => term)
}));

jest.mock('../dictation-commands.js', () => ({
  DictationCommandProcessor: jest.fn().mockImplementation(() => ({
    processCommands: jest.fn((text) => text)
  }))
}));

jest.mock('../audio-processor.js', () => ({
  AudioProcessor: jest.fn().mockImplementation(() => ({
    prepareAudio: jest.fn().mockResolvedValue('/tmp/prepared-audio.wav')
  }))
}));

jest.mock('../transcription-progress.js', () => ({
  TranscriptionProgress: jest.fn().mockImplementation(() => ({
    updateProgress: jest.fn(),
    complete: jest.fn()
  }))
}));

describe('WhisperTranscriber', () => {
  let WhisperTranscriber;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs methods
    fs.existsSync = jest.fn();
    fs.readFileSync = jest.fn();
    fs.writeFileSync = jest.fn();
    
    // Mock path methods
    path.join = jest.fn((...args) => args.join('/'));
    
    // Import after mocking
    delete require.cache[require.resolve('../whisper.js')];
    WhisperTranscriber = require('../whisper.js').WhisperTranscriber || require('../whisper.js');
  });

  describe('Initialization', () => {
    it('should create WhisperTranscriber instance', () => {
      const transcriber = new WhisperTranscriber();
      expect(transcriber).toBeDefined();
      expect(transcriber.isProcessing).toBe(false);
      expect(transcriber.selectedModel).toBe('medium.en');
    });

    it('should have available models configured', () => {
      const transcriber = new WhisperTranscriber();
      expect(transcriber.availableModels).toBeDefined();
      expect(transcriber.availableModels['medium.en']).toBeDefined();
      expect(transcriber.availableModels['small.en']).toBeDefined();
    });

    it('should initialize with default Python path', () => {
      const transcriber = new WhisperTranscriber();
      expect(transcriber.pythonPath).toBe('python3');
    });
  });

  describe('Environment Setup', () => {
    it('should detect existing Whisper environment', async () => {
      fs.existsSync.mockReturnValue(true);
      
      const transcriber = new WhisperTranscriber();
      const result = await transcriber.initializeWhisper();
      
      expect(result).toBe(true);
      expect(transcriber.whisperEnvPath).toContain('whisper-testing/venv');
    });

    it('should handle missing Whisper environment', async () => {
      fs.existsSync.mockReturnValue(false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const transcriber = new WhisperTranscriber();
      const result = await transcriber.initializeWhisper();
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Model Management', () => {
    it('should set model correctly', () => {
      const transcriber = new WhisperTranscriber();
      transcriber.setModel('small.en');
      
      expect(transcriber.selectedModel).toBe('small.en');
    });

    it('should get available models', () => {
      const transcriber = new WhisperTranscriber();
      const models = transcriber.getAvailableModels();
      
      expect(models).toBeDefined();
      expect(models['medium.en']).toBeDefined();
      expect(models['small.en']).toBeDefined();
    });

    it('should validate model exists before setting', () => {
      const transcriber = new WhisperTranscriber();
      
      expect(() => transcriber.setModel('invalid-model')).not.toThrow();
      // Should keep default model if invalid
      expect(transcriber.selectedModel).toBe('medium.en');
    });
  });

  describe('Audio Transcription', () => {
    it('should handle transcription request', async () => {
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 0);
          }
        })
      };
      
      spawn.mockReturnValue(mockSpawn);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        text: 'Patient presents with anxiety.'
      }));
      
      const transcriber = new WhisperTranscriber();
      transcriber.whisperEnvPath = '/mock/venv';
      
      const result = await transcriber.transcribeAudio('/mock/audio.wav');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle transcription errors', async () => {
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 0); // Error exit code
          }
        })
      };
      
      spawn.mockReturnValue(mockSpawn);
      
      const transcriber = new WhisperTranscriber();
      transcriber.whisperEnvPath = '/mock/venv';
      
      const result = await transcriber.transcribeAudio('/mock/audio.wav');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should prevent concurrent transcriptions', async () => {
      const transcriber = new WhisperTranscriber();
      transcriber.isProcessing = true;
      
      const result = await transcriber.transcribeAudio('/mock/audio.wav');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('already processing');
    });
  });

  describe('Medical Dictionary Integration', () => {
    it('should process medical terms in transcript', async () => {
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 0);
          }
        })
      };
      
      spawn.mockReturnValue(mockSpawn);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        text: 'Patient taking serotonin for anxiety.'
      }));
      
      const transcriber = new WhisperTranscriber();
      transcriber.whisperEnvPath = '/mock/venv';
      
      const result = await transcriber.transcribeAudio('/mock/audio.wav');
      
      // Should have processed the text
      expect(result.success).toBe(true);
      expect(result.transcript).toBeDefined();
    });
  });

  describe('Progress Tracking', () => {
    it('should track transcription progress', async () => {
      const mockSpawn = {
        stdout: { 
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              // Simulate progress output
              setTimeout(() => callback(Buffer.from('Processing 50%')), 10);
            }
          })
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 100);
          }
        })
      };
      
      spawn.mockReturnValue(mockSpawn);
      fs.readFileSync.mockReturnValue(JSON.stringify({
        text: 'Test transcript'
      }));
      
      const transcriber = new WhisperTranscriber();
      transcriber.whisperEnvPath = '/mock/venv';
      
      const result = await transcriber.transcribeAudio('/mock/audio.wav');
      
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing audio file', async () => {
      const transcriber = new WhisperTranscriber();
      const result = await transcriber.transcribeAudio('/nonexistent/file.wav');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('file not found');
    });

    it('should handle Python execution errors', async () => {
      spawn.mockImplementation(() => {
        throw new Error('Python not found');
      });
      
      const transcriber = new WhisperTranscriber();
      transcriber.whisperEnvPath = '/mock/venv';
      
      const result = await transcriber.transcribeAudio('/mock/audio.wav');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle malformed Whisper output', async () => {
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 0);
          }
        })
      };
      
      spawn.mockReturnValue(mockSpawn);
      fs.readFileSync.mockReturnValue('invalid json');
      
      const transcriber = new WhisperTranscriber();
      transcriber.whisperEnvPath = '/mock/venv';
      
      const result = await transcriber.transcribeAudio('/mock/audio.wav');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('parse');
    });
  });

  describe('Cleanup', () => {
    it('should reset processing state after completion', async () => {
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 0);
          }
        })
      };
      
      spawn.mockReturnValue(mockSpawn);
      fs.readFileSync.mockReturnValue(JSON.stringify({ text: 'test' }));
      
      const transcriber = new WhisperTranscriber();
      transcriber.whisperEnvPath = '/mock/venv';
      
      await transcriber.transcribeAudio('/mock/audio.wav');
      
      expect(transcriber.isProcessing).toBe(false);
    });
  });
});

// Simple module export test
describe('Module Export', () => {
  it('should export WhisperTranscriber', () => {
    const whisperModule = require('../whisper.js');
    expect(whisperModule).toBeDefined();
  });
});