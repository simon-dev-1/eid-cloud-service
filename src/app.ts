import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';

import { config } from './config.js';
import { asyncContextMiddleware } from './middlewares/async-context.js';
import { errorHandler } from './middlewares/error-handler.js';
import { originCheck } from './middlewares/origin-check.js';
import { apiRateLimiter } from './middlewares/rate-limit.js';
import { requestLogger } from './middlewares/request-logger.js';
import { routes } from './routes/index.js';

import type { Application, Request, Response } from 'express';

const app: Application = express();

app.disable('x-powered-by');
if (config.http.trustProxy) {
  app.set('trust proxy', 1);
}
app.use(helmet());
app.use(
  cors(config.appOrigin ? { origin: [config.appOrigin], credentials: true } : { origin: true }),
);
app.use(requestLogger);
app.use(asyncContextMiddleware);

app.use(express.json({ limit: '1mb' }));

// Rate limit the whole API, with stricter per-route limits applied downstream.
app.use('/api', apiRateLimiter);

// Reject cross-origin state-changing requests (CSRF defense-in-depth).
app.use(originCheck);

const healthRouter = Router();
healthRouter.get('/status', (_request: Request, response: Response): void => {
  response.status(200).send({ status: 'ok' });
});
healthRouter.get('/health', (_request: Request, response: Response): void => {
  response.status(200).send({ status: 'ok' });
});
healthRouter.get('/ready', async (_request: Request, response: Response): Promise<void> => {
  try {
    // Lazy import keeps knex out of the app module graph (so liveness/readiness
    // probing and unit tests don't require a database driver at import time).
    const { db } = await import('./database/db.js');
    await db.raw('select 1');
    response.status(200).send({ status: 'ok' });
  } catch {
    response.status(503).send({ status: 'unavailable' });
  }
});
app.use(healthRouter);

app.use(routes);

app.use(errorHandler);

export default app;
