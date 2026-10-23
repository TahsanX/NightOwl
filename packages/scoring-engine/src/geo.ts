import type { LineStringGeometry, Position } from '@saferoute/shared-types';

const EARTH_RADIUS_M = 6_371_008.8;

const toRad = (deg: number): number => (deg * Math.PI) / 180;

export function haversineM(a: Position, b: Position): number {
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(a[0] - b[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/** Cumulative distance in metres at each vertex of the line. */
export function cumulativeDistances(line: LineStringGeometry): number[] {
  const out: number[] = [0];
  for (let i = 1; i < line.coordinates.length; i += 1) {
    out.push(out[i - 1]! + haversineM(line.coordinates[i - 1]!, line.coordinates[i]!));
  }
  return out;
}

export function lineLengthM(line: LineStringGeometry): number {
  const cumulative = cumulativeDistances(line);
  return cumulative[cumulative.length - 1] ?? 0;
}

/**
 * How far along the route the given point sits, in metres, measured to the
 * nearest vertex. Vertex resolution is enough for gap analysis and keeps this
 * dependency-free; swap in a true perpendicular projection if a provider ever
 * returns very coarse geometry.
 */
export function distanceAlongRouteM(line: LineStringGeometry, point: Position): number {
  const cumulative = cumulativeDistances(line);
  let bestIndex = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < line.coordinates.length; i += 1) {
    const d = haversineM(line.coordinates[i]!, point);
    if (d < bestDistance) {
      bestDistance = d;
      bestIndex = i;
    }
  }
  return cumulative[bestIndex] ?? 0;
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(1, Math.max(0, value));
}
