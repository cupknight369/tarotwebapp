import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { createBrowserClient } = vi.hoisted(() => {
  const fn = vi.fn(() => ({ mockClient: true }));
  return { createBrowserClient: fn };
});

vi.mock('@supabase/ssr', () => ({
  createBrowserClient,
}));

describe('supabase.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    createBrowserClient.mockImplementation(() => ({ mockClient: true }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exports supabase client from createBrowserClient with env vars', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
    const mod = await import('../../lib/supabase.js');
    expect(createBrowserClient).toHaveBeenCalledTimes(1);
    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'test-anon-key',
    );
    expect(mod.supabase).toEqual({ mockClient: true });
  });

  it('throws when VITE_SUPABASE_URL is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'key');
    await expect(import('../../lib/supabase.js')).rejects.toThrow(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment',
    );
    expect(createBrowserClient).not.toHaveBeenCalled();
  });

  it('throws when VITE_SUPABASE_ANON_KEY is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    await expect(import('../../lib/supabase.js')).rejects.toThrow(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment',
    );
    expect(createBrowserClient).not.toHaveBeenCalled();
  });
});
