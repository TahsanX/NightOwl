import type {
  LegendResponse,
  PlaceSearchResponse,
  PlanRouteBody,
  Position,
  RoutePlanResponse,
} from '@saferoute/shared-types';
import { config } from '../config';
import type { SafeRouteApi } from './client';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class RestSafeRouteApi implements SafeRouteApi {
  constructor(private readonly baseUrl: string = config.apiBaseUrl) {}

  planRoute(body: PlanRouteBody): Promise<RoutePlanResponse> {
    return this.#request<RoutePlanResponse>('/routes/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  searchPlaces(text: string, near?: Position, signal?: AbortSignal): Promise<PlaceSearchResponse> {
    const params = new URLSearchParams({ q: text });
    if (near) {
      params.set('lon', String(near[0]));
      params.set('lat', String(near[1]));
    }
    return this.#request<PlaceSearchResponse>(`/search?${params.toString()}`, { signal });
  }

  legend(): Promise<LegendResponse> {
    return this.#request<LegendResponse>('/places/legend');
  }

  async #request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { message?: string } | null;
      throw new ApiError(response.status, body?.message ?? `Request failed (${response.status})`);
    }
    return (await response.json()) as T;
  }
}
