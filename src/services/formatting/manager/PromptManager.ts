import type { SectionManifest } from '../../../types/medical';
import { MedicalPrompt, TemplateLoader } from '../../../prompts';
import { resolveQwenProfile, listQwenProfiles } from './QwenProfiles';

export type PromptModeConfig = {
  maxSegmentLength: number;
  overlapSentences: number;
  model: string;
  timeout: number;
  options: Record<string, unknown>;
  profile?: ReturnType<typeof resolveQwenProfile>;
};

export type PromptManagerOptions = {
  templateName?: string;
  template?: ReturnType<typeof TemplateLoader.load>;
  prompt?: InstanceType<typeof MedicalPrompt>;
  qwenModel?: string;
  modeConfigs?: Record<string, Partial<PromptModeConfig>>;
  prompts?: Record<string, unknown>;
};

function mergeConfig(base: Record<string, unknown> = {}, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overrides)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      merged[key] = mergeConfig((base[key] as Record<string, unknown>) || {}, value as Record<string, unknown>);
    } else {
      merged[key] = value;
    }
  }
  return merged;
}

export class PromptManager {
  private readonly templateName: string;

  private readonly template: ReturnType<typeof TemplateLoader.load>;

  private readonly prompt: InstanceType<typeof MedicalPrompt>;

  private readonly modeConfigs: Record<string, PromptModeConfig>;

  constructor(options: PromptManagerOptions = {}) {
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
        timeout: 25_000,
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
        this.modeConfigs[mode] = mergeConfig(base, config) as PromptModeConfig;
      }
    }
  }

  getModeConfig(mode: string): PromptModeConfig {
    return this.modeConfigs[mode] || this.modeConfigs.accurate;
  }

  getAvailableLLMProfiles(): ReturnType<typeof listQwenProfiles> {
    return listQwenProfiles();
  }

  buildPrompt(text: string, context: { manifest?: SectionManifest; metadata?: { manifest?: SectionManifest } } = {}): string {
    const manifest = context.manifest || context.metadata?.manifest;
    if (manifest) {
      return this.prompt.generatePrompt(text, { manifest });
    }
    return this.prompt.generatePrompt(text);
  }

  postProcess(text: string): string {
    return this.prompt.postProcess(text);
  }
}
