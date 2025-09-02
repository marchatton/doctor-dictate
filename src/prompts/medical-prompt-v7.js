/**
 * Medical Prompt Management System - Version 7.0
 * Refactored architecture with template-driven approach
 * No duplicate logic - references external data sources
 */

const { SectionDetector } = require('./section-detector');
const { dictationCommands } = require('../data/dictation-commands');
const { dosingPatterns } = require('../data/dosing-patterns');
const medicalDictionary = require('../data/medical-dictionary');

class MedicalPromptV7 {
  static VERSION = "7.0";
  
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
    
    // Detect sections in the input text
    const detectedSections = this.sectionDetector.detectAllSections(dictationText);
    
    const prompt = {
      name: "Medical Transcription Formatter v7",
      description: "Format medical dictation according to template structure",
      
      context: {
        template: this.getTemplateInstructions(),
        date: currentDate,
        detectedSections: this.formatDetectedSections(detectedSections)
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
   * Format detected sections for the prompt
   */
  formatDetectedSections(sections) {
    if (!sections || sections.length === 0) {
      return "No sections auto-detected in dictation.";
    }
    
    return `
DETECTED SECTIONS IN DICTATION:
${sections.map(s => `- "${s.title}" at line ${s.lineNumber} (confidence: ${(s.confidence * 100).toFixed(0)}%)${s.type === 'smart' ? ' [auto-detected]' : ''}`).join('\n')}

IMPORTANT: Include ALL these sections in your output with ### headers.`;
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

IMPORTANT: The doctor may dictate additional sections not listed below. Include ALL sections dictated.

COMMON SECTIONS (use if dictated):
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

ADDITIONAL SECTIONS:
- If doctor dictates any section not listed above, include it with ### header
- Examples: ### Physical Exam, ### Labs, ### Plan, ### Social History, etc.
- Use appropriate formatting based on content (paragraph for narrative, list for items)

FORMATTING:
- Section headers: Use ${this.template.formatting.sectionHeaderPrefix} (H3 level)
- Add blank line between sections
- Date format: ${this.template.formatting.dateFormat}
- Medication format: ${this.template.formatting.medicationFormat || '{Name} {Dosage} ({Frequency})'}
- Problem format: ${this.template.formatting.problemFormat || '{Diagnosis} – {status}'}
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
        description: "Never omit any content from the dictation",
        examples: [
          { input: "awkwardly dictated sentence", output: "Include every word even if awkward" }
        ],
        constraints: ["100% content coverage required", "Never skip any dictated content"]
      },
      {
        name: "Dynamic Section Detection",
        description: "Detect and include ALL sections dictated by doctor",
        examples: [
          { input: "Physical exam colon", output: "### Physical Exam" },
          { input: "new section vitals", output: "### Vitals" },
          { input: "Social history start section", output: "### Social History" },
          { input: "Next paragraph Plan", output: "### Plan" }
        ],
        constraints: [
          "Include sections not in template",
          "Detect patterns: 'Section Name:', 'new section X', 'next section X', 'next paragraph X'",
          "Auto-detected sections MUST be included with ### headers"
        ]
      },
      {
        name: "Section Headers",
        description: "Format ALL sections with consistent headers",
        examples: [
          { input: "any section", output: "### Section Name" }
        ],
        constraints: ["Use ### for all section headers", "Blank line before each section", "Title case for section names"]
      },
      {
        name: "Dictation Commands",
        description: "Convert spoken punctuation commands to actual punctuation",
        examples: [
          { input: "patient is stable period", output: "patient is stable." },
          { input: "medications comma Lexapro", output: "medications, Lexapro" },
          { input: "new paragraph", output: "\n\n" },
          { input: "quote feeling better unquote", output: '"feeling better"' }
        ],
        constraints: ["Context-aware replacement", "Keep 'period' in phrases like 'interim period'"]
      },
      {
        name: "Medication Name Preservation",
        description: "Keep medication names exactly as dictated",
        examples: [
          { input: "Lexapro", output: "Lexapro (NOT escitalopram)" },
          { input: "sertraline", output: "sertraline (NOT Zoloft)" },
          { input: "Jornay PM", output: "Jornay PM (NOT methylphenidate)" }
        ],
        constraints: ["Never substitute brand/generic names", "Preserve exact spelling"]
      },
      {
        name: "Dosing Language Preservation",
        description: "Keep original dosing language for clarity",
        examples: [
          { input: "one pill per day", output: "(one pill per day)" },
          { input: "twice a day", output: "(twice a day)" },
          { input: "as needed for anxiety", output: "(as needed for anxiety)" },
          { input: "every morning", output: "(every morning)" },
          { input: "at bedtime", output: "(at bedtime)" },
          { input: "three times a day", output: "(three times a day)" },
          { input: "every other day", output: "(every other day)" },
          { input: "once a week", output: "(once a week)" },
          { input: "with meals", output: "(with meals)" },
          { input: "before breakfast", output: "(before breakfast)" }
        ],
        constraints: [
          "Never convert to medical abbreviations (BID, TID, PRN, QHS)",
          "Use medical abbreviations only when they are actually used in the dictation",
        ]
      },
      {
        name: "Unit Abbreviations",
        description: "Convert units to standard medical abbreviations",
        examples: [
          { input: "20 milligrams", output: "20mg" },
          { input: "5 milliliters", output: "5ml" },
          { input: "10 micrograms", output: "10mcg" },
          { input: "2 grams", output: "2g" },
          { input: "50 percent", output: "50%" }
        ],
        constraints: ["Use standard medical abbreviations", "No space between number and unit"]
      },
      {
        name: "Diagnosis Capitalization",
        description: "Use proper capitalization for medical conditions",
        examples: [
          { input: "major depressive disorder", output: "Major Depressive Disorder" },
          { input: "adhd", output: "ADHD" },
          { input: "generalized anxiety disorder", output: "Generalized Anxiety Disorder" }
        ],
        constraints: ["Title case for full condition names", "All caps for acronyms"]
      },
      {
        name: "Filler Word Removal",
        description: "Remove filler words that don't add meaning",
        examples: [
          { input: "um the patient is uh stable", output: "the patient is stable" },
          { input: "so like the mood is better", output: "the mood is better" },
          { input: "you know improving", output: "improving" }
        ],
        constraints: [
          "Remove: um, uh, uhm, like (as filler), you know (as filler)",
          "Keep: 'like' in clinical context (feels like crying)"
        ]
      },
      {
        name: "Unclear Content Marking",
        description: "Mark unclear or suspicious content appropriately",
        examples: [
          { input: "Jurn APM 60mg", output: "Jornay PM {unclear: Jurn APM?} 60mg" },
          { input: "sertraline 1mg", output: "sertraline 1mg {!dosage: typical 25-200mg}" }
        ],
        constraints: [
          "Flag unclear medication names",
          "Flag unusual dosages",
          "Reference medical-dictionary.json for clarification",
          "Preserve original for reference"
        ]
      }
    ];
  }
  
  /**
   * Get template-specific rules
   */
  getTemplateSpecificRules() {
    const rules = [];
    
    // Use new templateSpecificRules from template if available
    if (this.template.templateSpecificRules) {
      return this.template.templateSpecificRules;
    }
    
    // Fallback: Extract from sections for backward compatibility
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
    // Comprehensive examples incorporating rework-processing.md patterns
    return [
      {
        name: "Complex Full Note",
        input: "Identification comma John Smith is a 14 year old male with a history of ACHD and major depressive disorder period He's in the seventh grade period Chief complaint follow up period Next paragraph Problem list colon ACHD period Improving comma partial control period Two comma major depressive disorder comma stable period Current medications comma Lexapro 20 milligrams comma one pill per day comma Jurn APM comma 60 mg comma qhs period",
        output: `### Identification
John Smith is a 14 year old male with a history of ADHD and Major Depressive Disorder. He's in the seventh grade.

### CC
Follow-up

### Problem List
1. ADHD – improving, partial control
2. Major Depressive Disorder – stable

### Current Meds
1. Lexapro 20mg (one pill per day)
2. Jornay PM 60mg (QHS) {unclear: Jurn APM?}`
      },
      {
        name: "Punctuation and Quotes",
        input: "Patient reports quote I feel better unquote comma mood quote okay unquote period Assessment colon stable period Plan dash Continue meds semicolon follow up colon 4 weeks period",
        output: `Patient reports "I feel better", mood "okay".

### Assessment
- Stable

### Plan  
- Continue meds; follow up: 4 weeks`
      },
      {
        name: "Filler Removal",
        input: "So um the patient is like really improving you know period Diagnosed with ACHD comma MDD comma and GAD period Current meds include uh sertraline 50mg qhs for sleep",
        output: `The patient is really improving. Diagnosed with ADHD, MDD, and GAD.

### Current Meds
1. Sertraline 50mg (QHS for sleep)`
      },
      {
        name: "Dynamic Section Detection",
        input: "Interim history period ADHD in fair control period New section Physical exam period Vital signs stable period Next paragraph Labs colon CBC normal period",
        output: `### Interim History
- ADHD in fair control

### Physical Exam
Vital signs stable.

### Labs
CBC normal.`
      }
    ];
  }
  
  /**
   * Get constraints
   */
  getConstraints() {
    return [
      "Apply ALL global rules listed above consistently",
      "Follow template-specific formatting for list types and section structure",
      "Use detected sections to guide your formatting",
      "Refer to examples for proper transformation patterns"
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

${prompt.context.detectedSections}

${prompt.context.template}

==== GLOBAL RULES ====
${prompt.globalRules.map(rule => `
${rule.name}:
Description: ${rule.description}
Examples:
${rule.examples.map(ex => `  - Input: "${ex.input}" → Output: "${ex.output}"`).join('\n')}
Constraints:
${rule.constraints.map(c => `  - ${c}`).join('\n')}`).join('\n')}

==== TEMPLATE-SPECIFIC RULES ====
${prompt.templateSpecificRules.map(r => `${r.section}: ${r.rule}`).join('\n') || 'None'}

==== EXAMPLES ====
${prompt.examples.map((ex, i) => `
Example ${i + 1}: ${ex.name || ''}
Input: "${ex.input}"
Output:
${ex.output}`).join('\n')}

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
Apply the patterns shown in the examples.
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
  MedicalPromptV7,
  TemplateLoader
};