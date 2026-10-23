import type { FactorResult } from '@saferoute/shared-types';
import { clamp01, haversineM } from '../geo.js';
import { numberOption } from '../options.js';
import type { FactorEnvironment, ScoreFactor } from '../types.js';

/**
 * "Mapped surveillance coverage" — cameras tagged `man_made=surveillance` in
 * OpenStreetMap near the route.
 *
 * OSM camera coverage is extremely uneven: a street with no mapped cameras is almost
 * always unmapped rather than uncovered. Finding none therefore reports low
 * confidence, and the engine drops the factor instead of penalising the route.
 */
export const surveillanceFactor: ScoreFactor = {
  id: 'surveillance',
  defaultLabel: 'Mapped surveillance coverage',

  compute(context, env: FactorEnvironment): FactorResult {
    const maxDistanceM = numberOption(env.options, 'maxDistanceFromRouteM', 100);
    const targetPerKm = numberOption(env.options, 'targetCamerasPerKm', 2);

    const nearby = context.cameras.filter((camera) =>
      context.route.geometry.coordinates.some(
        (vertex) => haversineM(vertex, camera.position) <= maxDistanceM,
      ),
    );

    const routeKm = Math.max(context.route.distanceM / 1000, 0.1);
    const value = clamp01(nearby.length / routeKm / targetPerKm);

    return {
      factorId: 'surveillance',
      value,
      confidence: nearby.length === 0 ? 0.15 : 0.7,
      explanation:
        nearby.length === 0
          ? 'No cameras are mapped along this route — this area may simply not be surveyed.'
          : `${nearby.length} mapped camera(s) along this route.`,
      details: { cameraCount: nearby.length },
    };
  },
};
