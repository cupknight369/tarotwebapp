import { supabase } from './supabase.js';
import { publicCardImageUrl } from './cardImageUrls.js';
import type { CardRow, DeckRow } from '../types/decks.js';
import type { LocalCardRow, LocalDeckRow } from '../types/localDb.js';
import {
  deleteLocalDeck,
  listLocalDecks,
  putCardImage,
  putLocalCard,
  putLocalDeck,
} from './localDecks.js';

async function fetchImageBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  return res.blob();
}

export async function downloadCloudDeckToDevice(deckId: string): Promise<void> {
  const existing = await listLocalDecks();
  if (existing.some((d) => d.id === deckId)) return;

  const { data: deckData, error: deckError } = await supabase
    .from('deck')
    .select('id, title, description, created_at, modified_at')
    .eq('id', deckId)
    .single();

  if (deckError || !deckData) {
    throw new Error(deckError?.message ?? 'Deck not found in catalog');
  }

  const { data: cardRows, error: cardError } = await supabase
    .from('card')
    .select('id, title, number, image, censor_image, deck_id')
    .eq('deck_id', deckId)
    .order('number', { ascending: true });

  if (cardError) {
    throw new Error(cardError.message);
  }
  if (!cardRows?.length) {
    throw new Error('No cards in catalog for this deck');
  }

  const deck = deckData as DeckRow;
  const localDeck: LocalDeckRow = {
    id: deck.id,
    title: deck.title,
    description: deck.description,
    created_at: deck.created_at,
    modified_at: deck.modified_at,
  };

  try {
    await putLocalDeck(localDeck);

    for (const row of cardRows as CardRow[]) {
      const mainUrl = publicCardImageUrl(row.image);
      const mainBlob = await fetchImageBlob(mainUrl);
      const mainId = await putCardImage(mainBlob, mainBlob.type || 'image/webp', row.image);

      let censorBlobId: string | null = null;
      if (row.censor_image) {
        const cUrl = publicCardImageUrl(row.censor_image);
        const cBlob = await fetchImageBlob(cUrl);
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
    throw e;
  }
}
