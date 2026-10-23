import { Router } from 'express';
import type { Container } from '../container.js';
import { asyncHandler } from '../middleware/error-handler.js';

/**
 * URL -> controller mapping only. Versioned so a breaking response shape can
 * ship as /api/v2 while older app builds keep working.
 */
export function createV1Router(container: Container): Router {
  const router = Router();
  const { routesController, placesController, reportsController } = container;

  router.post('/routes/plan', asyncHandler(routesController.plan));

  router.get('/places', asyncHandler(placesController.listInArea));
  router.get('/places/legend', asyncHandler(placesController.legend));
  router.get('/cameras', asyncHandler(placesController.listCamerasInArea));

  router.post('/reports', asyncHandler(reportsController.create));
  router.get('/reports/summary', asyncHandler(reportsController.summarise));

  return router;
}
