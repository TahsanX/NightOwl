import OpeningHours from 'opening_hours';
import type { OpeningState, Poi, PoiCategoryDefinition } from '@saferoute/shared-types';

/**
 * Resolves OSM `opening_hours` expressions to open/closed/unknown at a moment.
 *
 * The three-state result is the point: an unparseable or missing expression
 * must stay `unknown` so the scoring factors can discount it, rather than
 * silently reading as "closed" and penalising places that simply were never
 * tagged.
 */
export class OpeningHoursService {
  readonly #cache = new Map<string, OpeningHours | null>();

  stateAt(
    poi: Poi,
    at: Date,
    category: PoiCategoryDefinition | undefined,
  ): OpeningState {
    const expression = poi.openingHours ?? category?.assumedHours;
    if (!expression) return 'unknown';

    const parsed = this.#parse(expression);
    if (!parsed) return 'unknown';

    try {
      if (parsed.getUnknown(at)) return 'unknown';
      return parsed.getState(at) ? 'open' : 'closed';
    } catch {
      return 'unknown';
    }
  }

  /** Expressions repeat heavily across a city ("24/7", "Mo-Sa 09:00-21:00"). */
  #parse(expression: string): OpeningHours | null {
    if (this.#cache.has(expression)) return this.#cache.get(expression) ?? null;

    let parsed: OpeningHours | null = null;
    try {
      parsed = new OpeningHours(expression);
    } catch {
      parsed = null;
    }
    this.#cache.set(expression, parsed);
    return parsed;
  }
}
