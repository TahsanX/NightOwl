import type { CommunityReport, CommunityReportSummary, Position } from '@saferoute/shared-types';

/** Reports older than this contribute almost nothing. */
const HALF_LIFE_DAYS = 60;
/** Grid cell for aggregation, in degrees (~110 m of latitude). */
const CELL_SIZE_DEG = 0.001;
/** How many corroborating reports a cell needs before it is fully trusted. */
const REPORTS_FOR_FULL_CONFIDENCE = 5;

/** 1..5 stars -> -1..1 sentiment. */
export const ratingToSentiment = (rating: number): number => (rating - 3) / 2;

export function decayWeight(createdAt: string, now = Date.now()): number {
  const ageDays = (now - new Date(createdAt).getTime()) / 86_400_000;
  if (!Number.isFinite(ageDays) || ageDays < 0) return 1;
  return 0.5 ** (ageDays / HALF_LIFE_DAYS);
}

const cellKey = ([lon, lat]: Position): string =>
  `${Math.floor(lon / CELL_SIZE_DEG)}:${Math.floor(lat / CELL_SIZE_DEG)}`;

/**
 * Aggregates raw reports into the time-decayed, confidence-weighted summaries
 * the scoring engine consumes.
 *
 * Shared by every report store so an in-memory dev run and a PostGIS deployment
 * cannot drift apart in how feedback is interpreted.
 */
export function summariseReports(
  reports: readonly CommunityReport[],
  now = Date.now(),
): CommunityReportSummary[] {
  const cells = new Map<string, CommunityReport[]>();
  for (const report of reports) {
    const key = cellKey(report.position);
    const bucket = cells.get(key);
    if (bucket) bucket.push(report);
    else cells.set(key, [report]);
  }

  return [...cells.values()].map((bucket) => {
    let weightTotal = 0;
    let sentimentTotal = 0;
    let lonTotal = 0;
    let latTotal = 0;

    for (const report of bucket) {
      const weight = decayWeight(report.createdAt, now) * (report.validated ? 1 : 0.6);
      weightTotal += weight;
      sentimentTotal += ratingToSentiment(report.rating) * weight;
      lonTotal += report.position[0];
      latTotal += report.position[1];
    }

    return {
      position: [lonTotal / bucket.length, latTotal / bucket.length],
      sentiment: weightTotal === 0 ? 0 : sentimentTotal / weightTotal,
      reportCount: bucket.length,
      confidence: Math.min(1, weightTotal / REPORTS_FOR_FULL_CONFIDENCE),
    };
  });
}
