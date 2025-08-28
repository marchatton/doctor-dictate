/**
 * Tests for Medical Formatter
 * Simple tests focusing on medical text formatting functionality
 */

// Mock the OllamaFormatter dependency
jest.mock('../ollama-formatter.js', () => ({
  OllamaFormatter: jest.fn().mockImplementation(() => ({
    formatMedicalText: jest.fn().mockResolvedValue({
      success: true,
      formattedText: 'Formatted medical text',
      confidence: 0.9
    }),
    isAvailable: jest.fn().mockReturnValue(true)
  }))
}));

describe('MedicalFormatter', () => {
  let MedicalFormatter;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import after mocking
    delete require.cache[require.resolve('../medical-formatter.js')];
    const module = require('../medical-formatter.js');
    MedicalFormatter = module.MedicalFormatter || module;
  });

  describe('Initialization', () => {
    it('should create MedicalFormatter instance', () => {
      const formatter = new MedicalFormatter();
      
      expect(formatter).toBeDefined();
      expect(formatter.useOllama).toBe(true);
      expect(formatter.psychiatricMeds).toBeDefined();
      expect(formatter.medicalAbbreviations).toBeDefined();
    });

    it('should have psychiatric medications configured', () => {
      const formatter = new MedicalFormatter();
      
      expect(formatter.psychiatricMeds.lexapro).toBeDefined();
      expect(formatter.psychiatricMeds.lexapro.generic).toBe('escitalopram');
      expect(formatter.psychiatricMeds.zoloft.generic).toBe('sertraline');
    });

    it('should have medical abbreviations configured', () => {
      const formatter = new MedicalFormatter();
      
      expect(formatter.medicalAbbreviations.bid).toBe('BID');
      expect(formatter.medicalAbbreviations.mg).toBe('mg');
      expect(formatter.medicalAbbreviations.prn).toBe('PRN');
    });
  });

  describe('Text Formatting', () => {
    it('should format medical text successfully', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'Patient taking prozac 20 mg bid for depression';
      
      const result = await formatter.formatMedicalText(inputText);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.formattedText).toBeDefined();
    });

    it('should handle empty text gracefully', async () => {
      const formatter = new MedicalFormatter();
      const result = await formatter.formatMedicalText('');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should format medication names correctly', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'prozac 20mg lexapro 10mg';
      
      const formatted = await formatter.formatMedicationNames(inputText);
      
      expect(formatted).toContain('Prozac');
      expect(formatted).toContain('Lexapro');
      expect(formatted).toContain('mg');
    });

    it('should standardize medical abbreviations', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'take bid with prn for anxiety';
      
      const formatted = await formatter.standardizeAbbreviations(inputText);
      
      expect(formatted).toContain('BID');
      expect(formatted).toContain('PRN');
    });
  });

  describe('Dictation Pattern Processing', () => {
    it('should convert dictation patterns to punctuation', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'Patient reports anxiety period Sleep improved comma energy better';
      
      const formatted = await formatter.processDictationPatterns(inputText);
      
      expect(formatted).toContain('anxiety.');
      expect(formatted).toContain('improved,');
    });

    it('should handle paragraph breaks', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'First paragraph next paragraph Second paragraph';
      
      const formatted = await formatter.processDictationPatterns(inputText);
      
      expect(formatted).toContain('\n\n');
    });

    it('should preserve existing punctuation', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'Patient reports: anxiety, depression.';
      
      const formatted = await formatter.processDictationPatterns(inputText);
      
      expect(formatted).toContain(':');
      expect(formatted).toContain(',');
      expect(formatted).toContain('.');
    });
  });

  describe('Psychiatric Medication Formatting', () => {
    it('should format common psychiatric medications', async () => {
      const formatter = new MedicalFormatter();
      const medications = [
        'lexapro 10mg',
        'zoloft 50mg',
        'wellbutrin 150mg'
      ];
      
      for (const med of medications) {
        const formatted = await formatter.formatMedicationNames(med);
        expect(formatted).toMatch(/^[A-Z]/); // Should start with capital
        expect(formatted).toContain('mg');
      }
    });

    it('should handle generic vs brand names', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'sertraline 50mg also known as zoloft';
      
      const formatted = await formatter.formatMedicationNames(inputText);
      
      expect(formatted).toContain('sertraline');
      expect(formatted).toContain('Zoloft');
    });

    it('should preserve dosage information', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'prozac 20 mg twice daily';
      
      const formatted = await formatter.formatMedicationNames(inputText);
      
      expect(formatted).toContain('20 mg');
      expect(formatted).toMatch(/Prozac.*20 mg/);
    });
  });

  describe('Medical Section Organization', () => {
    it('should identify common medical sections', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'Chief complaint patient reports anxiety. History of present illness started two weeks ago.';
      
      const sections = await formatter.identifyMedicalSections(inputText);
      
      expect(sections).toBeDefined();
      expect(Array.isArray(sections)).toBe(true);
    });

    it('should organize text into logical sections', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'Patient reports anxiety. Taking sertraline 50mg. Follow up in 4 weeks.';
      
      const organized = await formatter.organizeSections(inputText);
      
      expect(organized).toBeDefined();
      expect(organized.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle formatting errors gracefully', async () => {
      const formatter = new MedicalFormatter();
      
      // Mock Ollama to fail
      formatter.ollamaFormatter.formatMedicalText.mockResolvedValue({
        success: false,
        error: 'Ollama service unavailable'
      });
      
      const result = await formatter.formatMedicalText('test text');
      
      // Should fallback to rule-based formatting
      expect(result).toBeDefined();
    });

    it('should validate input parameters', async () => {
      const formatter = new MedicalFormatter();
      
      const result = await formatter.formatMedicalText(null);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle malformed medication names', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'unknown medication xyz 99mg';
      
      const formatted = await formatter.formatMedicationNames(inputText);
      
      // Should not crash, return original or safe version
      expect(formatted).toBeDefined();
      expect(formatted).toContain('xyz');
    });
  });

  describe('Rule-Based Fallback', () => {
    it('should use rule-based formatting when Ollama unavailable', async () => {
      const formatter = new MedicalFormatter();
      
      // Disable Ollama
      formatter.useOllama = false;
      
      const result = await formatter.formatMedicalText('patient reports anxiety');
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.method).toBe('rule-based');
    });

    it('should apply basic formatting rules', async () => {
      const formatter = new MedicalFormatter();
      formatter.useOllama = false;
      
      const inputText = 'patient taking prozac 20mg bid';
      const result = await formatter.formatMedicalText(inputText);
      
      expect(result.formattedText).toMatch(/Patient/); // Should capitalize
      expect(result.formattedText).toContain('Prozac');
      expect(result.formattedText).toContain('BID');
    });
  });

  describe('Content Analysis', () => {
    it('should analyze medical content confidence', async () => {
      const formatter = new MedicalFormatter();
      const medicalText = 'Patient reports depression, anxiety. Taking sertraline 50mg BID.';
      
      const analysis = await formatter.analyzeMedicalContent(medicalText);
      
      expect(analysis).toBeDefined();
      expect(analysis.confidence).toBeGreaterThan(0);
      expect(analysis.medicalTermsFound).toBeGreaterThan(0);
    });

    it('should detect psychiatric content', async () => {
      const formatter = new MedicalFormatter();
      const psychiatricText = 'Patient presents with anxiety and depression';
      
      const analysis = await formatter.analyzeMedicalContent(psychiatricText);
      
      expect(analysis.isPsychiatric).toBe(true);
      expect(analysis.psychiatricTerms).toContain('anxiety');
      expect(analysis.psychiatricTerms).toContain('depression');
    });

    it('should handle non-medical text', async () => {
      const formatter = new MedicalFormatter();
      const nonMedicalText = 'The weather is nice today';
      
      const analysis = await formatter.analyzeMedicalContent(nonMedicalText);
      
      expect(analysis.confidence).toBeLessThan(0.5);
      expect(analysis.medicalTermsFound).toBe(0);
    });
  });

  describe('Performance and Quality', () => {
    it('should format text in reasonable time', async () => {
      const formatter = new MedicalFormatter();
      const longText = 'Patient reports anxiety. '.repeat(100);
      
      const startTime = Date.now();
      const result = await formatter.formatMedicalText(longText);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete in 5 seconds
      expect(result.success).toBe(true);
    });

    it('should maintain text integrity', async () => {
      const formatter = new MedicalFormatter();
      const inputText = 'Patient reports specific symptoms and medication details';
      
      const result = await formatter.formatMedicalText(inputText);
      
      // Should preserve key medical information
      expect(result.formattedText).toContain('Patient');
      expect(result.formattedText).toContain('symptoms');
      expect(result.formattedText).toContain('medication');
    });
  });
});

// Simple module export test
describe('Module Export', () => {
  it('should export MedicalFormatter class', () => {
    const medicalModule = require('../medical-formatter.js');
    expect(medicalModule).toBeDefined();
  });
});