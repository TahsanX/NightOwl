import type { FactorResult } from '@saferoute/shared-types';
import { clamp01, distanceAlongRouteM } from '../geo.js';
import { numberOption } from '../options.js';
import type { FactorEnvironment, ScoreFactor } from '../types.js';

/**
 * "Fewer gaps between open places" — a route can have plenty of open places in
 * total and still contain one long empty stretch. This factor scores the worst
 * stretch, not the average.
 *
 * Every open place counts here regardless of category weight: for the purpose
 * of "is there anyone around", a grocery kiosk is as good as a supermarket.
 */
export const coverageGapsFactor: ScoreFactor = {
  id: 'coverage-gaps',
  defaultLabel: 'Fewer gaps between open places',

  compute(context, env: FactorEnvironment): FactorResult {
    const maxAcceptableGapM = numberOption(env.options, 'maxAcceptableGapM', 600);
    const maxDistanceM = numberOption(env.options, 'maxDistanceFromRouteM', 150);

    const openPositions = context.pois
      .filter((poi) => poi.openingState === 'open' && poi.distanceFromRouteM <= maxDistanceM)
      .map((poi) => distanceAlongRouteM(context.route.geometry, poi.position))
      .sort((a, b) => a - b);

    const total = context.route.distanceM;
    const marks = [0, ...openPositions, total];

    let longestGapM = 0;
    for (let i = 1; i < marks.length; i += 1) {
      longestGapM = Math.max(longestGapM, marks[i]! - marks[i - 1]!);
    }

    const value = clamp01(1 - longestGapM / maxAcceptableGapM);

    return {
      factorId: 'coverage-gaps',
      value,
      confidence: context.pois.length === 0 ? 0.2 : 0.8,
      explanation:
        longestGapM >= total
          ? 'No open places were found along this route, so the whole stretch is unbroken.'
          : `The longest stretch without an open place is about ${Math.round(longestGapM)} m.`,
      details: {
        longestGapM: Math.round(longestGapM),
        openPlaceCount: openPositions.length,
      },
    };
  },
};
