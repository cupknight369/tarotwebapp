/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { err, ok } from '../lib/result.js';

const DEFAULT_DECK_ID = 'a0000000-0000-4000-8000-000000000001';
const LAST_KEY = 'last_deck_id';

const queryFail = err({
  kind: 'unknown',
  operation: 'test',
  message: 'failed',
});

const deckEntry = {
  id: 'deck-local-1',
  title: 'Local deck',
  description: null,
  created_at: '2024-01-01',
  modified_at: '2024-01-01',
  fromCatalog: false,
};

const card = {
  id: 'card-1',
  deckId: 'deck-local-1',
  title: 'The Fool',
  num: 0,
  img: 'm00.webp',
};

const deckMocks = vi.hoisted(() => ({
  listOnDeviceDeckEntries: vi.fn(),
  listCatalogDeckOffers: vi.fn(),
  getCardsByDeckId: vi.fn(),
}));

const uiMocks = vi.hoisted(() => ({
  logError: vi.fn(),
  showQueryFailureDialog: vi.fn(),
  initAuthStore: vi.fn(() => Promise.resolve()),
  initSettingsStore: vi.fn(),
  initFontProfileStore: vi.fn(),
  startCardImagePrefetch: vi.fn(),
  ensureDefaultDeckOnDevice: vi.fn(() => Promise.resolve()),
  isDefaultDeckOnDevice: vi.fn(() => Promise.resolve(false)),
}));

const alpineHoisted = vi.hoisted(() => {
  const stores: Record<string, unknown> = {};
  return {
    stores,
    Alpine: {
      store(name: string, value?: unknown) {
        if (arguments.length >= 2) {
          stores[name] = value;
        }
        return stores[name];
      },
      data: vi.fn(),
      effect: vi.fn(),
      start: vi.fn(),
    },
  };
});

vi.mock('alpinejs', () => ({
  default: alpineHoisted.Alpine,
}));

vi.mock('../input.css', () => ({}));

vi.mock('../stores/authStore.js', () => ({
  initAuthStore: uiMocks.initAuthStore,
}));

vi.mock('../stores/settingsStore.js', () => ({
  initSettingsStore: uiMocks.initSettingsStore,
}));

vi.mock('../stores/fontProfileStore.js', () => ({
  initFontProfileStore: uiMocks.initFontProfileStore,
}));

vi.mock('../lib/cardImageUrls.js', () => ({
  startCardImagePrefetch: uiMocks.startCardImagePrefetch,
}));

vi.mock('../lib/bootstrapDefaultDeck.js', () => ({
  ensureDefaultDeckOnDevice: uiMocks.ensureDefaultDeckOnDevice,
  isDefaultDeckOnDevice: uiMocks.isDefaultDeckOnDevice,
}));

vi.mock('../lib/decks.js', () => ({
  LAST_DECK_STORAGE_KEY: LAST_KEY,
  DEFAULT_DECK_ID,
  listOnDeviceDeckEntries: deckMocks.listOnDeviceDeckEntries,
  listCatalogDeckOffers: deckMocks.listCatalogDeckOffers,
  getCardsByDeckId: deckMocks.getCardsByDeckId,
}));

vi.mock('../lib/logError.js', () => ({
  logError: uiMocks.logError,
}));

vi.mock('../lib/queryFailureUi.js', () => ({
  showQueryFailureDialog: uiMocks.showQueryFailureDialog,
}));

vi.mock('../components/CanvasScaleComponent', () => ({}));
vi.mock('../components/CanvasCardComponent', () => ({}));
vi.mock('../components/CanvasTextLabelComponent', () => ({}));
vi.mock('../components/CanvasComponent', () => ({}));
vi.mock('../components/CanvasStateComponent', () => ({}));
vi.mock('../components/CanvasDeckComponent', () => ({}));
vi.mock('../components/DialogComponent', () => ({}));
vi.mock('../components/SettingsComponent', () => ({}));
vi.mock('../components/HelpComponent', () => ({}));
vi.mock('../components/KeyboardShortcutsComponent', () => ({}));
vi.mock('../components/WelcomeComponent', () => ({}));
vi.mock('../components/AuthComponent', () => ({}));
vi.mock('../components/DeckEditComponent', () => ({}));
vi.mock('../components/CorrespondenceManagerComponent', () => ({}));

vi.mock('virtual:pwa-register', () => ({
  registerSW: vi.fn(() => vi.fn()),
}));

vi.mock('../lib/pwaClient.js', () => ({
  initPwaClient: vi.fn(),
}));

import { initPwaClient } from '../lib/pwaClient.js';

async function loadMain(): Promise<void> {
  await import('../main.js');
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((r) => {
    queueMicrotask(r);
  });
}

describe('main.ts bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    for (const k of Object.keys(alpineHoisted.stores)) {
      delete alpineHoisted.stores[k];
    }
    deckMocks.listOnDeviceDeckEntries.mockReset();
    deckMocks.listCatalogDeckOffers.mockReset();
    deckMocks.getCardsByDeckId.mockReset();
    uiMocks.logError.mockReset();
    uiMocks.showQueryFailureDialog.mockReset();
    uiMocks.initAuthStore.mockReset();
    uiMocks.initAuthStore.mockResolvedValue(undefined);
    uiMocks.initSettingsStore.mockReset();
    uiMocks.initFontProfileStore.mockReset();
    uiMocks.startCardImagePrefetch.mockReset();
    uiMocks.ensureDefaultDeckOnDevice.mockReset();
    uiMocks.ensureDefaultDeckOnDevice.mockResolvedValue(undefined);
    uiMocks.isDefaultDeckOnDevice.mockReset();
    uiMocks.isDefaultDeckOnDevice.mockResolvedValue(false);
    alpineHoisted.Alpine.start.mockReset();
  });

  it('initializes Alpine, auth, settings, prefetch, and bootstraps a deck', async () => {
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok([deckEntry]));
    deckMocks.listCatalogDeckOffers.mockResolvedValue(ok([]));
    deckMocks.getCardsByDeckId.mockResolvedValue(ok([card]));

    await loadMain();

    expect(window.Alpine).toBe(alpineHoisted.Alpine);
    expect(alpineHoisted.Alpine.start).toHaveBeenCalledTimes(1);
    expect(uiMocks.initAuthStore).toHaveBeenCalledTimes(1);
    expect(uiMocks.startCardImagePrefetch).toHaveBeenCalledTimes(1);
    expect(uiMocks.ensureDefaultDeckOnDevice).toHaveBeenCalledTimes(1);
    expect(uiMocks.initSettingsStore).toHaveBeenCalledTimes(1);
    expect(uiMocks.initFontProfileStore).toHaveBeenCalledTimes(1);
    expect(initPwaClient).toHaveBeenCalledTimes(1);

    expect(alpineHoisted.stores.shuffledCards).toEqual([card]);
    expect(alpineHoisted.stores.activeDeckId).toBe('deck-local-1');
    expect(alpineHoisted.stores.activeDeckTitle).toBe('Local deck');
    expect(localStorage.getItem(LAST_KEY)).toBe('deck-local-1');
  });

  it('skips prefetch and default deck install when Rider-Waite-Smith is already on device', async () => {
    uiMocks.isDefaultDeckOnDevice.mockResolvedValue(true);
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok([deckEntry]));
    deckMocks.listCatalogDeckOffers.mockResolvedValue(ok([]));
    deckMocks.getCardsByDeckId.mockResolvedValue(ok([card]));

    await loadMain();

    expect(uiMocks.startCardImagePrefetch).not.toHaveBeenCalled();
    expect(uiMocks.ensureDefaultDeckOnDevice).not.toHaveBeenCalled();
  });

  it('uses DEFAULT_DECK_ID when on-device list is empty', async () => {
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok([]));
    deckMocks.listCatalogDeckOffers.mockResolvedValue(ok([]));
    deckMocks.getCardsByDeckId.mockResolvedValue(ok([card]));

    await loadMain();

    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith(DEFAULT_DECK_ID);
    expect(localStorage.getItem(LAST_KEY)).toBe(DEFAULT_DECK_ID);
  });

  it('replaces unknown last_deck_id with first on-device deck', async () => {
    localStorage.setItem(LAST_KEY, 'unknown-id');
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok([deckEntry]));
    deckMocks.listCatalogDeckOffers.mockResolvedValue(ok([]));
    deckMocks.getCardsByDeckId.mockResolvedValue(ok([card]));

    await loadMain();

    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith('deck-local-1');
    expect(localStorage.getItem(LAST_KEY)).toBe('deck-local-1');
  });

  it('logs and shows dialog when on-device list fails', async () => {
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(queryFail);
    deckMocks.listCatalogDeckOffers.mockResolvedValue(ok([]));
    deckMocks.getCardsByDeckId.mockResolvedValue(ok([card]));

    await loadMain();

    expect(uiMocks.logError).toHaveBeenCalledWith('bootstrapDeck.loadDeckLists', queryFail.error);
    expect(uiMocks.showQueryFailureDialog).toHaveBeenCalledWith(queryFail.error);
  });

  it('logs when catalog offers fail', async () => {
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok([deckEntry]));
    deckMocks.listCatalogDeckOffers.mockResolvedValue(queryFail);
    deckMocks.getCardsByDeckId.mockResolvedValue(ok([card]));

    await loadMain();

    await vi.waitFor(() => {
      expect(uiMocks.logError).toHaveBeenCalledWith('bootstrapDeck.catalog', queryFail.error);
    });
  });

  it('handles getCardsByDeckId failure and still persists deck id', async () => {
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok([deckEntry]));
    deckMocks.listCatalogDeckOffers.mockResolvedValue(ok([]));
    deckMocks.getCardsByDeckId.mockResolvedValue(queryFail);

    await loadMain();

    expect(uiMocks.logError).toHaveBeenCalledWith(
      'bootstrapDeck.getCardsByDeckId',
      queryFail.error,
    );
    expect(uiMocks.showQueryFailureDialog).toHaveBeenCalledWith(queryFail.error);
    expect(alpineHoisted.stores.shuffledCards).toEqual([]);
    expect(alpineHoisted.stores.activeDeckId).toBe('deck-local-1');
    expect(alpineHoisted.stores.activeDeckTitle).toBe('');
    expect(localStorage.getItem(LAST_KEY)).toBe('deck-local-1');
  });

  it('logs unexpected bootstrap errors', async () => {
    deckMocks.listOnDeviceDeckEntries.mockRejectedValue(new Error('network'));
    deckMocks.listCatalogDeckOffers.mockResolvedValue(ok([]));

    await loadMain();

    await vi.waitFor(() => {
      expect(uiMocks.logError).toHaveBeenCalledWith('bootstrapDeck.unexpected', expect.any(Error));
    });
  });
});
