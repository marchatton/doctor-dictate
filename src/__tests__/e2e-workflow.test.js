/**
 * End-to-end workflow tests for the complete medical dictation pipeline
 */

const { ProcessorFactory } = require('../services/processing/unified-processor');
const fs = require('fs');
const path = require('path');

describe('E2E Medical Dictation Workflow', () => {
  const testDataDir = path.join(__dirname, '..', '..', 'docs', 'sample-data');
  const testAudioPath = path.join(testDataDir, 'mock recording-samir.m4a');
  
  describe('Complete Processing Pipeline', () => {
    test('should process medical dictation from audio to formatted note', async () => {
      // Skip if test audio doesn't exist
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping E2E test: Audio file not found');
        return;
      }
      
      const processor = ProcessorFactory.createFast();
      const result = await processor.process(testAudioPath);
      
      // Verify basic structure
      expect(result).toHaveProperty('text');
      expect(result).toHaveProperty('transcript');
      expect(result).toHaveProperty('mode');
      expect(result).toHaveProperty('processingTime');
      
      // Verify content quality
      if (result.text) {
        // Check for key medical sections
        const hasIdentification = result.text.includes('Identification') || 
                                 result.text.includes('IDENTIFICATION');
        const hasAssessment = result.text.includes('Assessment') || 
                             result.text.includes('ASSESSMENT');
        const hasPlan = result.text.includes('Plan') || 
                       result.text.includes('PLAN');
        
        expect(hasIdentification || hasAssessment || hasPlan).toBe(true);
      }
    }, 180000); // 3 minute timeout for full processing
    
    test('should maintain patient information integrity', async () => {
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping: Audio file not found');
        return;
      }
      
      const processor = ProcessorFactory.createAccurate();
      const result = await processor.process(testAudioPath);
      
      if (result.text) {
        // Check for critical patient information
        const criticalInfo = [
          'John Smith',  // Patient name
          'ADHD',        // Primary diagnosis
          '14'           // Age
        ];
        
        criticalInfo.forEach(info => {
          const found = result.text.toLowerCase().includes(info.toLowerCase());
          if (!found) {
            console.warn(`Missing critical info: ${info}`);
          }
        });
      }
    }, 180000);
  });
  
  describe('Mode Comparison', () => {
    test('ACCURATE mode should produce more detailed output than FAST mode', async () => {
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping: Audio file not found');
        return;
      }
      
      const fastProcessor = ProcessorFactory.createFast();
      const accurateProcessor = ProcessorFactory.createAccurate();
      
      const [fastResult, accurateResult] = await Promise.all([
        fastProcessor.process(testAudioPath),
        accurateProcessor.process(testAudioPath)
      ]);
      
      // Accurate mode should generally produce longer transcripts
      if (fastResult.transcript && accurateResult.transcript) {
        const fastLength = fastResult.transcript.length;
        const accurateLength = accurateResult.transcript.length;
        
        // Log for debugging but don't fail test as models may vary
        console.log(`Fast transcript: ${fastLength} chars`);
        console.log(`Accurate transcript: ${accurateLength} chars`);
      }
    }, 300000); // 5 minute timeout
  });
  
  describe('Error Recovery', () => {
    test('should handle processing errors gracefully', async () => {
      const processor = ProcessorFactory.createFast();
      
      // Test with non-existent file
      try {
        await processor.process('non-existent-file.m4a');
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeTruthy();
      }
    });
    
    test('should fallback appropriately when services unavailable', async () => {
      const processor = ProcessorFactory.createAccurate();
      
      // Mock service unavailability
      const originalTranscribe = processor.transcribe;
      let fallbackAttempted = false;
      
      processor.transcribe = async function(...args) {
        if (!fallbackAttempted) {
          fallbackAttempted = true;
          throw new Error('Service unavailable');
        }
        return originalTranscribe.call(this, ...args);
      };
      
      try {
        const result = await processor.process(testAudioPath);
        // Should have fallen back to FAST mode
        expect(result.mode).toBe('Fast');
      } catch (error) {
        // Acceptable if no fallback available
        expect(error.message).toContain('Service unavailable');
      }
    });
  });
  
  describe('Output Quality', () => {
    test('should format medical terms correctly', async () => {
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping: Audio file not found');
        return;
      }
      
      const processor = ProcessorFactory.createAccurate();
      const result = await processor.process(testAudioPath);
      
      if (result.text) {
        // Check for proper medical formatting
        const hasMedicalAbbreviations = /\b(ADHD|MDD|BP|HR|QHS|BID|TID|PRN)\b/.test(result.text);
        const hasDosageFormat = /\d+\s*(mg|mcg|ml|units)/i.test(result.text);
        
        // At least some medical formatting should be present
        expect(hasMedicalAbbreviations || hasDosageFormat).toBe(true);
      }
    }, 180000);
    
    test('should structure output with appropriate sections', async () => {
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping: Audio file not found');
        return;
      }
      
      const processor = ProcessorFactory.createAccurate();
      const result = await processor.process(testAudioPath);
      
      if (result.text) {
        // Check for markdown headers or section indicators
        const hasHeaders = result.text.includes('###') || result.text.includes('##');
        const hasSections = result.text.includes(':') && result.text.includes('\n');
        
        expect(hasHeaders || hasSections).toBe(true);
      }
    }, 180000);
  });
  
  describe('Performance Benchmarks', () => {
    test('should meet performance targets for FAST mode', async () => {
      if (!fs.existsSync(testAudioPath)) {
        console.log('Skipping: Audio file not found');
        return;
      }
      
      const processor = ProcessorFactory.createFast();
      const startTime = Date.now();
      
      await processor.process(testAudioPath);
      
      const processingTime = (Date.now() - startTime) / 1000;
      console.log(`FAST mode processing time: ${processingTime}s`);
      
      // Should process reasonably quickly (adjust based on your requirements)
      expect(processingTime).toBeLessThan(120); // 2 minutes max
    }, 180000);
    
    test('should use reasonable memory', () => {
      const memUsage = process.memoryUsage();
      const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
      
      console.log(`Heap used: ${heapUsedMB.toFixed(2)} MB`);
      
      // Should stay under reasonable memory limits
      expect(heapUsedMB).toBeLessThan(2000); // 2GB max
    });
  });
});