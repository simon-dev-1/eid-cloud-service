import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';

import { asyncContextMiddleware } from './middlewares/async-context.js';
import { errorHandler } from './middlewares/error-handler.js';
import { requestLogger } from './middlewares/request-logger.js';
import { routes } from './routes/index.js';

import type { Application, Request, Response } from 'express';

const app: Application = express();

app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(requestLogger);
app.use(asyncContextMiddleware);

app.use(express.json());

const healthRouter = Router();
healthRouter.get('/status', (_request: Request, response: Response): void => {
  response.status(200).send({ status: 'ok' });
});
app.use(healthRouter);

app.use(routes);

app.use(errorHandler);

export default app;
