import type { PoiCategories } from '@saferoute/scoring-engine';
import type { RouteCardView, RoutePlanResponse, ScoredRoute } from '@saferoute/shared-types';
import type { RoutePlan } from '../services/route-planning.service.js';
import { cameraCollection, poiCollection } from './poi.view.js';

/**
 * View layer: the exact shape the route comparison screen renders — comparison
 * cards, the score ring, and the breakdown sheet.
 */
export function routePlanView(
  plan: RoutePlan,
  categories: PoiCategories,
): RoutePlanResponse {
  const { comparison } = plan;

  return {
    routes: comparison.routes.map((route, index) =>
      routeCardView(route, {
        isFastest: index === comparison.fastestRouteIndex,
        isHighestActivity: index === comparison.highestActivityRouteIndex,
        openPlaceCount: plan.openPlaceCountByRouteId[route.id] ?? 0,
      }),
    ),
    fastestRouteIndex: comparison.fastestRouteIndex,
    highestActivityRouteIndex: comparison.highestActivityRouteIndex,
    pois: poiCollection(plan.pois, categories),
    cameras: cameraCollection(plan.cameras),
  };
}

interface CardFlags {
  isFastest: boolean;
  isHighestActivity: boolean;
  openPlaceCount: number;
}

function routeCardView(route: ScoredRoute, flags: CardFlags): RouteCardView {
  const possiblePoints = route.score.factors.reduce((sum, f) => sum + f.maxPoints, 0);

  return {
    id: route.id,
    geometry: route.geometry,
    distanceM: Math.round(route.distanceM),
    durationS: Math.round(route.durationS),
    durationMin: Math.round(route.durationS / 60),
    mode: route.mode,
    isFastest: flags.isFastest,
    isHighestActivity: flags.isHighestActivity,
    openPlaceCount: flags.openPlaceCount,
    score: {
      total: route.score.total,
      outOf: 100,
      dataCoverage:
        possiblePoints === 0
          ? 0
          : Math.round((route.score.effectiveMaxPoints / possiblePoints) * 100) / 100,
      judgedFactorCount: route.score.factors.filter((f) => !f.excluded).length,
      factorCount: route.score.factors.length,
      caption: 'Activity points · not a safety rating',
      disclaimer: route.score.disclaimer,
      // Ordered high-to-low so the breakdown sheet reads as a ranking of what
      // actually drove the score.
      breakdown: [...route.score.factors]
        .sort((a, b) => b.points - a.points)
        .map((factor) => ({
          factorId: factor.factorId,
          label: factor.label,
          points: factor.points,
          maxPoints: factor.maxPoints,
          explanation: factor.explanation,
          excluded: factor.excluded,
          excludedReason: factor.excluded ? 'Not enough data in this area' : null,
          details: factor.details ?? {},
        })),
    },
    steps: route.steps.map((step) => ({
      instruction: step.instruction,
      distanceM: Math.round(step.distanceM),
      durationS: Math.round(step.durationS),
    })),
  };
}
