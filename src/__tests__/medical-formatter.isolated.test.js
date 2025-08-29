/**
 * Isolated unit tests for MedicalFormatter
 * Tests each component independently to isolate issues
 */

const { MedicalFormatter } = require('../medical-formatter.js');

describe('MedicalFormatter - Isolated Tests', () => {
  let formatter;

  beforeEach(() => {
    formatter = new MedicalFormatter();
  });

  describe('Simple Template Formatter', () => {
    test('should extract identification correctly', () => {
      const input = `"Identification,": John Smith is a 14-year-old male with a history of ADHD and major depressive disorder. He's in the seventh grade.`;
      
      const sections = formatter.extractSectionsSimple(input);
      
      expect(sections.identification).toBe('John Smith is a 14-year-old male with a history of ADHD and major depressive disorder. He\'s in the seventh grade');
    });

    test('should extract problems correctly', () => {
      const input = `Problemist: ADHD. Improving, partial control. Major depressive disorder. Stable.`;
      
      const sections = formatter.extractSectionsSimple(input);
      
      expect(sections.problems).toEqual([
        'ADHD: improving, partial control',
        'Major Depressive Disorder: stable'
      ]);
    });

    test('should extract medications correctly', () => {
      const input = `Current medications: [Lexapro] 20 mg (one pill per day), Join A P.M. 60 mg QHS.`;
      
      const sections = formatter.extractSectionsSimple(input);
      
      expect(sections.medications).toEqual([
        'Lexapro 20 mg (one pill per day)',
        '[Journ PM] 60 mg (QHS)'
      ]);
    });

    test('should format complete template correctly', () => {
      const input = `"Identification,": John Smith is a 14-year-old male with a history of ADHD and major depressive disorder. He's in the seventh grade. Chief Complaint Follow-up. Problemist: ADHD. Improving, partial control. Major depressive disorder, stable. Current medications: [Lexapro] 20 mg (one pill per day), Join A P.M. 60 mg QHS.`;
      
      const result = formatter.simpleTemplateFormat(input);
      
      expect(result).toContain('# Identification');
      expect(result).toContain('**CC:** Follow-up');
      expect(result).toContain('## Problem List');
      expect(result).toContain('## Current medications');
      expect(result).toContain('John Smith is a 14-year-old male');
      expect(result).toContain('ADHD: improving, partial control');
      expect(result).toContain('Lexapro 20 mg');
    });
  });

  describe('Hallucination Validation', () => {
    test('should pass validation for identical content', () => {
      const original = 'John Smith ADHD Lexapro 20 mg';
      const formatted = '# Identification\nJohn Smith\n## Problem List\n1. ADHD\n## Medications\n1. Lexapro 20 mg';
      
      const isValid = formatter.validateNoHallucination(original, formatted);
      
      expect(isValid).toBe(true);
    });

    test('should fail validation for hallucinated medications', () => {
      const original = 'John Smith ADHD';
      const formatted = '# Identification\nJohn Smith\n## Problem List\n1. ADHD\n## Medications\n1. Prozac 40 mg';
      
      const isValid = formatter.validateNoHallucination(original, formatted);
      
      expect(isValid).toBe(false);
    });

    test('should fail validation for suspiciously long output', () => {
      const original = 'Short text';
      const formatted = 'This is a very long formatted text that is suspiciously much longer than the original input and contains lots of additional information that was not present in the original transcript which suggests hallucination or fabrication of content.';
      
      const isValid = formatter.validateNoHallucination(original, formatted);
      
      expect(isValid).toBe(false);
    });
  });

  describe('Medical Word Extraction', () => {
    test('should extract medical terms correctly', () => {
      const text = 'John Smith is a 14-year-old male with ADHD taking Lexapro 20 mg daily';
      
      const words = formatter.extractKeyMedicalWords(text);
      
      expect(words).toContain('lexapro');
      expect(words).toContain('ADHD');
      expect(words).toContain('20 mg');
      expect(words).toContain('daily');
    });
  });
});

// Integration test to verify full pipeline
describe('MedicalFormatter - Integration', () => {
  test('should process real transcript end-to-end', async () => {
    const formatter = new MedicalFormatter();
    const input = `"Identification,": John Smith is a 14-year-old male with a history of ADHD and major depressive disorder. He's in the seventh grade. Chief Complaint Follow-up. Problemist: ADHD. Improving, partial control. Two, major depressive disorder, stable. Current medications: [Lexapro] 20 mg (one pill per day), Join A P.M. 60 mg QHS.`;
    
    console.log('🧪 INTEGRATION TEST - Input:', input.substring(0, 100) + '...');
    
    const result = await formatter.formatMedicalNote(input);
    
    console.log('🧪 INTEGRATION TEST - Result method:', result.method);
    console.log('🧪 INTEGRATION TEST - Output:', result.formatted.substring(0, 200) + '...');
    
    expect(result).toBeDefined();
    expect(result.formatted).toBeDefined();
    expect(result.method).toBeDefined();
    expect(result.formatted.length).toBeGreaterThan(0);
    
    // Verify template structure
    expect(result.formatted).toContain('# Identification');
    expect(result.formatted).toContain('**CC:**');
    expect(result.formatted).toContain('## Problem List');
    expect(result.formatted).toContain('## Current medications');
  });
});