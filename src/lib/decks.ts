import { supabase } from './supabase.js'
import { publicCardImageUrl } from './cardImageUrls.js'
import type { TarotCard } from '../types/canvas.js'
import type { DeckRow, CardRow } from '../types/decks.js'

export const LAST_DECK_STORAGE_KEY = 'last_deck_id'

/** Seeded default deck id (matches migration). */
export const DEFAULT_DECK_ID = 'a0000000-0000-4000-8000-000000000001'

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

export async function listDecks(): Promise<DeckRow[]> {
  const { data, error } = await supabase
    .from('deck')
    .select('id, title, description, created_at, modified_at')
    .order('title', { ascending: true })

  if (error || !data) return []
  return data as DeckRow[]
}

export async function getCardsByDeckId(deckId: string): Promise<TarotCard[]> {
  const { data, error } = await supabase
    .from('card')
    .select('id, title, number, image, censor_image, deck_id')
    .eq('deck_id', deckId)
    .order('number', { ascending: true })

  if (error || !data) return []
  return (data as CardRow[]).map(rowToTarotCard)
}

export async function getCardsByIds(ids: string[]): Promise<Map<string, TarotCard>> {
  const unique = [...new Set(ids)].filter(Boolean)
  const map = new Map<string, TarotCard>()
  if (unique.length === 0) return map

  const { data, error } = await supabase
    .from('card')
    .select('id, title, number, image, censor_image, deck_id')
    .in('id', unique)

  if (error || !data) return map
  for (const row of data as CardRow[]) {
    const card = rowToTarotCard(row)
    map.set(card.id, card)
  }
  return map
}
