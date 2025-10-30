class OllamaClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.fetchImpl = options.fetchImpl || global.fetch || null;
    this.healthTimeoutMs = options.healthTimeoutMs || 3000;
    this.modelCacheTtlMs = options.modelCacheTtlMs || 60_000;
    this.cachedModels = null;
    this.cachedModelsAt = 0;
  }

  async ensureHealthy() {
    try {
      await this.healthCheck();
    } catch (error) {
      const message = error?.message || 'Unknown error';
      throw new Error(`Ollama is not reachable at ${this.baseUrl}: ${message}`);
    }
  }

  async healthCheck() {
    const fetch = await this.resolveFetch();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.healthTimeoutMs);

    try {
      const response = await fetch(new URL('/api/version', this.baseUrl), {
        method: 'GET',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return true;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async generate({ prompt, model, options = {}, timeout = 45000 }) {
    if (!prompt) {
      throw new Error('Prompt is required for Ollama generation');
    }

    const fetch = await this.resolveFetch();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(new URL('/api/generate', this.baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Ollama request failed with ${response.status}: ${body}`);
      }

      const data = await response.json();
      const text = data.response || data.text || '';
      return { text, raw: data };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async resolveFetch() {
    if (this.fetchImpl) {
      return this.fetchImpl;
    }

    if (typeof fetch === 'function') {
      this.fetchImpl = fetch.bind(globalThis);
      return this.fetchImpl;
    }

    const { default: nodeFetch } = await import('node-fetch');
    this.fetchImpl = nodeFetch;
    return nodeFetch;
  }

  async ensureModel(model) {
    if (!model) {
      return;
    }

    const models = await this.listInstalledModels();
    if (!models.includes(model)) {
      throw new Error(
        `Ollama model "${model}" is not installed. Run \`ollama pull ${model}\` to make it available.`
      );
    }
  }

  async listInstalledModels(force = false) {
    const now = Date.now();
    if (!force && Array.isArray(this.cachedModels) && now - this.cachedModelsAt < this.modelCacheTtlMs) {
      return this.cachedModels;
    }

    const fetch = await this.resolveFetch();
    const response = await fetch(new URL('/api/tags', this.baseUrl), { method: 'GET' });
    if (!response.ok) {
      throw new Error(`Failed to list Ollama models: HTTP ${response.status}`);
    }

    const body = await response.json().catch(() => ({}));
    const models = Array.isArray(body.models)
      ? body.models
          .map((entry) => entry?.name || entry?.model || entry?.digest)
          .filter(Boolean)
      : [];

    this.cachedModels = models;
    this.cachedModelsAt = now;
    return models;
  }
}

module.exports = { OllamaClient };
