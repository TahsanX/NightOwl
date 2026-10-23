import cors from 'cors';
import express, { type Express } from 'express';
import type { Container } from './container.js';
import { errorHandler } from './middleware/error-handler.js';
import { createV1Router } from './routes/v1.js';

export function createApp(container: Container): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '256kb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      providers: container.providers,
      profiles: container.engine.profileIds(),
    });
  });

  app.use('/api/v1', createV1Router(container));
  app.use(errorHandler);

  return app;
}
