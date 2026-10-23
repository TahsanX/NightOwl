/** [longitude, latitude] — GeoJSON axis order, used everywhere in this codebase. */
export type Position = [number, number];

export interface LineStringGeometry {
  type: 'LineString';
  coordinates: Position[];
}

export interface BoundingBox {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
}

export type TravelMode = 'walking' | 'cycling' | 'driving';
