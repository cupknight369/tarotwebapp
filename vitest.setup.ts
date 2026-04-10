/**
 * Runs before each test file. Ensures server modules that read Supabase env at load time do not throw.
 */

import {
  createAlpineDataCapture,
  VITEST_ALPINE_CAPTURE_GLOBAL,
} from './src/__tests__/helpers/alpineDataCapture.js';

process.env.VITE_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.VITE_SUPABASE_ANON_KEY ??= 'vitest-placeholder-anon-key';

(globalThis as Record<string, unknown>)[VITEST_ALPINE_CAPTURE_GLOBAL] = createAlpineDataCapture;
