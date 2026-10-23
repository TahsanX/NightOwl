import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { UpstreamError } from '../lib/http-client.js';
import { GeocodingUnavailableError } from '../repositories/geoapify-geocoding.repository.js';
import { NoRouteError } from '../services/route-planning.service.js';

/** Lets controllers be plain async functions without try/catch boilerplate. */
export const asyncHandler =
  (handler: RequestHandler): RequestHandler =>
  (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'invalid_request',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof GeocodingUnavailableError) {
    res.status(error.status).json({ error: 'search_unavailable', message: error.message });
    return;
  }

  if (error instanceof NoRouteError) {
    res.status(error.status).json({ error: 'no_route', message: error.message });
    return;
  }

  if (error instanceof UpstreamError) {
    res.status(502).json({
      error: 'upstream_unavailable',
      provider: error.provider,
      message: error.message,
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected error';
  console.error('[saferoute] unhandled error:', error);
  res.status(500).json({ error: 'internal_error', message });
}
