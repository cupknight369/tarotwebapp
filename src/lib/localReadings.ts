import type { SavedReadingState, ReadingSummary } from '../types/readingState.js'
import type { LocalReadingRow } from '../types/localDb.js'
import {
  openTarotDb,
  STORE_READINGS,
  idbRequest,
} from './indexedDb.js'

export async function listLocalReadings(): Promise<ReadingSummary[]> {
  const db = await openTarotDb()
  const tx = db.transaction(STORE_READINGS, 'readonly')
  const store = tx.objectStore(STORE_READINGS)
  const rows = await idbRequest(store.getAll()) as LocalReadingRow[]
  return rows
    .map((r) => ({ id: r.id, name: r.name, updated_at: r.updated_at }))
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
}

export async function loadLocalReading(
  id: string
): Promise<{ state: SavedReadingState; name: string } | null> {
  const db = await openTarotDb()
  const tx = db.transaction(STORE_READINGS, 'readonly')
  const row = (await idbRequest(
    tx.objectStore(STORE_READINGS).get(id)
  )) as LocalReadingRow | undefined
  if (!row) return null
  return { state: row.state, name: row.name ?? 'Untitled Reading' }
}

export async function saveLocalReading(
  state: SavedReadingState,
  name?: string,
  readingId?: string
): Promise<{ id: string } | { error: string }> {
  try {
    const db = await openTarotDb()
    const now = new Date().toISOString()
    const id = readingId ?? crypto.randomUUID()
    const row: LocalReadingRow = {
      id,
      name: name ?? 'Untitled Reading',
      state,
      updated_at: now,
    }
    const tx = db.transaction(STORE_READINGS, 'readwrite')
    await idbRequest(tx.objectStore(STORE_READINGS).put(row))
    return { id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save locally' }
  }
}

export async function deleteLocalReading(id: string): Promise<{ error?: string }> {
  const db = await openTarotDb()
  const tx = db.transaction(STORE_READINGS, 'readwrite')
  await idbRequest(tx.objectStore(STORE_READINGS).delete(id))
  return {}
}
