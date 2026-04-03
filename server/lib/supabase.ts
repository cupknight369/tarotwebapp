import { createServerClient, type SupabaseClient } from '@supabase/ssr';
import type { Request, Response } from 'express';
import { parse as parseCookie } from 'cookie';

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL/SUPABASE_URL or VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY');
}

/**
 * Creates a Supabase server client bound to the current request/response cookie jar.
 *
 * @param req - Incoming Express request (cookies read from headers).
 * @param res - Express response used to set refreshed session cookies.
 * @returns A Supabase SSR client configured for cookie-based auth.
 */
export function createSupabaseClient(req: Request, res: Response): SupabaseClient {
  return createServerClient(supabaseUrl as string, supabaseAnonKey as string, {
    cookies: {
      getAll() {
        const cookieHeader = req.headers.cookie;
        if (!cookieHeader) {
          return [];
        }
        const parsed = parseCookie(cookieHeader);
        return Object.entries(parsed).map(([name, value]) => ({ name, value: value ?? '' }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          res.cookie(name, value, {
            ...options,
            path: options?.path ?? '/',
          });
        }
      },
    },
  });
}
