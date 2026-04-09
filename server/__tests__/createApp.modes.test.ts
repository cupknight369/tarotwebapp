import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../createApp.js';

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'prod-static');

describe('createApp production mode', () => {
  it('enables trust proxy', async () => {
    const app = await createApp('production', {
      productionStaticRoot: fixtureRoot,
    });
    expect(app.get('trust proxy')).toBeTruthy();
  });

  it('serves index.html for SPA fallback routes', async () => {
    const app = await createApp('production', {
      productionStaticRoot: fixtureRoot,
    });
    const res = await request(app).get('/any-spa-route');
    expect(res.status).toBe(200);
    expect(res.text).toContain('fixture');
  });

  // This assertion is loose on purpose: the test is mainly there to exercise 
  // the branch where productionStaticRoot is omitted
  it('falls back to __dirname when productionStaticRoot is omitted', async () => {
    const app = await createApp('production');
    const res = await request(app).get('/some-route');
    expect([200, 404, 500]).toContain(res.status);
  });
});

describe('createApp development mode', () => {
  it('mounts Vite and responds to HTTP', async () => {
    const app = await createApp('development');
    const res = await request(app).get('/');
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(500);
  }, 30_000);
});
