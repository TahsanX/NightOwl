import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import type {
  EvaluatedPoi,
  PoiCategoryDefinition,
  RouteContext,
  ScoringProfile,
} from '@saferoute/shared-types';
// Tests run against the built package: Node's type stripping cannot resolve
// the `.js` specifiers TypeScript requires in ESM source.
import { PoiCategories, ScoringEngine, createDefaultRegistry } from '../dist/index.js';

const configDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'config');

const readConfig = async <T>(file: string): Promise<T> =>
  JSON.parse(await readFile(path.join(configDir, file), 'utf8')) as T;

const categories = new PoiCategories(
  await readConfig<PoiCategoryDefinition[]>('poi-categories.json'),
);
const profiles = await readConfig<ScoringProfile[]>('profiles.json');
const engine = new ScoringEngine({
  registry: createDefaultRegistry(),
  categories,
  profiles,
});

/** A 1 km straight line heading east from an arbitrary origin. */
function straightRoute(lengthM = 1000) {
  const steps = 10;
  const coordinates: [number, number][] = Array.from({ length: steps + 1 }, (_, i) => [
    90.4 + (i / steps) * (lengthM / 111_320),
    23.78,
  ]);
  return {
    id: 'test-route',
    geometry: { type: 'LineString' as const, coordinates },
    distanceM: lengthM,
    durationS: lengthM,
    steps: [
      {
        instruction: 'Head east',
        distanceM: lengthM,
        durationS: lengthM,
        turnAngleDeg: 0,
        roadClass: 'primary',
      },
    ],
    mainRoadDistanceM: lengthM,
  };
}

function poi(
  id: string,
  categoryId: string,
  fraction: number,
  openingState: EvaluatedPoi['openingState'],
): EvaluatedPoi {
  return {
    id,
    categoryId,
    position: [90.4 + fraction * (1000 / 111_320), 23.78],
    source: 'test',
    distanceFromRouteM: 20,
    openingState,
  };
}

function context(overrides: Partial<RouteContext> = {}): RouteContext {
  return {
    route: straightRoute(),
    mode: 'walking',
    departureTime: new Date('2026-10-23T21:00:00Z').toISOString(),
    pois: [],
    cameras: [],
    communityReports: [],
    ...overrides,
  };
}

test('a route with open places scores higher than an empty one', () => {
  const busy = engine.score(
    context({
      pois: [
        poi('a', 'convenience', 0.1, 'open'),
        poi('b', 'restaurant', 0.3, 'open'),
        poi('c', 'pharmacy', 0.5, 'open'),
        poi('d', 'supermarket', 0.7, 'open'),
        poi('e', 'cafe', 0.9, 'open'),
      ],
    }),
    'walking',
  );
  const empty = engine.score(context(), 'walking');

  assert.ok(busy.total > empty.total, `${busy.total} should exceed ${empty.total}`);
  assert.ok(busy.total <= 100 && empty.total >= 0);
});

test('factors without data are excluded rather than scored as zero', () => {
  const score = engine.score(context(), 'walking');
  const surveillance = score.factors.find((factor) => factor.factorId === 'surveillance');

  assert.equal(surveillance?.excluded, true);
  assert.ok(
    score.effectiveMaxPoints < 100,
    'excluded factors must leave the denominator too',
  );
});

test('unknown opening hours never count as closed', () => {
  const unknown = engine.score(
    context({ pois: [poi('a', 'convenience', 0.5, 'unknown')] }),
    'walking',
  );
  const closed = engine.score(
    context({ pois: [poi('a', 'convenience', 0.5, 'closed')] }),
    'walking',
  );
  const openPlaces = (score: typeof unknown) =>
    score.factors.find((factor) => factor.factorId === 'open-places')!;

  assert.equal(openPlaces(unknown).points, openPlaces(closed).points);
  assert.ok(openPlaces(unknown).confidence <= openPlaces(closed).confidence);
});

test('one long empty stretch is penalised even when totals look fine', () => {
  const clustered = engine.score(
    context({
      pois: [
        poi('a', 'convenience', 0.01, 'open'),
        poi('b', 'cafe', 0.02, 'open'),
        poi('c', 'restaurant', 0.03, 'open'),
      ],
    }),
    'walking',
  );
  const spread = engine.score(
    context({
      pois: [
        poi('a', 'convenience', 0.2, 'open'),
        poi('b', 'cafe', 0.5, 'open'),
        poi('c', 'restaurant', 0.8, 'open'),
      ],
    }),
    'walking',
  );

  const gaps = (score: typeof clustered) =>
    score.factors.find((factor) => factor.factorId === 'coverage-gaps')!.points;

  assert.ok(gaps(spread) > gaps(clustered));
});

test('each profile is scorable and every referenced factor is registered', () => {
  for (const profile of profiles) {
    const score = engine.score(context({ mode: 'walking' }), profile.id);
    assert.equal(score.profileId, profile.id);
    assert.ok(score.total >= 0 && score.total <= 100);
  }
});

test('an unknown profile fails loudly', () => {
  assert.throws(() => engine.score(context(), 'teleporting'), /Unknown scoring profile/);
});
