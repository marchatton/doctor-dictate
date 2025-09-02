/**
 * Medical Prompt v7 - Simplified & Efficient
 * Focuses on essential instructions for medical note formatting
 */

class MedicalPromptV7 {
  static VERSION = "7.0";
  
  constructor(template, options = {}) {
    this.template = template;
    // Only load the corrections we actually use
    this.corrections = require('../data/medical-dictionary').corrections;
    this.options = options;
  }
  
  /**
   * Generate concise, effective prompt
   */
  generatePrompt(dictationText, options = {}) {
    // Build a concise but complete prompt
    const sections = this.template.sections.map(s => 
      `${s.title}: ${s.format}${s.required ? ' (required)' : ''}`
    ).join('\n');
    
    const prompt = `Format this medical dictation into a structured note.

TEMPLATE STRUCTURE:
${sections}

RULES:
1. Use ### for section headers (e.g., ### Identification)
2. Never omit content - include everything from the dictation
3. Convert dictation commands: period→. comma→, new paragraph→\n\n
4. Keep medication names exactly as dictated (don't change brand/generic)
5. Keep dosing language as dictated: "one pill per day" → "(one pill per day)"
6. Use Title Case for diagnoses
7. Convert units: milligrams→mg, milliliters→ml

CORRECTIONS TO APPLY:
${JSON.stringify(this.corrections, null, 2)}

EXAMPLE FORMAT:
### Identification
John Smith is a 14 year old male

### CC
Follow-up

### Problem List
1. Major Depressive Disorder
2. ADHD

INPUT TO FORMAT:
${dictationText}

OUTPUT:`;
    
    return prompt;
  }
  
  /**
   * Post-process formatted text - minimal cleanup
   */
  postProcess(text) {
    return text
      .replace(/\n{3,}/g, '\n\n')  // Max 2 newlines
      .replace(/([#]{3}\s+\w+)\n([^\n])/g, '$1\n\n$2')  // Space after headers
      .trim();
  }
}

/**
 * Template Loader - streamlined
 */
class TemplateLoader {
  static load(templateName) {
    try {
      return require(`../templates/format/${templateName}.json`);
    } catch (error) {
      throw new Error(`Template '${templateName}' not found`);
    }
  }
}

module.exports = { 
  MedicalPromptV7,
  TemplateLoader
};