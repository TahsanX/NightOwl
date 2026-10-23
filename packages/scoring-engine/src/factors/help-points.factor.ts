import type { FactorResult } from '@saferoute/shared-types';
import { clamp01 } from '../geo.js';
import { numberOption } from '../options.js';
import type { FactorEnvironment, ScoreFactor } from '../types.js';

/**
 * "Open help points nearby" — staffed places where someone could actually ask
 * for help: hospitals, police stations, pharmacies, fuel stations.
 *
 * Unlike `open-places`, a closed hospital or police station still counts
 * partially: the building is a landmark and emergency access often exists.
 */
export const helpPointsFactor: ScoreFactor = {
  id: 'help-points',
  defaultLabel: 'Open help points nearby',

  compute(context, env: FactorEnvironment): FactorResult {
    const maxDistanceM = numberOption(env.options, 'maxDistanceFromRouteM', 400);
    const targetWeightedPerKm = numberOption(env.options, 'targetWeightedPerKm', 1.5);
    const closedCredit = numberOption(env.options, 'closedCredit', 0.3);

    const helpPoints = context.pois.filter(
      (poi) =>
        poi.distanceFromRouteM <= maxDistanceM &&
        env.categories.get(poi.categoryId)?.tier === 'assistance',
    );

    const weighted = helpPoints.reduce((sum, poi) => {
      const weight = env.categories.get(poi.categoryId)?.weight ?? 1;
      const availability = poi.openingState === 'closed' ? closedCredit : 1;
      return sum + weight * availability;
    }, 0);

    const routeKm = Math.max(context.route.distanceM / 1000, 0.1);
    const value = clamp01(weighted / routeKm / targetWeightedPerKm);

    return {
      factorId: 'help-points',
      value,
      // Assistance POIs are well mapped almost everywhere, so finding none is
      // informative rather than a data gap — confidence stays usable.
      confidence: helpPoints.length === 0 ? 0.6 : 0.9,
      explanation:
        helpPoints.length === 0
          ? 'No hospitals, pharmacies or police stations are listed close to this route.'
          : `${helpPoints.length} assistance point(s) are listed within ${maxDistanceM} m of this route.`,
      details: {
        helpPointCount: helpPoints.length,
        openCount: helpPoints.filter((poi) => poi.openingState === 'open').length,
      },
    };
  },
};
