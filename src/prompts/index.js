/**
 * Prompts module index
 * Exports the current/latest versions of all prompts
 * This provides a stable interface regardless of version changes
 */

// Import the current version (v7 is latest)
const { MedicalPromptV7, TemplateLoader } = require('./medical-prompt-v7');
const { SectionDetector } = require('./section-detector');

// Export with stable names (no version numbers)
module.exports = {
  // Main prompt class - always points to latest version
  MedicalPrompt: MedicalPromptV7,
  
  // Legacy export for backward compatibility
  MedicalPromptV5: MedicalPromptV7,  // Aliased to latest
  MedicalPromptV7,                   // Explicit version export if needed
  
  // Other exports
  TemplateLoader,
  SectionDetector,
  
  // Version info
  CURRENT_VERSION: '7.0',
  CURRENT_PROMPT_FILE: 'medical-prompt-v7.js'
};