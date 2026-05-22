import { DEFAULT_CORRESPONDENCE_GROUP_ID, DEFAULT_READING_GROUP_ID } from '../types/localDb.js';
import type { LocalReadingRow } from '../types/localDb.js';

const DB_NAME = 'tarot';
/** v7: repair migration when `readingGroups` store is missing at v6. */
const DB_VERSION = 7;

/** IndexedDB object store for saved readings (protobuf state). */
export const STORE_READINGS = 'readings';
/** IndexedDB object store for reading group rows. */
export const STORE_READING_GROUPS = 'readingGroups';
/** IndexedDB object store for on-device deck metadata. */
export const STORE_DECKS = 'decks';
/** IndexedDB object store for on-device card rows. */
export const STORE_CARDS = 'cards';
/** IndexedDB object store for image blobs referenced by local cards. */
export const STORE_CARD_IMAGES = 'cardImages';
/** IndexedDB object store for correspondence group rows. */
export const STORE_CORRESPONDENCE_GROUPS = 'correspondenceGroups';
/** IndexedDB object store for correspondence rows. */
export const STORE_CORRESPONDENCES = 'correspondences';
/** IndexedDB object store for correspondence thumbnail blobs. */
export const STORE_CORRESPONDENCE_IMAGES = 'correspondenceImages';
/** IndexedDB object store for cloud deck downloads waiting on connectivity. */
export const STORE_PENDING_DECK_DOWNLOADS = 'pendingDeckDownloads';

let dbPromise: Promise<IDBDatabase> | null = null;

function backfillReadingGroupIds(readingsStore: IDBObjectStore): void {
  if (typeof readingsStore.openCursor !== 'function') return;
  const cursorReq = readingsStore.openCursor();
  cursorReq.onsuccess = () => {
    const cursor = cursorReq.result;
    if (!cursor) return;
    const row = cursor.value as LocalReadingRow;
    if (!row.group_id) {
      const updateReq = cursor.update({ ...row, group_id: DEFAULT_READING_GROUP_ID });
      updateReq.onsuccess = () => cursor.continue();
    } else {
      cursor.continue();
    }
  };
}

/**
 * Creates the reading groups store (if needed), seeds Default, and backfills reading rows.
 *
 * @param db - Database being upgraded.
 * @param upgradeTx - Active upgrade transaction, when available.
 */
function migrateReadingGroups(db: IDBDatabase, upgradeTx: IDBTransaction | null): void {
  if (!db.objectStoreNames.contains(STORE_READING_GROUPS)) {
    db.createObjectStore(STORE_READING_GROUPS, { keyPath: 'id' });
  }
  if (!upgradeTx) return;
  const gStore = upgradeTx.objectStore(STORE_READING_GROUPS);
  gStore.put({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
  const readingsStore = upgradeTx.objectStore(STORE_READINGS);
  if (readingsStore.indexNames && !readingsStore.indexNames.contains('by_group_id')) {
    readingsStore.createIndex('by_group_id', 'group_id');
  }
  backfillReadingGroupIds(readingsStore);
}

/**
 * Opens the database at a specific version and runs schema upgrades.
 *
 * @param version - Target IndexedDB version.
 * @returns Promise resolving to the opened database.
 */
function openTarotDbAtVersion(version: number): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, version);
    req.onerror = () => reject(req.error ?? new Error('indexedDB.open failed'));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (ev) => {
      const db = req.result;
      const old = ev.oldVersion;
      if (old < 1) {
        if (!db.objectStoreNames.contains(STORE_READINGS)) {
          const readings = db.createObjectStore(STORE_READINGS, { keyPath: 'id' });
          readings.createIndex('by_updated_at', 'updated_at');
        }
        if (!db.objectStoreNames.contains(STORE_DECKS)) {
          db.createObjectStore(STORE_DECKS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CARD_IMAGES)) {
          db.createObjectStore(STORE_CARD_IMAGES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CARDS)) {
          const cards = db.createObjectStore(STORE_CARDS, { keyPath: 'id' });
          cards.createIndex('by_deck_id', 'deck_id');
        }
      }
      if (old < 3 && old >= 1) {
        if (db.objectStoreNames.contains(STORE_READINGS)) {
          db.deleteObjectStore(STORE_READINGS);
        }
        const readings = db.createObjectStore(STORE_READINGS, { keyPath: 'id' });
        readings.createIndex('by_updated_at', 'updated_at');
      }
      if (old < 4) {
        if (!db.objectStoreNames.contains(STORE_CORRESPONDENCE_GROUPS)) {
          db.createObjectStore(STORE_CORRESPONDENCE_GROUPS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CORRESPONDENCES)) {
          const corr = db.createObjectStore(STORE_CORRESPONDENCES, { keyPath: 'id' });
          corr.createIndex('by_group_id', 'group_id');
        }
        if (!db.objectStoreNames.contains(STORE_CORRESPONDENCE_IMAGES)) {
          db.createObjectStore(STORE_CORRESPONDENCE_IMAGES, { keyPath: 'id' });
        }
        const upgradeTx = req.transaction;
        if (upgradeTx) {
          const gStore = upgradeTx.objectStore(STORE_CORRESPONDENCE_GROUPS);
          gStore.put({ id: DEFAULT_CORRESPONDENCE_GROUP_ID, title: 'Default' });
        }
      }
      if (old < 5) {
        if (!db.objectStoreNames.contains(STORE_PENDING_DECK_DOWNLOADS)) {
          db.createObjectStore(STORE_PENDING_DECK_DOWNLOADS, { keyPath: 'deckId' });
        }
      }
      if (old < 6) {
        migrateReadingGroups(db, req.transaction);
      }
      if (old < 7) {
        migrateReadingGroups(db, req.transaction);
      }
    };
  });
}

/**
 * Re-opens the database when a cached connection lacks the reading groups store.
 *
 * @param db - Opened database connection.
 * @param allowRetry - When false, missing store throws instead of retrying.
 * @returns A connection that includes {@link STORE_READING_GROUPS}.
 */
async function ensureReadingGroupsStorePresent(
  db: IDBDatabase,
  allowRetry = true,
): Promise<IDBDatabase> {
  if (db.objectStoreNames.contains(STORE_READING_GROUPS)) {
    return db;
  }
  if (!allowRetry) {
    throw new Error('readingGroups object store missing after IndexedDB repair');
  }
  db.close();
  dbPromise = openTarotDbAtVersion(Math.max(db.version + 1, DB_VERSION));
  const repaired = await dbPromise;
  return ensureReadingGroupsStorePresent(repaired, false);
}

/**
 * Opens (and upgrades when needed) the single tarot IndexedDB database.
 *
 * @returns A shared promise resolving to the database connection.
 */
export function openTarotDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openTarotDbAtVersion(DB_VERSION).then((db) => ensureReadingGroupsStorePresent(db));
  }
  return dbPromise;
}

/**
 * Wraps an `IDBRequest` in a Promise (success → resolve, error → reject).
 *
 * @param req - Pending IndexedDB request.
 * @returns Promise of the request result.
 */
export function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onerror = () => reject(req.error ?? new Error('IDBRequest failed'));
    req.onsuccess = () => resolve(req.result);
  });
}
