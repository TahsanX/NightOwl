import type { PlaceSearchResult, Position } from '@saferoute/shared-types';
import type { HttpClient } from '../lib/http-client.js';
import type { GeocodingRepository } from './interfaces.js';

interface GeoapifyAutocompleteResponse {
  results: {
    place_id: string;
    name?: string;
    address_line1?: string;
    address_line2?: string;
    formatted?: string;
    lon: number;
    lat: number;
  }[];
}

/** Destination search. Runs server-side so the API key never ships in the app. */
export class GeoapifyGeocodingRepository implements GeocodingRepository {
  readonly name = 'geoapify';

  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
    private readonly apiKey: string,
  ) {}

  async search(
    text: string,
    near: Position | undefined,
    limit: number,
  ): Promise<PlaceSearchResult[]> {
    const url = new URL(`${this.baseUrl}/autocomplete`);
    url.searchParams.set('text', text);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('format', 'json');
    url.searchParams.set('apiKey', this.apiKey);
    if (near) url.searchParams.set('bias', `proximity:${near[0]},${near[1]}`);

    const response = await this.http.getJson<GeoapifyAutocompleteResponse>(
      'geoapify',
      url.toString(),
    );

    return response.results.map((result) => ({
      id: `geoapify:${result.place_id}`,
      name: result.name ?? result.address_line1 ?? result.formatted ?? 'Unnamed place',
      address: result.address_line2 ?? '',
      position: [result.lon, result.lat],
    }));
  }
}

export class GeocodingUnavailableError extends Error {
  readonly status = 503;
}

/** Used when no geocoding key is configured, so the failure is explicit. */
export class UnavailableGeocodingRepository implements GeocodingRepository {
  readonly name = 'unavailable';

  async search(): Promise<PlaceSearchResult[]> {
    throw new GeocodingUnavailableError(
      'Place search needs GEOAPIFY_API_KEY to be set on the server.',
    );
  }
}
