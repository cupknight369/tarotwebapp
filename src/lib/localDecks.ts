import type { LocalCardRow, LocalCardImageRow, LocalDeckRow } from '../types/localDb.js';
import {
  openTarotDb,
  STORE_CARDS,
  STORE_CARD_IMAGES,
  STORE_DECKS,
  idbRequest,
} from './indexedDb.js';

const blobUrlByBlobId = new Map<string, string>();

export function getCachedObjectUrlForBlobId(blobId: string): string | undefined {
  return blobUrlByBlobId.get(blobId);
}

export function setCachedObjectUrl(blobId: string, url: string): void {
  const prev = blobUrlByBlobId.get(blobId);
  if (prev && prev !== url) URL.revokeObjectURL(prev);
  blobUrlByBlobId.set(blobId, url);
}

export function revokeBlobObjectUrl(blobId: string): void {
  const u = blobUrlByBlobId.get(blobId);
  if (u) {
    URL.revokeObjectURL(u);
    blobUrlByBlobId.delete(blobId);
  }
}

/** True if this object URL is the live cache entry for a deck card image in IndexedDB. */
export function isBlobUrlManagedByDeckCache(url: string): boolean {
  for (const u of blobUrlByBlobId.values()) {
    if (u === url) return true;
  }
  return false;
}

export async function listLocalDecks(): Promise<LocalDeckRow[]> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_DECKS, 'readonly');
  const rows = (await idbRequest(tx.objectStore(STORE_DECKS).getAll())) as LocalDeckRow[];
  return rows.sort((a, b) => a.title.localeCompare(b.title));
}

export async function putLocalDeck(row: LocalDeckRow): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_DECKS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_DECKS).put(row));
}

export async function createLocalDeck(
  title: string,
  description: string | null = null,
): Promise<LocalDeckRow> {
  const now = new Date().toISOString();
  const row: LocalDeckRow = {
    id: crypto.randomUUID(),
    title,
    description,
    created_at: now,
    modified_at: now,
    from_catalog: false,
  };
  await putLocalDeck(row);
  return row;
}

export async function putCardImage(blob: Blob, mimeType?: string, title?: string): Promise<string> {
  const db = await openTarotDb();
  const id = crypto.randomUUID();
  const row: LocalCardImageRow = {
    id,
    blob,
    mimeType: mimeType ?? blob.type,
    created_at: new Date().toISOString(),
    ...(title?.trim() ? { title: title.trim() } : {}),
  };
  const tx = db.transaction(STORE_CARD_IMAGES, 'readwrite');
  await idbRequest(tx.objectStore(STORE_CARD_IMAGES).put(row));
  return id;
}

/** Write a card image row with a fixed id (e.g. backup restore). */
export async function putLocalCardImageRow(row: LocalCardImageRow): Promise<void> {
  revokeBlobObjectUrl(row.id);
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CARD_IMAGES, 'readwrite');
  await idbRequest(tx.objectStore(STORE_CARD_IMAGES).put(row));
}

export async function getCardImageRow(id: string): Promise<LocalCardImageRow | null> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CARD_IMAGES, 'readonly');
  const row = (await idbRequest(tx.objectStore(STORE_CARD_IMAGES).get(id))) as
    | LocalCardImageRow
    | undefined;
  return row ?? null;
}

export async function getCardImageBlob(id: string): Promise<Blob | null> {
  const row = await getCardImageRow(id);
  return row?.blob ?? null;
}

async function deleteCardImageRow(id: string): Promise<void> {
  revokeBlobObjectUrl(id);
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CARD_IMAGES, 'readwrite');
  await idbRequest(tx.objectStore(STORE_CARD_IMAGES).delete(id));
}

export async function listLocalCardsByDeckId(deckId: string): Promise<LocalCardRow[]> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CARDS, 'readonly');
  const store = tx.objectStore(STORE_CARDS);
  const idx = store.index('by_deck_id');
  const rows = (await idbRequest(idx.getAll(deckId))) as LocalCardRow[];
  return rows.sort((a, b) => a.number - b.number);
}

export async function getLocalCardsByIds(ids: string[]): Promise<Map<string, LocalCardRow>> {
  const map = new Map<string, LocalCardRow>();
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return map;
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CARDS, 'readonly');
  const store = tx.objectStore(STORE_CARDS);
  await Promise.all(
    unique.map(async (id) => {
      const row = (await idbRequest(store.get(id))) as LocalCardRow | undefined;
      if (row) map.set(id, row);
    }),
  );
  return map;
}

export async function putLocalCard(row: LocalCardRow): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CARDS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_CARDS).put(row));

  const deckTx = db.transaction(STORE_DECKS, 'readwrite');
  const deckStore = deckTx.objectStore(STORE_DECKS);
  const deck = (await idbRequest(deckStore.get(row.deck_id))) as LocalDeckRow | undefined;
  if (deck) {
    deck.modified_at = new Date().toISOString();
    await idbRequest(deckStore.put(deck));
  }
}

export async function countCardsReferencingBlob(blobId: string): Promise<number> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CARDS, 'readonly');
  const all = (await idbRequest(tx.objectStore(STORE_CARDS).getAll())) as LocalCardRow[];
  let n = 0;
  for (const c of all) {
    if (c.imageBlobId === blobId || c.censorImageBlobId === blobId) n++;
  }
  return n;
}

export async function deleteLocalCard(cardId: string): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CARDS, 'readwrite');
  const cardStore = tx.objectStore(STORE_CARDS);
  const row = (await idbRequest(cardStore.get(cardId))) as LocalCardRow | undefined;
  if (!row) return;
  await idbRequest(cardStore.delete(cardId));

  const maybeDeleteBlob = async (blobId: string | null) => {
    if (!blobId) return;
    const n = await countCardsReferencingBlob(blobId);
    if (n === 0) await deleteCardImageRow(blobId);
  };

  await maybeDeleteBlob(row.imageBlobId);
  await maybeDeleteBlob(row.censorImageBlobId);
}

export async function deleteLocalDeck(deckId: string): Promise<void> {
  const cards = await listLocalCardsByDeckId(deckId);
  for (const c of cards) {
    await deleteLocalCard(c.id);
  }
  const db = await openTarotDb();
  const tx = db.transaction(STORE_DECKS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_DECKS).delete(deckId));
}

export async function addCardToLocalDeck(opts: {
  deckId: string;
  title: string;
  number: number;
  imageFile: File;
  censorFile?: File | null;
}): Promise<LocalCardRow> {
  const mainBlobId = await putCardImage(opts.imageFile, opts.imageFile.type, opts.imageFile.name);
  let censorBlobId: string | null = null;
  if (opts.censorFile && opts.censorFile.size > 0) {
    censorBlobId = await putCardImage(opts.censorFile, opts.censorFile.type, opts.censorFile.name);
  }
  const row: LocalCardRow = {
    id: crypto.randomUUID(),
    deck_id: opts.deckId,
    title: opts.title,
    number: opts.number,
    imageBlobId: mainBlobId,
    censorImageBlobId: censorBlobId,
  };
  await putLocalCard(row);
  return row;
}

export async function updateLocalCard(opts: {
  cardId: string;
  title: string;
  number: number;
  mainImageFile?: File | null;
  censorImageFile?: File | null;
  /** When true, remove the censored image (ignored if `censorImageFile` is provided with size > 0 after clear — prefer explicit clear first in UI). */
  censorClear?: boolean;
}): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CARDS, 'readonly');
  const row = (await idbRequest(tx.objectStore(STORE_CARDS).get(opts.cardId))) as
    | LocalCardRow
    | undefined;
  if (!row) throw new Error(`Card not found: ${opts.cardId}`);

  const oldMain = row.imageBlobId;
  const oldCensor = row.censorImageBlobId;

  let imageBlobId = row.imageBlobId;
  let censorImageBlobId = row.censorImageBlobId;

  const mainFile = opts.mainImageFile;
  if (mainFile && mainFile.size > 0) {
    imageBlobId = await putCardImage(mainFile, mainFile.type, mainFile.name);
  }

  if (opts.censorClear) {
    censorImageBlobId = null;
  } else {
    const censorFile = opts.censorImageFile;
    if (censorFile && censorFile.size > 0) {
      censorImageBlobId = await putCardImage(censorFile, censorFile.type, censorFile.name);
    }
  }

  const updated: LocalCardRow = {
    ...row,
    title: opts.title.trim(),
    number: opts.number,
    imageBlobId,
    censorImageBlobId,
  };

  await putLocalCard(updated);

  const maybeDeleteBlob = async (blobId: string | null) => {
    if (!blobId) return;
    const n = await countCardsReferencingBlob(blobId);
    if (n === 0) await deleteCardImageRow(blobId);
  };

  if (mainFile && mainFile.size > 0 && oldMain !== imageBlobId) {
    await maybeDeleteBlob(oldMain);
  }
  if (opts.censorClear && oldCensor) {
    await maybeDeleteBlob(oldCensor);
  } else if (!opts.censorClear) {
    const censorFile = opts.censorImageFile;
    if (censorFile && censorFile.size > 0 && oldCensor && oldCensor !== censorImageBlobId) {
      await maybeDeleteBlob(oldCensor);
    }
  }
}
