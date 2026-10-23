import 'dotenv/config';
import { z } from 'zod';

/**
 * Every tunable the service reads, validated once at boot. If something is
 * missing the process fails here rather than halfway through a request.
 */
const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  ROUTING_PROVIDER: z.enum(['osrm', 'graphhopper']).default('osrm'),
  OSRM_BASE_URL: z.string().url().default('https://router.project-osrm.org'),
  GRAPHHOPPER_BASE_URL: z.string().url().default('https://graphhopper.com/api/1'),
  GRAPHHOPPER_API_KEY: z.string().optional(),

  PLACES_PROVIDER: z.enum(['geoapify', 'overpass']).default('geoapify'),
  GEOAPIFY_BASE_URL: z.string().url().default('https://api.geoapify.com/v2'),
  GEOAPIFY_API_KEY: z.string().optional(),
  GEOAPIFY_GEOCODE_URL: z.string().url().default('https://api.geoapify.com/v1/geocode'),

  OVERPASS_BASE_URL: z.string().url().default('https://overpass-api.de/api/interpreter'),

  REPORT_STORE: z.enum(['memory', 'postgis']).default('memory'),
  DATABASE_URL: z.string().optional(),

  PLACES_CACHE_TTL_S: z.coerce.number().default(900),
  CAMERAS_CACHE_TTL_S: z.coerce.number().default(86_400),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().default(120_000),
  OPTIONAL_LAYER_BUDGET_MS: z.coerce.number().default(5_000),

  /** Per client IP. The API is public and every request can spend paid quota. */
  RATE_LIMIT_PER_MINUTE: z.coerce.number().default(60),
  /** Hops of reverse proxy in front of the app (Render: 1), so client IPs are real. */
  TRUST_PROXY_HOPS: z.coerce.number().default(0),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
