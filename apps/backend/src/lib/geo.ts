import { haversineM } from '@saferoute/scoring-engine';
import type { BoundingBox, LineStringGeometry, Position } from '@saferoute/shared-types';

const METRES_PER_DEGREE_LAT = 111_320;

/** Bounding box around a line, expanded by `bufferM` on every side. */
export function boundingBoxOf(line: LineStringGeometry, bufferM: number): BoundingBox {
  const lons = line.coordinates.map(([lon]) => lon);
  const lats = line.coordinates.map(([, lat]) => lat);

  const latBuffer = bufferM / METRES_PER_DEGREE_LAT;
  const meanLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  // Longitude degrees shrink towards the poles; guard against the cos -> 0 case.
  const lonBuffer = bufferM / (METRES_PER_DEGREE_LAT * Math.max(Math.cos((meanLat * Math.PI) / 180), 0.01));

  return {
    minLon: Math.min(...lons) - lonBuffer,
    minLat: Math.min(...lats) - latBuffer,
    maxLon: Math.max(...lons) + lonBuffer,
    maxLat: Math.max(...lats) + latBuffer,
  };
}

/** Union of several boxes, so one upstream call can serve every alternative. */
export function mergeBoundingBoxes(boxes: readonly BoundingBox[]): BoundingBox {
  const first = boxes[0];
  if (!first) throw new Error('mergeBoundingBoxes requires at least one box');
  return boxes.reduce((merged, box) => ({
    minLon: Math.min(merged.minLon, box.minLon),
    minLat: Math.min(merged.minLat, box.minLat),
    maxLon: Math.max(merged.maxLon, box.maxLon),
    maxLat: Math.max(merged.maxLat, box.maxLat),
  }));
}

/** Distance to the nearest vertex of the line, in metres. */
export function distanceToLineM(line: LineStringGeometry, point: Position): number {
  let nearest = Infinity;
  for (const vertex of line.coordinates) {
    nearest = Math.min(nearest, haversineM(vertex, point));
  }
  return nearest;
}

/** Cache key that groups nearby requests onto the same upstream fetch. */
export function boundingBoxKey(bbox: BoundingBox, precision = 3): string {
  const round = (value: number): string => value.toFixed(precision);
  return [bbox.minLon, bbox.minLat, bbox.maxLon, bbox.maxLat].map(round).join(',');
}
