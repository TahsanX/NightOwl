import type { BoundingBox, SurveillanceCamera } from '@saferoute/shared-types';
import { bboxClause, elementPosition, type OverpassClient } from '../lib/overpass.js';
import type { CameraRepository } from './interfaces.js';

/**
 * Surveillance camera *locations* from OpenStreetMap (`man_made=surveillance`),
 * fetched one bounding box at a time through Overpass.
 *
 * This is deliberately not the "stitch together city traffic-camera feeds"
 * approach: those feeds exist only for a handful of named cities and would not
 * generalise to wherever SafeRoute is deployed. OSM tags are sparse but global,
 * and the surveillance factor is written to treat "none found" as unknown.
 *
 * No video, no streams — positions and tags only.
 */
export class OverpassCameraRepository implements CameraRepository {
  readonly name = 'overpass';

  constructor(private readonly overpass: OverpassClient) {}

  async findInBoundingBox(bbox: BoundingBox): Promise<SurveillanceCamera[]> {
    const area = bboxClause(bbox);
    const elements = await this.overpass.query([
      `nwr["man_made"="surveillance"]${area};`,
    ]);

    return elements.flatMap((element) => {
      const position = elementPosition(element);
      if (!position) return [];

      const direction = Number(element.tags?.['camera:direction']);
      return [
        {
          id: `osm:${element.type}/${element.id}`,
          position,
          surveillanceType: element.tags?.surveillance,
          directionDeg: Number.isFinite(direction) ? direction : undefined,
          source: 'openstreetmap',
        } satisfies SurveillanceCamera,
      ];
    });
  }
}
