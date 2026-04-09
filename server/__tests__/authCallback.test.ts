import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const exchangeCodeForSession = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase.js', () => ({
  createSupabaseClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession,
    },
  })),
}));

import { createApp } from '../createApp.js';

describe('/auth/callback with mocked Supabase', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset();
  });

  it('redirects home when exchange returns an error', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: 'failed', name: 'AuthApiError' },
    });
    const app = await createApp('test');
    const res = await request(app).get('/auth/callback').query({ code: 'test-code' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('test-code');
  });

  it('redirects home when exchange succeeds', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const app = await createApp('test');
    const res = await request(app).get('/auth/callback').query({ code: 'good-code' });
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/');
    expect(exchangeCodeForSession).toHaveBeenCalledWith('good-code');
  });
});
