import type { ScoreFactor } from '../types.js';
import { communityReportsFactor } from './community-reports.factor.js';
import { coverageGapsFactor } from './coverage-gaps.factor.js';
import { helpPointsFactor } from './help-points.factor.js';
import { mainRoadsFactor } from './main-roads.factor.js';
import { openPlacesFactor } from './open-places.factor.js';
import { surveillanceFactor } from './surveillance.factor.js';
import { transportFactor } from './transport.factor.js';
import { turnsFactor } from './turns.factor.js';

/**
 * The built-in factor set.
 *
 * Adding a factor: create `<name>.factor.ts` next to these, implement
 * `ScoreFactor`, append it here, then give it a `maxPoints` entry in
 * `config/profiles.json`. No other file needs to change.
 */
export const builtInFactors: readonly ScoreFactor[] = [
  openPlacesFactor,
  helpPointsFactor,
  mainRoadsFactor,
  coverageGapsFactor,
  transportFactor,
  turnsFactor,
  surveillanceFactor,
  communityReportsFactor,
];

export {
  communityReportsFactor,
  coverageGapsFactor,
  helpPointsFactor,
  mainRoadsFactor,
  openPlacesFactor,
  surveillanceFactor,
  transportFactor,
  turnsFactor,
};
