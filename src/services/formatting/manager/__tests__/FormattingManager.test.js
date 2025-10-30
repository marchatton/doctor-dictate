const path = require('path');

describe('FormattingManager', () => {
  let FormattingManager;
  let promptManager;
  let ollamaClient;
  let cache;

  beforeEach(() => {
    jest.resetModules();
    ({ FormattingManager } = require('../FormattingManager'));

    promptManager = {
      buildPrompt: jest.fn((text) => `PROMPT:${text}`),
      getModeConfig: jest.fn(() => ({
        maxSegmentLength: 50,
        overlapSentences: 0,
        model: 'tinyllama',
        timeout: 30000,
        options: { temperature: 0.2 },
      })),
      postProcess: jest.fn((text) => text.trim()),
    };

    ollamaClient = {
      generate: jest.fn(async ({ prompt, model, options, timeout }) => {
        return {
          text: prompt.replace('PROMPT:', '').trim().toUpperCase(),
          model,
          options,
          timeout,
        };
      }),
      ensureHealthy: jest.fn(() => Promise.resolve()),
      ensureModel: jest.fn(() => Promise.resolve()),
    };

    cache = {
      get: jest.fn(() => null),
      set: jest.fn(),
      touch: jest.fn(),
      buildKey: jest.fn((text, mode) => `${mode}:${text.length}`),
    };
  });

  it('splits transcripts and formats each segment through Ollama', async () => {
    const manager = new FormattingManager({
      promptManager,
      ollamaClient,
      cache,
      defaultMode: 'accurate',
      splitter: {
        split: jest.fn(() => [
          { id: 'seg-0', text: 'Line one about the patient.', start: 0, end: 27 },
          { id: 'seg-1', text: 'Line two with more context.', start: 27, end: 54 },
        ]),
      },
    });

    const transcript = 'Line one about the patient. Line two with more context.';
    const result = await manager.format({ transcript, metadata: { patient: 'Test' } });

    expect(ollamaClient.ensureHealthy).toHaveBeenCalled();
    expect(promptManager.getModeConfig).toHaveBeenCalledWith('accurate');
    expect(ollamaClient.ensureModel).toHaveBeenCalledWith('tinyllama');
    expect(promptManager.buildPrompt).toHaveBeenCalledTimes(2);
    expect(ollamaClient.generate).toHaveBeenCalledTimes(2);
    expect(result.formatted.replace(/\s+/g, ' ').trim()).toBe(
      'LINE ONE ABOUT THE PATIENT. LINE TWO WITH MORE CONTEXT.'
    );
    expect(result.segments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'seg-0', formatted: 'LINE ONE ABOUT THE PATIENT.' }),
        expect.objectContaining({ id: 'seg-1', formatted: 'LINE TWO WITH MORE CONTEXT.' }),
      ])
    );
  });

  it('uses cached formatting when available and updates cache metadata', async () => {
    const cachedValue = {
      formatted: 'CACHED SEGMENT',
      metadata: { mode: 'fast' },
    };

    cache.get
      .mockReturnValueOnce(cachedValue)
      .mockReturnValueOnce(null);

    const manager = new FormattingManager({
      promptManager,
      ollamaClient,
      cache,
      defaultMode: 'fast',
      splitter: {
        split: jest.fn((text) => [
          { id: 'seg-0', text: text.slice(0, 20), start: 0, end: 20 },
          { id: 'seg-1', text: text.slice(20), start: 20, end: 40 },
        ]),
      },
    });

    const transcript = 'Short segment. Second segment here.';
    const result = await manager.format({ transcript, mode: 'fast' });

    expect(cache.get).toHaveBeenCalledTimes(2);
    expect(cache.touch).toHaveBeenCalledWith('fast:20');
    expect(ollamaClient.generate).toHaveBeenCalledTimes(1);
    expect(cache.set).toHaveBeenCalledTimes(1);
    expect(result.segments[0].formatted).toBe('CACHED SEGMENT');
    expect(result.metadata.cacheHits).toBe(1);
  });

  it('returns empty result for missing transcripts without touching ollama', async () => {
    const manager = new FormattingManager({ promptManager, ollamaClient, cache });
    const result = await manager.format({ transcript: '' });

    expect(ollamaClient.generate).not.toHaveBeenCalled();
    expect(result.formatted).toBe('');
    expect(result.segments).toEqual([]);
  });

  it('propagates qwen profile metadata when present', async () => {
    promptManager.getModeConfig.mockReturnValue({
      maxSegmentLength: 1200,
      overlapSentences: 2,
      model: 'qwen2.5:1.5b',
      timeout: 45000,
      options: {},
      profile: {
        model: 'qwen2.5:1.5b',
        label: 'Qwen2.5 1.5B',
      },
    });

    const manager = new FormattingManager({
      promptManager,
      ollamaClient,
      cache,
      splitter: {
        split: jest.fn(() => [{ id: 'seg-0', text: 'content', start: 0, end: 7 }]),
      },
    });

    const result = await manager.format({ transcript: 'content', mode: 'accurate' });

    expect(ollamaClient.ensureModel).toHaveBeenCalledWith('qwen2.5:1.5b');
    expect(result.metadata.profile).toEqual(
      expect.objectContaining({ model: 'qwen2.5:1.5b', label: 'Qwen2.5 1.5B' })
    );
  });
});
