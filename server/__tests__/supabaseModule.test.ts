import { describe, expect, it, vi } from 'vitest';

describe('supabase module load', () => {
  it('throws when Supabase URL and anon key env vars are missing', async () => {
    const saved = {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL,
      VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    };
    try {
      vi.resetModules();
      delete process.env.VITE_SUPABASE_URL;
      delete process.env.VITE_SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;

      await expect(import('../lib/supabase.js')).rejects.toThrow(/Missing VITE_SUPABASE_URL/);
    } finally {
      Object.assign(process.env, saved);
      vi.resetModules();
    }
  });
});
