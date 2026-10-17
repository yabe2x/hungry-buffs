export class TTLCache {
  constructor({ ttlMs = 10 * 60 * 1000, maxEntries = 500, now = Date.now } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.now = now;
    this.map = new Map(); // insertion order = age
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expires <= this.now()) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    this.map.delete(key);
    this.map.set(key, { value, expires: this.now() + this.ttlMs });
    while (this.map.size > this.maxEntries) {
      this.map.delete(this.map.keys().next().value);
    }
  }

  // concurrent callers for the same key share one in-flight promise
  async getOrCompute(key, compute) {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const promise = compute().catch((err) => {
      this.map.delete(key);
      throw err;
    });
    this.set(key, promise);
    return promise;
  }
}
