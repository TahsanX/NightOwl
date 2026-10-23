import type { Position } from './geo.js';

/**
 * Category ids are plain strings on purpose: the catalogue lives in config
 * (see packages/scoring-engine/config/poi-categories.json), so a contributor
 * can add a category without a type-level change rippling through the codebase.
 */
export type PoiCategoryId = string;

/** Tri-state because "we have no opening-hours data" must never be scored as "closed". */
export type OpeningState = 'open' | 'closed' | 'unknown';

export interface Poi {
  id: string;
  name?: string;
  categoryId: PoiCategoryId;
  position: Position;
  /** Raw OSM-syntax opening_hours string, when the source provides one. */
  openingHours?: string;
  /** Source of the record, e.g. 'geoapify' | 'overpass' | 'community'. */
  source: string;
}

/** A Poi resolved against a specific moment in time (usually estimated arrival). */
export interface EvaluatedPoi extends Poi {
  openingState: OpeningState;
  /** Metres from the route polyline. */
  distanceFromRouteM: number;
}

export interface SurveillanceCamera {
  id: string;
  position: Position;
  /** OSM `surveillance` tag: 'public' | 'outdoor' | 'indoor' | ... when present. */
  surveillanceType?: string;
  /** OSM `camera:direction` in degrees, when mapped. */
  directionDeg?: number;
  source: string;
}

/**
 * Config shape for one POI category. `mapIcon` drives rendering, `tier` and the
 * weights drive scoring — both are data, never branches in code.
 */
export interface PoiCategoryDefinition {
  id: PoiCategoryId;
  label: string;
  /** Icon id registered with the map style's sprite sheet. */
  mapIcon: string;
  /** Hex colour for the marker, also used by the legend. */
  mapColor: string;
  /**
   * 'assistance'  — staffed help points (hospital, police, pharmacy, fuel)
   * 'activity'    — places whose presence means people are around (shops, food)
   * 'transport'   — stops and stations
   */
  tier: 'assistance' | 'activity' | 'transport';
  /** Relative contribution within its tier. A corner shop < a hospital. */
  weight: number;
  /** Provider query strings, e.g. Geoapify categories / Overpass tag filters. */
  providerQueries: Record<string, string[]>;
  /** Fallback when a POI of this category has no opening_hours data. */
  assumedHours?: string;
}
