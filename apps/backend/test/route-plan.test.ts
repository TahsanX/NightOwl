import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import type {
  BoundingBox,
  Poi,
  PoiCategoryDefinition,
  Position,
  RouteCandidate,
  RoutePlanResponse,
  SurveillanceCamera,
} from '@saferoute/shared-types';
import { createApp } from '../src/app.js';
import { loadEnv } from '../src/config/env.js';
import { createContainer } from '../src/container.js';
import type {
  CameraRepository,
  PlacesRepository,
  RoutingRepository,
} from '../src/repositories/interfaces.js';

/**
 * End-to-end through the real router, controller, service, engine and view —
 * with the network providers replaced. Everything except the upstream vendors
 * is the production path.
 */

const straight = (id: string, lengthM: number, mainRoadShare: number): RouteCandidate => ({
  id,
  geometry: {
    type: 'LineString',
    coordinates: Array.from({ length: 11 }, (_, i): Position => [
      90.4 + (i / 10) * (lengthM / 111_320),
      23.78,
    ]),
  },
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
  mainRoadDistanceM: lengthM * mainRoadShare,
});

class FakeRouting implements RoutingRepository {
  readonly name = 'fake-routing';
  async findAlternatives(): Promise<RouteCandidate[]> {
    // The quick route is a back street; the longer one follows main roads.
    return [straight('quick', 800, 0.1), straight('lively', 1000, 0.9)];
  }
}

class FakePlaces implements PlacesRepository {
  readonly name = 'fake-places';
  async findInBoundingBox(
    _bbox: BoundingBox,
    _categories: readonly PoiCategoryDefinition[],
  ): Promise<Poi[]> {
    return [
      place('shop-1', 'convenience', 0.2),
      place('shop-2', 'convenience', 0.5),
      place('food-1', 'restaurant', 0.7),
      { ...place('clinic-1', 'pharmacy', 0.4), openingHours: 'Mo-Su 08:00-23:00' },
      { ...place('hospital-1', 'hospital', 0.6), openingHours: undefined },
    ];
  }
}

class EmptyCameras implements CameraRepository {
  readonly name = 'fake-cameras';
  async findInBoundingBox(): Promise<SurveillanceCamera[]> {
    return [];
  }
}

function place(id: string, categoryId: string, fraction: number): Poi {
  return {
    id,
    name: id,
    categoryId,
    position: [90.4 + fraction * (1000 / 111_320), 23.78009],
    openingHours: 'Mo-Su 06:00-02:00',
    source: 'test',
  };
}

async function startServer() {
  const env = loadEnv({ ...process.env, REPORT_STORE: 'memory', NODE_ENV: 'test' });
  const container = await createContainer(env, {
    routing: new FakeRouting(),
    places: new FakePlaces(),
    cameras: new EmptyCameras(),
  });

  const server = createApp(container).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

const planBody = {
  origin: [90.4, 23.78],
  destination: [90.41, 23.78],
  mode: 'walking',
  departureTime: '2026-10-23T21:00:00Z',
};

test('a plan compares routes, scores them and returns drawable places', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const response = await fetch(`${server.url}/api/v1/routes/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(planBody),
  });
  assert.equal(response.status, 200);

  const plan = (await response.json()) as RoutePlanResponse;

  assert.equal(plan.routes.length, 2);
  assert.equal(plan.routes[plan.fastestRouteIndex]!.id, 'quick');
  assert.equal(plan.routes[plan.highestActivityRouteIndex]!.id, 'lively');
  assert.ok(plan.routes.every((route) => route.score.total >= 0 && route.score.total <= 100));

  // Every place carries the icon and colour the map draws it with, resolved
  // server-side from the category config.
  assert.ok(plan.pois.features.length > 0);
  for (const feature of plan.pois.features) {
    assert.match(feature.properties.color, /^#[0-9A-Fa-f]{6}$/);
    assert.ok(feature.properties.icon.length > 0);
    assert.ok(['open', 'closed', 'unknown'].includes(feature.properties.openingState));
  }

  // The hospital has no opening_hours of its own, so the category's assumed
  // 24/7 must apply rather than leaving it unknown.
  const hospital = plan.pois.features.find((f) => f.properties.categoryId === 'hospital');
  assert.equal(hospital?.properties.openingState, 'open');
});

test('the breakdown explains every point and flags what it could not judge', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const response = await fetch(`${server.url}/api/v1/routes/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(planBody),
  });
  const plan = (await response.json()) as RoutePlanResponse;
  const { score } = plan.routes[plan.highestActivityRouteIndex]!;

  assert.ok(score.breakdown.length > 0);
  for (const item of score.breakdown) {
    assert.ok(item.label.length > 0);
    assert.ok(item.explanation.length > 0 || item.excluded);
    assert.ok(item.points <= item.maxPoints);
  }

  // No cameras were supplied, so that factor must be excluded and say why,
  // rather than silently scoring zero.
  const surveillance = score.breakdown.find((item) => item.factorId === 'surveillance');
  assert.equal(surveillance?.excluded, true);
  assert.equal(surveillance?.points, 0);
  assert.ok(surveillance?.excludedReason);

  // The response must say how much of the score rests on data.
  assert.ok(score.judgedFactorCount < score.factorCount);
  assert.ok(score.dataCoverage > 0 && score.dataCoverage < 1);

  const counted = score.breakdown.filter((item) => !item.excluded);
  const earned = counted.reduce((sum, item) => sum + item.points, 0);
  const available = counted.reduce((sum, item) => sum + item.maxPoints, 0);
  assert.equal(score.total, Math.round((earned / available) * 100));
});

test('a malformed request is rejected with field-level detail', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const response = await fetch(`${server.url}/api/v1/routes/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin: [999, 23.78], destination: [90.41, 23.78] }),
  });

  assert.equal(response.status, 400);
  const body = (await response.json()) as { error: string; issues: { path: string }[] };
  assert.equal(body.error, 'invalid_request');
  assert.ok(body.issues.some((issue) => issue.path.startsWith('origin')));
});

test('community reports round-trip and come back only in aggregate', async (t) => {
  const server = await startServer();
  t.after(() => server.close());

  const created = await fetch(`${server.url}/api/v1/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      position: [90.405, 23.78],
      rating: 2,
      tags: ['poor-lighting'],
    }),
  });
  assert.equal(created.status, 201);

  const summary = await fetch(
    `${server.url}/api/v1/reports/summary?minLon=90.4&minLat=23.77&maxLon=90.42&maxLat=23.79`,
  );
  const body = (await summary.json()) as {
    summaries: { sentiment: number; reportCount: number }[];
  };

  assert.equal(body.summaries.length, 1);
  assert.equal(body.summaries[0]!.reportCount, 1);
  assert.ok(body.summaries[0]!.sentiment < 0);
});
