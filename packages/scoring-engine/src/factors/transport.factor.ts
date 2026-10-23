import type { FactorResult } from '@saferoute/shared-types';
import { clamp01 } from '../geo.js';
import { numberOption } from '../options.js';
import type { FactorEnvironment, ScoreFactor } from '../types.js';

/**
 * "Transport locations listed open" — bus stops, stations and stands give a way
 * out of a street, which matters more on foot than in a car.
 */
export const transportFactor: ScoreFactor = {
  id: 'transport',
  defaultLabel: 'Transport locations listed open',

  compute(context, env: FactorEnvironment): FactorResult {
    const maxDistanceM = numberOption(env.options, 'maxDistanceFromRouteM', 300);
    const targetPerKm = numberOption(env.options, 'targetPerKm', 1);

    const stops = context.pois.filter(
      (poi) =>
        poi.distanceFromRouteM <= maxDistanceM &&
        env.categories.get(poi.categoryId)?.tier === 'transport',
    );
    // A stop with no hours data is still a stop; only an explicit "closed"
    // (e.g. a station with listed hours) is discounted.
    const usable = stops.filter((poi) => poi.openingState !== 'closed');

    const routeKm = Math.max(context.route.distanceM / 1000, 0.1);
    const value = clamp01(usable.length / routeKm / targetPerKm);

    return {
      factorId: 'transport',
      value,
      confidence: stops.length === 0 ? 0.4 : 0.8,
      explanation: `${usable.length} transport stop(s) listed within ${maxDistanceM} m of this route.`,
      details: { stopCount: stops.length, usableCount: usable.length },
    };
  },
};
