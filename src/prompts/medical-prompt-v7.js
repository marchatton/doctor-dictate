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
    // No preprocessing - let LLM handle it
    // Build a concise but complete prompt
    const sections = this.template.sections.map(s => 
      `${s.title}: ${s.format}${s.required ? ' (required)' : ''}`
    ).join('\n');
    
    const prompt = `Format this medical dictation into a structured note.

AVAILABLE SECTIONS (only use if content exists):
${sections}

STRICT RULES - MUST FOLLOW:
1. ONLY include sections that have actual content in the dictation
2. NEVER create or hallucinate content that wasn't dictated
3. If a section wasn't mentioned, DO NOT include it
4. When you hear a section name, start a new section with ### prefix
5. Section matching: "problemist"→"Problem List", "carton medications"→"Current Meds", etc.

DICTATION COMMANDS TO CONVERT:
- "period" → "." (except in "interim period", "school period")
- "comma" → ","
- "colon" → ":"
- "next paragraph" or "new paragraph" → start new section/paragraph
- "next line" → new line

CONTENT RULES:
- Include EVERYTHING that was dictated (no omissions)
- Keep medication names exactly as stated
- Keep dosing in parentheses as stated
- Convert units: milligrams→mg, milliliters→ml

CRITICAL: Only output sections that were actually dictated. Do not add sections like ROS, Vitals, MSE, Risk Assessment, etc. unless they were specifically mentioned in the dictation.

CORRECTIONS TO APPLY:
${JSON.stringify(this.corrections, null, 2)}

EXAMPLE (only showing dictated sections):
If dictation mentions: "identification John Smith 14 year old male period chief complaint follow-up"
Output:
### Identification
John Smith 14 year old male

### CC
Follow-up

DO NOT add other sections unless explicitly dictated!

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