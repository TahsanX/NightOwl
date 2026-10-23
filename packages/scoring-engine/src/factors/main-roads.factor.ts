import type { FactorResult } from '@saferoute/shared-types';
import { clamp01 } from '../geo.js';
import { numberOption } from '../options.js';
import type { FactorEnvironment, ScoreFactor } from '../types.js';

/**
 * "Distance on main roads" — share of the journey on roads that usually carry
 * traffic and lighting, as classified by the routing provider.
 */
export const mainRoadsFactor: ScoreFactor = {
  id: 'main-roads',
  defaultLabel: 'Distance on main roads',

  compute(context, env: FactorEnvironment): FactorResult {
    const targetShare = numberOption(env.options, 'targetShare', 0.8);
    const total = context.route.distanceM;

    if (total <= 0) {
      return {
        factorId: 'main-roads',
        value: 0,
        confidence: 0,
        explanation: 'Route geometry was too short to classify.',
      };
    }

    const share = context.route.mainRoadDistanceM / total;
    const value = clamp01(share / targetShare);
    const classified = context.route.steps.filter((step) => step.roadClass).length;

    return {
      factorId: 'main-roads',
      value,
      // Without road classes from the provider this is guesswork, so say so.
      confidence: context.route.steps.length === 0 ? 0.2 : clamp01(classified / context.route.steps.length),
      explanation: `Main roads are identified along at least ${Math.round(share * 100)}% of this route.`,
      details: {
        mainRoadShare: Number(share.toFixed(3)),
        mainRoadDistanceM: Math.round(context.route.mainRoadDistanceM),
      },
    };
  },
};
