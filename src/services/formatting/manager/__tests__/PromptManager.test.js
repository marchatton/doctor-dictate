describe('PromptManager', () => {
  let PromptManager;
  const originalEnv = process.env.DD_QWEN_MODEL;

  beforeEach(() => {
    jest.resetModules();
    ({ PromptManager } = require('../PromptManager'));
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.DD_QWEN_MODEL;
    } else {
      process.env.DD_QWEN_MODEL = originalEnv;
    }
  });

  it('uses qwen profile overrides from environment variable', () => {
    process.env.DD_QWEN_MODEL = 'qwen2.5:3b';
    const manager = new PromptManager();
    const config = manager.getModeConfig('accurate');

    expect(config.model).toBe('qwen2.5:3b');
    expect(config.profile.label).toContain('3B');
    expect(config.options.num_ctx).toBeGreaterThan(4000);
  });

  it('merges custom mode overrides', () => {
    const manager = new PromptManager({
      modeConfigs: {
        accurate: {
          options: { temperature: 0.5 },
        },
      },
    });

    const config = manager.getModeConfig('accurate');
    expect(config.options.temperature).toBe(0.5);
    expect(config.options.num_ctx).toBeGreaterThan(0);
  });

  it('lists available qwen profiles', () => {
    const manager = new PromptManager();
    const profiles = manager.getAvailableLLMProfiles();

    expect(Array.isArray(profiles)).toBe(true);
    expect(profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ model: 'qwen2.5:1.5b' }),
        expect.objectContaining({ model: 'qwen2.5:0.5b' }),
      ])
    );
  });
});
