/**
 * Medical Prompt Management System - Version 7.0 (ORIGINAL)
 * This is the original verbose version before simplification
 * Kept for comparison purposes
 */

const { SectionDetector } = require('./section-detector');
const { dictationCommands } = require('../data/dictation-commands');
const { dosingPatterns } = require('../data/dosing-patterns');
const medicalDictionary = require('../data/medical-dictionary');

class MedicalPromptV7Original {
  static VERSION = "7.0-original";
  
  constructor(template, options = {}) {
    this.template = template;
    this.dictionary = medicalDictionary;
    this.sectionDetector = new SectionDetector(template);
    this.options = options;
  }
  
  /**
   * Generate the prompt with proper structure
   */
  generatePrompt(dictationText, options = {}) {
    const currentDate = options.date || new Date().toLocaleDateString('en-US');
    
    const prompt = {
      name: "Medical Transcription Formatter v7",
      description: "Format medical dictation according to template structure",
      
      context: {
        template: this.getTemplateInstructions(),
        date: currentDate
      },
      
      globalRules: this.getGlobalRules(),
      
      templateSpecificRules: this.getTemplateSpecificRules(),
      
      dataReferences: {
        dictationCommands: this.getDictationCommandSummary(),
        medicalCorrections: this.getMedicalCorrectionsSummary(),
        dosingPreservation: this.getDosingPreservationRules()
      },
      
      examples: this.getRelevantExamples(),
      
      constraints: this.getConstraints(),
      
      input: dictationText
    };
    
    return this.formatPromptAsString(prompt);
  }
  
  /**
   * Get template instructions
   */
  getTemplateInstructions() {
    if (!this.template) {
      throw new Error('No template provided');
    }
    
    return `
TEMPLATE: ${this.template.name}

SECTION STRUCTURE:
${this.template.sections.map(section => {
  return `
${section.title} (${section.format}):
- Required: ${section.required}
- Format: ${section.format}
${section.format === 'numbered-list' ? '- Use numbered list (1. 2. 3.)' : ''}
${section.format === 'bullet-list' ? '- Use bullet points (-)' : ''}
${section.format === 'paragraph' ? '- Use paragraph format' : ''}
${section.format === 'single-line' ? '- Single line entry' : ''}
${section.itemFormat ? `- Item format: ${section.itemFormat}` : ''}
${section.default ? `- Default if not provided: ${section.default}` : ''}`;
}).join('\n')}

FORMATTING:
- Section headers: Use ${this.template.formatting.sectionHeaderPrefix} (H3 level)
- Add blank line between sections
- Date format: ${this.template.formatting.dateFormat}
- Signature: ${this.template.formatting.signatureFormat}
`;
  }
  
  /**
   * Get global rules that apply to all templates
   */
  getGlobalRules() {
    return [
      {
        name: "Content Preservation",
        description: "NEVER omit any content from the dictation",
        examples: ["Include every sentence, even if awkwardly dictated"],
        constraints: ["100% content coverage required"]
      },
      {
        name: "Section Headers",
        description: "Format ALL sections with ### headers",
        examples: ["### Identification", "### CC", "### Problem List"],
        constraints: ["Every section needs a header", "Blank line before each section"]
      },
      {
        name: "Dictation Commands",
        description: "Convert dictation commands to punctuation/formatting",
        examples: [
          "'period' at end of sentence → '.'",
          "'comma' → ','",
          "'new paragraph' → double line break",
          "BUT keep 'period' in 'interim period'"
        ],
        constraints: ["Context-aware replacement"]
      },
      {
        name: "Medication Preservation",
        description: "NEVER substitute brand names with generics or vice versa",
        examples: [
          "Keep 'Lexapro' as 'Lexapro', not 'escitalopram'",
          "Keep 'sertraline' as 'sertraline', not 'Zoloft'"
        ],
        constraints: ["Preserve exactly as dictated"]
      },
      {
        name: "Dosing Language",
        description: "Preserve exact dosing language",
        examples: [
          "'one pill per day' → '(one pill per day)' NOT '(daily)'",
          "'as needed for anxiety' → '(as needed for anxiety)' NOT '(PRN)'"
        ],
        constraints: ["Keep original wording"]
      },
      {
        name: "Abbreviations",
        description: "Use short form for units",
        examples: [
          "'milligrams' → 'mg'",
          "'milliliters' → 'ml'"
        ],
        constraints: ["Standard medical abbreviations only"]
      },
      {
        name: "Title Case",
        description: "Use Title Case for all diagnoses",
        examples: [
          "'major depressive disorder' → 'Major Depressive Disorder'",
          "'ADHD' stays as 'ADHD'"
        ],
        constraints: ["Consistent capitalization"]
      }
    ];
  }
  
  /**
   * Get template-specific rules
   */
  getTemplateSpecificRules() {
    const rules = [];
    
    // Extract template-specific constraints from sections
    this.template.sections.forEach(section => {
      if (section.templateSpecific) {
        section.templateSpecific.forEach(rule => {
          rules.push({
            section: section.title,
            rule: rule
          });
        });
      }
    });
    
    return rules;
  }
  
  /**
   * Get dictation command summary
   */
  getDictationCommandSummary() {
    return `
DICTATION COMMANDS TO CONVERT:
- Punctuation: period→. comma→, colon→: semicolon→;
- Formatting: new paragraph→\\n\\n, new line→\\n, bullet point→•
- Lists: number one→1. number two→2. etc.
- Parenthetical: open paren→( close paren→)
- Special: milligrams→mg, percent→%
(Full list available in dictation-commands.js)
`;
  }
  
  /**
   * Get medical corrections summary
   */
  getMedicalCorrectionsSummary() {
    return `
MEDICAL CORRECTIONS TO APPLY:
${JSON.stringify(this.dictionary.corrections, null, 2)}

REMEMBER: ${this.dictionary.preservationRules.medications}
`;
  }
  
  /**
   * Get dosing preservation rules
   */
  getDosingPreservationRules() {
    return `
DOSING PRESERVATION:
${dosingPatterns.preservationRules.map(r => `- ${r.rule}`).join('\n')}

Note: ${dosingPatterns.note}
`;
  }
  
  /**
   * Get relevant examples based on template
   */
  getRelevantExamples() {
    // Return template-specific examples if available
    if (this.template.examples) {
      return this.template.examples;
    }
    
    // Default examples
    return [
      {
        input: "Identification John Smith is a 14 year old male chief complaint follow-up",
        output: `### Identification
John Smith is a 14 year old male

### CC
Follow-up`
      }
    ];
  }
  
  /**
   * Get constraints
   */
  getConstraints() {
    return [
      "Follow template structure.", 
      "Use template's formatting rules",
      "However more importantly always preserve the order of what was dictated (in terms of sections and contents within)",
      "Sometimes there will be omitted section or additional sections, so it won't perfectly follow the template.",
      "Never omit content",
      "Preserve medication names as dictated",
      "Apply all global rules",
      "Section headers are mandatory"
    ];
  }
  
  /**
   * Format prompt object as string for LLM
   */
  formatPromptAsString(prompt) {
    return `
${prompt.name}
${prompt.description}

==== CONTEXT ====
Date: ${prompt.context.date}

${prompt.context.template}

==== GLOBAL RULES ====
${prompt.globalRules.map(rule => `
${rule.name}:
- ${rule.description}
Examples: ${rule.examples.join(', ')}
Constraints: ${rule.constraints.join(', ')}`).join('\n')}

==== TEMPLATE-SPECIFIC RULES ====
${prompt.templateSpecificRules.map(r => `${r.section}: ${r.rule}`).join('\n') || 'None'}

==== DATA REFERENCES ====
${prompt.dataReferences.dictationCommands}
${prompt.dataReferences.medicalCorrections}
${prompt.dataReferences.dosingPreservation}

==== CONSTRAINTS ====
${prompt.constraints.map(c => `- ${c}`).join('\n')}

==== INPUT TO FORMAT ====
${prompt.input}

==== INSTRUCTIONS ====
Format the above dictation following the template structure and all rules.
Output ONLY the formatted medical note with proper sections and formatting.
`;
  }
  
  /**
   * Post-process formatted text
   */
  postProcess(text) {
    // Remove any notes or meta-commentary
    const notePattern = /\[Note:.*?\]|\(Note:.*?\)|Note:.*?(?=\n|$)/gi;
    let cleanedText = text.replace(notePattern, '');
    
    // Ensure proper spacing
    cleanedText = cleanedText
      .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines
      .replace(/([#]{3}\s+\w+)\n([^\n])/g, '$1\n\n$2')  // Space after headers
      .trim();
    
    return cleanedText;
  }
}

/**
 * Template Loader helper
 */
class TemplateLoader {
  static load(templateName) {
    try {
      const template = require(`../templates/format/${templateName}.json`);
      return template;
    } catch (error) {
      throw new Error(`Template '${templateName}' not found`);
    }
  }
  
  static getExample(templateName) {
    try {
      const fs = require('fs');
      const path = require('path');
      const examplePath = path.join(__dirname, '..', 'templates', 'example', `${templateName}.md`);
      return fs.readFileSync(examplePath, 'utf8');
    } catch (error) {
      return null;
    }
  }
}

module.exports = { 
  MedicalPromptV7Original,
  TemplateLoader
};