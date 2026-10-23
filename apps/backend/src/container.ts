import {
  PoiCategories,
  ScoringEngine,
  createDefaultRegistry,
} from '@saferoute/scoring-engine';
import type { Poi, SurveillanceCamera } from '@saferoute/shared-types';
import { ScoringConfigService } from './config/scoring-config.service.js';
import type { Env } from './config/env.js';
import { TtlCache } from './lib/cache.js';
import { HttpClient } from './lib/http-client.js';
import { OverpassClient } from './lib/overpass.js';
import { PlacesController } from './controllers/places.controller.js';
import { ReportsController } from './controllers/reports.controller.js';
import { RoutesController } from './controllers/routes.controller.js';
import { GeoapifyPlacesRepository } from './repositories/geoapify-places.repository.js';
import type {
  CommunityReportRepository,
  PlacesRepository,
  RoutingRepository,
} from './repositories/interfaces.js';
import { MemoryReportRepository } from './repositories/memory-report.repository.js';
import { OsrmRoutingRepository } from './repositories/osrm-routing.repository.js';
import { OverpassCameraRepository } from './repositories/overpass-camera.repository.js';
import { OverpassPlacesRepository } from './repositories/overpass-places.repository.js';
import { CameraService } from './services/camera.service.js';
import { OpeningHoursService } from './services/opening-hours.service.js';
import { PoiService } from './services/poi.service.js';
import { RoutePlanningService } from './services/route-planning.service.js';

export interface Container {
  env: Env;
  categories: PoiCategories;
  engine: ScoringEngine;
  routesController: RoutesController;
  placesController: PlacesController;
  reportsController: ReportsController;
  providers: { routing: string; places: string; cameras: string; reports: string };
}

/**
 * Composition root. Every concrete provider is chosen here and injected as an
 * interface, so nothing below this file knows which vendor is in use — that is
 * what makes a provider swap a one-line change and keeps services testable.
 */
export async function createContainer(env: Env): Promise<Container> {
  const config = new ScoringConfigService();
  const categories = new PoiCategories(await config.categories());
  const engine = new ScoringEngine({
    registry: createDefaultRegistry(),
    categories,
    profiles: await config.profiles(),
  });

  const http = new HttpClient({ timeoutMs: env.UPSTREAM_TIMEOUT_MS });
  const overpass = new OverpassClient(http, env.OVERPASS_BASE_URL);

  const routing: RoutingRepository = new OsrmRoutingRepository(http, env.OSRM_BASE_URL);
  const places = createPlacesRepository(env, http, overpass);
  const cameras = new OverpassCameraRepository(overpass);
  const reports = await createReportRepository(env);

  const poiService = new PoiService(
    places,
    new OpeningHoursService(),
    categories,
    new TtlCache<Poi[]>(env.PLACES_CACHE_TTL_S),
  );
  const cameraService = new CameraService(
    cameras,
    new TtlCache<SurveillanceCamera[]>(env.CAMERAS_CACHE_TTL_S),
  );
  const planning = new RoutePlanningService(
    routing,
    poiService,
    cameraService,
    reports,
    engine,
  );

  return {
    env,
    categories,
    engine,
    routesController: new RoutesController(planning, categories),
    placesController: new PlacesController(poiService, cameraService, categories),
    reportsController: new ReportsController(reports),
    providers: {
      routing: routing.name,
      places: places.name,
      cameras: cameras.name,
      reports: reports.name,
    },
  };
}

function createPlacesRepository(
  env: Env,
  http: HttpClient,
  overpass: OverpassClient,
): PlacesRepository {
  if (env.PLACES_PROVIDER === 'geoapify') {
    if (env.GEOAPIFY_API_KEY) {
      return new GeoapifyPlacesRepository(http, env.GEOAPIFY_BASE_URL, env.GEOAPIFY_API_KEY);
    }
    // A fresh clone has no key; keyless Overpass keeps the project runnable.
    console.warn(
      '[saferoute] GEOAPIFY_API_KEY is not set — falling back to Overpass for places.',
    );
  }
  return new OverpassPlacesRepository(overpass);
}

async function createReportRepository(env: Env): Promise<CommunityReportRepository> {
  if (env.REPORT_STORE === 'memory') return new MemoryReportRepository();

  if (!env.DATABASE_URL) {
    throw new Error('REPORT_STORE=postgis requires DATABASE_URL to be set.');
  }
  const [{ Pool }, { PostgisReportRepository }] = await Promise.all([
    import('pg'),
    import('./repositories/postgis-report.repository.js'),
  ]);
  return new PostgisReportRepository(new Pool({ connectionString: env.DATABASE_URL }));
}
