import type { Request, Response } from 'express';
import { z } from 'zod';
import type { PlaceSearchResponse } from '@saferoute/shared-types';
import type { GeocodingRepository } from '../repositories/interfaces.js';

const searchSchema = z.object({
  q: z.string().trim().min(2).max(120),
  lon: z.coerce.number().min(-180).max(180).optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  limit: z.coerce.number().int().min(1).max(10).default(6),
});

export class SearchController {
  constructor(private readonly geocoding: GeocodingRepository) {}

  search = async (req: Request, res: Response): Promise<void> => {
    const { q, lon, lat, limit } = searchSchema.parse(req.query);
    const near = lon !== undefined && lat !== undefined ? ([lon, lat] as [number, number]) : undefined;
    const body: PlaceSearchResponse = { results: await this.geocoding.search(q, near, limit) };
    res.json(body);
  };
}
