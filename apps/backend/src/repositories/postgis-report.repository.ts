import type {
  BoundingBox,
  CommunityReport,
  CommunityReportInput,
  CommunityReportSummary,
} from '@saferoute/shared-types';
import type { Pool } from 'pg';
import { summariseReports } from '../models/community-report.model.js';
import type { CommunityReportRepository } from './interfaces.js';

interface ReportRow {
  id: string;
  lon: number;
  lat: number;
  tags: string[];
  rating: number;
  comment: string | null;
  created_at: Date;
  validated: boolean;
}

/** Durable store. Schema lives in db/schema.sql. */
export class PostgisReportRepository implements CommunityReportRepository {
  readonly name = 'postgis';

  constructor(private readonly pool: Pool) {}

  async create(input: CommunityReportInput): Promise<CommunityReport> {
    const { rows } = await this.pool.query<ReportRow>(
      `INSERT INTO community_reports (geom, tags, rating, comment)
       VALUES (ST_SetSRID(ST_MakePoint($1, $2), 4326), $3, $4, $5)
       RETURNING id, ST_X(geom) AS lon, ST_Y(geom) AS lat, tags, rating, comment,
                 created_at, validated`,
      [input.position[0], input.position[1], input.tags, input.rating, input.comment ?? null],
    );
    return toReport(rows[0]!);
  }

  async findInBoundingBox(bbox: BoundingBox): Promise<CommunityReport[]> {
    const { rows } = await this.pool.query<ReportRow>(
      `SELECT id, ST_X(geom) AS lon, ST_Y(geom) AS lat, tags, rating, comment,
              created_at, validated
       FROM community_reports
       WHERE geom && ST_MakeEnvelope($1, $2, $3, $4, 4326)`,
      [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat],
    );
    return rows.map(toReport);
  }

  async summarise(bbox: BoundingBox): Promise<CommunityReportSummary[]> {
    // Aggregation stays in the shared model so every store interprets feedback
    // identically; PostGIS is used for the spatial filter only.
    return summariseReports(await this.findInBoundingBox(bbox));
  }
}

const toReport = (row: ReportRow): CommunityReport => ({
  id: row.id,
  position: [row.lon, row.lat],
  tags: row.tags,
  rating: row.rating,
  comment: row.comment ?? undefined,
  createdAt: row.created_at.toISOString(),
  validated: row.validated,
});
