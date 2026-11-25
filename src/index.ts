/* istanbul ignore file */
import app from './app.js';
import { config, validateConfig } from './config.js';
import { db } from './database/db.js';
import { logger } from './utils/logger.js';

// Fail fast on a misconfigured runtime before accepting any traffic.
validateConfig();

const port = config.port;

const server = app.listen(port, (): void => {
  logger.info(`App listening on port ${port}`);
});

// Server timeouts so slow or stalled clients cannot tie up sockets indefinitely.
// Keep headersTimeout < requestTimeout to satisfy Node's constraint.
server.headersTimeout = 60_000;
server.requestTimeout = 120_000;
server.keepAliveTimeout = 5_000;

let shuttingDown = false;
const shutdown = (signal: string): void => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');

  const forceExit = setTimeout((): void => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close((closeError) => {
    if (closeError) {
      logger.error({ err: closeError }, 'Error closing server');
    }
    void db
      .destroy()
      .then(() => logger.info('DB connection stopped'))
      .catch((err: unknown) => logger.error({ err }, 'Error stopping DB'))
      .finally(() => process.exit(closeError ? 1 : 0));
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
