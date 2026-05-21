import type { CardRow, DeckRow } from '../types/decks.js';
import { err, ok, type Result } from './result.js';

/** Supabase PostgREST credentials for fetch-based access (main thread and service worker). */
export interface SupabaseRestConfig {
  readonly url: string;
  readonly anonKey: string;
}

/** REST fetch failure that may be retried when connectivity returns. */
export type SupabaseRestFailure =
  | { kind: 'network'; message: string }
  | { kind: 'not_found'; message: string }
  | { kind: 'http'; message: string; status: number; retryable: boolean };

/**
 * @returns Supabase REST config from Vite env (browser main thread).
 */
export function getBrowserSupabaseRestConfig(): SupabaseRestConfig {
  return {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  };
}

function restHeaders(config: SupabaseRestConfig): HeadersInit {
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${config.anonKey}`,
    Accept: 'application/json',
  };
}

function singleObjectHeaders(config: SupabaseRestConfig): HeadersInit {
  return {
    ...restHeaders(config),
    Accept: 'application/vnd.pgrst.object+json',
  };
}

/**
 * @param config - Supabase REST credentials.
 * @param deckId - Catalog deck id.
 * @returns Deck row or a structured REST failure.
 */
export async function fetchDeckRowRest(
  config: SupabaseRestConfig,
  deckId: string,
): Promise<Result<DeckRow, SupabaseRestFailure>> {
  const url = `${config.url}/rest/v1/deck?select=id,title,description,created_at,modified_at&id=eq.${encodeURIComponent(deckId)}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: singleObjectHeaders(config) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return err({ kind: 'network', message });
  }

  if (res.status === 406 || res.status === 404) {
    return err({ kind: 'not_found', message: 'Deck not found in catalog.' });
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return err({
      kind: 'http',
      message: text.trim() || `Deck request failed (${res.status}).`,
      status: res.status,
      retryable: res.status >= 500 || res.status === 408 || res.status === 429,
    });
  }

  const data = (await res.json()) as DeckRow;
  return ok(data);
}

/**
 * @param config - Supabase REST credentials.
 * @param deckId - Catalog deck id.
 * @returns Card rows ordered by number, or a structured REST failure.
 */
export async function fetchCardRowsRest(
  config: SupabaseRestConfig,
  deckId: string,
): Promise<Result<CardRow[], SupabaseRestFailure>> {
  const url = `${config.url}/rest/v1/card?select=id,title,number,image,censor_image,deck_id&deck_id=eq.${encodeURIComponent(deckId)}&order=number.asc`;
  let res: Response;
  try {
    res = await fetch(url, { headers: restHeaders(config) });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Network request failed';
    return err({ kind: 'network', message });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    return err({
      kind: 'http',
      message: text.trim() || `Card request failed (${res.status}).`,
      status: res.status,
      retryable: res.status >= 500 || res.status === 408 || res.status === 429,
    });
  }

  const data = (await res.json()) as CardRow[];
  return ok(data);
}

/**
 * @param config - Supabase REST credentials.
 * @param filename - Storage object key in the card-images bucket.
 * @returns Public storage URL for the card image.
 */
export function publicCardImageUrlRest(config: SupabaseRestConfig, filename: string): string {
  return `${config.url}/storage/v1/object/public/card-images/${filename}`;
}
