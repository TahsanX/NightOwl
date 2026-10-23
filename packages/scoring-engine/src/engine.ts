import type {
  RouteContext,
  RouteScore,
  ScoredFactor,
  ScoringProfile,
} from '@saferoute/shared-types';
import type { PoiCategoryCatalogue } from './types.js';
import type { FactorRegistry } from './registry.js';

const DEFAULT_DISCLAIMER =
  'Activity estimate. More points mean more listed activity along the journey. A lower score does not mean the road is unsafe.';

export interface ScoringEngineOptions {
  registry: FactorRegistry;
  categories: PoiCategoryCatalogue;
  profiles: readonly ScoringProfile[];
  disclaimer?: string;
}

export class ScoringEngine {
  readonly #registry: FactorRegistry;
  readonly #categories: PoiCategoryCatalogue;
  readonly #profiles: Map<string, ScoringProfile>;
  readonly #disclaimer: string;

  constructor(options: ScoringEngineOptions) {
    this.#registry = options.registry;
    this.#categories = options.categories;
    this.#profiles = new Map(options.profiles.map((profile) => [profile.id, profile]));
    this.#disclaimer = options.disclaimer ?? DEFAULT_DISCLAIMER;
  }

  profileIds(): string[] {
    return [...this.#profiles.keys()];
  }

  /**
   * Scores one route under one profile.
   *
   * Factors that report confidence below their configured threshold are marked
   * `excluded` and removed from both the numerator and the denominator, so a
   * route is never punished for data that simply does not exist.
   */
  score(context: RouteContext, profileId: string): RouteScore {
    const profile = this.#profiles.get(profileId);
    if (!profile) {
      throw new Error(
        `Unknown scoring profile "${profileId}". Known profiles: ${this.profileIds().join(', ')}`,
      );
    }

    const factors: ScoredFactor[] = profile.factors.map((weight) => {
      const factor = this.#registry.get(weight.factorId);
      if (!factor) {
        throw new Error(
          `Profile "${profileId}" references unregistered factor "${weight.factorId}".`,
        );
      }

      const result = factor.compute(context, {
        options: weight.options ?? {},
        categories: this.#categories,
      });

      const minConfidence = weight.minConfidence ?? 0.25;
      const excluded = result.confidence < minConfidence;

      return {
        ...result,
        label: weight.label || factor.defaultLabel,
        maxPoints: weight.maxPoints,
        points: excluded ? 0 : round1(result.value * weight.maxPoints),
        excluded,
      };
    });

    const counted = factors.filter((factor) => !factor.excluded);
    const effectiveMaxPoints = counted.reduce((sum, factor) => sum + factor.maxPoints, 0);
    const earned = counted.reduce((sum, factor) => sum + factor.points, 0);

    return {
      total: effectiveMaxPoints === 0 ? 0 : Math.round((earned / effectiveMaxPoints) * 100),
      factors,
      effectiveMaxPoints,
      profileId,
      disclaimer: this.#disclaimer,
    };
  }
}

const round1 = (value: number): number => Math.round(value * 10) / 10;
