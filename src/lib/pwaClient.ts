import type { RegisterSWOptions } from 'vite-plugin-pwa/types';
import { logDebug } from './logError.js';
import { processPendingDeckDownloads } from './processPendingDeckDownloads.js';
import { getBrowserSupabaseRestConfig } from './supabaseRest.js';

type RegisterSW = (options?: RegisterSWOptions) => (reloadPage?: boolean) => Promise<void>;

let drainScheduled = false;

async function drainPendingDeckDownloads(): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    await processPendingDeckDownloads(getBrowserSupabaseRestConfig());
  } catch (e) {
    logDebug('drainPendingDeckDownloads', e);
  }
}

function scheduleDrainPendingDeckDownloads(): void {
  if (drainScheduled) return;
  drainScheduled = true;
  void drainPendingDeckDownloads().finally(() => {
    drainScheduled = false;
  });
}

async function registerAppServiceWorker(registerSW: RegisterSW): Promise<void> {
  registerSW({
    immediate: true,
    onRegisterError(error) {
      logDebug('registerSW.onRegisterError', error);
    },
  });

  const swUrl = import.meta.env.DEV ? '/dev-sw.js?dev-sw' : '/sw.js';
  try {
    await navigator.serviceWorker.register(swUrl, { scope: '/', type: 'module' });
  } catch (e) {
    logDebug('registerAppServiceWorker', e);
  }
}

/**
 * Registers the service worker and wires PWA client handlers for deck download sync.
 *
 * @param registerSW - Virtual module from `vite-plugin-pwa`.
 */
export function initPwaClient(registerSW: RegisterSW): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  void registerAppServiceWorker(registerSW);

  navigator.serviceWorker.addEventListener('message', (event: MessageEvent) => {
    const data = event.data as { type?: string; deckId?: string; message?: string } | null;
    if (!data || typeof data.type !== 'string') return;
    if (data.type === 'deck-download-complete' && typeof data.deckId === 'string') {
      window.dispatchEvent(
        new CustomEvent('deck-download-complete', { detail: { deckId: data.deckId } }),
      );
      return;
    }
    if (
      data.type === 'deck-download-failed' &&
      typeof data.deckId === 'string' &&
      typeof data.message === 'string'
    ) {
      window.dispatchEvent(
        new CustomEvent('deck-download-failed', {
          detail: { deckId: data.deckId, message: data.message },
        }),
      );
    }
  });

  window.addEventListener('online', () => {
    scheduleDrainPendingDeckDownloads();
  });

  scheduleDrainPendingDeckDownloads();
}
