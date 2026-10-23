import type { ScoringEngine } from '@saferoute/scoring-engine';
import type {
  CommunityReportSummary,
  EvaluatedPoi,
  Position,
  RouteComparison,
  ScoredRoute,
  SurveillanceCamera,
  TravelMode,
} from '@saferoute/shared-types';
import { boundingBoxOf, mergeBoundingBoxes } from '../lib/geo.js';
import type { CommunityReportRepository, RoutingRepository } from '../repositories/interfaces.js';
import type { CameraService } from './camera.service.js';
import type { PoiService } from './poi.service.js';

export interface PlanRouteRequest {
  origin: Position;
  destination: Position;
  mode: TravelMode;
  departureTime: Date;
}

export interface RoutePlan {
  comparison: RouteComparison;
  /** Open places near each route, counted per route rather than per plan. */
  openPlaceCountByRouteId: Record<string, number>;
  /** Everything worth drawing on the map, evaluated along the chosen route. */
  pois: EvaluatedPoi[];
  cameras: SurveillanceCamera[];
}

/** How far either side of a route to look for places, per travel mode. */
const SEARCH_BUFFER_M: Record<TravelMode, number> = {
  walking: 400,
  cycling: 600,
  driving: 1000,
};

export class RoutePlanningService {
  constructor(
    private readonly routing: RoutingRepository,
    private readonly poiService: PoiService,
    private readonly cameraService: CameraService,
    private readonly reports: CommunityReportRepository,
    private readonly engine: ScoringEngine,
    /** How long the plan waits for an optional layer before scoring without it. */
    private readonly optionalLayerBudgetMs: number,
  ) {}

  async plan(request: PlanRouteRequest): Promise<RoutePlan> {
    const routes = await this.routing.findAlternatives(
      request.origin,
      request.destination,
      request.mode,
    );
    if (routes.length === 0) {
      throw new NoRouteError('No route was found between those points.');
    }

    const buffer = SEARCH_BUFFER_M[request.mode];
    const area = mergeBoundingBoxes(
      routes.map((route) => boundingBoxOf(route.geometry, buffer)),
    );

    // Contextual layers are optional: if a provider is down, rate limited or
    // just slow, the plan still returns on time and the affected factors drop
    // out of the score for lack of confidence instead of reporting a falsely
    // low number. A slow fetch keeps running and warms the cache for next time.
    const budget = this.optionalLayerBudgetMs;
    const [pois, cameras, reportSummaries] = await Promise.all([
      this.poiService.findInArea(area),
      optional(this.cameraService.findInArea(area), [] as SurveillanceCamera[], budget),
      optional(this.reports.summarise(area), [] as CommunityReportSummary[], budget),
    ]);

    const openPlaceCountByRouteId: Record<string, number> = {};

    const scored: ScoredRoute[] = routes.map((route) => {
      const evaluated = this.poiService.evaluateAlongRoute(pois, route, request.departureTime);
      openPlaceCountByRouteId[route.id] = evaluated.filter(
        (poi) => poi.openingState === 'open' && poi.distanceFromRouteM <= buffer,
      ).length;

      const score = this.engine.score(
        {
          route,
          mode: request.mode,
          departureTime: request.departureTime.toISOString(),
          pois: evaluated,
          cameras,
          communityReports: reportSummaries,
        },
        request.mode,
      );
      return { ...route, mode: request.mode, score };
    });

    const fastestRouteIndex = indexOfMin(scored, (route) => route.durationS);
    const highestActivityRouteIndex = indexOfMin(scored, (route) => -route.score.total);

    return {
      comparison: { routes: scored, fastestRouteIndex, highestActivityRouteIndex },
      openPlaceCountByRouteId,
      pois: this.poiService.evaluateAlongRoute(
        pois,
        scored[highestActivityRouteIndex]!,
        request.departureTime,
      ),
      cameras,
    };
  }
}

export class NoRouteError extends Error {
  readonly status = 404;
}

async function optional<T>(promise: Promise<T>, fallback: T, budgetMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), budgetMs);
  });
  try {
    return await Promise.race([promise.catch(() => fallback), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function indexOfMin<T>(items: readonly T[], by: (item: T) => number): number {
  let bestIndex = 0;
  let bestValue = Infinity;
  items.forEach((item, index) => {
    const value = by(item);
    if (value < bestValue) {
      bestValue = value;
      bestIndex = index;
    }
  });
  return bestIndex;
}
