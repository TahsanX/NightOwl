import type { Request, Response } from 'express';
import { z } from 'zod';
import type { CommunityReportRepository } from '../repositories/interfaces.js';

const createSchema = z.object({
  position: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
  rating: z.number().int().min(1).max(5),
  tags: z.array(z.string().max(40)).max(10).default([]),
  comment: z.string().max(500).optional(),
});

const areaSchema = z.object({
  minLon: z.coerce.number(),
  minLat: z.coerce.number(),
  maxLon: z.coerce.number(),
  maxLat: z.coerce.number(),
});

export class ReportsController {
  constructor(private readonly reports: CommunityReportRepository) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const report = await this.reports.create(createSchema.parse(req.body));
    res.status(201).json(report);
  };

  /** Aggregated only: individual reports are not served back verbatim. */
  summarise = async (req: Request, res: Response): Promise<void> => {
    const summaries = await this.reports.summarise(areaSchema.parse(req.query));
    res.json({ summaries });
  };
}
