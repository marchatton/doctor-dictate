/**
 * Integration Tests for Medical Prompt System
 * Tests the complete prompt generation with all rules
 */

const { MedicalPrompt } = require('../prompts');
const { TemplateLoader } = require('../prompts/medical-prompt-v7');
const { SectionDetector } = require('../prompts/section-detector');

describe('Medical Prompt Integration', () => {
  let template;
  let promptGenerator;

  beforeEach(() => {
    // Load the medicine management template
    template = {
      id: "medicine-management",
      name: "Medicine Management Follow-up",
      sections: [
        {
          id: "identification",
          title: "Identification",
          format: "paragraph",
          patterns: ["^identification", "^patient"]
        },
        {
          id: "cc",
          title: "CC",
          format: "single-line",
          patterns: ["^chief complaint", "^cc"]
        },
        {
          id: "problem-list",
          title: "Problem List",
          format: "numbered-list",
          patterns: ["^problem list"]
        },
        {
          id: "current-meds",
          title: "Current Meds",
          format: "numbered-list",
          patterns: ["^current med"]
        }
      ],
      formatting: {
        sectionHeaderPrefix: "###",
        medicationFormat: "{Name} {Dosage} ({Frequency})",
        problemFormat: "{Diagnosis} – {status}",
        dateFormat: "MMM/DD/YYYY"
      },
      templateSpecificRules: [
        {
          section: "Current Meds",
          rule: "Format as: Name Dosage (frequency in patient's words)"
        }
      ]
    };

    promptGenerator = new MedicalPrompt(template);
  });

  describe('Rule Structure', () => {
    it('should have properly structured global rules', () => {
      const rules = promptGenerator.getGlobalRules();
      
      expect(rules).toBeInstanceOf(Array);
      expect(rules.length).toBeGreaterThan(0);
      
      rules.forEach(rule => {
        expect(rule).toHaveProperty('name');
        expect(rule).toHaveProperty('description');
        expect(rule).toHaveProperty('examples');
        expect(rule).toHaveProperty('constraints');
        
        expect(rule.examples).toBeInstanceOf(Array);
        expect(rule.constraints).toBeInstanceOf(Array);
        
        // Each example should have input/output
        rule.examples.forEach(ex => {
          expect(ex).toHaveProperty('input');
          expect(ex).toHaveProperty('output');
        });
      });
    });

    it('should include all critical global rules', () => {
      const rules = promptGenerator.getGlobalRules();
      const ruleNames = rules.map(r => r.name);
      
      expect(ruleNames).toContain('Content Preservation');
      expect(ruleNames).toContain('Dynamic Section Detection');
      expect(ruleNames).toContain('Medication Name Preservation');
      expect(ruleNames).toContain('Dosing Language Preservation');
      expect(ruleNames).toContain('Unit Abbreviations');
      expect(ruleNames).toContain('Filler Word Removal');
      expect(ruleNames).toContain('Unclear Content Marking');
    });
  });

  describe('Section Detection', () => {
    it('should detect sections with SectionDetector', () => {
      const detector = new SectionDetector(template);
      const text = "Identification John Smith is 14. Chief complaint follow-up. Problem list: ADHD.";
      
      const sections = detector.detectAllSections(text);
      
      expect(sections).toBeInstanceOf(Array);
      expect(sections.length).toBeGreaterThan(0);
      
      const sectionTitles = sections.map(s => s.title);
      expect(sectionTitles).toContain('Identification');
    });

    it('should detect dynamic sections not in template', () => {
      const detector = new SectionDetector(template);
      const text = "Physical exam: vital signs stable. Labs: CBC normal.";
      
      const sections = detector.detectAllSections(text);
      const sectionTitles = sections.map(s => s.title);
      
      // These sections are not in the template but should be detected
      expect(sections.some(s => s.type === 'smart')).toBe(true);
    });
  });

  describe('Dosing Language Preservation', () => {
    it('should preserve patient-friendly dosing language', () => {
      const rules = promptGenerator.getGlobalRules();
      const dosingRule = rules.find(r => r.name === 'Dosing Language Preservation');
      
      expect(dosingRule).toBeDefined();
      
      const examples = dosingRule.examples;
      expect(examples).toContainEqual({
        input: "one pill per day",
        output: "(one pill per day)"
      });
      expect(examples).toContainEqual({
        input: "as needed for anxiety",
        output: "(as needed for anxiety)"
      });
      
      // Should NOT convert to medical abbreviations
      expect(dosingRule.constraints).toContain(
        "Never convert to medical abbreviations (BID, TID, PRN, QHS)"
      );
    });
  });

  describe('Unit Abbreviations', () => {
    it('should convert units to short form', () => {
      const rules = promptGenerator.getGlobalRules();
      const unitRule = rules.find(r => r.name === 'Unit Abbreviations');
      
      expect(unitRule).toBeDefined();
      
      const examples = unitRule.examples;
      expect(examples).toContainEqual({
        input: "20 milligrams",
        output: "20mg"
      });
      expect(examples).toContainEqual({
        input: "5 milliliters",
        output: "5ml"
      });
    });
  });

  describe('Template Formatting', () => {
    it('should use template-specific formatting rules', () => {
      const prompt = promptGenerator.generatePrompt("test");
      
      // Check that medication format is included
      expect(prompt).toContain(template.formatting.medicationFormat);
      
      // Check that problem format is included
      expect(prompt).toContain(template.formatting.problemFormat);
    });

    it('should include template-specific rules', () => {
      const rules = promptGenerator.getTemplateSpecificRules();
      
      expect(rules).toBeInstanceOf(Array);
      expect(rules.some(r => 
        r.section === 'Current Meds' && 
        r.rule.includes("patient's words")
      )).toBe(true);
    });
  });

  describe('Prompt Generation', () => {
    it('should generate complete prompt with all sections', () => {
      const input = "Identification John Smith age 14 ADHD";
      const prompt = promptGenerator.generatePrompt(input);
      
      // Check for major sections
      expect(prompt).toContain('==== CONTEXT ====');
      expect(prompt).toContain('==== GLOBAL RULES ====');
      expect(prompt).toContain('==== TEMPLATE-SPECIFIC RULES ====');
      expect(prompt).toContain('==== EXAMPLES ====');
      expect(prompt).toContain('==== DATA REFERENCES ====');
      expect(prompt).toContain('==== CONSTRAINTS ====');
      expect(prompt).toContain('==== INPUT TO FORMAT ====');
      expect(prompt).toContain('==== INSTRUCTIONS ====');
      
      // Check that input is included
      expect(prompt).toContain(input);
    });

    it('should include detected sections in prompt', () => {
      const input = "Problem list: ADHD, depression. Physical exam: normal.";
      const prompt = promptGenerator.generatePrompt(input);
      
      // Should detect and report sections
      expect(prompt).toContain('DETECTED SECTIONS');
    });
  });

  describe('Examples', () => {
    it('should include comprehensive examples', () => {
      const examples = promptGenerator.getRelevantExamples();
      
      expect(examples).toBeInstanceOf(Array);
      expect(examples.length).toBeGreaterThan(0);
      
      // Check for different example types
      const exampleNames = examples.map(e => e.name);
      expect(exampleNames).toContain('Complex Full Note');
      expect(exampleNames).toContain('Punctuation and Quotes');
      expect(exampleNames).toContain('Filler Removal');
      expect(exampleNames).toContain('Dynamic Section Detection');
    });

    it('should show correct transformations in examples', () => {
      const examples = promptGenerator.getRelevantExamples();
      const complexExample = examples.find(e => e.name === 'Complex Full Note');
      
      expect(complexExample).toBeDefined();
      
      // Input should have dictation commands
      expect(complexExample.input).toContain('comma');
      expect(complexExample.input).toContain('period');
      
      // Output should have proper formatting
      expect(complexExample.output).toContain('###');
      expect(complexExample.output).toContain('1.');
      expect(complexExample.output).not.toContain('comma');
      expect(complexExample.output).not.toContain('period Next');
    });
  });

  describe('Medical Corrections', () => {
    it('should include medical dictionary corrections', () => {
      const prompt = promptGenerator.generatePrompt("test");
      
      // Should reference medical corrections
      expect(prompt).toContain('MEDICAL CORRECTIONS');
    });

    it('should mark unclear content', () => {
      const rules = promptGenerator.getGlobalRules();
      const unclearRule = rules.find(r => r.name === 'Unclear Content Marking');
      
      expect(unclearRule).toBeDefined();
      
      const examples = unclearRule.examples;
      expect(examples.some(e => e.output.includes('{unclear:'))).toBe(true);
      expect(examples.some(e => e.output.includes('{!dosage:'))).toBe(true);
    });
  });

  describe('Constraints', () => {
    it('should have comprehensive constraints', () => {
      const constraints = promptGenerator.getConstraints();
      
      expect(constraints).toBeInstanceOf(Array);
      expect(constraints.length).toBeGreaterThan(5);
      
      // Check for key constraints
      expect(constraints.some(c => c.includes('ALL sections'))).toBe(true);
      expect(constraints.some(c => c.includes('Never omit'))).toBe(true);
      expect(constraints.some(c => c.includes('medication names'))).toBe(true);
      expect(constraints.some(c => c.includes('dosing language'))).toBe(true);
    });
  });
});