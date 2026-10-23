import type { BoundingBox, Poi, PoiCategoryDefinition } from '@saferoute/shared-types';
import type { HttpClient } from '../lib/http-client.js';
import type { PlacesRepository } from './interfaces.js';

interface GeoapifyResponse {
  features: {
    properties: {
      place_id: string;
      name?: string;
      categories?: string[];
      lon: number;
      lat: number;
      opening_hours?: string;
      datasource?: { raw?: Record<string, unknown> };
    };
  }[];
}

/**
 * Geoapify Places. Chosen as the default places provider because it normalises
 * OSM `opening_hours`, which the open-places and help-points factors need.
 */
export class GeoapifyPlacesRepository implements PlacesRepository {
  readonly name = 'geoapify';

  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly limit = 500,
  ) {}

  async findInBoundingBox(
    bbox: BoundingBox,
    categories: readonly PoiCategoryDefinition[],
  ): Promise<Poi[]> {
    const queries = categories.flatMap((category) => category.providerQueries.geoapify ?? []);
    if (queries.length === 0) return [];

    const url = new URL(`${this.baseUrl}/places`);
    url.searchParams.set('categories', [...new Set(queries)].join(','));
    url.searchParams.set(
      'filter',
      `rect:${bbox.minLon},${bbox.minLat},${bbox.maxLon},${bbox.maxLat}`,
    );
    url.searchParams.set('limit', String(this.limit));
    url.searchParams.set('apiKey', this.apiKey);

    const response = await this.http.getJson<GeoapifyResponse>('geoapify', url.toString());
    const lookup = buildCategoryLookup(categories);

    return response.features.flatMap((feature) => {
      const props = feature.properties;
      const categoryId = resolveCategoryId(props.categories ?? [], lookup);
      if (!categoryId) return [];

      return [
        {
          id: `geoapify:${props.place_id}`,
          name: props.name,
          categoryId,
          position: [props.lon, props.lat],
          openingHours:
            props.opening_hours ?? (props.datasource?.raw?.opening_hours as string | undefined),
          source: 'geoapify',
        } satisfies Poi,
      ];
    });
  }
}

/** Provider category string -> our category id, built from config. */
function buildCategoryLookup(
  categories: readonly PoiCategoryDefinition[],
): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const category of categories) {
    for (const query of category.providerQueries.geoapify ?? []) {
      lookup.set(query, category.id);
    }
  }
  return lookup;
}

/**
 * Geoapify returns several categories per place, from broad to specific. The
 * most specific match wins so a pharmacy inside a mall is not filed as retail.
 */
function resolveCategoryId(
  provided: string[],
  lookup: Map<string, string>,
): string | undefined {
  const matches = provided
    .filter((category) => lookup.has(category))
    .sort((a, b) => b.length - a.length);
  const best = matches[0];
  return best ? lookup.get(best) : undefined;
}
