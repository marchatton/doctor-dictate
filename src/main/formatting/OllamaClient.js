class OllamaClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:11434';
    this.fetchImpl = options.fetchImpl || global.fetch || null;
    this.healthTimeoutMs = options.healthTimeoutMs || 3000;
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
}

module.exports = { OllamaClient };
