class ProgressReporter {
  constructor(context = {}, options = {}) {
    this.context = context;
    this.emitter = options.emitter || null;
    this.logger = options.logger || console;
  }

  start(stage, payload = {}) {
    this.emit('stage', {
      stage: stage || 'unknown',
      status: 'start',
      ...payload,
    });
  }

  advance(stage, payload = {}) {
    this.emit('stage', {
      stage: stage || payload.stage || 'unknown',
      status: 'progress',
      ...payload,
    });
  }

  chunkProgress(payload = {}) {
    this.emit('chunk', {
      status: 'chunk',
      ...payload,
    });
  }

  complete(result) {
    this.emit('complete', { result });
  }

  fail(error) {
    this.emit('error', { error });
  }

  emit(event, payload) {
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

module.exports = { ProgressReporter };
