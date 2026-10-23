import type { BoundingBox, SurveillanceCamera } from '@saferoute/shared-types';
import { boundingBoxKey } from '../lib/geo.js';
import type { TtlCache } from '../lib/cache.js';
import type { CameraRepository } from '../repositories/interfaces.js';

export class CameraService {
  constructor(
    private readonly cameras: CameraRepository,
    private readonly cache: TtlCache<SurveillanceCamera[]>,
  ) {}

  /**
   * Camera positions change on the timescale of OSM edits, so these are cached
   * far longer than places — Overpass is a shared public resource.
   */
  async findInArea(bbox: BoundingBox): Promise<SurveillanceCamera[]> {
    return this.cache.wrap(`${this.cameras.name}:${boundingBoxKey(bbox, 2)}`, () =>
      this.cameras.findInBoundingBox(bbox),
    );
  }
}
