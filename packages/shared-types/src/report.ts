import type { Position } from './geo.js';

export type ReportTag =
  | string; // catalogue lives in config, same reasoning as PoiCategoryId

export interface CommunityReport {
  id: string;
  position: Position;
  tags: ReportTag[];
  /** 1..5 as submitted by the traveller after a trip. */
  rating: number;
  comment?: string;
  createdAt: string;
  /** Set once corroborated by other reports in the same cell. */
  validated: boolean;
}

export interface CommunityReportInput {
  position: Position;
  tags: ReportTag[];
  rating: number;
  comment?: string;
}
