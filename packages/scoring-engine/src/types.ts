import type {
  FactorId,
  FactorResult,
  FactorWeight,
  PoiCategoryDefinition,
  RouteContext,
} from '@saferoute/shared-types';

/**
 * The single extension point of the scoring engine.
 *
 * To add a factor: implement this interface in `src/factors/<name>.factor.ts`,
 * export it from `src/factors/index.ts`, and add an entry to
 * `config/profiles.json`. Nothing else in the codebase needs to change.
 */
export interface ScoreFactor {
  readonly id: FactorId;
  /** Shown in the breakdown sheet when the profile does not override it. */
  readonly defaultLabel: string;
  compute(context: RouteContext, env: FactorEnvironment): FactorResult;
}

/** Everything a factor is given besides the route itself. */
export interface FactorEnvironment {
  /** Factor-specific options from the active profile. */
  options: Record<string, unknown>;
  categories: PoiCategoryCatalogue;
}

export interface PoiCategoryCatalogue {
  get(id: string): PoiCategoryDefinition | undefined;
  byTier(tier: PoiCategoryDefinition['tier']): PoiCategoryDefinition[];
  all(): PoiCategoryDefinition[];
}

export type { FactorWeight, FactorResult, RouteContext };
