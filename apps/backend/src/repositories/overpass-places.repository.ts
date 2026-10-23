import type { BoundingBox, Poi, PoiCategoryDefinition } from '@saferoute/shared-types';
import {
  bboxClause,
  elementPosition,
  tagFilter,
  type OverpassClient,
} from '../lib/overpass.js';
import type { PlacesRepository } from './interfaces.js';

/**
 * Keyless places provider. Slower and rate limited compared with Geoapify, but
 * it needs no API key — which keeps the project runnable by any contributor who
 * just cloned the repo.
 */
export class OverpassPlacesRepository implements PlacesRepository {
  readonly name = 'overpass';

  constructor(private readonly overpass: OverpassClient) {}

  async findInBoundingBox(
    bbox: BoundingBox,
    categories: readonly PoiCategoryDefinition[],
  ): Promise<Poi[]> {
    const area = bboxClause(bbox);
    const statements: string[] = [];
    const filterToCategory = new Map<string, string>();

    for (const category of categories) {
      for (const expression of category.providerQueries.overpass ?? []) {
        const filter = tagFilter(expression);
        filterToCategory.set(filter, category.id);
        // `nwr` is one statement for nodes, ways and relations; issuing them
        // separately doubles the work the public instance has to schedule.
        statements.push(`nwr${filter}${area};`);
      }
    }
    if (statements.length === 0) return [];

    const elements = await this.overpass.queryInBatches(statements);

    return elements.flatMap((element) => {
      const position = elementPosition(element);
      const categoryId = matchCategory(element.tags ?? {}, filterToCategory);
      if (!position || !categoryId) return [];

      return [
        {
          id: `osm:${element.type}/${element.id}`,
          name: element.tags?.name,
          categoryId,
          position,
          openingHours: element.tags?.opening_hours,
          source: 'openstreetmap',
        } satisfies Poi,
      ];
    });
  }
}

/**
 * Overpass returns elements without saying which of our filters matched, so the
 * tags are re-checked here. Most specific filter (key=value) wins over a
 * wildcard (key=*) so an office inside a shop is not double-counted as both.
 */
function matchCategory(
  tags: Record<string, string>,
  filterToCategory: Map<string, string>,
): string | undefined {
  let wildcardMatch: string | undefined;

  for (const [filter, categoryId] of filterToCategory) {
    const exact = /^\["([^"]+)"="([^"]+)"\]$/.exec(filter);
    if (exact && tags[exact[1]!] === exact[2]) return categoryId;

    const wildcard = /^\["([^"]+)"\]$/.exec(filter);
    if (wildcard && tags[wildcard[1]!] !== undefined) wildcardMatch ??= categoryId;
  }
  return wildcardMatch;
}
