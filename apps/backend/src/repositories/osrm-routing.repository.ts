import type {
  Position,
  RouteCandidate,
  RouteStep,
  TravelMode,
} from '@saferoute/shared-types';
import type { HttpClient } from '../lib/http-client.js';
import type { RoutingRepository } from './interfaces.js';

const OSRM_PROFILE: Record<TravelMode, string> = {
  walking: 'foot',
  cycling: 'bike',
  driving: 'car',
};

/** Road classes counted as "main roads" by the main-roads score factor. */
const MAIN_ROAD_CLASSES = new Set([
  'motorway',
  'trunk',
  'primary',
  'secondary',
  'tertiary',
]);

interface OsrmResponse {
  code: string;
  routes: {
    geometry: { type: 'LineString'; coordinates: Position[] };
    distance: number;
    duration: number;
    legs: {
      steps: {
        name: string;
        distance: number;
        duration: number;
        maneuver: { modifier?: string; bearing_before: number; bearing_after: number };
        // Present when the OSRM instance is built with road class annotations.
        ref?: string;
        rotary_name?: string;
        intersections?: { classes?: string[] }[];
      }[];
    }[];
  }[];
}

export class OsrmRoutingRepository implements RoutingRepository {
  readonly name = 'osrm';

  constructor(
    private readonly http: HttpClient,
    private readonly baseUrl: string,
  ) {}

  async findAlternatives(
    origin: Position,
    destination: Position,
    mode: TravelMode,
  ): Promise<RouteCandidate[]> {
    const coords = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
    const url =
      `${this.baseUrl}/route/v1/${OSRM_PROFILE[mode]}/${coords}` +
      '?alternatives=3&overview=full&geometries=geojson&steps=true&annotations=false';

    const response = await this.http.getJson<OsrmResponse>('osrm', url);
    return response.routes.map((route, index) => toCandidate(route, index));
  }
}

function toCandidate(route: OsrmResponse['routes'][number], index: number): RouteCandidate {
  const steps: RouteStep[] = route.legs.flatMap((leg) =>
    leg.steps.map((step) => ({
      instruction: step.name || step.maneuver.modifier || 'Continue',
      distanceM: step.distance,
      durationS: step.duration,
      turnAngleDeg: turnAngle(step.maneuver.bearing_before, step.maneuver.bearing_after),
      roadClass: step.intersections?.[0]?.classes?.[0],
    })),
  );

  return {
    id: `osrm-${index}`,
    geometry: route.geometry,
    distanceM: route.distance,
    durationS: route.duration,
    steps,
    mainRoadDistanceM: steps
      .filter((step) => step.roadClass && MAIN_ROAD_CLASSES.has(step.roadClass))
      .reduce((sum, step) => sum + step.distanceM, 0),
  };
}

/** Smallest signed angle between two bearings, in degrees. */
function turnAngle(before: number, after: number): number {
  const delta = ((after - before + 540) % 360) - 180;
  return Math.round(delta);
}
