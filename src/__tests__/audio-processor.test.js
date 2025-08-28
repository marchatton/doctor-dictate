/**
 * Tests for Audio Processing Pipeline
 * Simple tests focusing on core functionality
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock dependencies
jest.mock('child_process');
jest.mock('fs');
jest.mock('path');
jest.mock('os');

describe('AudioProcessor', () => {
  let AudioProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fs methods
    fs.existsSync = jest.fn(() => true);
    fs.writeFileSync = jest.fn();
    fs.readFileSync = jest.fn();
    fs.unlinkSync = jest.fn();
    
    // Mock path methods
    path.join = jest.fn((...args) => args.join('/'));
    path.extname = jest.fn((file) => '.wav');
    path.basename = jest.fn((file) => file.split('/').pop());
    
    // Mock os methods
    os.tmpdir = jest.fn(() => '/tmp');
    
    // Import after mocking
    delete require.cache[require.resolve('../audio-processor.js')];
    const module = require('../audio-processor.js');
    AudioProcessor = module.AudioProcessor || module;
  });

  describe('Initialization', () => {
    it('should create AudioProcessor instance with default settings', () => {
      const processor = new AudioProcessor();
      
      expect(processor).toBeDefined();
      expect(processor.chunkDuration).toBe(30);
      expect(processor.chunkOverlap).toBe(2);
      expect(processor.targetSampleRate).toBe(16000);
    });

    it('should allow custom chunk settings', () => {
      const processor = new AudioProcessor();
      processor.chunkDuration = 60;
      processor.chunkOverlap = 5;
      
      expect(processor.chunkDuration).toBe(60);
      expect(processor.chunkOverlap).toBe(5);
    });
  });

  describe('Audio Processing Pipeline', () => {
    it('should process audio file successfully', async () => {
      const mockProgress = jest.fn();
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
      
      const processor = new AudioProcessor();
      const result = await processor.processAudio('/mock/audio.webm', mockProgress);
      
      expect(result).toBeDefined();
      expect(result.processedPath).toBeDefined();
      expect(result.chunks).toBeDefined();
      expect(mockProgress).toHaveBeenCalledWith('preprocessing', 0, 'Starting audio preprocessing...');
    });

    it('should handle processing errors', async () => {
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
      
      const processor = new AudioProcessor();
      
      await expect(processor.processAudio('/mock/audio.webm'))
        .rejects.toThrow();
    });

    it('should report progress during processing', async () => {
      const mockProgress = jest.fn();
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
      
      const processor = new AudioProcessor();
      await processor.processAudio('/mock/audio.webm', mockProgress);
      
      expect(mockProgress).toHaveBeenCalled();
      expect(mockProgress).toHaveBeenCalledWith('preprocessing', expect.any(Number), expect.any(String));
    });
  });

  describe('Audio Preprocessing', () => {
    it('should preprocess audio to correct format', async () => {
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
      
      const processor = new AudioProcessor();
      const result = await processor.preprocessAudio('/mock/audio.webm');
      
      expect(result).toContain('.wav');
      expect(spawn).toHaveBeenCalled();
    });

    it('should handle unsupported audio formats', async () => {
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 0); // Error
          }
        })
      };
      
      spawn.mockReturnValue(mockSpawn);
      
      const processor = new AudioProcessor();
      
      await expect(processor.preprocessAudio('/mock/audio.xyz'))
        .rejects.toThrow();
    });
  });

  describe('Audio Duration Detection', () => {
    it('should get audio duration successfully', async () => {
      const mockSpawn = {
        stdout: { 
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              // Mock ffprobe output
              callback(Buffer.from('120.5'));
            }
          })
        },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(0), 0);
          }
        })
      };
      
      spawn.mockReturnValue(mockSpawn);
      
      const processor = new AudioProcessor();
      const duration = await processor.getAudioDuration('/mock/audio.wav');
      
      expect(duration).toBe(120.5);
    });

    it('should handle duration detection errors', async () => {
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 0);
          }
        })
      };
      
      spawn.mockReturnValue(mockSpawn);
      
      const processor = new AudioProcessor();
      
      await expect(processor.getAudioDuration('/mock/audio.wav'))
        .rejects.toThrow();
    });
  });

  describe('Audio Chunking', () => {
    it('should create chunks for long audio', async () => {
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
      
      const processor = new AudioProcessor();
      const chunks = await processor.createChunks('/mock/audio.wav', 90); // 90 second audio
      
      expect(chunks).toBeDefined();
      expect(Array.isArray(chunks)).toBe(true);
    });

    it('should not chunk short audio files', async () => {
      const processor = new AudioProcessor();
      const chunks = await processor.createChunks('/mock/audio.wav', 20); // 20 second audio
      
      expect(chunks).toEqual([{ 
        path: '/mock/audio.wav', 
        startTime: 0, 
        duration: 20 
      }]);
    });

    it('should handle chunking with overlap', async () => {
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
      
      const processor = new AudioProcessor();
      processor.chunkOverlap = 5;
      
      const chunks = await processor.createChunks('/mock/audio.wav', 70);
      
      expect(chunks).toBeDefined();
      // Should account for overlap in chunk timing
    });
  });

  describe('Utility Methods', () => {
    it('should generate unique temp filenames', () => {
      const processor = new AudioProcessor();
      const filename1 = processor.generateTempFilename('processed', 'wav');
      const filename2 = processor.generateTempFilename('processed', 'wav');
      
      expect(filename1).toContain('processed');
      expect(filename1).toContain('.wav');
      expect(filename1).not.toBe(filename2);
    });

    it('should validate audio file existence', () => {
      fs.existsSync.mockReturnValue(true);
      
      const processor = new AudioProcessor();
      const result = processor.validateAudioFile('/mock/audio.wav');
      
      expect(result).toBe(true);
      expect(fs.existsSync).toHaveBeenCalledWith('/mock/audio.wav');
    });

    it('should detect invalid audio files', () => {
      fs.existsSync.mockReturnValue(false);
      
      const processor = new AudioProcessor();
      const result = processor.validateAudioFile('/nonexistent/audio.wav');
      
      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing ffmpeg gracefully', async () => {
      spawn.mockImplementation(() => {
        throw new Error('ffmpeg not found');
      });
      
      const processor = new AudioProcessor();
      
      await expect(processor.processAudio('/mock/audio.webm'))
        .rejects.toThrow('ffmpeg not found');
    });

    it('should cleanup temp files on error', async () => {
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { on: jest.fn() },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 0);
          }
        })
      };
      
      spawn.mockReturnValue(mockSpawn);
      
      const processor = new AudioProcessor();
      
      try {
        await processor.processAudio('/mock/audio.webm');
      } catch (error) {
        // Should attempt cleanup
        expect(fs.unlinkSync).toHaveBeenCalled();
      }
    });

    it('should handle corrupt audio files', async () => {
      const mockSpawn = {
        stdout: { on: jest.fn() },
        stderr: { 
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback(Buffer.from('Invalid data stream'));
            }
          })
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(() => callback(1), 0);
          }
        })
      };
      
      spawn.mockReturnValue(mockSpawn);
      
      const processor = new AudioProcessor();
      
      await expect(processor.processAudio('/mock/corrupt.webm'))
        .rejects.toThrow();
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize processing parameters for short files', async () => {
      const processor = new AudioProcessor();
      const optimized = processor.optimizeForShortAudio(15); // 15 second file
      
      expect(optimized.chunkDuration).toBeGreaterThanOrEqual(15);
      expect(optimized.skipChunking).toBe(true);
    });

    it('should maintain quality settings for medical content', () => {
      const processor = new AudioProcessor();
      const settings = processor.getMedicalQualitySettings();
      
      expect(settings.sampleRate).toBe(16000);
      expect(settings.bitRate).toBeDefined();
      expect(settings.channels).toBe(1); // Mono for smaller files
    });
  });
});

// Simple module export test
describe('Module Export', () => {
  it('should export AudioProcessor class', () => {
    const audioModule = require('../audio-processor.js');
    expect(audioModule).toBeDefined();
  });
});