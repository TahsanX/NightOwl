import type { LineStringGeometry, Position, TravelMode } from './geo.js';
import type { EvaluatedPoi, SurveillanceCamera } from './poi.js';
import type { RouteScore } from './score.js';

export interface RouteStep {
  instruction: string;
  distanceM: number;
  durationS: number;
  /** Turn angle in degrees; used by the "fewer turns" factor. */
  turnAngleDeg?: number;
  /** OSM highway class of the segment, e.g. 'primary', 'residential'. */
  roadClass?: string;
}

/** A route as returned by the routing provider, before scoring. */
export interface RouteCandidate {
  id: string;
  geometry: LineStringGeometry;
  distanceM: number;
  durationS: number;
  steps: RouteStep[];
  /** Metres of this route that run on main roads, per the provider's road classes. */
  mainRoadDistanceM: number;
}

/** Everything a ScoreFactor is allowed to look at. Factors must stay pure w.r.t. this. */
export interface RouteContext {
  route: RouteCandidate;
  mode: TravelMode;
  /** When the traveller is expected to pass each point; factors use it for opening hours. */
  departureTime: string;
  pois: EvaluatedPoi[];
  cameras: SurveillanceCamera[];
  communityReports: CommunityReportSummary[];
}

export interface CommunityReportSummary {
  position: Position;
  /** -1..1, aggregated and time-decayed. */
  sentiment: number;
  reportCount: number;
  confidence: number;
}

/** A scored route, as served to the client. */
export interface ScoredRoute extends RouteCandidate {
  score: RouteScore;
  mode: TravelMode;
}

export interface RouteComparison {
  routes: ScoredRoute[];
  /** Index into `routes` of the quickest option. */
  fastestRouteIndex: number;
  /** Index into `routes` of the highest-scoring option. */
  highestActivityRouteIndex: number;
}
