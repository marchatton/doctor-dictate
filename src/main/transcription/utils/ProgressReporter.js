class ProgressReporter {
  constructor(context = {}, options = {}) {
    this.context = context;
    this.emitter = options.emitter || null;
    this.logger = options.logger || console;
  }

  begin(payload = {}) {
    this.emit('begin', { ...payload, context: this.context });
  }

  reportStage(stage, payload = {}) {
    if (!stage && payload.stage) {
      stage = payload.stage;
    }
    this.emit('stage', {
      stage: stage || 'unknown',
      ...payload,
      context: this.context,
    });
  }

  complete(result) {
    this.emit('complete', { result, context: this.context });
  }

  fail(error) {
    this.emit('error', { error, context: this.context });
  }

  emit(event, payload) {
    if (this.emitter && typeof this.emitter.emit === 'function') {
      this.emitter.emit(event, payload);
      return;
    }

    const label = `[Transcription:${this.context.mode || 'unknown'}]`;
    switch (event) {
      case 'begin':
        this.logger.info(`${label} begin`, payload);
        break;
      case 'stage':
        this.logger.info(`${label} stage:${payload.stage}`, payload);
        break;
      case 'complete':
        this.logger.info(`${label} complete`);
        break;
      case 'error':
        this.logger.error(`${label} error`, payload.error);
        break;
      default:
        this.logger.debug(`${label} event:${event}`, payload);
    }
  }
}

module.exports = { ProgressReporter };
