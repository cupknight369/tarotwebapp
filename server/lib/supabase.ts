import { createServerClient } from '@supabase/ssr'
import type { Request, Response } from 'express'
import { parse as parseCookie } from 'cookie'

const supabaseUrl = process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_URL/SUPABASE_URL or VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY')
}

export function createSupabaseClient(req: Request, res: Response) {
  return createServerClient(supabaseUrl as string, supabaseAnonKey as string, {
    cookies: {
      getAll() {
        const cookieHeader = req.headers.cookie
        if (!cookieHeader) return []
        const parsed = parseCookie(cookieHeader)
        return Object.entries(parsed).map(([name, value]) => ({ name, value: value ?? '' }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookie(name, value, {
            ...options,
            path: options?.path ?? '/',
          })
        })
      },
    },
  })
}
