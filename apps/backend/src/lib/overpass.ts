import type { BoundingBox } from '@saferoute/shared-types';
import { UpstreamError, type HttpClient } from './http-client.js';

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

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

/**
 * Overpass asks callers to identify themselves so they can contact or throttle
 * a misbehaving client instead of blocking a whole network. Some instances
 * reject anonymous requests outright with 406.
 */
const USER_AGENT = 'SafeRoute/0.1 (open source; https://github.com/saferoute/saferoute)';

/**
 * Server-side execution budget Overpass is asked for. A single tag filter over
 * a city-sized box has been measured at 35-60s on the public instance, and a
 * query that exceeds its own budget is aborted with 502 — so this has to be
 * generous. Self-host, or use Geoapify, if that latency matters.
 */
const DEFAULT_QUERY_TIMEOUT_S = 90;

export class OverpassClient {
  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  /**
   * Runs the statements in small batches, sequentially.
   *
   * A public instance will not schedule one query carrying every POI filter
   * over a city-sized box — it answers 502 rather than queueing it. Several
   * small queries get served where one large one is refused.
   */
  async queryInBatches(
    statements: string[],
    batchSize = 4,
    timeoutS = DEFAULT_QUERY_TIMEOUT_S,
  ): Promise<OverpassElement[]> {
    const elements: OverpassElement[] = [];
    for (let i = 0; i < statements.length; i += batchSize) {
      elements.push(...(await this.query(statements.slice(i, i + batchSize), timeoutS)));
    }
    return elements;
  }

  async query(
    statements: string[],
    timeoutS = DEFAULT_QUERY_TIMEOUT_S,
  ): Promise<OverpassElement[]> {
    const ql = `[out:json][timeout:${timeoutS}];(${statements.join('')});out center tags;`;
    const body = new URLSearchParams({ data: ql }).toString();

    // Public instances shed load with 429/502/504 when their slots are full;
    // the usage policy expects clients to back off and come back rather than
    // hammer or give up. Two attempts, then the caller decides.
    for (let attempt = 0; ; attempt += 1) {
      try {
        const response = await this.http.postForm<OverpassResponse>(
          'overpass',
          this.baseUrl,
          body,
          { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        );
        return response.elements;
      } catch (error) {
        const retryable =
          error instanceof UpstreamError && [429, 502, 503, 504].includes(error.status);
        if (!retryable || attempt >= 1) throw error;
        await delay(2000);
      }
    }
  }
}
