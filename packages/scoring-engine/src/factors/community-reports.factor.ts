import type { FactorResult } from '@saferoute/shared-types';
import { clamp01, haversineM } from '../geo.js';
import { numberOption } from '../options.js';
import type { FactorEnvironment, ScoreFactor } from '../types.js';

/**
 * "Community feedback" — travellers' own ratings of the area, time-decayed and
 * confidence-weighted upstream by the report repository.
 *
 * Reported sentiment is -1..1; it is mapped onto 0..1 so that an area with no
 * strong feedback lands mid-scale rather than at either extreme.
 */
export const communityReportsFactor: ScoreFactor = {
  id: 'community-reports',
  defaultLabel: 'Community feedback',

  compute(context, env: FactorEnvironment): FactorResult {
    const maxDistanceM = numberOption(env.options, 'maxDistanceFromRouteM', 200);

    const relevant = context.communityReports.filter((report) =>
      context.route.geometry.coordinates.some(
        (vertex) => haversineM(vertex, report.position) <= maxDistanceM,
      ),
    );

    if (relevant.length === 0) {
      return {
        factorId: 'community-reports',
        value: 0.5,
        confidence: 0,
        explanation: 'No community feedback has been submitted for this area yet.',
        details: { reportCount: 0 },
      };
    }

    const totalConfidence = relevant.reduce((sum, r) => sum + r.confidence, 0);
    const weightedSentiment =
      relevant.reduce((sum, r) => sum + r.sentiment * r.confidence, 0) / totalConfidence;

    return {
      factorId: 'community-reports',
      value: clamp01((weightedSentiment + 1) / 2),
      confidence: clamp01(totalConfidence / relevant.length),
      explanation: `${relevant.length} community report(s) cover parts of this route.`,
      details: {
        reportCount: relevant.length,
        averageSentiment: Number(weightedSentiment.toFixed(2)),
      },
    };
  },
};
