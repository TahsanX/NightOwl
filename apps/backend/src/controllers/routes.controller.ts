import type { Request, Response } from 'express';
import { z } from 'zod';
import type { PoiCategories } from '@saferoute/scoring-engine';
import type { RoutePlanningService } from '../services/route-planning.service.js';
import { routePlanView } from '../views/route.view.js';

const position = z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]);

const planRequestSchema = z.object({
  origin: position,
  destination: position,
  mode: z.enum(['walking', 'cycling', 'driving']).default('walking'),
  departureTime: z.coerce.date().default(() => new Date()),
});

/** Controller: validates input, delegates to the service, renders through a view. */
export class RoutesController {
  constructor(
    private readonly planning: RoutePlanningService,
    private readonly categories: PoiCategories,
  ) {}

  plan = async (req: Request, res: Response): Promise<void> => {
    const request = planRequestSchema.parse(req.body);
    const plan = await this.planning.plan(request);
    res.json(routePlanView(plan, this.categories));
  };
}
