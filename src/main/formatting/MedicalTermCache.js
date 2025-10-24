const crypto = require('crypto');

class MedicalTermCache {
  constructor(options = {}) {
    this.maxEntries = options.maxEntries || 64;
    this.store = new Map();
  }

  buildKey(text, mode = 'default', extras = {}) {
    const hash = crypto.createHash('sha1');
    hash.update(String(mode));
    hash.update('\u0000');
    hash.update(text || '');
    if (extras.model) {
      hash.update('\u0001');
      hash.update(String(extras.model));
    }
    return hash.digest('hex');
  }

  get(key) {
    if (!key || !this.store.has(key)) {
      return null;
    }

    const value = this.store.get(key);
    return value ? { ...value } : null;
  }

  set(key, value) {
    if (!key) {
      return;
    }

    if (this.store.has(key)) {
      this.store.delete(key);
    }

    this.store.set(key, { ...value, updatedAt: Date.now() });
    this.trim();
  }

  touch(key) {
    if (!key || !this.store.has(key)) {
      return;
    }

    const entry = this.store.get(key);
    this.store.delete(key);
    this.store.set(key, { ...entry, accessedAt: Date.now() });
  }

  clear() {
    this.store.clear();
  }

  trim() {
    if (this.store.size <= this.maxEntries) {
      return;
    }

    const excess = this.store.size - this.maxEntries;
    const keysToDelete = Array.from(this.store.keys()).slice(0, excess);
    for (const key of keysToDelete) {
      this.store.delete(key);
    }
  }
}

module.exports = { MedicalTermCache };
