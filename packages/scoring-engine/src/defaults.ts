import { builtInFactors } from './factors/index.js';
import { FactorRegistry } from './registry.js';
import type { ScoreFactor } from './types.js';

/**
 * Registry pre-loaded with the built-in factors. Pass `extraFactors` to add
 * your own without forking the package — this is the seam a deployment or a
 * downstream fork uses to plug in region-specific scoring.
 */
export function createDefaultRegistry(
  extraFactors: readonly ScoreFactor[] = [],
): FactorRegistry {
  return new FactorRegistry().registerAll(builtInFactors).registerAll(extraFactors);
}
