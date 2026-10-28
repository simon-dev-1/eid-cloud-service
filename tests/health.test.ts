import { describe, expect, it } from '@jest/globals';
import request from 'supertest';

const { default: app } = await import('../src/app.js');

describe('GET /status', () => {
  it('returns 200 with ok status', async () => {
    const response = await request(app).get('/status').expect(200);

    expect(response.body).toEqual({ status: 'ok' });
  });
});
