import { distanceAlongRouteM, type PoiCategories } from '@saferoute/scoring-engine';
import type {
  BoundingBox,
  EvaluatedPoi,
  Poi,
  RouteCandidate,
} from '@saferoute/shared-types';
import { boundingBoxKey, distanceToLineM } from '../lib/geo.js';
import type { TtlCache } from '../lib/cache.js';
import type { PlacesRepository } from '../repositories/interfaces.js';
import type { OpeningHoursService } from './opening-hours.service.js';

export class PoiService {
  constructor(
    private readonly places: PlacesRepository,
    private readonly openingHours: OpeningHoursService,
    private readonly categories: PoiCategories,
    private readonly cache: TtlCache<Poi[]>,
  ) {}

  /** Raw places in an area, cached per rounded bounding box. */
  async findInArea(bbox: BoundingBox): Promise<Poi[]> {
    return this.cache.wrap(`${this.places.name}:${boundingBoxKey(bbox)}`, () =>
      this.places.findInBoundingBox(bbox, this.categories.all()),
    );
  }

  /** Opening state at one moment, for map browsing where there is no route. */
  evaluateAt(pois: readonly Poi[], at: Date): EvaluatedPoi[] {
    return pois.map((poi) => ({
      ...poi,
      distanceFromRouteM: 0,
      openingState: this.openingHours.stateAt(poi, at, this.categories.get(poi.categoryId)),
    }));
  }

  /**
   * Resolves each place against the moment the traveller is expected to pass
   * it, rather than against departure time — on a 40-minute walk the far end of
   * the route is evaluated 40 minutes later, which is when it actually matters.
   */
  evaluateAlongRoute(
    pois: readonly Poi[],
    route: RouteCandidate,
    departure: Date,
  ): EvaluatedPoi[] {
    return pois.map((poi) => {
      const alongM = distanceAlongRouteM(route.geometry, poi.position);
      const fraction = route.distanceM === 0 ? 0 : alongM / route.distanceM;
      const passingTime = new Date(departure.getTime() + fraction * route.durationS * 1000);

      return {
        ...poi,
        distanceFromRouteM: distanceToLineM(route.geometry, poi.position),
        openingState: this.openingHours.stateAt(
          poi,
          passingTime,
          this.categories.get(poi.categoryId),
        ),
      };
    });
  }
}
