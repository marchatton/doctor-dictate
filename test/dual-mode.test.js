/**
 * Test suite for dual-mode processing system
 */

const { describe, it, expect, beforeAll, afterAll } = require('@jest/globals');
const { ProcessingModes } = require('../src/processing-config');
const { UnifiedProcessor, ProcessorFactory } = require('../src/unified-processor');
const { WhisperCpp } = require('../src/whisper-cpp');
const { OllamaFormatter } = require('../src/ollama-formatter');
const { ContentVerifier } = require('../src/content-verifier');
const fs = require('fs');
const path = require('path');

describe('Dual-Mode Processing System', () => {
  const testAudioPath = path.join(__dirname, '..', 'docs', 'sample-data', 'mock recording-samir.m4a');
  const tempDir = path.join(__dirname, 'temp');
  
  beforeAll(() => {
    // Create temp directory for test outputs
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });
  
  afterAll(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
  
  describe('Processing Modes Configuration', () => {
    it('should have FAST mode configured correctly', () => {
      const fastMode = ProcessingModes.FAST;
      
      expect(fastMode).toBeDefined();
      expect(fastMode.whisper.model).toBe('tiny.en');
      expect(fastMode.ollama.model).toBe('qwen2.5:0.5b');
      expect(fastMode.vad.enabled).toBe(true);
      expect(fastMode.vad.threshold).toBe(0.6);
    });
    
    it('should have ACCURATE mode configured correctly', () => {
      const accurateMode = ProcessingModes.ACCURATE;
      
      expect(accurateMode).toBeDefined();
      expect(accurateMode.whisper.model).toBe('base.en');
      expect(accurateMode.ollama.model).toBe('qwen2.5:1.5b');
      expect(accurateMode.vad.enabled).toBe(true);
      expect(accurateMode.vad.threshold).toBe(0.4);
    });
    
    it('should have different performance expectations', () => {
      expect(ProcessingModes.FAST.expected.speed).toBe('7-10x real-time');
      expect(ProcessingModes.ACCURATE.expected.speed).toBe('3-5x real-time');
      
      expect(ProcessingModes.FAST.expected.accuracy).toBe('85%');
      expect(ProcessingModes.ACCURATE.expected.accuracy).toBe('95%');
    });
  });
  
  describe('ProcessorFactory', () => {
    it('should create FAST processor', () => {
      const processor = ProcessorFactory.createFast();
      
      expect(processor).toBeInstanceOf(UnifiedProcessor);
      expect(processor.config.name).toBe('Fast');
    });
    
    it('should create ACCURATE processor', () => {
      const processor = ProcessorFactory.createAccurate();
      
      expect(processor).toBeInstanceOf(UnifiedProcessor);
      expect(processor.config.name).toBe('High Accuracy');
    });
    
    it('should auto-select mode based on file size', () => {
      // Mock a small file
      const smallFile = path.join(tempDir, 'small.m4a');
      fs.writeFileSync(smallFile, Buffer.alloc(1024 * 1024)); // 1MB
      
      const processor = ProcessorFactory.create(smallFile);
      expect(processor.config.name).toBe('High Accuracy');
      
      // Clean up
      fs.unlinkSync(smallFile);
    });
  });
  
  describe('WhisperCpp', () => {
    let whisperCpp;
    
    beforeAll(() => {
      whisperCpp = new WhisperCpp({ model: 'tiny.en' });
    });
    
    it('should initialize with correct model', () => {
      expect(whisperCpp.model).toBe('tiny.en');
    });
    
    it('should detect whisper-cli executable', async () => {
      const isAvailable = await whisperCpp.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });
    
    it('should check for model existence', async () => {
      try {
        const modelPath = await whisperCpp.ensureModel();
        expect(modelPath).toContain('ggml-tiny.en.bin');
      } catch (error) {
        // Model might not be downloaded in CI
        expect(error.message).toContain('Model tiny.en not found');
      }
    });
    
    it('should handle audio conversion', async () => {
      const wavPath = await whisperCpp.convertToWav(testAudioPath);
      
      if (wavPath !== testAudioPath) {
        expect(wavPath).toContain('-temp.wav');
        expect(fs.existsSync(wavPath)).toBe(true);
        
        // Clean up
        if (fs.existsSync(wavPath)) {
          fs.unlinkSync(wavPath);
        }
      }
    });
  });
  
  describe('OllamaFormatter', () => {
    let formatter;
    
    beforeAll(() => {
      formatter = new OllamaFormatter({ model: 'qwen2.5:0.5b' });
    });
    
    it('should initialize with specified model', () => {
      expect(formatter.model).toBe('qwen2.5:0.5b');
    });
    
    it('should check Ollama availability', async () => {
      const isAvailable = await formatter.isOllamaAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });
    
    it('should handle short text appropriately', async () => {
      const shortText = 'This is too short.';
      const result = await formatter.formatMedicalDictation(shortText);
      
      if (!await formatter.isOllamaAvailable()) {
        expect(result.success).toBe(false);
        expect(result.error).toContain('Ollama is not available');
      } else {
        // Should skip formatting for very short text
        expect(result.formatted).toBe(shortText);
      }
    });
  });
  
  describe('ContentVerifier', () => {
    let verifier;
    
    beforeAll(() => {
      verifier = new ContentVerifier();
    });
    
    it('should verify content with high coverage', () => {
      const input = 'The patient John Smith has ADHD and depression.';
      const output = 'John Smith has ADHD and depression.';
      
      const result = verifier.verifyContent(input, output);
      
      expect(result.isValid).toBe(true);
      expect(result.coverage).toBeGreaterThan(0.8);
    });
    
    it('should detect missing content', () => {
      const input = 'The patient John Smith has ADHD and depression. He takes Lexapro daily.';
      const output = 'John Smith has ADHD.';
      
      const result = verifier.verifyContent(input, output);
      
      expect(result.isValid).toBe(false);
      expect(result.coverage).toBeLessThan(0.8);
      expect(result.missingWords).toContain('depression');
      expect(result.missingWords).toContain('Lexapro');
    });
    
    it('should find missing sentences', () => {
      const input = 'First sentence here. Second sentence missing. Third sentence here.';
      const output = 'First sentence here. Third sentence here.';
      
      const result = verifier.verifyContent(input, output);
      
      expect(result.missingSentences.length).toBeGreaterThan(0);
      expect(result.missingSentences[0]).toContain('Second sentence');
    });
  });
  
  describe('Integration Tests', () => {
    it('should process audio in FAST mode', async () => {
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping: Test audio file not found');
        return;
      }
      
      const processor = ProcessorFactory.createFast();
      const result = await processor.process(testAudioPath);
      
      expect(result).toBeDefined();
      expect(result.mode).toBe('Fast');
      expect(result.processingTime).toBeDefined();
      expect(result.metadata.whisperModel).toBe('tiny.en');
      expect(result.metadata.ollamaModel).toBe('qwen2.5:0.5b');
    }, 120000); // 2 minute timeout
    
    it('should process audio in ACCURATE mode', async () => {
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping: Test audio file not found');
        return;
      }
      
      const processor = ProcessorFactory.createAccurate();
      const result = await processor.process(testAudioPath);
      
      expect(result).toBeDefined();
      expect(result.mode).toBe('High Accuracy');
      expect(result.processingTime).toBeDefined();
      expect(result.metadata.whisperModel).toBe('base.en');
      expect(result.metadata.ollamaModel).toBe('qwen2.5:1.5b');
    }, 180000); // 3 minute timeout
    
    it('should fallback from ACCURATE to FAST on failure', async () => {
      const processor = new UnifiedProcessor('ACCURATE');
      
      // Mock a failure scenario
      processor.transcribe = jest.fn()
        .mockRejectedValueOnce(new Error('Simulated failure'))
        .mockResolvedValueOnce('Fallback transcript');
      
      processor.format = jest.fn()
        .mockResolvedValue('Formatted text');
      
      const result = await processor.process(testAudioPath);
      
      expect(result.mode).toBe('Fast'); // Should have fallen back
      expect(processor.transcribe).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Performance Tests', () => {
    it('FAST mode should be faster than ACCURATE mode', async () => {
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping: Test audio file not found');
        return;
      }
      
      const fastProcessor = ProcessorFactory.createFast();
      const accurateProcessor = ProcessorFactory.createAccurate();
      
      const fastStart = Date.now();
      await fastProcessor.process(testAudioPath);
      const fastTime = Date.now() - fastStart;
      
      const accurateStart = Date.now();
      await accurateProcessor.process(testAudioPath);
      const accurateTime = Date.now() - accurateStart;
      
      // Fast mode should be at least 20% faster
      expect(fastTime).toBeLessThan(accurateTime * 0.8);
    }, 300000); // 5 minute timeout
    
    it('should meet memory constraints', () => {
      const fastRAM = ProcessingModes.FAST.expected.ramUsage;
      const accurateRAM = ProcessingModes.ACCURATE.expected.ramUsage;
      
      expect(fastRAM).toBe('2-3GB');
      expect(accurateRAM).toBe('3.5-4.5GB');
      
      // Check current memory usage
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      
      expect(heapUsedMB).toBeLessThan(5000); // Should use less than 5GB
    });
  });
  
  describe('Error Handling', () => {
    it('should handle missing audio file gracefully', async () => {
      const processor = ProcessorFactory.createFast();
      const missingFile = path.join(tempDir, 'missing.m4a');
      
      await expect(processor.process(missingFile)).rejects.toThrow();
    });
    
    it('should handle corrupted audio gracefully', async () => {
      const corruptedFile = path.join(tempDir, 'corrupted.m4a');
      fs.writeFileSync(corruptedFile, 'not audio data');
      
      const processor = ProcessorFactory.createFast();
      
      await expect(processor.process(corruptedFile)).rejects.toThrow();
      
      // Clean up
      fs.unlinkSync(corruptedFile);
    });
    
    it('should handle Ollama timeout', async () => {
      const formatter = new OllamaFormatter({ 
        model: 'qwen2.5:0.5b',
        timeout: 1 // 1ms timeout to force failure
      });
      
      const longText = 'A'.repeat(10000);
      const result = await formatter.formatMedicalDictation(longText);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});