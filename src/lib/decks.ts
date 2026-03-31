import { supabase } from './supabase.js'
import { publicCardImageUrl } from './cardImageUrls.js'
import type { CatalogDeckOffer, OnDeviceDeckEntry, TarotCard } from '../types/canvas.js'
import type { DeckRow, CardRow } from '../types/decks.js'
import type { LocalCardImageRow, LocalCardRow } from '../types/localDb.js'
import {
  getCardImageRow,
  getCachedObjectUrlForBlobId,
  getLocalCardsByIds,
  listLocalCardsByDeckId,
  listLocalDecks,
  setCachedObjectUrl,
} from './localDecks.js'

export const LAST_DECK_STORAGE_KEY = 'last_deck_id'

/** Seeded default deck id (matches migration). */
export const DEFAULT_DECK_ID = 'a0000000-0000-4000-8000-000000000001'

async function listCloudDecks(): Promise<DeckRow[]> {
  const { data, error } = await supabase
    .from('deck')
    .select('id, title, description, created_at, modified_at')
    .order('title', { ascending: true })

  if (error) {
    console.error('listCloudDecks failed', error.message, error)
    return []
  }
  if (!data) return []
  return data as DeckRow[]
}

/** Supabase catalog rows with `installed` when the same deck id exists in IDB. */
export async function listCatalogDeckOffers(): Promise<CatalogDeckOffer[]> {
  const [catalog, localRows] = await Promise.all([listCloudDecks(), listLocalDecks()])
  const localIds = new Set(localRows.map((l) => l.id))
  return catalog.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description,
    installed: localIds.has(d.id),
  }))
}

/** All IndexedDB decks with `fromCatalog` when the id exists in the Supabase catalog. */
export async function listOnDeviceDeckEntries(): Promise<OnDeviceDeckEntry[]> {
  const [catalog, localRows] = await Promise.all([listCloudDecks(), listLocalDecks()])
  const catalogIds = new Set(catalog.map((c) => c.id))
  return localRows
    .map((d) => ({
      id: d.id,
      title: d.title,
      description: d.description,
      created_at: d.created_at,
      modified_at: d.modified_at,
      fromCatalog: catalogIds.has(d.id),
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
}

/** Valid deck ids = catalog ∪ on-device (for `last_deck_id` validation). */
export async function getKnownDeckIds(): Promise<Set<string>> {
  const [catalog, localRows] = await Promise.all([listCloudDecks(), listLocalDecks()])
  const ids = new Set<string>()
  for (const d of catalog) ids.add(d.id)
  for (const d of localRows) ids.add(d.id)
  return ids
}

/** Title for a deck id from local row or catalog (local wins if both). */
async function getDeckTitle(deckId: string): Promise<string | undefined> {
  const [localDecks, catalog] = await Promise.all([listLocalDecks(), listCloudDecks()])
  return localDecks.find((d) => d.id === deckId)?.title ?? catalog.find((d) => d.id === deckId)?.title
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
  }
}

function localImageSourceLabel(meta: LocalCardImageRow | null): string {
  if (!meta) return 'Local image (missing)'
  const t = meta.title?.trim()
  if (t) return t
  return 'Local image (no title stored)'
}

async function localRowToTarotCard(row: LocalCardRow, deckTitle?: string): Promise<TarotCard> {
  const mainMeta = await getCardImageRow(row.imageBlobId)
  if (!mainMeta?.blob) {
    throw new Error(`Missing image blob for card ${row.id}`)
  }
  let img = getCachedObjectUrlForBlobId(row.imageBlobId)
  if (!img) {
    img = URL.createObjectURL(mainMeta.blob)
    setCachedObjectUrl(row.imageBlobId, img)
  }
  let censoredImg: string | null = null
  let censorImageSourceLabel: string | null = null
  if (row.censorImageBlobId) {
    const cMeta = await getCardImageRow(row.censorImageBlobId)
    censorImageSourceLabel = localImageSourceLabel(cMeta)
    if (cMeta?.blob) {
      let u = getCachedObjectUrlForBlobId(row.censorImageBlobId)
      if (!u) {
        u = URL.createObjectURL(cMeta.blob)
        setCachedObjectUrl(row.censorImageBlobId, u)
      }
      censoredImg = u
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
  }
}

export async function getCardsByDeckId(deckId: string): Promise<TarotCard[]> {
  const localCardRows = await listLocalCardsByDeckId(deckId)
  const deckTitle = await getDeckTitle(deckId)

  if (localCardRows.length > 0) {
    const out: TarotCard[] = []
    for (const row of localCardRows) {
      out.push(await localRowToTarotCard(row, deckTitle))
    }
    return out
  }

  const { data, error } = await supabase
    .from('card')
    .select('id, title, number, image, censor_image, deck_id')
    .eq('deck_id', deckId)
    .order('number', { ascending: true })

  if (error) {
    console.error('getCardsByDeckId failed', deckId, error.message, error)
  }
  if (data && data.length > 0) {
    return (data as CardRow[]).map((row) => rowToTarotCard(row, deckTitle))
  }

  return []
}

export async function getCardsByIds(ids: string[]): Promise<Map<string, TarotCard>> {
  const unique = [...new Set(ids)].filter(Boolean)
  const map = new Map<string, TarotCard>()
  if (unique.length === 0) return map

  const [localDecks, catalog] = await Promise.all([listLocalDecks(), listCloudDecks()])
  const deckTitleById = new Map<string, string>()
  for (const d of localDecks) deckTitleById.set(d.id, d.title)
  for (const d of catalog) {
    if (!deckTitleById.has(d.id)) deckTitleById.set(d.id, d.title)
  }

  const localMap = await getLocalCardsByIds(unique)
  const needFromCloud: string[] = []
  for (const id of unique) {
    const row = localMap.get(id)
    if (row) {
      const deckTitle = deckTitleById.get(row.deck_id)
      map.set(id, await localRowToTarotCard(row, deckTitle))
    } else {
      needFromCloud.push(id)
    }
  }

  if (needFromCloud.length === 0) return map

  const { data, error } = await supabase
    .from('card')
    .select('id, title, number, image, censor_image, deck_id')
    .in('id', needFromCloud)

  if (error) {
    console.error('getCardsByIds failed', error.message, error)
  }
  if (data) {
    for (const row of data as CardRow[]) {
      const deckTitle = deckTitleById.get(row.deck_id)
      const card = rowToTarotCard(row, deckTitle)
      map.set(card.id, card)
    }
  }
  return map
}
