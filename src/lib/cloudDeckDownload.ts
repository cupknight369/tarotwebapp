import {
  executeCloudDeckDownload,
  isRetryableCoreFailure,
  type CoreDownloadFailure,
} from './cloudDeckDownloadCore.js';
import { enqueuePendingDeckDownload, registerDeckDownloadSync } from './pendingDeckDownloads.js';
import { err, ok, type Result } from './result.js';
import type { QueryFailure } from './supabaseErrors.js';
import { queryFailureMessage } from './supabaseErrors.js';
import { getBrowserSupabaseRestConfig } from './supabaseRest.js';

/** Expected failures when downloading a catalog deck to the device. */
export type DownloadDeckFailure =
  | { kind: 'query'; failure: QueryFailure }
  | { kind: 'network'; message: string }
  | { kind: 'empty'; message: string }
  | { kind: 'io'; message: string }
  | { kind: 'queued'; message: string };

const QUEUED_MESSAGE = 'Download queued. It will finish when you are back online.';

/**
 * User-visible message for a download failure.
 *
 * @param f - Structured download failure.
 */
export function downloadFailureMessage(f: DownloadDeckFailure): string {
  switch (f.kind) {
    case 'query':
      return queryFailureMessage(f.failure);
    case 'network':
    case 'empty':
    case 'io':
    case 'queued':
      return f.message;
  }
}

function mapCoreFailureToDownloadFailure(failure: CoreDownloadFailure): DownloadDeckFailure {
  switch (failure.kind) {
    case 'already_installed':
      return { kind: 'empty', message: 'Deck is already on this device.' };
    case 'network':
      return { kind: 'network', message: failure.message };
    case 'empty':
      return { kind: 'empty', message: failure.message };
    case 'io':
      return { kind: 'io', message: failure.message };
    case 'query':
      return {
        kind: 'query',
        failure: {
          kind: failure.retryable ? 'unknown' : 'unknown',
          operation: 'downloadCloudDeckToDevice',
          message: failure.message,
        },
      };
  }
}

/**
 * Copies a cloud deck into IndexedDB (cards and images).
 *
 * @param deckId - Catalog deck id.
 * @returns Ok on success, or Err with a structured failure.
 */
export async function downloadCloudDeckToDevice(
  deckId: string,
): Promise<Result<void, DownloadDeckFailure>> {
  const config = getBrowserSupabaseRestConfig();
  const result = await executeCloudDeckDownload(deckId, config);
  if (result.ok) return ok(undefined);
  if (result.error.kind === 'already_installed') return ok(undefined);

  if (isRetryableCoreFailure(result.error)) {
    await enqueuePendingDeckDownload(deckId);
    await registerDeckDownloadSync();
    return err({ kind: 'queued', message: QUEUED_MESSAGE });
  }

  return err(mapCoreFailureToDownloadFailure(result.error));
}
