import type { LineStringGeometry, Position, TravelMode } from './geo.js';

/**
 * The HTTP contract between the API's view layer and every client.
 *
 * Both sides import these types, so a response-shape change that forgets a
 * client is a compile error rather than a runtime surprise. Breaking changes go
 * to a new /api/vN router instead of being edited in place.
 */

export interface PlanRouteBody {
  origin: Position;
  destination: Position;
  mode?: TravelMode;
  departureTime?: string;
}

export interface ScoreBreakdownItem {
  factorId: string;
  label: string;
  points: number;
  maxPoints: number;
  explanation: string;
  excluded: boolean;
  excludedReason: string | null;
  details: Record<string, number | string>;
}

export interface RouteScoreView {
  total: number;
  outOf: number;
  /**
   * 0..1 — share of the possible points that had enough data to be judged.
   * A 67 built on a third of the factors must not read like a 67 built on all
   * of them; clients are expected to say so when this is low.
   */
  dataCoverage: number;
  judgedFactorCount: number;
  factorCount: number;
  caption: string;
  disclaimer: string;
  breakdown: ScoreBreakdownItem[];
}

export interface RouteCardView {
  id: string;
  geometry: LineStringGeometry;
  distanceM: number;
  durationS: number;
  durationMin: number;
  mode: TravelMode;
  isFastest: boolean;
  isHighestActivity: boolean;
  openPlaceCount: number;
  score: RouteScoreView;
  steps: { instruction: string; distanceM: number; durationS: number }[];
}

export interface PoiFeatureProperties {
  id: string;
  name: string | null;
  categoryId: string;
  categoryLabel: string;
  icon: string;
  color: string;
  tier: string;
  openingState: string;
  distanceFromRouteM: number;
}

export interface CameraFeatureProperties {
  id: string;
  icon: 'camera';
  color: string;
  surveillanceType: string | null;
  directionDeg: number | null;
  source: string;
}

export interface PointFeature<P> {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: Position };
  properties: P;
}

export interface FeatureCollection<F> {
  type: 'FeatureCollection';
  features: F[];
}

export interface RoutePlanResponse {
  routes: RouteCardView[];
  fastestRouteIndex: number;
  highestActivityRouteIndex: number;
  pois: FeatureCollection<PointFeature<PoiFeatureProperties>>;
  cameras: FeatureCollection<PointFeature<CameraFeatureProperties>>;
}

export interface LegendEntry {
  categoryId: string;
  label: string;
  icon: string;
  color: string;
  tier: string;
}

export interface LegendResponse {
  categories: LegendEntry[];
}
