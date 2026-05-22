/// <reference lib="webworker" />

import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import {
  DECK_DOWNLOAD_SYNC_TAG,
  processPendingDeckDownloads,
} from './lib/processPendingDeckDownloads.js';
import type { SupabaseRestConfig } from './lib/supabaseRest.js';

declare let self: ServiceWorkerGlobalScope;
declare const __WB_MANIFEST: Array<{ url: string; revision: string | null }>;

interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

const wbManifest = self.__WB_MANIFEST;

precacheAndRoute(wbManifest);
cleanupOutdatedCaches();

if (wbManifest.length > 0) {
  const navigationHandler = createHandlerBoundToURL('/index.html');
  const navigationRoute = new NavigationRoute(navigationHandler, {
    denylist: [/^\/auth\//],
  });
  registerRoute(navigationRoute);
} else {
  registerRoute(
    ({ request, url }) => request.mode === 'navigate' && !url.pathname.startsWith('/auth/'),
    new NetworkFirst({ cacheName: 'pages' }),
  );
}

function getSwSupabaseRestConfig(): SupabaseRestConfig {
  return {
    url: import.meta.env.VITE_SUPABASE_URL as string,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  };
}

/**
 * PostgREST traffic to loopback Supabase must not be handled by Workbox: service-worker
 * `fetch` to another loopback port often fails with `TypeError: Failed to fetch` in Chrome
 * while the same URL works from the window (e.g. `http://127.0.0.1:8001` app →
 * `http://127.0.0.1:54321` API). Hosted Supabase URLs still use NetworkFirst for offline
 * catalog hints.
 */
function isLoopbackSupabaseUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
  } catch {
    return false;
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
if (supabaseUrl && !isLoopbackSupabaseUrl(supabaseUrl)) {
  registerRoute(
    ({ url }) =>
      url.href.startsWith(`${supabaseUrl}/rest/v1/deck`) ||
      url.href.startsWith(`${supabaseUrl}/rest/v1/card`),
    new NetworkFirst({
      cacheName: 'supabase-catalog',
      networkTimeoutSeconds: 10,
      fetchOptions: {
        credentials: 'omit',
      },
      plugins: [
        new ExpirationPlugin({
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24,
        }),
      ],
    }),
  );
}

async function runPendingDeckDownloads(): Promise<void> {
  await processPendingDeckDownloads(getSwSupabaseRestConfig(), { notifyClients: true });
}

self.addEventListener('sync', ((event: Event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === DECK_DOWNLOAD_SYNC_TAG) {
    syncEvent.waitUntil(runPendingDeckDownloads());
  }
}) as EventListener);

self.addEventListener('online', () => {
  void runPendingDeckDownloads();
});
