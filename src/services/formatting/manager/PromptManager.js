const { MedicalPrompt, TemplateLoader } = require('../../../prompts');
const { resolveQwenProfile, listQwenProfiles } = require('./QwenProfiles');

function mergeConfig(base = {}, overrides = {}) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = mergeConfig(base[key] || {}, value);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

class PromptManager {
  constructor(options = {}) {
    this.templateName = options.templateName || 'medicine-management';
    this.template = options.template || TemplateLoader.load(this.templateName);
    this.prompt = options.prompt || new MedicalPrompt(this.template);

    const requestedQwenModel = options.qwenModel || process.env.DD_QWEN_MODEL;
    const qwenProfile = resolveQwenProfile(requestedQwenModel);

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
        maxSegmentLength: qwenProfile.maxSegmentLength,
        overlapSentences: qwenProfile.overlapSentences,
        model: qwenProfile.model,
        timeout: qwenProfile.timeout,
        options: {
          temperature: qwenProfile.options.temperature,
          num_ctx: qwenProfile.options.num_ctx,
          num_predict: qwenProfile.options.num_predict,
          top_p: qwenProfile.options.top_p,
          repeat_penalty: qwenProfile.options.repeat_penalty,
        },
        profile: qwenProfile,
      },
    };

    if (options.modeConfigs) {
      for (const [mode, config] of Object.entries(options.modeConfigs)) {
        const base = this.modeConfigs[mode] || {};
        this.modeConfigs[mode] = mergeConfig(base, config);
      }
    }
  }

  getModeConfig(mode) {
    return this.modeConfigs[mode] || this.modeConfigs.accurate;
  }

  getAvailableLLMProfiles() {
    return listQwenProfiles();
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
