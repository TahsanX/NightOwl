import type { ScoreFactor } from './types.js';

export class FactorRegistry {
  readonly #factors = new Map<string, ScoreFactor>();

  register(factor: ScoreFactor): this {
    if (this.#factors.has(factor.id)) {
      throw new Error(`Score factor "${factor.id}" is already registered.`);
    }
    this.#factors.set(factor.id, factor);
    return this;
  }

  registerAll(factors: Iterable<ScoreFactor>): this {
    for (const factor of factors) this.register(factor);
    return this;
  }

  get(id: string): ScoreFactor | undefined {
    return this.#factors.get(id);
  }

  ids(): string[] {
    return [...this.#factors.keys()];
  }
}
