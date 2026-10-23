import cors from 'cors';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { Container } from './container.js';
import { errorHandler } from './middleware/error-handler.js';
import { createV1Router } from './routes/v1.js';

export function createApp(container: Container): Express {
  const app = express();
  const { env } = container;

  // Without this, behind Render's proxy every client shares one IP and the
  // rate limit below would throttle all users together.
  app.set('trust proxy', env.TRUST_PROXY_HOPS);

  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      providers: container.providers,
      profiles: container.engine.profileIds(),
    });
  });

  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: env.RATE_LIMIT_PER_MINUTE,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { error: 'rate_limited', message: 'Too many requests, slow down a little.' },
    }),
  );
  app.use('/api/v1', createV1Router(container));
  app.use(errorHandler);

  return app;
}
