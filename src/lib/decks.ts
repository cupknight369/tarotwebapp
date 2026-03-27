import { supabase } from './supabase.js'
import { publicCardImageUrl } from './cardImageUrls.js'
import type { TarotCard } from '../types/canvas.js'
import type { DeckRow, CardRow } from '../types/decks.js'
import type { LocalCardRow } from '../types/localDb.js'
import {
  getCardImageBlob,
  getCachedObjectUrlForBlobId,
  getLocalCardsByIds,
  listLocalCardsByDeckId,
  listLocalDecks,
  setCachedObjectUrl,
} from './localDecks.js'

export const LAST_DECK_STORAGE_KEY = 'last_deck_id'

/** Seeded default deck id (matches migration). */
export const DEFAULT_DECK_ID = 'a0000000-0000-4000-8000-000000000001'

export type DeckWithSource = DeckRow & { source: 'cloud' | 'local' }

function rowToTarotCard(row: CardRow): TarotCard {
  return {
    id: row.id,
    deckId: row.deck_id,
    title: row.title,
    num: row.number,
    img: publicCardImageUrl(row.image),
    censoredImg: row.censor_image ? publicCardImageUrl(row.censor_image) : null,
  }
}

async function localRowToTarotCard(row: LocalCardRow): Promise<TarotCard> {
  const mainBlob = await getCardImageBlob(row.imageBlobId)
  if (!mainBlob) {
    throw new Error(`Missing image blob for card ${row.id}`)
  }
  let img = getCachedObjectUrlForBlobId(row.imageBlobId)
  if (!img) {
    img = URL.createObjectURL(mainBlob)
    setCachedObjectUrl(row.imageBlobId, img)
  }
  let censoredImg: string | null = null
  if (row.censorImageBlobId) {
    const cBlob = await getCardImageBlob(row.censorImageBlobId)
    if (cBlob) {
      let u = getCachedObjectUrlForBlobId(row.censorImageBlobId)
      if (!u) {
        u = URL.createObjectURL(cBlob)
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
  }
}

async function listCloudDecks(): Promise<DeckRow[]> {
  const { data, error } = await supabase
    .from('deck')
    .select('id, title, description, created_at, modified_at')
    .order('title', { ascending: true })

  if (error) {
    console.error('listDecks failed', error.message, error)
    return []
  }
  if (!data) return []
  return data as DeckRow[]
}

export async function listDecks(): Promise<DeckWithSource[]> {
  const [cloud, local] = await Promise.all([listCloudDecks(), listLocalDecks()])
  const merged: DeckWithSource[] = [
    ...cloud.map((d) => ({ ...d, source: 'cloud' as const })),
    ...local.map((d) => ({ ...d, source: 'local' as const })),
  ]
  merged.sort((a, b) => a.title.localeCompare(b.title))
  return merged
}

export async function getCardsByDeckId(deckId: string): Promise<TarotCard[]> {
  const { data, error } = await supabase
    .from('card')
    .select('id, title, number, image, censor_image, deck_id')
    .eq('deck_id', deckId)
    .order('number', { ascending: true })

  if (error) {
    console.error('getCardsByDeckId failed', deckId, error.message, error)
  }
  if (data && data.length > 0) {
    return (data as CardRow[]).map(rowToTarotCard)
  }

  const localRows = await listLocalCardsByDeckId(deckId)
  const out: TarotCard[] = []
  for (const row of localRows) {
    out.push(await localRowToTarotCard(row))
  }
  return out
}

export async function getCardsByIds(ids: string[]): Promise<Map<string, TarotCard>> {
  const unique = [...new Set(ids)].filter(Boolean)
  const map = new Map<string, TarotCard>()
  if (unique.length === 0) return map

  const { data, error } = await supabase
    .from('card')
    .select('id, title, number, image, censor_image, deck_id')
    .in('id', unique)

  if (error) {
    console.error('getCardsByIds failed', error.message, error)
  }
  const found = new Set<string>()
  if (data) {
    for (const row of data as CardRow[]) {
      const card = rowToTarotCard(row)
      map.set(card.id, card)
      found.add(card.id)
    }
  }

  const missing = unique.filter((id) => !found.has(id))
  if (missing.length === 0) return map

  const localMap = await getLocalCardsByIds(missing)
  for (const row of localMap.values()) {
    const card = await localRowToTarotCard(row)
    map.set(card.id, card)
  }
  return map
}
