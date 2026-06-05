/**
 * @vitest-environment node
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const workboxMocks = vi.hoisted(() => ({
  precacheAndRoute: vi.fn(),
  cleanupOutdatedCaches: vi.fn(),
  createHandlerBoundToURL: vi.fn(() => 'navigation-handler'),
  registerRoute: vi.fn(),
  NavigationRoute: vi.fn(function NavigationRoute(
    this: { handler: unknown; options: unknown },
    handler: unknown,
    options: unknown,
  ) {
    this.handler = handler;
    this.options = options;
  }),
  NetworkFirst: vi.fn(function NetworkFirst(this: { options: unknown }, options: unknown) {
    this.options = options;
  }),
  ExpirationPlugin: vi.fn(function ExpirationPlugin(this: { options: unknown }, options: unknown) {
    this.options = options;
  }),
}));

const processMocks = vi.hoisted(() => ({
  processPendingDeckDownloads: vi.fn(() => Promise.resolve()),
  DECK_DOWNLOAD_SYNC_TAG: 'deck-download',
}));

vi.mock('workbox-precaching', () => ({
  precacheAndRoute: workboxMocks.precacheAndRoute,
  cleanupOutdatedCaches: workboxMocks.cleanupOutdatedCaches,
  createHandlerBoundToURL: workboxMocks.createHandlerBoundToURL,
}));

vi.mock('workbox-routing', () => ({
  registerRoute: workboxMocks.registerRoute,
  NavigationRoute: workboxMocks.NavigationRoute,
}));

vi.mock('workbox-strategies', () => ({
  NetworkFirst: workboxMocks.NetworkFirst,
}));

vi.mock('workbox-expiration', () => ({
  ExpirationPlugin: workboxMocks.ExpirationPlugin,
}));

vi.mock('../lib/processPendingDeckDownloads.js', () => ({
  processPendingDeckDownloads: processMocks.processPendingDeckDownloads,
  DECK_DOWNLOAD_SYNC_TAG: processMocks.DECK_DOWNLOAD_SYNC_TAG,
}));

interface SwListeners {
  sync: Set<EventListener>;
  online: Set<EventListener>;
}

interface LoadSwOptions {
  manifest?: Array<{ url: string; revision: string | null }>;
}

async function loadSw(options: LoadSwOptions = {}): Promise<SwListeners> {
  const manifest = options.manifest ?? [{ url: '/index.html', revision: 'abc123' }];
  const listeners: SwListeners = {
    sync: new Set(),
    online: new Set(),
  };

  vi.stubGlobal('self', {
    __WB_MANIFEST: manifest,
    addEventListener(type: string, listener: EventListener) {
      if (type === 'sync') listeners.sync.add(listener);
      if (type === 'online') listeners.online.add(listener);
    },
  });

  await import('../sw.js');
  return listeners;
}

type RouteMatcher = (ctx: {
  request: { mode: string };
  url: URL;
}) => boolean;

function getFunctionRouteMatcher(cacheName: string): RouteMatcher {
  for (const call of workboxMocks.registerRoute.mock.calls) {
    const [matcher, strategy] = call as [RouteMatcher | unknown, { options?: { cacheName?: string } }];
    if (typeof matcher === 'function' && strategy?.options?.cacheName === cacheName) {
      return matcher;
    }
  }
  throw new Error(`No registerRoute matcher found for cache "${cacheName}"`);
}

function getSupabaseRouteMatcher(): RouteMatcher {
  for (const call of workboxMocks.registerRoute.mock.calls) {
    const [matcher, strategy] = call as [RouteMatcher | unknown, { options?: { cacheName?: string } }];
    if (typeof matcher === 'function' && strategy?.options?.cacheName === 'supabase-catalog') {
      return matcher;
    }
  }
  throw new Error('No supabase-catalog registerRoute matcher found');
}

function hasSupabaseCatalogRoute(): boolean {
  return workboxMocks.registerRoute.mock.calls.some((call) => {
    const [, strategy] = call as [unknown, { options?: { cacheName?: string } }];
    return strategy?.options?.cacheName === 'supabase-catalog';
  });
}

describe('sw.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'vitest-anon-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('Workbox bootstrap', () => {
    it('precaches manifest entries and cleans outdated caches', async () => {
      const manifest = [
        { url: '/index.html', revision: 'rev-1' },
        { url: '/assets/app.js', revision: null },
      ];
      await loadSw({ manifest });

      expect(workboxMocks.precacheAndRoute).toHaveBeenCalledWith(manifest);
      expect(workboxMocks.cleanupOutdatedCaches).toHaveBeenCalledTimes(1);
    });

    it('registers a NavigationRoute when the precache manifest is non-empty', async () => {
      await loadSw({ manifest: [{ url: '/index.html', revision: null }] });

      expect(workboxMocks.createHandlerBoundToURL).toHaveBeenCalledWith('/index.html');
      expect(workboxMocks.NavigationRoute).toHaveBeenCalledWith('navigation-handler', {
        denylist: [/^\/auth\//],
      });
      expect(workboxMocks.registerRoute).toHaveBeenCalledWith(
        expect.objectContaining({ handler: 'navigation-handler' }),
      );
    });

    it('registers a NetworkFirst navigation fallback when the precache manifest is empty', async () => {
      await loadSw({ manifest: [] });

      expect(workboxMocks.NavigationRoute).not.toHaveBeenCalled();
      expect(workboxMocks.createHandlerBoundToURL).not.toHaveBeenCalled();
      expect(workboxMocks.NetworkFirst).toHaveBeenCalledWith({ cacheName: 'pages' });

      const matcher = getFunctionRouteMatcher('pages');
      expect(
        matcher({
          request: { mode: 'navigate' },
          url: new URL('https://app.test/'),
        }),
      ).toBe(true);
      expect(
        matcher({
          request: { mode: 'navigate' },
          url: new URL('https://app.test/auth/callback'),
        }),
      ).toBe(false);
      expect(
        matcher({
          request: { mode: 'cors' },
          url: new URL('https://app.test/'),
        }),
      ).toBe(false);
    });
  });

  describe('Supabase catalog caching', () => {
    it('does not register a Supabase route for loopback Supabase URLs', async () => {
      for (const url of [
        'http://127.0.0.1:54321',
        'http://localhost:54321',
        'http://[::1]:54321',
      ]) {
        vi.resetModules();
        vi.clearAllMocks();
        vi.stubEnv('VITE_SUPABASE_URL', url);
        vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'vitest-anon-key');
        await loadSw();
        expect(hasSupabaseCatalogRoute()).toBe(false);
      }
    });

    it('does not register a Supabase route when VITE_SUPABASE_URL is empty', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      await loadSw();
      expect(hasSupabaseCatalogRoute()).toBe(false);
    });

    it('registers NetworkFirst caching for hosted Supabase deck and card endpoints', async () => {
      const supabaseUrl = 'https://example.supabase.co';
      vi.stubEnv('VITE_SUPABASE_URL', supabaseUrl);
      await loadSw();

      expect(hasSupabaseCatalogRoute()).toBe(true);
      expect(workboxMocks.ExpirationPlugin).toHaveBeenCalledWith({
        maxEntries: 50,
        maxAgeSeconds: 60 * 60 * 24,
      });
      expect(workboxMocks.NetworkFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          cacheName: 'supabase-catalog',
          networkTimeoutSeconds: 10,
          fetchOptions: { credentials: 'omit' },
        }),
      );

      const matcher = getSupabaseRouteMatcher();
      expect(matcher({ request: { mode: 'cors' }, url: new URL(`${supabaseUrl}/rest/v1/deck`) })).toBe(
        true,
      );
      expect(matcher({ request: { mode: 'cors' }, url: new URL(`${supabaseUrl}/rest/v1/card`) })).toBe(
        true,
      );
      expect(
        matcher({ request: { mode: 'cors' }, url: new URL(`${supabaseUrl}/rest/v1/profile`) }),
      ).toBe(false);
    });

    it('treats invalid Supabase URLs as non-loopback so catalog routes can still register', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'not-a-valid-url');
      await loadSw();
      expect(hasSupabaseCatalogRoute()).toBe(true);
    });
  });

  describe('background sync and connectivity', () => {
    it('drains pending deck downloads on matching sync events', async () => {
      const listeners = await loadSw();
      const waitUntil = vi.fn((promise: Promise<void>) => promise);

      listeners.sync.forEach((listener) => {
        listener.call(globalThis, {
          tag: processMocks.DECK_DOWNLOAD_SYNC_TAG,
          waitUntil,
        } as unknown as Event);
      });

      await Promise.resolve();

      expect(waitUntil).toHaveBeenCalledTimes(1);
      expect(processMocks.processPendingDeckDownloads).toHaveBeenCalledWith(
        {
          url: 'http://127.0.0.1:54321',
          anonKey: 'vitest-anon-key',
        },
        { notifyClients: true },
      );
    });

    it('ignores sync events with unrelated tags', async () => {
      const listeners = await loadSw();

      listeners.sync.forEach((listener) => {
        listener.call(globalThis, {
          tag: 'other-sync-tag',
          waitUntil: vi.fn(),
        } as unknown as Event);
      });

      await Promise.resolve();
      expect(processMocks.processPendingDeckDownloads).not.toHaveBeenCalled();
    });

    it('drains pending deck downloads when the service worker goes online', async () => {
      const listeners = await loadSw();

      listeners.online.forEach((listener) => {
        listener.call(globalThis, new Event('online'));
      });

      await Promise.resolve();

      expect(processMocks.processPendingDeckDownloads).toHaveBeenCalledWith(
        {
          url: 'http://127.0.0.1:54321',
          anonKey: 'vitest-anon-key',
        },
        { notifyClients: true },
      );
    });
  });
});
