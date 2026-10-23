import type { BoundingBox } from '@saferoute/shared-types';
import type { HttpClient } from './http-client.js';

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

/** Overpass takes bbox as (south,west,north,east). */
export const bboxClause = (bbox: BoundingBox): string =>
  `(${bbox.minLat},${bbox.minLon},${bbox.maxLat},${bbox.maxLon})`;

/**
 * Turns a config tag filter into Overpass syntax:
 *   "amenity=hospital" -> ["amenity"="hospital"]
 *   "office=*"         -> ["office"]
 */
export function tagFilter(expression: string): string {
  const [key, value] = expression.split('=');
  if (!key) throw new Error(`Invalid tag filter "${expression}"`);
  return value && value !== '*' ? `["${key}"="${value}"]` : `["${key}"]`;
}

export function elementPosition(element: OverpassElement): [number, number] | undefined {
  const lon = element.lon ?? element.center?.lon;
  const lat = element.lat ?? element.center?.lat;
  return lon !== undefined && lat !== undefined ? [lon, lat] : undefined;
}

export class OverpassClient {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  async query(statements: string[], timeoutS = 25): Promise<OverpassElement[]> {
    const ql = `[out:json][timeout:${timeoutS}];(${statements.join('')});out center tags;`;
    const response = await this.http.postForm<OverpassResponse>(
      'overpass',
      this.baseUrl,
      new URLSearchParams({ data: ql }).toString(),
    );
    return response.elements;
  }
}
