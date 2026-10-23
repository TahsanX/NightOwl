import type { PoiCategoryDefinition } from '@saferoute/shared-types';
import type { PoiCategoryCatalogue } from './types.js';

/** In-memory view over the POI category config. Pure data, no behaviour branches. */
export class PoiCategories implements PoiCategoryCatalogue {
  readonly #byId: Map<string, PoiCategoryDefinition>;

  constructor(definitions: readonly PoiCategoryDefinition[]) {
    this.#byId = new Map(definitions.map((definition) => [definition.id, definition]));
  }

  get(id: string): PoiCategoryDefinition | undefined {
    return this.#byId.get(id);
  }

  byTier(tier: PoiCategoryDefinition['tier']): PoiCategoryDefinition[] {
    return this.all().filter((definition) => definition.tier === tier);
  }

  all(): PoiCategoryDefinition[] {
    return [...this.#byId.values()];
  }

  /** Provider query strings for a given source, e.g. 'geoapify' or 'overpass'. */
  queriesFor(source: string): Map<string, string[]> {
    const out = new Map<string, string[]>();
    for (const definition of this.all()) {
      const queries = definition.providerQueries[source];
      if (queries?.length) out.set(definition.id, queries);
    }
    return out;
  }
}
