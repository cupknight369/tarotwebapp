import { DEFAULT_CORRESPONDENCE_GROUP_ID, DEFAULT_READING_GROUP_ID } from '../types/localDb.js';
import type { LocalReadingMetaRow, LocalReadingRow } from '../types/localDb.js';

const DB_NAME = 'tarot';
/** v11: repair path may bump past v10; upgrades always ensure required stores exist. */
const DB_VERSION = 11;

/** IndexedDB object store for saved reading metadata (no protobuf state). */
export const STORE_READINGS = 'readings';
/** IndexedDB object store for saved reading protobuf state blobs. */
export const STORE_READING_STATES = 'readingStates';
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
    const row = cursor.value as LocalReadingMetaRow & { group_id?: string };
    if (!row.group_id) {
      const updateReq = cursor.update({
        id: row.id,
        name: row.name,
        updated_at: row.updated_at,
        group_id: DEFAULT_READING_GROUP_ID,
      });
      updateReq.onsuccess = () => cursor.continue();
    } else {
      cursor.continue();
    }
  };
}

/** Creates the reading groups object store when it is missing. */
function ensureReadingGroupsStore(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(STORE_READING_GROUPS)) {
    db.createObjectStore(STORE_READING_GROUPS, { keyPath: 'id' });
  }
}

/** Creates the reading states object store when it is missing. */
function ensureReadingStatesStore(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(STORE_READING_STATES)) {
    db.createObjectStore(STORE_READING_STATES, { keyPath: 'id' });
  }
}

/**
 * Seeds Default group, adds `by_group_id` index, and backfills reading rows (v6–v7).
 *
 * @param upgradeTx - Active upgrade transaction, when available.
 */
function migrateReadingGroupsData(upgradeTx: IDBTransaction | null): void {
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
 * Moves inline `state` from `readings` rows into `readingStates` (v8+).
 *
 * @param db - Database being upgraded.
 * @param upgradeTx - Active upgrade transaction, when available.
 */
function migrateReadingStatesSplitData(
  db: IDBDatabase,
  upgradeTx: IDBTransaction | null,
): void {
  if (
    !upgradeTx ||
    !db.objectStoreNames.contains(STORE_READINGS) ||
    !db.objectStoreNames.contains(STORE_READING_STATES)
  ) {
    return;
  }
  const readingsStore = upgradeTx.objectStore(STORE_READINGS);
  const statesStore = upgradeTx.objectStore(STORE_READING_STATES);
  if (typeof readingsStore.openCursor !== 'function') return;
  const cursorReq = readingsStore.openCursor();
  cursorReq.onsuccess = () => {
    const cursor = cursorReq.result;
    if (!cursor) return;
    const row = cursor.value as LocalReadingRow;
    if (row.state !== undefined && row.state !== null) {
      const bytes =
        row.state instanceof Uint8Array ? row.state : new Uint8Array(row.state as ArrayBuffer);
      const meta: LocalReadingMetaRow = {
        id: row.id,
        name: row.name,
        updated_at: row.updated_at,
        group_id: row.group_id ?? DEFAULT_READING_GROUP_ID,
      };
      const putReq = statesStore.put({ id: row.id, state: bytes });
      putReq.onsuccess = () => {
        const updateReq = cursor.update(meta);
        updateReq.onsuccess = () => cursor.continue();
        updateReq.onerror = () => cursor.continue();
      };
      putReq.onerror = () => cursor.continue();
      return;
    }
    cursor.continue();
  };
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
    req.onerror = () => {
      const err = req.error;
      if (err?.name === 'VersionError') {
        const fallback = indexedDB.open(DB_NAME);
        fallback.onerror = () =>
          reject(fallback.error ?? new Error('indexedDB.open failed after VersionError'));
        fallback.onsuccess = () => resolve(fallback.result);
        return;
      }
      reject(err ?? new Error('indexedDB.open failed'));
    };
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = (ev) => {
      runTarotDbUpgrade(req.result, ev.oldVersion, req.transaction);
    };
  });
}

/**
 * Applies schema upgrades for `tarot` IndexedDB.
 *
 * @param db - Database being upgraded.
 * @param old - Previous version before this upgrade.
 * @param upgradeTx - Active upgrade transaction, when available.
 */
function runTarotDbUpgrade(
  db: IDBDatabase,
  old: number,
  upgradeTx: IDBTransaction | null,
): void {
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
      ensureReadingGroupsStore(db);
      ensureReadingStatesStore(db);
      if (old < 7) {
        migrateReadingGroupsData(upgradeTx);
      }
      if (old < 11) {
        migrateReadingStatesSplitData(db, upgradeTx);
      }
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
  dbPromise = null;
  dbPromise = openTarotDbAtVersion(Math.max(db.version + 1, DB_VERSION))
    .then((repaired) => ensureReadingGroupsStorePresent(repaired, false));
  return dbPromise;
}

async function ensureReadingStatesStorePresent(
  db: IDBDatabase,
  allowRetry = true,
): Promise<IDBDatabase> {
  if (db.objectStoreNames.contains(STORE_READING_STATES)) {
    return db;
  }
  if (!allowRetry) {
    throw new Error('readingStates object store missing after IndexedDB repair');
  }
  db.close();
  dbPromise = null;
  dbPromise = openTarotDbAtVersion(Math.max(db.version + 1, DB_VERSION))
    .then((repaired) => ensureReadingStatesStorePresent(repaired, false));
  return dbPromise;
}

/**
 * Opens (and upgrades when needed) the single tarot IndexedDB database.
 *
 * @returns A shared promise resolving to the database connection.
 */
export function openTarotDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openTarotDbAtVersion(DB_VERSION)
      .then((db) => ensureReadingGroupsStorePresent(db))
      .then((db) => ensureReadingStatesStorePresent(db));
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
