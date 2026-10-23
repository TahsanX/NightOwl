import type {
  BoundingBox,
  CommunityReport,
  CommunityReportInput,
  CommunityReportSummary,
  PlaceSearchResult,
  Poi,
  PoiCategoryDefinition,
  Position,
  RouteCandidate,
  SurveillanceCamera,
  TravelMode,
} from '@saferoute/shared-types';

/**
 * Ports. Services depend on these interfaces only, never on a provider SDK, so
 * swapping OSRM for GraphHopper or Geoapify for Overpass is a container change.
 */

export interface RoutingRepository {
  readonly name: string;
  findAlternatives(
    origin: Position,
    destination: Position,
    mode: TravelMode,
  ): Promise<RouteCandidate[]>;
}

export interface PlacesRepository {
  readonly name: string;
  findInBoundingBox(
    bbox: BoundingBox,
    categories: readonly PoiCategoryDefinition[],
  ): Promise<Poi[]>;
}

export interface CameraRepository {
  readonly name: string;
  findInBoundingBox(bbox: BoundingBox): Promise<SurveillanceCamera[]>;
}

export interface GeocodingRepository {
  readonly name: string;
  /** Free-text place search, ranked towards `near` when given. */
  search(text: string, near: Position | undefined, limit: number): Promise<PlaceSearchResult[]>;
}

export interface CommunityReportRepository {
  readonly name: string;
  create(input: CommunityReportInput): Promise<CommunityReport>;
  findInBoundingBox(bbox: BoundingBox): Promise<CommunityReport[]>;
  /** Aggregated, time-decayed view used by the scoring engine. */
  summarise(bbox: BoundingBox): Promise<CommunityReportSummary[]>;
}
