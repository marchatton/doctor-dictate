import type { ModeDecision as SmartModeDecision } from '../services/transcription/manager/utils/SmartModeSelector';

export type RecordingTranscriptPayload =
  | string
  | {
      transcript?: string;
      formatted?: string;
      raw?: string;
      corrections?: Array<Record<string, unknown>>;
      medications?: string[];
      metadata?: Record<string, unknown>;
      [key: string]: unknown;
    };

export type ModeDecision = SmartModeDecision;

export type ProcessingStepId = 'audio' | 'transcribe' | 'medical' | 'complete';
