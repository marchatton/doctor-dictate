import type { ModeDecision } from './SmartModeSelector';

type ProgressEvent = 'stage' | 'chunk' | 'complete' | 'error' | string;

type ProgressEmitter = {
  emit: (event: ProgressEvent, payload: Record<string, unknown>) => void;
};

type Logger = Pick<Console, 'info' | 'warn' | 'error' | 'debug'>;

type ReporterContext = Record<string, unknown> & { mode?: string; decision?: ModeDecision };

type ProgressReporterOptions = {
  emitter?: ProgressEmitter | null;
  logger?: Logger;
};

export class ProgressReporter {
  private context: ReporterContext;

  private readonly emitter: ProgressEmitter | null;

  private readonly logger: Logger;

  constructor(context: ReporterContext = {}, options: ProgressReporterOptions = {}) {
    this.context = context;
    this.emitter = options.emitter || null;
    this.logger = options.logger || console;
  }

  updateContext(partial: ReporterContext = {}): void {
    if (!partial || typeof partial !== 'object') {
      return;
    }
    this.context = { ...this.context, ...partial };
  }

  start(stage?: string, payload: Record<string, unknown> = {}): void {
    this.emit('stage', {
      stage: stage || 'unknown',
      status: 'start',
      ...payload,
    });
  }

  advance(stage?: string, payload: Record<string, unknown> = {}): void {
    this.emit('stage', {
      stage: stage || (payload.stage as string) || 'unknown',
      status: 'progress',
      ...payload,
    });
  }

  chunkProgress(payload: Record<string, unknown> = {}): void {
    this.emit('chunk', {
      status: 'chunk',
      ...payload,
    });
  }

  complete(result: unknown): void {
    this.emit('complete', { result });
  }

  fail(error: unknown): void {
    this.emit('error', { error });
  }

  private emit(event: ProgressEvent, payload: Record<string, unknown>): void {
    const enriched = { ...payload, context: this.context };
    if (this.emitter && typeof this.emitter.emit === 'function') {
      this.emitter.emit(event, enriched);
      return;
    }

    const label = `[Transcription:${this.context.mode || 'unknown'}]`;
    switch (event) {
      case 'stage':
        this.logger.info(`${label} ${enriched.status || 'stage'}:${enriched.stage}`, enriched);
        break;
      case 'chunk':
        this.logger.info(`${label} chunk ${enriched.current}/${enriched.total}`, enriched);
        break;
      case 'complete':
        this.logger.info(`${label} complete`);
        break;
      case 'error':
        this.logger.error(`${label} error`, enriched.error);
        break;
      default:
        this.logger.debug(`${label} event:${event}`, enriched);
    }
  }
}

export default ProgressReporter;
