import { executeCloudDeckDownload, isRetryableCoreFailure } from './cloudDeckDownloadCore.js';
import { DEFAULT_DECK_ID } from './decks.js';
import { logDebug } from './logError.js';
import { listLocalDecks } from './localDecks.js';
import {
  enqueuePendingDeckDownload,
  registerDeckDownloadSync,
} from './pendingDeckDownloads.js';
import { getBrowserSupabaseRestConfig } from './supabaseRest.js';

function notifyDefaultDeckInstalled(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('decks-changed'));
  window.dispatchEvent(
    new CustomEvent('deck-download-complete', { detail: { deckId: DEFAULT_DECK_ID } }),
  );
}

/**
 * Copies the seeded Rider-Waite-Smith catalog deck into IndexedDB when it is not already installed.
 * Uses the same download pipeline as manual cloud installs so local and catalog lists stay in sync.
 */
export async function ensureDefaultDeckOnDevice(): Promise<void> {
  const config = getBrowserSupabaseRestConfig();
  if (!config.url || !config.anonKey) return;

  const existing = await listLocalDecks();
  if (existing.some((d) => d.id === DEFAULT_DECK_ID)) return;

  const result = await executeCloudDeckDownload(DEFAULT_DECK_ID, config);
  if (result.ok || result.error.kind === 'already_installed') {
    notifyDefaultDeckInstalled();
    return;
  }

  if (isRetryableCoreFailure(result.error)) {
    await enqueuePendingDeckDownload(DEFAULT_DECK_ID);
    await registerDeckDownloadSync();
    return;
  }

  logDebug('ensureDefaultDeckOnDevice', result.error);
}
