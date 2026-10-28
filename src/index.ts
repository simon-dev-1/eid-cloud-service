/* istanbul ignore file */
import app from './app.js';
import { config } from './config.js';
import { db } from './database/db.js';
import { logger } from './utils/logger.js';

const port = config.port;

const server = app.listen(port, (): void => {
  logger.info(`App listening on port ${port}`);
});

process.on('SIGTERM', () => {
  db.destroy().then(() => {
    logger.info('DB connection stopped');
  });
  server.close(() => {
    logger.info('Cleanly shutdown express server.');
  });
});
