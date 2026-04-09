import * as cookieModule from 'cookie';
import type { Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

type CookieAdapter = {
  cookies: {
    getAll: () => { name: string; value: string }[];
    setAll: (
      cookiesToSet: {
        name: string;
        value: string;
        options?: { path?: string };
      }[],
    ) => void;
  };
};

let capturedAdapter: CookieAdapter | undefined;

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: CookieAdapter) => {
    capturedAdapter = options;
    return { auth: {} };
  }),
}));

import { createSupabaseClient } from '../lib/supabase.js';

describe('createSupabaseClient', () => {
  it('returns empty cookie list when Cookie header is missing', () => {
    const req = { headers: {} } as Request;
    const res = { cookie: vi.fn() } as unknown as Response;
    createSupabaseClient(req, res);
    expect(capturedAdapter).toBeDefined();
    expect(capturedAdapter!.cookies.getAll()).toEqual([]);
  });

  it('parses cookies from the Cookie header', () => {
    const req = {
      headers: { cookie: 'session=abc; other=def' },
    } as unknown as Request;
    const res = { cookie: vi.fn() } as unknown as Response;
    createSupabaseClient(req, res);
    const all = capturedAdapter!.cookies.getAll();
    expect(all).toEqual(
      expect.arrayContaining([
        { name: 'session', value: 'abc' },
        { name: 'other', value: 'def' },
      ]),
    );
    expect(all).toHaveLength(2);
  });

  it('defaults undefined cookie values to an empty string', () => {
    const spy = vi.spyOn(cookieModule, 'parse').mockReturnValue({
      ghost: undefined as unknown as string,
    });
    const req = { headers: { cookie: 'x=y' } } as Request;
    const res = { cookie: vi.fn() } as unknown as Response;
    createSupabaseClient(req, res);
    expect(capturedAdapter!.cookies.getAll()).toEqual([{ name: 'ghost', value: '' }]);
    spy.mockRestore();
  });

  it('setAll forwards cookies to res.cookie with merged options', () => {
    const req = { headers: {} } as Request;
    const cookie = vi.fn();
    const res = { cookie } as unknown as Response;
    createSupabaseClient(req, res);

    capturedAdapter!.cookies.setAll([
      { name: 'a', value: '1', options: { path: '/custom' } },
      { name: 'b', value: '2', options: {} },
    ]);

    expect(cookie).toHaveBeenCalledWith('a', '1', expect.objectContaining({ path: '/custom' }));
    expect(cookie).toHaveBeenCalledWith('b', '2', expect.objectContaining({ path: '/' }));
  });
});
