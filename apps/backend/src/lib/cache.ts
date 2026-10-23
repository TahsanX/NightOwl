interface Entry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Minimal TTL cache. Upstream geodata providers are rate limited and their data
 * changes slowly, so repeated route requests in the same area must not fan out
 * to them. Swap for Redis behind the same shape when there is more than one
 * backend instance.
 */
export class TtlCache<T> {
  readonly #entries = new Map<string, Entry<T>>();
  readonly #ttlMs: number;
  readonly #maxEntries: number;

  constructor(ttlSeconds: number, maxEntries = 500) {
    this.#ttlMs = ttlSeconds * 1000;
    this.#maxEntries = maxEntries;
  }

  get(key: string): T | undefined {
    const entry = this.#entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.#entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    if (this.#entries.size >= this.#maxEntries) {
      const oldest = this.#entries.keys().next();
      if (!oldest.done) this.#entries.delete(oldest.value);
    }
    this.#entries.set(key, { value, expiresAt: Date.now() + this.#ttlMs });
  }

  async wrap(key: string, produce: () => Promise<T>): Promise<T> {
    const cached = this.get(key);
    if (cached !== undefined) return cached;
    const value = await produce();
    this.set(key, value);
    return value;
  }
}
