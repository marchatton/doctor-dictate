/**
 * Test suite for medical prompt system
 */

const { describe, it, expect, beforeEach } = require('@jest/globals');
const { MedicalPromptV5 } = require('../src/prompts/medical-prompt-v5');

describe('Medical Prompt V5', () => {
  describe('Prompt Generation', () => {
    it('should generate complete prompt with all sections', () => {
      const input = 'Patient John Smith has ADHD.';
      const prompt = MedicalPromptV5.getPrompt(input);
      
      expect(prompt).toContain('MEDICAL DICTATION FORMATTING TASK');
      expect(prompt).toContain('CRITICAL RULES');
      expect(prompt).toContain('REQUIRED SECTIONS');
      expect(prompt).toContain('MEDICAL CORRECTIONS');
      expect(prompt).toContain(input);
    });
    
    it('should include few-shot examples', () => {
      const prompt = MedicalPromptV5.getPrompt('test');
      
      expect(prompt).toContain('Example Input:');
      expect(prompt).toContain('Example Output:');
      expect(prompt).toContain('### Identification');
      expect(prompt).toContain('### CC');
    });
    
    it('should include current date if not present', () => {
      const input = 'Patient seen today.';
      const prompt = MedicalPromptV5.getPrompt(input);
      const today = new Date().toLocaleDateString();
      
      expect(prompt).toContain(today);
    });
  });
  
  describe('Post-Processing', () => {
    it('should extract and remove LLM notes', () => {
      const output = `### Identification
John Smith is a 14-year-old male.

[Note: Some information was unclear in the dictation]

### CC
Follow-up`;
      
      const result = MedicalPromptV5.postProcessAndExtractNotes(output);
      
      expect(result.formatted).not.toContain('[Note:');
      expect(result.llmNotes).toContain('Some information was unclear');
    });
    
    it('should preserve medical content while removing notes', () => {
      const output = `### Assessment
ADHD - stable
[LLM Note: Medication name was unclear]
MDD - improving`;
      
      const result = MedicalPromptV5.postProcessAndExtractNotes(output);
      
      expect(result.formatted).toContain('ADHD - stable');
      expect(result.formatted).toContain('MDD - improving');
      expect(result.formatted).not.toContain('LLM Note');
    });
    
    it('should handle output without notes', () => {
      const output = `### Identification
John Smith, 14 years old

### CC
Follow-up`;
      
      const result = MedicalPromptV5.postProcessAndExtractNotes(output);
      
      expect(result.formatted).toBe(output);
      expect(result.llmNotes).toBe('');
    });
  });
  
  describe('Dictation Command Processing', () => {
    it('should convert "period" to "." at end of sentences', () => {
      const input = 'Patient is stable period Next sentence here.';
      const prompt = MedicalPromptV5.getPrompt(input);
      
      expect(prompt).toContain('CONVERT DICTATION COMMANDS');
      expect(prompt).toContain('"period" or "Period" at end of sentence → "."');
    });
    
    it('should preserve "period" in medical contexts', () => {
      const prompt = MedicalPromptV5.getPrompt('interim period');
      
      expect(prompt).toContain('Keep "period" when it\'s part of a word');
      expect(prompt).toContain('interim period');
    });
    
    it('should handle paragraph and line commands', () => {
      const prompt = MedicalPromptV5.getPrompt('next paragraph');
      
      expect(prompt).toContain('"next paragraph" → actual paragraph break');
      expect(prompt).toContain('"next line" → actual line break');
    });
  });
  
  describe('Medical Corrections', () => {
    it('should include medication name corrections', () => {
      const prompt = MedicalPromptV5.getPrompt('Lexapot');
      
      expect(prompt).toContain('MEDICAL CORRECTIONS');
      expect(prompt).toContain('Lexapot → Lexapro');
    });
    
    it('should include medical abbreviation rules', () => {
      const prompt = MedicalPromptV5.getPrompt('qhs bid tid');
      
      expect(prompt).toContain('QHS, BID, TID, PRN');
    });
    
    it('should format medication dosages', () => {
      const prompt = MedicalPromptV5.getPrompt('20 milligrams');
      
      expect(prompt).toContain('milligrams → mg');
      expect(prompt).toContain('Use standard formats');
    });
  });
  
  describe('Template Compliance', () => {
    it('should require all mandatory sections', () => {
      const sections = MedicalPromptV5.REQUIRED_SECTIONS;
      
      expect(sections).toContain('### Identification');
      expect(sections).toContain('### CC');
      expect(sections).toContain('### Problem List');
      expect(sections).toContain('### Assessment');
      expect(sections).toContain('### Plan');
    });
    
    it('should check for section completeness', () => {
      const output = `### Identification
John Smith

### CC
Follow-up`;
      
      const missingSections = MedicalPromptV5.REQUIRED_SECTIONS.filter(
        section => !output.includes(section)
      );
      
      expect(missingSections).toContain('### Problem List');
      expect(missingSections).toContain('### Assessment');
      expect(missingSections).toContain('### Plan');
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle empty input', () => {
      const prompt = MedicalPromptV5.getPrompt('');
      
      expect(prompt).toBeDefined();
      expect(prompt).toContain('MEDICAL DICTATION FORMATTING TASK');
    });
    
    it('should handle very long input', () => {
      const longInput = 'Patient history. '.repeat(1000);
      const prompt = MedicalPromptV5.getPrompt(longInput);
      
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(longInput.length);
    });
    
    it('should handle special characters', () => {
      const input = 'Patient\'s BP: 120/80, HR: 72 & stable';
      const prompt = MedicalPromptV5.getPrompt(input);
      
      expect(prompt).toContain(input);
    });
    
    it('should handle multiple speaker indicators', () => {
      const input = 'Doctor: Patient is stable. Nurse: Vitals recorded.';
      const result = MedicalPromptV5.postProcessAndExtractNotes(input);
      
      expect(result.formatted).toBeDefined();
    });
  });
  
  describe('Formatting Rules', () => {
    it('should format vital signs correctly', () => {
      const prompt = MedicalPromptV5.getPrompt('blood pressure 120 over 80');
      
      expect(prompt).toContain('120/80');
    });
    
    it('should format dates correctly', () => {
      const prompt = MedicalPromptV5.getPrompt('July 10th 2025');
      
      expect(prompt).toContain('MM/DD/YYYY format');
    });
    
    it('should handle numbered lists', () => {
      const prompt = MedicalPromptV5.getPrompt('problem one ADHD problem two depression');
      
      expect(prompt).toContain('numbered lists');
      expect(prompt).toContain('1.');
      expect(prompt).toContain('2.');
    });
    
    it('should capitalize medical abbreviations', () => {
      const input = 'adhd mdd bp hr';
      const prompt = MedicalPromptV5.getPrompt(input);
      
      expect(prompt).toContain('ADHD');
      expect(prompt).toContain('MDD');
    });
  });
  
  describe('Content Preservation', () => {
    it('should preserve all medical information', () => {
      const criticalInfo = [
        'suicide attempt',
        'Lexapro 20mg',
        'ADHD diagnosis',
        'blood pressure 120/80'
      ];
      
      criticalInfo.forEach(info => {
        const prompt = MedicalPromptV5.getPrompt(info);
        expect(prompt).toContain(info);
      });
    });
    
    it('should not add information not in source', () => {
      const prompt = MedicalPromptV5.getPrompt('Patient has ADHD');
      
      expect(prompt).toContain('Do NOT add information');
      expect(prompt).toContain('ONLY format what is dictated');
    });
  });
});