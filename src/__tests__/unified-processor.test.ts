jest.mock('../services/transcription/whisper-cpp');
jest.mock('../services/transcription/whisper');
jest.mock('../services/formatting/ollama-formatter');

import { UnifiedProcessor } from '../services/processing/unified-processor';
import WhisperCpp from '../services/transcription/whisper-cpp';
import { WhisperTranscriber } from '../services/transcription/whisper';
import { OllamaFormatter } from '../services/formatting/ollama-formatter';

const MockedWhisperCpp = WhisperCpp as jest.MockedClass<typeof WhisperCpp>;
const MockedWhisperTranscriber = WhisperTranscriber as jest.MockedClass<typeof WhisperTranscriber>;
const MockedOllamaFormatter = OllamaFormatter as jest.MockedClass<typeof OllamaFormatter>;

describe('UnifiedProcessor', () => {
  const AUDIO_PATH = '/tmp/audio.wav';
const mockWhisperIsAvailable = jest.fn();
const mockWhisperTranscribe = jest.fn();
const mockTranscribeAudio = jest.fn();
const mockIsOllamaAvailable = jest.fn();
const mockFormatMedicalDictation = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockWhisperIsAvailable.mockReset();
    mockWhisperTranscribe.mockReset();
    mockTranscribeAudio.mockReset();
    mockIsOllamaAvailable.mockReset();
    mockFormatMedicalDictation.mockReset();

    mockIsOllamaAvailable.mockResolvedValue(false);

    MockedWhisperCpp.mockImplementation(
      () =>
        ({
          isAvailable: mockWhisperIsAvailable,
          transcribe: mockWhisperTranscribe,
        }) as unknown as WhisperCpp,
    );

    MockedWhisperTranscriber.mockImplementation(
      () =>
        ({
          transcribeAudio: mockTranscribeAudio,
        }) as unknown as WhisperTranscriber,
    );

    MockedOllamaFormatter.mockImplementation(
      () =>
        ({
          isOllamaAvailable: mockIsOllamaAvailable,
          formatMedicalDictation: mockFormatMedicalDictation,
        }) as unknown as OllamaFormatter,
    );
  });

  it('uses whisper.cpp when it is available', async () => {
    mockWhisperIsAvailable.mockResolvedValueOnce(true);
    mockWhisperTranscribe.mockResolvedValueOnce('cpp transcript');

    const processor = new UnifiedProcessor('FAST');
    const result = await processor.process(AUDIO_PATH);

    expect(result.text).toBe('cpp transcript');
    expect(result.mode).toBe('Fast');
    expect(mockWhisperTranscribe).toHaveBeenCalledWith(AUDIO_PATH);
    expect(mockTranscribeAudio).not.toHaveBeenCalled();
  });

  it('falls back to the Python transcriber when whisper.cpp is unavailable', async () => {
    mockWhisperIsAvailable.mockResolvedValueOnce(false);
    mockTranscribeAudio.mockResolvedValueOnce({ text: 'python transcript' });

    const processor = new UnifiedProcessor('ACCURATE');
    const result = await processor.process(AUDIO_PATH);

    expect(result.text).toBe('python transcript');
    expect(result.mode).toBe('High Accuracy');
    expect(mockTranscribeAudio).toHaveBeenCalledWith(AUDIO_PATH);
    expect(mockWhisperTranscribe).not.toHaveBeenCalled();
  });

  it('switches to FAST mode after a failure in ACCURATE mode', async () => {
    mockWhisperIsAvailable.mockResolvedValue(true);
    mockWhisperTranscribe.mockResolvedValue('a'.repeat(200));
    mockIsOllamaAvailable.mockResolvedValue(true);
    mockFormatMedicalDictation
      .mockRejectedValueOnce(new Error('formatting failed'))
      .mockResolvedValueOnce({ success: true, formatted: 'formatted transcript' });

    const processor = new UnifiedProcessor('ACCURATE');
    const result = await processor.process(AUDIO_PATH);

    expect(result.mode).toBe('Fast');
    expect(result.text).toBe('formatted transcript');
    expect(mockFormatMedicalDictation).toHaveBeenCalledTimes(2);
    expect(mockWhisperTranscribe).toHaveBeenCalledTimes(2);
  });
});
