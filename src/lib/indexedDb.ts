const DB_NAME = 'tarot'
/** v3: `readings.state` is protobuf bytes (prior versions stored structured objects). */
const DB_VERSION = 3

export const STORE_READINGS = 'readings'
export const STORE_DECKS = 'decks'
export const STORE_CARDS = 'cards'
export const STORE_CARD_IMAGES = 'cardImages'

let dbPromise: Promise<IDBDatabase> | null = null

export function openTarotDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error ?? new Error('indexedDB.open failed'))
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = (ev) => {
      const db = req.result
      const old = ev.oldVersion
      if (old < 1) {
        if (!db.objectStoreNames.contains(STORE_READINGS)) {
          const readings = db.createObjectStore(STORE_READINGS, { keyPath: 'id' })
          readings.createIndex('by_updated_at', 'updated_at')
        }
        if (!db.objectStoreNames.contains(STORE_DECKS)) {
          db.createObjectStore(STORE_DECKS, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_CARD_IMAGES)) {
          db.createObjectStore(STORE_CARD_IMAGES, { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains(STORE_CARDS)) {
          const cards = db.createObjectStore(STORE_CARDS, { keyPath: 'id' })
          cards.createIndex('by_deck_id', 'deck_id')
        }
      }
      if (old < 3 && old >= 1) {
        if (db.objectStoreNames.contains(STORE_READINGS)) {
          db.deleteObjectStore(STORE_READINGS)
        }
        const readings = db.createObjectStore(STORE_READINGS, { keyPath: 'id' })
        readings.createIndex('by_updated_at', 'updated_at')
      }
    }
  })
  return dbPromise
}

export function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onerror = () => reject(req.error ?? new Error('IDBRequest failed'))
    req.onsuccess = () => resolve(req.result as T)
  })
}
