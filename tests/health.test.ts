import { afterEach, describe, expect, it, jest } from '@jest/globals';
import request from 'supertest';

jest.unstable_mockModule('../src/database/db.js', () => ({
  db: { raw: jest.fn() },
}));

const { default: app } = await import('../src/app.js');
const { db } = await import('../src/database/db.js');

const rawMock = jest.mocked(db.raw);

afterEach(() => {
  jest.clearAllMocks();
});

describe('health endpoints', () => {
  it('GET /status returns 200', async () => {
    const response = await request(app).get('/status').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('GET /health returns 200 without touching the DB', async () => {
    const response = await request(app).get('/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  describe('GET /ready', () => {
    it('returns 200 when the database is reachable', async () => {
      rawMock.mockResolvedValueOnce([{}] as never);

      await request(app).get('/ready').expect(200);
    });

    it('returns 503 when the database is unreachable', async () => {
      rawMock.mockRejectedValueOnce(new Error('connection refused'));

      const response = await request(app).get('/ready').expect(503);
      expect(response.body).toEqual({ status: 'unavailable' });
    });
  });
});
