const { MedicalPrompt, TemplateLoader } = require('../../prompts');

class PromptManager {
  constructor(options = {}) {
    this.templateName = options.templateName || 'medicine-management';
    this.template = options.template || TemplateLoader.load(this.templateName);
    this.prompt = options.prompt || new MedicalPrompt(this.template);

    this.modeConfigs = {
      fast: {
        maxSegmentLength: 800,
        overlapSentences: 1,
        model: 'tinyllama:1.1b',
        timeout: 25000,
        options: {
          temperature: 0.1,
          num_ctx: 2048,
          top_p: 0.9,
        },
      },
      accurate: {
        maxSegmentLength: 1200,
        overlapSentences: 2,
        model: 'qwen2.5:1.5b',
        timeout: 45000,
        options: {
          temperature: 0.2,
          num_ctx: 4096,
          top_p: 0.95,
        },
      },
    };

    if (options.modeConfigs) {
      this.modeConfigs = {
        ...this.modeConfigs,
        ...options.modeConfigs,
      };
    }
  }

  getModeConfig(mode) {
    return this.modeConfigs[mode] || this.modeConfigs.accurate;
  }

  buildPrompt(text, context = {}) {
    const manifest = context.manifest || context.metadata?.manifest;
    if (manifest) {
      return this.prompt.generatePrompt(text, { manifest });
    }
    return this.prompt.generatePrompt(text);
  }

  postProcess(text) {
    return this.prompt.postProcess(text);
  }
}

module.exports = { PromptManager };
