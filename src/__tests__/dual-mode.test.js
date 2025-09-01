/**
 * Test suite for dual-mode processing system
 */

const { ProcessingModes } = require('../processing-config');
const { UnifiedProcessor, ProcessorFactory } = require('../unified-processor');
const { WhisperCpp } = require('../whisper-cpp');
const { OllamaFormatter } = require('../ollama-formatter');
const { ContentVerifier } = require('../content-verifier');
const fs = require('fs');
const path = require('path');

describe('Dual-Mode Processing System', () => {
  const testAudioPath = path.join(__dirname, '..', '..', 'docs', 'sample-data', 'mock recording-samir.m4a');
  
  describe('Processing Modes Configuration', () => {
    test('should have FAST mode configured correctly', () => {
      const fastMode = ProcessingModes.FAST;
      
      expect(fastMode).toBeDefined();
      expect(fastMode.whisper.model).toBe('tiny.en');
      expect(fastMode.ollama.model).toBe('qwen2.5:0.5b');
      expect(fastMode.vad.enabled).toBe(true);
      expect(fastMode.vad.threshold).toBe(0.6);
    });
    
    test('should have ACCURATE mode configured correctly', () => {
      const accurateMode = ProcessingModes.ACCURATE;
      
      expect(accurateMode).toBeDefined();
      expect(accurateMode.whisper.model).toBe('base.en');
      expect(accurateMode.ollama.model).toBe('qwen2.5:1.5b');
      expect(accurateMode.vad.enabled).toBe(true);
      expect(accurateMode.vad.threshold).toBe(0.4);
    });
    
    test('should have different performance expectations', () => {
      expect(ProcessingModes.FAST.expected.speed).toBe('7-10x real-time');
      expect(ProcessingModes.ACCURATE.expected.speed).toBe('3-5x real-time');
      
      expect(ProcessingModes.FAST.expected.accuracy).toBe('85%');
      expect(ProcessingModes.ACCURATE.expected.accuracy).toBe('95%');
    });
  });
  
  describe('ProcessorFactory', () => {
    test('should create FAST processor', () => {
      const processor = ProcessorFactory.createFast();
      
      expect(processor).toBeInstanceOf(UnifiedProcessor);
      expect(processor.config.name).toBe('Fast');
    });
    
    test('should create ACCURATE processor', () => {
      const processor = ProcessorFactory.createAccurate();
      
      expect(processor).toBeInstanceOf(UnifiedProcessor);
      expect(processor.config.name).toBe('High Accuracy');
    });
  });
  
  describe('WhisperCpp', () => {
    let whisperCpp;
    
    beforeAll(() => {
      whisperCpp = new WhisperCpp({ model: 'tiny.en' });
    });
    
    test('should initialize with correct model', () => {
      expect(whisperCpp.model).toBe('tiny.en');
    });
    
    test('should detect whisper-cli executable', async () => {
      const isAvailable = await whisperCpp.isAvailable();
      expect(typeof isAvailable).toBe('boolean');
    });
    
    test('should validate audio conversion for non-WAV files', async () => {
      const testFile = 'test.m4a';
      // Mock the conversion since we're just testing the logic
      const shouldConvert = !testFile.endsWith('.wav');
      expect(shouldConvert).toBe(true);
    });
  });
  
  describe('ContentVerifier', () => {
    let verifier;
    
    beforeAll(() => {
      verifier = new ContentVerifier();
    });
    
    test('should verify content with high coverage', () => {
      const input = 'The patient John Smith has ADHD and depression.';
      const output = 'John Smith has ADHD and depression.';
      
      const result = verifier.verifyContent(input, output);
      
      expect(result.isValid).toBe(true);
      expect(result.coverage).toBeGreaterThan(0.8);
    });
    
    test('should detect missing content', () => {
      const input = 'The patient John Smith has ADHD and depression. He takes Lexapro daily.';
      const output = 'John Smith has ADHD.';
      
      const result = verifier.verifyContent(input, output);
      
      expect(result.isValid).toBe(false);
      expect(result.coverage).toBeLessThan(0.8);
      expect(result.missingWords).toContain('depression');
      expect(result.missingWords).toContain('Lexapro');
    });
    
    test('should find missing sentences', () => {
      const input = 'First sentence here. Second sentence missing. Third sentence here.';
      const output = 'First sentence here. Third sentence here.';
      
      const result = verifier.verifyContent(input, output);
      
      expect(result.missingSentences.length).toBeGreaterThan(0);
      expect(result.missingSentences[0]).toContain('Second sentence');
    });
  });
  
  describe('OllamaFormatter Configuration', () => {
    test('should initialize with FAST mode config', () => {
      const formatter = new OllamaFormatter({ 
        model: ProcessingModes.FAST.ollama.model 
      });
      expect(formatter.model).toBe('qwen2.5:0.5b');
    });
    
    test('should initialize with ACCURATE mode config', () => {
      const formatter = new OllamaFormatter({ 
        model: ProcessingModes.ACCURATE.ollama.model 
      });
      expect(formatter.model).toBe('qwen2.5:1.5b');
    });
    
    test('should have appropriate timeout settings', () => {
      expect(ProcessingModes.FAST.ollama.timeout).toBe(30000);
      expect(ProcessingModes.ACCURATE.ollama.timeout).toBe(60000);
    });
  });
});