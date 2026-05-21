import type { CardRow, DeckRow } from '../types/decks.js';
import type { LocalCardRow, LocalDeckRow } from '../types/localDb.js';
import {
  deleteLocalDeck,
  listLocalDecks,
  putCardImage,
  putLocalCard,
  putLocalDeck,
} from './localDecks.js';
import { err, ok, type Result } from './result.js';
import {
  fetchCardRowsRest,
  fetchDeckRowRest,
  publicCardImageUrlRest,
  type SupabaseRestConfig,
  type SupabaseRestFailure,
} from './supabaseRest.js';

/** Expected failures from the shared cloud deck download pipeline. */
export type CoreDownloadFailure =
  | { kind: 'already_installed' }
  | { kind: 'query'; message: string; retryable: boolean }
  | { kind: 'network'; message: string }
  | { kind: 'empty'; message: string }
  | { kind: 'io'; message: string };

/**
 * @param failure - REST layer failure.
 * @returns Core download failure with retry hint.
 */
export function mapRestFailureToCore(failure: SupabaseRestFailure): CoreDownloadFailure {
  switch (failure.kind) {
    case 'network':
      return { kind: 'network', message: failure.message };
    case 'not_found':
      return { kind: 'empty', message: failure.message };
    case 'http':
      return {
        kind: 'query',
        message: failure.message,
        retryable: failure.retryable,
      };
  }
}

/**
 * @param failure - Core download failure.
 * @returns True when the download should remain queued for retry.
 */
export function isRetryableCoreFailure(failure: CoreDownloadFailure): boolean {
  if (failure.kind === 'network') return true;
  if (failure.kind === 'query' && failure.retryable) return true;
  return false;
}

async function fetchImageBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return res.blob();
}

/**
 * Copies a cloud deck into IndexedDB (cards and images) using REST fetch.
 *
 * @param deckId - Catalog deck id.
 * @param config - Supabase REST credentials.
 * @returns Ok on success, or Err with a structured failure.
 */
export async function executeCloudDeckDownload(
  deckId: string,
  config: SupabaseRestConfig,
): Promise<Result<void, CoreDownloadFailure>> {
  const existing = await listLocalDecks();
  if (existing.some((d) => d.id === deckId)) {
    return err({ kind: 'already_installed' });
  }

  const deckRes = await fetchDeckRowRest(config, deckId);
  if (!deckRes.ok) {
    return err(mapRestFailureToCore(deckRes.error));
  }

  const cardRes = await fetchCardRowsRest(config, deckId);
  if (!cardRes.ok) {
    return err(mapRestFailureToCore(cardRes.error));
  }
  if (!cardRes.value.length) {
    return err({ kind: 'empty', message: 'No cards in catalog for this deck.' });
  }

  const deck = deckRes.value as DeckRow;
  const cardRows = cardRes.value as CardRow[];
  const localDeck: LocalDeckRow = {
    id: deck.id,
    title: deck.title,
    description: deck.description,
    created_at: deck.created_at,
    modified_at: deck.modified_at,
    from_catalog: true,
  };

  try {
    await putLocalDeck(localDeck);

    for (const row of cardRows) {
      const mainUrl = publicCardImageUrlRest(config, row.image);
      let mainBlob: Blob;
      try {
        mainBlob = await fetchImageBlob(mainUrl);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Failed to fetch image';
        await deleteLocalDeck(deckId);
        return err({ kind: 'network', message });
      }
      const mainId = await putCardImage(mainBlob, mainBlob.type || 'image/webp', row.image);

      let censorBlobId: string | null = null;
      if (row.censor_image) {
        const cUrl = publicCardImageUrlRest(config, row.censor_image);
        let cBlob: Blob;
        try {
          cBlob = await fetchImageBlob(cUrl);
        } catch (e) {
          const message = e instanceof Error ? e.message : 'Failed to fetch image';
          await deleteLocalDeck(deckId);
          return err({ kind: 'network', message });
        }
        censorBlobId = await putCardImage(cBlob, cBlob.type || 'image/webp', row.censor_image);
      }

      const localCard: LocalCardRow = {
        id: row.id,
        deck_id: row.deck_id,
        title: row.title,
        number: row.number,
        imageBlobId: mainId,
        censorImageBlobId: censorBlobId,
        correspondence_ids: [],
      };
      await putLocalCard(localCard);
    }
  } catch (e) {
    await deleteLocalDeck(deckId);
    return err({
      kind: 'io',
      message: e instanceof Error ? e.message : 'Could not save deck to this device.',
    });
  }

  return ok(undefined);
}
