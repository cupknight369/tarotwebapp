import { idbRequest, openTarotDb, STORE_PENDING_DECK_DOWNLOADS } from './indexedDb.js';

/** Background Sync tag for pending cloud deck downloads. */
export const DECK_DOWNLOAD_SYNC_TAG = 'deck-download';

/** Max automatic retry attempts before dropping a queued download. */
export const MAX_DOWNLOAD_ATTEMPTS = 5;

/** Row in IndexedDB `pendingDeckDownloads` store. */
export interface PendingDeckDownloadRow {
  deckId: string;
  enqueuedAt: string;
  attempts: number;
  lastError?: string;
}

/**
 * @param deckId - Catalog deck id to queue.
 */
export async function enqueuePendingDeckDownload(deckId: string): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_PENDING_DECK_DOWNLOADS, 'readwrite');
  const row: PendingDeckDownloadRow = {
    deckId,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
  };
  await idbRequest(tx.objectStore(STORE_PENDING_DECK_DOWNLOADS).put(row));
}

/**
 * @param deckId - Catalog deck id to remove from the queue.
 */
export async function dequeuePendingDeckDownload(deckId: string): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_PENDING_DECK_DOWNLOADS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_PENDING_DECK_DOWNLOADS).delete(deckId));
}

/**
 * @returns All pending cloud deck download rows.
 */
export async function listPendingDeckDownloads(): Promise<PendingDeckDownloadRow[]> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_PENDING_DECK_DOWNLOADS, 'readonly');
  return (await idbRequest(
    tx.objectStore(STORE_PENDING_DECK_DOWNLOADS).getAll(),
  )) as PendingDeckDownloadRow[];
}

/**
 * @param deckId - Catalog deck id.
 * @param lastError - Optional error message from the latest attempt.
 */
export async function incrementPendingDeckDownloadAttempt(
  deckId: string,
  lastError: string,
): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_PENDING_DECK_DOWNLOADS, 'readwrite');
  const store = tx.objectStore(STORE_PENDING_DECK_DOWNLOADS);
  const existing = (await idbRequest(store.get(deckId))) as PendingDeckDownloadRow | undefined;
  if (!existing) return;
  const updated: PendingDeckDownloadRow = {
    ...existing,
    attempts: existing.attempts + 1,
    lastError,
  };
  await idbRequest(store.put(updated));
}

/** Background Sync manager when supported by the browser. */
interface SyncManager {
  register(tag: string): Promise<void>;
}

/**
 * Registers a Background Sync event when supported (no-op otherwise).
 */
export async function registerDeckDownloadSync(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const syncManager = (registration as ServiceWorkerRegistration & { sync?: SyncManager }).sync;
    if (syncManager) {
      await syncManager.register(DECK_DOWNLOAD_SYNC_TAG);
    }
  } catch {
    /* Background Sync may be unavailable or blocked */
  }
}
