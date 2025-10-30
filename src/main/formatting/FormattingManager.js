const { PromptManager } = require('./PromptManager');
const { OllamaClient } = require('./OllamaClient');
const { MedicalTermCache } = require('./MedicalTermCache');
const { SegmentSplitter } = require('./SegmentSplitter');

class FormattingManager {
  constructor(options = {}) {
    this.promptManager = options.promptManager || new PromptManager(options.prompts);
    this.ollamaClient = options.ollamaClient || new OllamaClient(options.ollama);
    this.cache = options.cache || new MedicalTermCache(options.cacheOptions);
    this.splitter = options.splitter || new SegmentSplitter(options.splitterOptions);
    this.defaultMode = options.defaultMode || 'accurate';
  }

  async format({ transcript, mode = this.defaultMode, metadata = {} }) {
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

    const formattedSegments = [];
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
        cacheHits,
        cacheMisses,
      },
    };
  }
}

module.exports = { FormattingManager };
