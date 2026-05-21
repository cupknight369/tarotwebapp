import { executeCloudDeckDownload, isRetryableCoreFailure } from './cloudDeckDownloadCore.js';
import {
  DECK_DOWNLOAD_SYNC_TAG,
  dequeuePendingDeckDownload,
  incrementPendingDeckDownloadAttempt,
  listPendingDeckDownloads,
  MAX_DOWNLOAD_ATTEMPTS,
} from './pendingDeckDownloads.js';
import type { SupabaseRestConfig } from './supabaseRest.js';

/** Message posted to clients when a queued deck download completes. */
export interface DeckDownloadCompleteMessage {
  type: 'deck-download-complete';
  deckId: string;
}

/** Message posted to clients when a queued deck download is dropped. */
export interface DeckDownloadFailedMessage {
  type: 'deck-download-failed';
  deckId: string;
  message: string;
}

export type DeckDownloadClientMessage = DeckDownloadCompleteMessage | DeckDownloadFailedMessage;

/** Options for {@link processPendingDeckDownloads}. */
export interface ProcessPendingDeckDownloadsOptions {
  /** When true, notify open window clients via `postMessage`. */
  notifyClients?: boolean;
}

async function notifyWindowClients(message: DeckDownloadClientMessage): Promise<void> {
  if (typeof self === 'undefined' || !('clients' in self)) return;
  const sw = self as unknown as ServiceWorkerGlobalScope;
  const windowClients = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
  for (const client of windowClients) {
    client.postMessage(message);
  }
}

function dispatchBrowserEvent(message: DeckDownloadClientMessage): void {
  if (typeof window === 'undefined') return;
  if (message.type === 'deck-download-complete') {
    window.dispatchEvent(
      new CustomEvent('deck-download-complete', { detail: { deckId: message.deckId } }),
    );
  }
}

/**
 * Processes all pending cloud deck downloads (shared by service worker and main-thread fallback).
 *
 * @param config - Supabase REST credentials.
 * @param options - Notification options.
 */
export async function processPendingDeckDownloads(
  config: SupabaseRestConfig,
  options: ProcessPendingDeckDownloadsOptions = {},
): Promise<void> {
  if (!config.url || !config.anonKey) return;

  const pending = await listPendingDeckDownloads();
  for (const row of pending) {
    const result = await executeCloudDeckDownload(row.deckId, config);
    if (result.ok || result.error.kind === 'already_installed') {
      await dequeuePendingDeckDownload(row.deckId);
      const message: DeckDownloadCompleteMessage = {
        type: 'deck-download-complete',
        deckId: row.deckId,
      };
      if (options.notifyClients) {
        await notifyWindowClients(message);
      } else {
        dispatchBrowserEvent(message);
      }
      continue;
    }

    const failure = result.error;
    if (isRetryableCoreFailure(failure)) {
      const nextAttempts = row.attempts + 1;
      const errorMessage =
        failure.kind === 'network' || failure.kind === 'query'
          ? failure.message
          : 'Download failed.';
      if (nextAttempts >= MAX_DOWNLOAD_ATTEMPTS) {
        await dequeuePendingDeckDownload(row.deckId);
        const message: DeckDownloadFailedMessage = {
          type: 'deck-download-failed',
          deckId: row.deckId,
          message: errorMessage,
        };
        if (options.notifyClients) {
          await notifyWindowClients(message);
        }
      } else {
        await incrementPendingDeckDownloadAttempt(row.deckId, errorMessage);
      }
      continue;
    }

    const permanentMessage =
      failure.kind === 'empty' || failure.kind === 'io' || failure.kind === 'query'
        ? failure.message
        : 'Download failed.';
    await dequeuePendingDeckDownload(row.deckId);
    const message: DeckDownloadFailedMessage = {
      type: 'deck-download-failed',
      deckId: row.deckId,
      message: permanentMessage,
    };
    if (options.notifyClients) {
      await notifyWindowClients(message);
    }
  }
}

export { DECK_DOWNLOAD_SYNC_TAG };
