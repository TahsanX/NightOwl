export type FactorId = string;

/** What a single ScoreFactor returns. Normalised, so weighting stays in config. */
export interface FactorResult {
  factorId: FactorId;
  /** 0..1 — how well this route does on this factor alone. */
  value: number;
  /**
   * 0..1 — how much data the factor actually had. A factor that reports low
   * confidence is dropped from the total rather than scored as zero, so
   * unmapped areas are treated as "unknown", never as "bad".
   */
  confidence: number;
  /** Plain-language line shown in the score breakdown sheet. */
  explanation: string;
  /** Free-form numbers backing the explanation, e.g. counts and distances. */
  details?: Record<string, number | string>;
}

/** A factor result after the engine has applied the configured weight. */
export interface ScoredFactor extends FactorResult {
  label: string;
  points: number;
  maxPoints: number;
  /** True when the factor was dropped from the total for lack of data. */
  excluded: boolean;
}

export interface RouteScore {
  /** 0..100, rounded for display. */
  total: number;
  factors: ScoredFactor[];
  /** Sum of maxPoints actually counted, after exclusions. */
  effectiveMaxPoints: number;
  /** Profile used to weight the factors, e.g. 'walking'. */
  profileId: string;
  /** Mirrors the disclaimer shown in the UI — this is an activity estimate. */
  disclaimer: string;
}

/** Config: one entry per factor, per profile. */
export interface FactorWeight {
  factorId: FactorId;
  label: string;
  maxPoints: number;
  /** Below this confidence the factor is excluded from the total. */
  minConfidence?: number;
  /** Factor-specific tuning, passed through to the factor at compute time. */
  options?: Record<string, unknown>;
}

export interface ScoringProfile {
  id: string;
  label: string;
  factors: FactorWeight[];
}
