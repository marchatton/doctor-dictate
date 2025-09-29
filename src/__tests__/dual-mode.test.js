const { ProcessingModes, AutoModeSelector } = require('../services/processing/processing-config');
const { OllamaFormatter } = require('../services/formatting/ollama-formatter');
const { ContentVerifier } = require('../services/formatting/content-verifier');

describe('Processing configuration', () => {
  it('configures FAST mode with the lightweight Whisper model', () => {
    expect(ProcessingModes.FAST.whisper.model).toBe('base.en');
    expect(ProcessingModes.FAST.ollama.model).toBe('qwen2.5:1.5b');
    expect(ProcessingModes.FAST.ollama.timeout).toBe(90000);
  });

  it('configures ACCURATE mode with higher quality settings', () => {
    expect(ProcessingModes.ACCURATE.whisper.model).toBe('small.en');
    expect(ProcessingModes.ACCURATE.ollama.model).toBe('qwen2.5:1.5b');
    expect(ProcessingModes.ACCURATE.ollama.timeout).toBe(120000);
  });

  it('selects a mode based on recording length', () => {
    expect(AutoModeSelector.selectMode(180)).toBe(ProcessingModes.ACCURATE);
    expect(AutoModeSelector.selectMode(3600)).toBe(ProcessingModes.FAST);
  });
});

describe('Ollama formatter defaults', () => {
  it('uses the configured model when instantiated', () => {
    const formatter = new OllamaFormatter({ model: ProcessingModes.FAST.ollama.model });
    expect(formatter.model).toBe('qwen2.5:1.5b');
  });
});

describe('Content verifier basics', () => {
  const verifier = new ContentVerifier();

  it('recognises full coverage when all key words match', () => {
    const input = 'John Smith has depression and insomnia that is improving.';
    const output = 'John Smith has depression and insomnia that is improving.';

    const result = verifier.verifyContent(input, output);
    expect(result.isValid).toBe(true);
    expect(result.coverage).toBeCloseTo(1, 5);
  });

  it('flags coverage issues and identifies missing words', () => {
    const input = 'Patient reports depression improving but insomnia persistent.';
    const output = 'Patient reports depression improving.';

    const result = verifier.verifyContent(input, output);
    expect(result.isValid).toBe(false);
    expect(result.missingWords).toContain('insomnia');
  });

  it('tracks missing sentences when most keywords are absent', () => {
    const input = 'First paragraph covers medication updates. Second paragraph describes sleep. Third paragraph final plan.';
    const output = 'First paragraph covers medication updates. Third paragraph final plan.';

    const result = verifier.verifyContent(input, output);
    expect(result.missingSentences.length).toBeGreaterThan(0);
    expect(result.missingSentences[0].text).toContain('Second paragraph');
  });
});
