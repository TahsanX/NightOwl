import type { Request, Response } from 'express';
import { z } from 'zod';
import type { PoiCategories } from '@saferoute/scoring-engine';
import type { CameraService } from '../services/camera.service.js';
import type { PoiService } from '../services/poi.service.js';
import { cameraCollection, legendView, poiCollection } from '../views/poi.view.js';

const areaSchema = z.object({
  minLon: z.coerce.number().min(-180).max(180),
  minLat: z.coerce.number().min(-90).max(90),
  maxLon: z.coerce.number().min(-180).max(180),
  maxLat: z.coerce.number().min(-90).max(90),
  at: z.coerce.date().default(() => new Date()),
});

/** Places and cameras for whatever the map is currently showing. */
export class PlacesController {
  constructor(
    private readonly pois: PoiService,
    private readonly cameras: CameraService,
    private readonly categories: PoiCategories,
  ) {}

  listInArea = async (req: Request, res: Response): Promise<void> => {
    const { at, ...bbox } = areaSchema.parse(req.query);
    const found = await this.pois.findInArea(bbox);
    res.json(poiCollection(this.pois.evaluateAt(found, at), this.categories));
  };

  listCamerasInArea = async (req: Request, res: Response): Promise<void> => {
    const { at: _at, ...bbox } = areaSchema.parse(req.query);
    res.json(cameraCollection(await this.cameras.findInArea(bbox)));
  };

  legend = async (_req: Request, res: Response): Promise<void> => {
    res.json({ categories: legendView(this.categories) });
  };
}
