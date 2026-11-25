import { pino } from 'pino';

import { config } from '../config.js';

export const logger = pino({
  level: config.logLevel,
  base: { service: 'eid-cloud-service' },
  redact: {
    paths: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'],
    censor: '[redacted]',
  },
});
