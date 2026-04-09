import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../createApp.js';

describe('createApp (test mode)', () => {
  it('GET /health returns 200', async () => {
    const app = await createApp('test');
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  it('GET /auth/callback without code redirects to /', async () => {
    const app = await createApp('test');
    const res = await request(app).get('/auth/callback');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
});
