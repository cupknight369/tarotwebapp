import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp, normalizeAuthPath } from '../createApp.js';

describe('normalizeAuthPath', () => {
  it('maps an empty path to the root', () => {
    expect(normalizeAuthPath('')).toBe('/');
  });

  it('preserves non-empty paths', () => {
    expect(normalizeAuthPath('/auth/callback')).toBe('/auth/callback');
  });
});

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

  it('GET /auth/callback with OAuth error redirects and logs', async () => {
    const app = await createApp('test');
    const res = await request(app)
      .get('/auth/callback')
      .query({ error: 'access_denied', error_description: 'User canceled' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  it('GET /auth/callback with array error query uses JSON in logs', async () => {
    const app = await createApp('test');
    const res = await request(app)
      .get('/auth/callback')
      .query({ error: ['a', 'b'] });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });

  it('GET /auth/callback omits error_description when it is not a string', async () => {
    const app = await createApp('test');
    const res = await request(app)
      .get('/auth/callback')
      .query({ error: 'x', error_description: ['not', 'a', 'string'] });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
  });
});
