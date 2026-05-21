/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const processMocks = vi.hoisted(() => ({
  processPendingDeckDownloads: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../lib/processPendingDeckDownloads.js', () => ({
  processPendingDeckDownloads: processMocks.processPendingDeckDownloads,
}));

vi.mock('../../lib/supabaseRest.js', () => ({
  getBrowserSupabaseRestConfig: vi.fn(() => ({
    url: 'https://example.supabase.co',
    anonKey: 'anon-key',
  })),
}));

import { initPwaClient } from '../../lib/pwaClient.js';

function stubServiceWorker(): void {
  const listeners = new Map<string, Set<EventListener>>();
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: {
      ready: Promise.resolve({ sync: { register: vi.fn() } }),
      addEventListener(type: string, listener: EventListener) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)?.add(listener);
      },
      dispatchEvent(event: Event) {
        listeners.get(event.type)?.forEach((listener) => {
          listener.call(navigator.serviceWorker, event);
        });
        return true;
      },
    },
  });
}

describe('initPwaClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubServiceWorker();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
  });

  it('registers the service worker and drains pending downloads on init', async () => {
    const registerSW = vi.fn(() => vi.fn());
    initPwaClient(registerSW);
    await Promise.resolve();
    expect(registerSW).toHaveBeenCalledWith(expect.objectContaining({ immediate: true }));
    expect(processMocks.processPendingDeckDownloads).toHaveBeenCalled();
  });

  it('dispatches deck-download-complete when service worker posts a message', () => {
    const registerSW = vi.fn(() => vi.fn());
    initPwaClient(registerSW);
    const handler = vi.fn();
    window.addEventListener('deck-download-complete', handler);
    navigator.serviceWorker.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'deck-download-complete', deckId: 'deck-1' },
      }),
    );
    expect(handler).toHaveBeenCalled();
    window.removeEventListener('deck-download-complete', handler);
  });

  it('drains pending downloads when browser goes online', async () => {
    const registerSW = vi.fn(() => vi.fn());
    initPwaClient(registerSW);
    await Promise.resolve();
    await Promise.resolve();
    processMocks.processPendingDeckDownloads.mockClear();
    window.dispatchEvent(new Event('online'));
    await Promise.resolve();
    expect(processMocks.processPendingDeckDownloads).toHaveBeenCalled();
  });
});
