import { PromptManager, type PromptManagerOptions } from './PromptManager';
import { OllamaClient } from './OllamaClient';
import { MedicalTermCache } from './MedicalTermCache';
import { SegmentSplitter } from './SegmentSplitter';

export type FormattingManagerOptions = {
  promptManager?: PromptManager;
  prompts?: PromptManagerOptions['prompts'];
  ollamaClient?: OllamaClient;
  ollama?: Record<string, unknown>;
  cache?: MedicalTermCache;
  cacheOptions?: Record<string, unknown>;
  splitter?: SegmentSplitter;
  splitterOptions?: Record<string, unknown>;
  defaultMode?: string;
};

export type FormattingRequest = {
  transcript: string;
  mode?: string;
  metadata?: Record<string, unknown>;
};

export class FormattingManager {
  private readonly promptManager: PromptManager;

  private readonly ollamaClient: OllamaClient;

  private readonly cache: MedicalTermCache;

  private readonly splitter: SegmentSplitter;

  private readonly defaultMode: string;

  constructor(options: FormattingManagerOptions = {}) {
    this.promptManager = options.promptManager || new PromptManager(options.prompts);
    this.ollamaClient = options.ollamaClient || new OllamaClient(options.ollama);
    this.cache = options.cache || new MedicalTermCache(options.cacheOptions);
    this.splitter = options.splitter || new SegmentSplitter(options.splitterOptions);
    this.defaultMode = options.defaultMode || 'accurate';
  }

  async format({ transcript, mode = this.defaultMode, metadata = {} }: FormattingRequest): Promise<{
    formatted: string;
    segments: Array<{ formatted: string; text: string; source: 'cache' | 'ollama'; [key: string]: unknown }>;
    metadata: Record<string, unknown>;
  }> {
    const text = typeof transcript === 'string' ? transcript.trim() : '';
    if (!text) {
      return {
        formatted: '',
        segments: [],
        metadata: { mode, cacheHits: 0, cacheMisses: 0 },
      };
    }

    const config = this.promptManager.getModeConfig(mode) || this.promptManager.getModeConfig(this.defaultMode);
    const segments = this.splitter.split(text, config);

    await this.ollamaClient.ensureHealthy();
    if (config?.model) {
      await this.ollamaClient.ensureModel(config.model);
    }

    const formattedSegments: Array<{ formatted: string; text: string; source: 'cache' | 'ollama'; [key: string]: unknown }> = [];
    let cacheHits = 0;
    let cacheMisses = 0;

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const cacheKey = this.cache.buildKey(segment.text, mode, { model: config.model });
      const cached = this.cache.get(cacheKey);

      if (cached?.formatted) {
        cacheHits += 1;
        this.cache.touch(cacheKey);
        formattedSegments.push({
          ...segment,
          formatted: cached.formatted,
          source: 'cache',
        });
        continue;
      }

      cacheMisses += 1;
      const prompt = this.promptManager.buildPrompt(segment.text, {
        mode,
        metadata: {
          ...metadata,
          segmentIndex: index,
          totalSegments: segments.length,
        },
      });

      const response = await this.ollamaClient.generate({
        prompt,
        model: config.model,
        options: config.options,
        timeout: config.timeout,
      });

      const formatted = this.promptManager.postProcess(response.text || '');
      this.cache.set(cacheKey, {
        formatted,
        metadata: {
          mode,
          model: config.model,
        },
      });

      formattedSegments.push({
        ...segment,
        formatted,
        source: 'ollama',
      });
    }

    const combined = formattedSegments
      .map((segment) => segment.formatted)
      .filter(Boolean)
      .join('\n\n')
      .trim();

    return {
      formatted: combined,
      segments: formattedSegments,
      metadata: {
        mode,
        model: config.model,
        profile: config.profile,
        cacheHits,
        cacheMisses,
      },
    };
  }
}
