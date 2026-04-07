/**
 * Maps Supabase PostgREST errors to typed domain failures at module boundaries.
 */

import type { PostgrestError } from '@supabase/supabase-js';

/** High-level category for UI and logging. */
export type QueryFailureKind = 'not_found' | 'permission' | 'unknown';

/** Structured failure from a Supabase table/query call. */
export interface QueryFailure {
  readonly kind: QueryFailureKind;
  readonly operation: string;
  readonly message: string;
  readonly supabaseCode?: string;
}

/**
 * Maps a PostgREST error to a {@link QueryFailure}.
 *
 * @param error - Supabase PostgREST error object.
 * @param operation - Stable name of the operation (for logs).
 * @returns A typed failure for callers and UI.
 */
export function toQueryFailure(error: PostgrestError, operation: string): QueryFailure {
  let kind: QueryFailureKind = 'unknown';
  if (error.code === 'PGRST116') {
    kind = 'not_found';
  } else if (error.code === '42501' || error.code === 'PGRST301') {
    kind = 'permission';
  }
  return {
    kind,
    operation,
    message: error.message,
    supabaseCode: error.code,
  };
}

/**
 * User-visible message for a query failure.
 *
 * @param f - Structured query failure.
 * @returns Short string for dialogs and inline UI.
 */
export function queryFailureMessage(f: QueryFailure): string {
  switch (f.kind) {
    case 'not_found':
      return 'Nothing was found for that request.';
    case 'permission':
      return 'You do not have permission to load this data.';
    case 'unknown':
    default:
      return f.message.trim() ? f.message : 'Could not load data from the server.';
  }
}

/**
 * Maps an unexpected thrown value (e.g. failed fetch) to a {@link QueryFailure}.
 *
 * @param operation - Stable operation name for logs.
 * @param e - Thrown value.
 */
export function exceptionToQueryFailure(operation: string, e: unknown): QueryFailure {
  const message =
    e instanceof Error ? e.message : typeof e === 'string' ? e : 'Unexpected error.';
  return {
    kind: 'unknown',
    operation,
    message: message.trim() ? message : 'Could not load data from the server.',
  };
}
