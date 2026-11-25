import { beforeAll, describe, expect, it } from '@jest/globals';
import express from 'express';
import request from 'supertest';

import { setConfig } from '../../src/config.ts';
import { errorHandler } from '../../src/middlewares/error-handler.ts';
import { originCheck } from '../../src/middlewares/origin-check.ts';
import { createRateLimiter } from '../../src/middlewares/rate-limit.ts';

import type { RequestHandler } from 'express';

const appOrigin = 'https://app.eid-cloud.ch';

const makeApp = (middlewares: RequestHandler[]) => {
  const app = express();
  app.use(express.json());
  app.use(middlewares);
  app.post('/resource', (_req, res) => res.status(200).json({ ok: true }));
  app.get('/resource', (_req, res) => res.status(200).json({ ok: true }));
  app.use(errorHandler);
  return app;
};

beforeAll(() => {
  setConfig({ appOrigin, env: 'local' });
});

describe('originCheck', () => {
  const app = makeApp([originCheck]);

  it('allows requests without an Origin header', async () => {
    await request(app).post('/resource').expect(200);
  });

  it('allows a matching Origin', async () => {
    await request(app).post('/resource').set('Origin', appOrigin).expect(200);
  });

  it('rejects a mismatched Origin on unsafe methods', async () => {
    const response = await request(app)
      .post('/resource')
      .set('Origin', 'https://evil.example')
      .expect(403);

    expect(response.body.message).toContain('Cross-origin');
  });

  it('rejects a mismatched Origin on DELETE', async () => {
    await request(app).delete('/resource').set('Origin', 'https://evil.example').expect(403);
  });

  it('ignores Origin on safe methods', async () => {
    await request(app).get('/resource').set('Origin', 'https://evil.example').expect(200);
  });
});

describe('rate limiting', () => {
  const app = makeApp([createRateLimiter({ windowMs: 60_000, limit: 2 })]);

  it('returns 429 after the limit is exceeded', async () => {
    await request(app).post('/resource').expect(200);
    await request(app).post('/resource').expect(200);

    const response = await request(app).post('/resource').expect(429);
    expect(response.body.errorCode).toBe('RATE_LIMITED');
  });
});
