const { ProcessingModes } = require('../services/processing/processing-config.js');

describe('Whisper Model Configuration', () => {
  describe('FAST Mode', () => {
    it('should use base.en model (upgraded from tiny.en)', () => {
      expect(ProcessingModes.FAST.whisper.model).toBe('base.en');
    });

    it('should have correct configuration for fast processing', () => {
      expect(ProcessingModes.FAST.whisper.threads).toBeDefined();
      expect(ProcessingModes.FAST.whisper.parallel).toBe(4);
      expect(ProcessingModes.FAST.whisper.chunkSize).toBe(15);
    });
  });

  describe('ACCURATE Mode', () => {
    it('should use small.en model (upgraded from base.en)', () => {
      expect(ProcessingModes.ACCURATE.whisper.model).toBe('small.en');
    });

    it('should have correct configuration for accurate processing', () => {
      expect(ProcessingModes.ACCURATE.whisper.threads).toBeDefined();
      expect(ProcessingModes.ACCURATE.whisper.parallel).toBe(2);
      expect(ProcessingModes.ACCURATE.whisper.chunkSize).toBe(30);
    });
  });

  describe('Model Progression', () => {
    it('should have proper model size progression', () => {
      // Model sizes: tiny.en (39MB) -> base.en (141MB) -> small.en (244MB)
      const fastModel = ProcessingModes.FAST.whisper.model;
      const accurateModel = ProcessingModes.ACCURATE.whisper.model;

      expect(fastModel).toBe('base.en');
      expect(accurateModel).toBe('small.en');

      // Ensure ACCURATE uses a higher quality model than FAST
      const modelHierarchy = ['tiny.en', 'base.en', 'small.en', 'medium.en', 'large.en'];
      const fastIndex = modelHierarchy.indexOf(fastModel);
      const accurateIndex = modelHierarchy.indexOf(accurateModel);

      expect(accurateIndex).toBeGreaterThan(fastIndex);
    });
  });

  describe('Performance Expectations', () => {
    it('should have reasonable performance expectations for FAST mode', () => {
      expect(ProcessingModes.FAST.expected.speed).toBe('7-10x real-time');
      expect(ProcessingModes.FAST.expected.accuracy).toBe('85%');
    });

    it('should have high accuracy expectations for ACCURATE mode', () => {
      expect(ProcessingModes.ACCURATE.expected.speed).toBe('3-5x real-time');
      expect(ProcessingModes.ACCURATE.expected.accuracy).toBe('95%');
    });
  });
});