class CacheManager {
  constructor() {
    this.cache = new Map();
    this.expireAt = new Map();
  }

  set(key, value, ttlMs = 300000) {
    this.cache.set(key, value);
    this.expireAt.set(key, Date.now() + ttlMs);
  }

  get(key) {
    if (!this.cache.has(key)) return null;
    const expires = this.expireAt.get(key);
    if (expires && Date.now() > expires) {
      this.cache.delete(key);
      this.expireAt.delete(key);
      return null;
    }
    return this.cache.get(key);
  }

  delete(key) {
    this.cache.delete(key);
    this.expireAt.delete(key);
  }

  clear() {
    this.cache.clear();
    this.expireAt.clear();
  }
}

module.exports = CacheManager;


