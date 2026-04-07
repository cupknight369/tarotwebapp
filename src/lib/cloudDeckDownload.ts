import { supabase } from './supabase.js';
import { publicCardImageUrl } from './cardImageUrls.js';
import { err, ok, type Result } from './result.js';
import type { QueryFailure } from './supabaseErrors.js';
import { queryFailureMessage, toQueryFailure } from './supabaseErrors.js';
import type { CardRow, DeckRow } from '../types/decks.js';
import type { LocalCardRow, LocalDeckRow } from '../types/localDb.js';
import {
  deleteLocalDeck,
  listLocalDecks,
  putCardImage,
  putLocalCard,
  putLocalDeck,
} from './localDecks.js';

/** Expected failures when downloading a catalog deck to the device. */
export type DownloadDeckFailure =
  | { kind: 'query'; failure: QueryFailure }
  | { kind: 'network'; message: string }
  | { kind: 'empty'; message: string }
  | { kind: 'io'; message: string };

/**
 * User-visible message for a download failure.
 *
 * @param f - Structured download failure.
 */
export function downloadFailureMessage(f: DownloadDeckFailure): string {
  switch (f.kind) {
    case 'query':
      return queryFailureMessage(f.failure);
    case 'network':
    case 'empty':
    case 'io':
      return f.message;
  }
}

async function fetchImageBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return res.blob();
}

/**
 * Copies a cloud deck into IndexedDB (cards and images).
 *
 * @param deckId - Catalog deck id.
 * @returns Ok on success, or Err with a structured failure.
 */
export async function downloadCloudDeckToDevice(
  deckId: string,
): Promise<Result<void, DownloadDeckFailure>> {
  const existing = await listLocalDecks();
  if (existing.some((d) => d.id === deckId)) return ok(undefined);

  const { data: deckData, error: deckError } = await supabase
    .from('deck')
    .select('id, title, description, created_at, modified_at')
    .eq('id', deckId)
    .single();

  if (deckError) {
    return err({ kind: 'query', failure: toQueryFailure(deckError, 'downloadCloudDeckToDevice.deck') });
  }
  if (!deckData) {
    return err({ kind: 'empty', message: 'Deck not found in catalog.' });
  }

  const { data: cardRows, error: cardError } = await supabase
    .from('card')
    .select('id, title, number, image, censor_image, deck_id')
    .eq('deck_id', deckId)
    .order('number', { ascending: true });

  if (cardError) {
    return err({ kind: 'query', failure: toQueryFailure(cardError, 'downloadCloudDeckToDevice.cards') });
  }
  if (!cardRows?.length) {
    return err({ kind: 'empty', message: 'No cards in catalog for this deck.' });
  }

  const deck = deckData as DeckRow;
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

    for (const row of cardRows as CardRow[]) {
      const mainUrl = publicCardImageUrl(row.image);
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
        const cUrl = publicCardImageUrl(row.censor_image);
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
