import { randomUUID } from 'node:crypto';
import type {
  BoundingBox,
  CommunityReport,
  CommunityReportInput,
  CommunityReportSummary,
} from '@saferoute/shared-types';
import { summariseReports } from '../models/community-report.model.js';
import type { CommunityReportRepository } from './interfaces.js';

/** Default store, so a fresh clone runs with no database. Not durable. */
export class MemoryReportRepository implements CommunityReportRepository {
  readonly name = 'memory';
  readonly #reports: CommunityReport[] = [];

  async create(input: CommunityReportInput): Promise<CommunityReport> {
    const report: CommunityReport = {
      ...input,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      validated: false,
    };
    this.#reports.push(report);
    return report;
  }

  async findInBoundingBox(bbox: BoundingBox): Promise<CommunityReport[]> {
    return this.#reports.filter(
      ({ position: [lon, lat] }) =>
        lon >= bbox.minLon && lon <= bbox.maxLon && lat >= bbox.minLat && lat <= bbox.maxLat,
    );
  }

  async summarise(bbox: BoundingBox): Promise<CommunityReportSummary[]> {
    return summariseReports(await this.findInBoundingBox(bbox));
  }
}
