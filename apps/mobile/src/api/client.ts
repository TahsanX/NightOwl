import type {
  LegendResponse,
  PlaceSearchResponse,
  PlanRouteBody,
  Position,
  RoutePlanResponse,
} from '@saferoute/shared-types';

/**
 * The app talks to this interface, never to `fetch` directly.
 *
 * That is what lets the planned offline build swap in a client backed by the
 * on-device routing engine and SQLite cache without any screen changing.
 */
export interface SafeRouteApi {
  planRoute(body: PlanRouteBody): Promise<RoutePlanResponse>;
  searchPlaces(text: string, near?: Position, signal?: AbortSignal): Promise<PlaceSearchResponse>;
  legend(): Promise<LegendResponse>;
}
