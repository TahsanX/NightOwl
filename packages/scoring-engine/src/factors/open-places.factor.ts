import type { EvaluatedPoi, FactorResult } from '@saferoute/shared-types';
import { clamp01 } from '../geo.js';
import type { FactorEnvironment, ScoreFactor } from '../types.js';
import { numberOption } from '../options.js';
import { knownHoursConfidence } from './confidence.js';

/**
 * "Open places along the route" — how much ordinary activity (shops, food,
 * fuel, kiosks) is listed as open around the time the traveller passes.
 *
 * Category weights come from the catalogue, so a corner grocery contributes
 * less than a 24h supermarket without any branching here.
 */
export const openPlacesFactor: ScoreFactor = {
  id: 'open-places',
  defaultLabel: 'Open places along the route',

  compute(context, env: FactorEnvironment): FactorResult {
    const targetPerKm = numberOption(env.options, 'targetOpenPlacesPerKm', 6);
    const maxDistanceM = numberOption(env.options, 'maxDistanceFromRouteM', 150);

    const nearby = context.pois.filter(
      (poi) => poi.distanceFromRouteM <= maxDistanceM && isScored(poi, env),
    );
    const open = nearby.filter((poi) => poi.openingState === 'open');

    const weighted = open.reduce(
      (sum, poi) => sum + (env.categories.get(poi.categoryId)?.weight ?? 1),
      0,
    );

    const routeKm = Math.max(context.route.distanceM / 1000, 0.1);
    const value = clamp01(weighted / routeKm / targetPerKm);

    return {
      factorId: 'open-places',
      value,
      confidence: knownHoursConfidence(nearby),
      explanation: `${open.length} of ${nearby.length} listed places near this route are expected to be open as you pass.`,
      details: {
        openCount: open.length,
        nearbyCount: nearby.length,
        weightedOpenPerKm: Number((weighted / routeKm).toFixed(2)),
      },
    };
  },
};

function isScored(poi: EvaluatedPoi, env: FactorEnvironment): boolean {
  const tier = env.categories.get(poi.categoryId)?.tier;
  return tier === 'activity' || tier === 'assistance';
}
