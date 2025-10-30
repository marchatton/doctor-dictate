const path = require('path');
const { FasterWhisperBridge } = require('../FasterWhisperBridge');

describe('FasterWhisperBridge', () => {
  it('normalizes camelCase settings to bridge format', () => {
    const bridge = new FasterWhisperBridge();
    const normalized = bridge.normalizeSettings({
      beamSize: 3,
      computeType: 'int8',
      conditionOnPreviousText: true,
      noSpeechThreshold: 0.6,
      randomValue: 1,
    });

    expect(normalized).toEqual(
      expect.objectContaining({
        beam_size: 3,
        compute_type: 'int8',
        condition_on_previous_text: true,
        no_speech_threshold: 0.6,
        random_value: 1,
      })
    );
  });

  it('resolves model path relative to process cwd', () => {
    const bridge = new FasterWhisperBridge();
    const resolved = bridge.resolveModelPath('models/faster-whisper/small.bin');
    expect(resolved).toBe(path.resolve(process.cwd(), 'models/faster-whisper/small.bin'));
  });
});
