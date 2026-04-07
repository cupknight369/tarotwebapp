import { supabase } from './supabase.js';
import { publicCardImageUrl } from './cardImageUrls.js';
import type { CatalogDeckOffer, OnDeviceDeckEntry, TarotCard } from '../types/canvas.js';
import type { DeckRow, CardRow } from '../types/decks.js';
import type { LocalCardImageRow, LocalCardRow } from '../types/localDb.js';
import { err, ok, type Result } from './result.js';
import type { QueryFailure } from './supabaseErrors.js';
import { exceptionToQueryFailure, toQueryFailure } from './supabaseErrors.js';
import {
  getCardImageRow,
  getCachedObjectUrlForBlobId,
  getLocalCardsByIds,
  listLocalCardsByDeckId,
  listLocalDecks,
  putLocalDeck,
  setCachedObjectUrl,
} from './localDecks.js';

export const LAST_DECK_STORAGE_KEY = 'last_deck_id';

/** Seeded default deck id (matches migration). */
export const DEFAULT_DECK_ID = 'a0000000-0000-4000-8000-000000000001';

/** Max wait for Supabase deck/catalog HTTP — avoids blocking local IDB when the network hangs. */
const CLOUD_REQUEST_TIMEOUT_MS = 15_000;

/**
 * Resolves with a timeout error if `work` does not settle in time (underlying fetch may still run).
 *
 * @param ms - Timeout in milliseconds.
 * @param operation - Operation label for failures.
 * @param work - Promise of a Result from the network layer.
 */
function withTimeoutResult<T>(
  ms: number,
  operation: string,
  work: Promise<Result<T, QueryFailure>>,
): Promise<Result<T, QueryFailure>> {
  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      resolve(
        err({
          kind: 'unknown',
          operation,
          message: `Request timed out after ${ms} ms.`,
        }),
      );
    }, ms);
    work
      .then((r) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(r);
      })
      .catch((e) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(err(exceptionToQueryFailure(operation, e)));
      });
  });
}

async function listCloudDecks(): Promise<Result<DeckRow[], QueryFailure>> {
  try {
    const { data, error } = await supabase
      .from('deck')
      .select('id, title, description, created_at, modified_at')
      .order('title', { ascending: true });

    if (error) {
      return err(toQueryFailure(error, 'listCloudDecks'));
    }
    if (!data) return ok([]);
    return ok(data as DeckRow[]);
  } catch (e) {
    return err(exceptionToQueryFailure('listCloudDecks', e));
  }
}

function fetchCatalogDeckRows(): Promise<Result<DeckRow[], QueryFailure>> {
  return withTimeoutResult(CLOUD_REQUEST_TIMEOUT_MS, 'listCloudDecks', listCloudDecks());
}

/**
 * Supabase catalog rows with `installed` when the same deck id exists in IDB.
 * Uses a timeout so a hung network cannot block forever. Callers may treat failure as an empty store.
 */
export async function listCatalogDeckOffers(): Promise<Result<CatalogDeckOffer[], QueryFailure>> {
  const localRows = await listLocalDecks();
  const catalogResult = await fetchCatalogDeckRows();
  if (!catalogResult.ok) return catalogResult;
  const catalog = catalogResult.value;
  const localIds = new Set(localRows.map((l) => l.id));
  const catalogIds = new Set(catalog.map((c) => c.id));
  const migrations = localRows
    .filter((d) => d.from_catalog === undefined)
    .map((d) => putLocalDeck({ ...d, from_catalog: catalogIds.has(d.id) }));
  await Promise.all(migrations);
  return ok(
    catalog.map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      installed: localIds.has(d.id),
    })),
  );
}

/**
 * All IndexedDB decks (no network). Cloud badge uses persisted `from_catalog` only; run
 * {@link listCatalogDeckOffers} in the background to refresh flags after the catalog loads.
 */
export async function listOnDeviceDeckEntries(): Promise<Result<OnDeviceDeckEntry[], QueryFailure>> {
  const localRows = await listLocalDecks();
  const entries: OnDeviceDeckEntry[] = localRows.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    created_at: d.created_at,
    modified_at: d.modified_at,
    fromCatalog: d.from_catalog === true,
  }));
  entries.sort((a, b) => a.title.localeCompare(b.title));
  return ok(entries);
}

/**
 * Deck ids present in IndexedDB (no network). Cloud-only ids are not included until a catalog fetch succeeds elsewhere.
 */
export async function getKnownDeckIds(): Promise<Result<Set<string>, QueryFailure>> {
  const localRows = await listLocalDecks();
  return ok(new Set(localRows.map((d) => d.id)));
}

/**
 * Title for a deck id from local row or catalog (local wins if both).
 * If the catalog request fails but a local deck exists, returns the local title only.
 */
async function getDeckTitle(deckId: string): Promise<Result<string | undefined, QueryFailure>> {
  const localDecks = await listLocalDecks();
  const localTitle = localDecks.find((d) => d.id === deckId)?.title;
  if (localTitle !== undefined) return ok(localTitle);
  const catalogResult = await fetchCatalogDeckRows();
  if (!catalogResult.ok) return catalogResult;
  const catalog = catalogResult.value;
  return ok(catalog.find((d) => d.id === deckId)?.title);
}

function rowToTarotCard(row: CardRow, deckTitle?: string): TarotCard {
  return {
    id: row.id,
    deckId: row.deck_id,
    title: row.title,
    num: row.number,
    img: publicCardImageUrl(row.image),
    censoredImg: row.censor_image ? publicCardImageUrl(row.censor_image) : null,
    deckTitle,
    imageSourceLabel: row.image,
    censorImageSourceLabel: row.censor_image ?? null,
  };
}

function localImageSourceLabel(meta: LocalCardImageRow | null): string {
  if (!meta) return 'Local image (missing)';
  const t = meta.title?.trim();
  if (t) return t;
  return 'Local image (no title stored)';
}

async function localRowToTarotCard(row: LocalCardRow, deckTitle?: string): Promise<TarotCard> {
  const mainMeta = await getCardImageRow(row.imageBlobId);
  if (!mainMeta?.blob) {
    throw new Error(`Missing image blob for card ${row.id}`);
  }
  let img = getCachedObjectUrlForBlobId(row.imageBlobId);
  if (!img) {
    img = URL.createObjectURL(mainMeta.blob);
    setCachedObjectUrl(row.imageBlobId, img);
  }
  let censoredImg: string | null = null;
  let censorImageSourceLabel: string | null = null;
  if (row.censorImageBlobId) {
    const cMeta = await getCardImageRow(row.censorImageBlobId);
    censorImageSourceLabel = localImageSourceLabel(cMeta);
    if (cMeta?.blob) {
      let u = getCachedObjectUrlForBlobId(row.censorImageBlobId);
      if (!u) {
        u = URL.createObjectURL(cMeta.blob);
        setCachedObjectUrl(row.censorImageBlobId, u);
      }
      censoredImg = u;
    }
  }
  return {
    id: row.id,
    deckId: row.deck_id,
    title: row.title,
    num: row.number,
    img,
    censoredImg,
    deckTitle,
    imageSourceLabel: localImageSourceLabel(mainMeta),
    censorImageSourceLabel,
  };
}

export async function getCardsByDeckId(deckId: string): Promise<Result<TarotCard[], QueryFailure>> {
  const localCardRows = await listLocalCardsByDeckId(deckId);
  const deckTitleRes = await getDeckTitle(deckId);
  if (!deckTitleRes.ok) return deckTitleRes;
  const deckTitle = deckTitleRes.value;

  if (localCardRows.length > 0) {
    const out: TarotCard[] = [];
    for (const row of localCardRows) {
      out.push(await localRowToTarotCard(row, deckTitle));
    }
    return ok(out);
  }

  const cloudCardsResult = await withTimeoutResult(
    CLOUD_REQUEST_TIMEOUT_MS,
    'fetchCloudCardsForDeck',
    fetchCloudCardsForDeck(deckId),
  );
  if (!cloudCardsResult.ok) return cloudCardsResult;
  const data = cloudCardsResult.value;
  if (data.length > 0) {
    return ok(data.map((row) => rowToTarotCard(row, deckTitle)));
  }

  return ok([]);
}

async function fetchCloudCardsForDeck(deckId: string): Promise<Result<CardRow[], QueryFailure>> {
  try {
    const { data, error } = await supabase
      .from('card')
      .select('id, title, number, image, censor_image, deck_id')
      .eq('deck_id', deckId)
      .order('number', { ascending: true });

    if (error) {
      return err(toQueryFailure(error, 'fetchCloudCardsForDeck'));
    }
    return ok((data ?? []) as CardRow[]);
  } catch (e) {
    return err(exceptionToQueryFailure('fetchCloudCardsForDeck', e));
  }
}

export async function getCardsByIds(
  ids: string[],
): Promise<Result<Map<string, TarotCard>, QueryFailure>> {
  const unique = [...new Set(ids)].filter(Boolean);
  const map = new Map<string, TarotCard>();
  if (unique.length === 0) return ok(map);

  const localMap = await getLocalCardsByIds(unique);
  const needFromCloud: string[] = [];
  for (const id of unique) {
    if (!localMap.has(id)) needFromCloud.push(id);
  }

  const localDecks = await listLocalDecks();
  const deckTitleById = new Map<string, string>();
  for (const d of localDecks) deckTitleById.set(d.id, d.title);

  if (needFromCloud.length === 0) {
    for (const id of unique) {
      const row = localMap.get(id);
      if (!row) continue;
      const deckTitle = deckTitleById.get(row.deck_id);
      map.set(id, await localRowToTarotCard(row, deckTitle));
    }
    return ok(map);
  }

  const catalogResult = await fetchCatalogDeckRows();
  if (!catalogResult.ok) return catalogResult;
  const catalog = catalogResult.value;
  for (const d of catalog) {
    if (!deckTitleById.has(d.id)) deckTitleById.set(d.id, d.title);
  }

  for (const id of unique) {
    const row = localMap.get(id);
    if (row) {
      const deckTitle = deckTitleById.get(row.deck_id);
      map.set(id, await localRowToTarotCard(row, deckTitle));
    }
  }

  const cloudByIdsResult = await withTimeoutResult(
    CLOUD_REQUEST_TIMEOUT_MS,
    'fetchCloudCardsByIds',
    fetchCloudCardsByIds(needFromCloud),
  );
  if (!cloudByIdsResult.ok) return cloudByIdsResult;
  for (const row of cloudByIdsResult.value) {
    const deckTitle = deckTitleById.get(row.deck_id);
    const card = rowToTarotCard(row, deckTitle);
    map.set(card.id, card);
  }
  return ok(map);
}

async function fetchCloudCardsByIds(cardIds: string[]): Promise<Result<CardRow[], QueryFailure>> {
  try {
    const { data, error } = await supabase
      .from('card')
      .select('id, title, number, image, censor_image, deck_id')
      .in('id', cardIds);

    if (error) {
      return err(toQueryFailure(error, 'fetchCloudCardsByIds'));
    }
    return ok((data ?? []) as CardRow[]);
  } catch (e) {
    return err(exceptionToQueryFailure('fetchCloudCardsByIds', e));
  }
}
