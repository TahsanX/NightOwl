import type { EvaluatedPoi } from '@saferoute/shared-types';
import { clamp01 } from '../geo.js';

/**
 * Share of places whose opening state is actually known.
 *
 * Deliberately has no floor: if almost nothing near the route has opening
 * hours tagged, a factor built on "what is open" has nothing to stand on and
 * must fall below the exclusion threshold, not score the route as empty.
 */
export function knownHoursConfidence(pois: readonly EvaluatedPoi[]): number {
  if (pois.length === 0) return 0;
  const known = pois.filter((poi) => poi.openingState !== 'unknown').length;
  return clamp01(known / pois.length);
}
