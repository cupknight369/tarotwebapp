/**
 * Runs before each test file. Ensures server modules that read Supabase env at load time do not throw.
 */

process.env.VITE_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY ??= 'vitest-placeholder-anon-key';
