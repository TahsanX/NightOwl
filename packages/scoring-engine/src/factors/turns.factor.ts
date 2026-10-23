import type { FactorResult } from '@saferoute/shared-types';
import { clamp01 } from '../geo.js';
import { numberOption } from '../options.js';
import type { FactorEnvironment, ScoreFactor } from '../types.js';

/**
 * "Fewer turns" — a route with many turns through small streets is harder to
 * follow at night and usually means leaving the main grid.
 */
export const turnsFactor: ScoreFactor = {
  id: 'turns',
  defaultLabel: 'Fewer turns',

  compute(context, env: FactorEnvironment): FactorResult {
    const significantTurnDeg = numberOption(env.options, 'significantTurnDeg', 45);
    const maxTurnsPerKm = numberOption(env.options, 'maxTurnsPerKm', 4);

    const turns = context.route.steps.filter(
      (step) => Math.abs(step.turnAngleDeg ?? 0) >= significantTurnDeg,
    ).length;

    const routeKm = Math.max(context.route.distanceM / 1000, 0.1);
    const turnsPerKm = turns / routeKm;
    const value = clamp01(1 - turnsPerKm / maxTurnsPerKm);

    return {
      factorId: 'turns',
      value,
      confidence: context.route.steps.length === 0 ? 0.2 : 0.9,
      explanation: `${turns} significant turn(s) along ${routeKm.toFixed(1)} km.`,
      details: { turnCount: turns, turnsPerKm: Number(turnsPerKm.toFixed(2)) },
    };
  },
};
