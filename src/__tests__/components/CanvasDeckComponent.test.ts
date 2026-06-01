/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { err, ok } from '../../lib/result.js';
import type { CatalogDeckOffer, OnDeviceDeckEntry, TarotCard } from '../../types/canvas.js';
import type { QueryFailure } from '../../lib/supabaseErrors.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const testConsts = vi.hoisted(() => ({
  DEFAULT_DECK_ID: 'a0000000-0000-4000-8000-000000000001',
  LAST_DECK_KEY: 'last_deck_id',
}));

const deckMocks = vi.hoisted(() => ({
  listOnDeviceDeckEntries: vi.fn(),
  listCatalogDeckOffers: vi.fn(),
  getCardsByDeckId: vi.fn(),
}));

const cloudMocks = vi.hoisted(() => ({
  downloadCloudDeckToDevice: vi.fn(),
  downloadFailureMessage: vi.fn(() => 'Download failed'),
}));

const uiMocks = vi.hoisted(() => ({
  logError: vi.fn(),
  showQueryFailureDialog: vi.fn(),
}));

const localMocks = vi.hoisted(() => ({
  createLocalDeck: vi.fn(),
  deleteLocalDeck: vi.fn(),
}));

const alpineStub = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'deckComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineStub.Alpine,
}));

vi.mock('../../lib/decks.js', () => ({
  DEFAULT_DECK_ID: testConsts.DEFAULT_DECK_ID,
  LAST_DECK_STORAGE_KEY: testConsts.LAST_DECK_KEY,
  getCardsByDeckId: (...args: unknown[]) =>
    (deckMocks.getCardsByDeckId as (...a: unknown[]) => unknown)(...args),
  listCatalogDeckOffers: (...args: unknown[]) =>
    (deckMocks.listCatalogDeckOffers as (...a: unknown[]) => unknown)(...args),
  listOnDeviceDeckEntries: (...args: unknown[]) =>
    (deckMocks.listOnDeviceDeckEntries as (...a: unknown[]) => unknown)(...args),
}));

vi.mock('../../lib/cloudDeckDownload.js', () => ({
  downloadCloudDeckToDevice: (...args: unknown[]) =>
    (cloudMocks.downloadCloudDeckToDevice as (...a: unknown[]) => unknown)(...args),
  downloadFailureMessage: (...args: unknown[]) =>
    (cloudMocks.downloadFailureMessage as (...a: unknown[]) => unknown)(...args),
}));

vi.mock('../../lib/logError.js', () => ({
  logError: (...args: unknown[]) => (uiMocks.logError as (...a: unknown[]) => unknown)(...args),
}));

vi.mock('../../lib/queryFailureUi.js', () => ({
  showQueryFailureDialog: (...args: unknown[]) =>
    (uiMocks.showQueryFailureDialog as (...a: unknown[]) => unknown)(...args),
}));

vi.mock('../../lib/localDecks.js', () => ({
  createLocalDeck: (...args: unknown[]) =>
    (localMocks.createLocalDeck as (...a: unknown[]) => unknown)(...args),
  deleteLocalDeck: (...args: unknown[]) =>
    (localMocks.deleteLocalDeck as (...a: unknown[]) => unknown)(...args),
}));

import { DECK_MODAL_TAB_KEY } from '../../components/CanvasDeckComponent.js';
import '../../components/CanvasDeckComponent.js';

const qf: QueryFailure = { kind: 'unknown', operation: 't', message: 'fail' };

const sampleCard: TarotCard = {
  id: 'c1',
  deckId: 'd1',
  title: 'One',
  num: 0,
  img: 'a.webp',
};

function onDevice(id: string, title: string, description: string | null = null): OnDeviceDeckEntry {
  return {
    id,
    title,
    description,
    created_at: '2024-01-01',
    modified_at: '2024-01-01',
    fromCatalog: false,
  };
}

function catalogOffer(
  id: string,
  title: string,
  installed = false,
  description: string | null = null,
): CatalogDeckOffer {
  return { id, title, description, installed };
}

type DeckCtx = {
  deckModalOpen: boolean;
  deckModalTab: 'onDevice' | 'store';
  catalogOffers: CatalogDeckOffer[];
  onDeviceDecks: OnDeviceDeckEntry[];
  deckSearchQuery: string;
  newLocalDeckTitle: string;
  newLocalDeckTitleError: string;
  shuffleDeck: ReturnType<typeof vi.fn>;
  setDeckModalTab: (tab: 'onDevice' | 'store') => void;
  filteredOnDeviceDecks: () => OnDeviceDeckEntry[];
  filteredCatalogOffers: () => CatalogDeckOffer[];
  openDeckModal: () => Promise<void>;
  closeDeckModal: () => void;
  refreshDeckLists: () => Promise<void>;
  switchToDeck: (deckId: string) => Promise<void>;
  createLocalDeckAction: () => Promise<void>;
  downloadCatalogDeckAction: (deckId: string) => Promise<void>;
  onDeckDownloadComplete: (deckId: string) => Promise<void>;
  removeCatalogInstallAction: (deckId: string) => Promise<void>;
  deleteLocalDeckAction: (deckId: string) => Promise<void>;
};

function mountDeck(): DeckCtx {
  const factory = alpineStub.getFactory();
  if (!factory) {
    throw new Error('deckComponent factory not registered');
  }
  const base = factory() as DeckCtx;
  return { ...base, shuffleDeck: vi.fn() };
}

async function flushAsyncWork(rounds = 8): Promise<void> {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
}

describe('deckComponent (CanvasDeckComponent.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(alpineStub.rawStores)) {
      delete alpineStub.rawStores[k];
    }
    localStorage.clear();
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok([]));
    deckMocks.listCatalogDeckOffers.mockResolvedValue(ok([]));
    deckMocks.getCardsByDeckId.mockResolvedValue(ok([sampleCard]));
    cloudMocks.downloadCloudDeckToDevice.mockResolvedValue(ok(undefined));
    localMocks.createLocalDeck.mockResolvedValue(undefined);
    localMocks.deleteLocalDeck.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports DECK_MODAL_TAB_KEY', () => {
    expect(DECK_MODAL_TAB_KEY).toBe('deck_modal_tab');
  });

  it('setDeckModalTab updates tab and persists to localStorage', () => {
    const ctx = mountDeck();
    ctx.setDeckModalTab.call(ctx, 'store');
    expect(ctx.deckModalTab).toBe('store');
    expect(localStorage.getItem(DECK_MODAL_TAB_KEY)).toBe('store');
  });

  it('setDeckModalTab swallows localStorage errors', () => {
    const ctx = mountDeck();
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => ctx.setDeckModalTab.call(ctx, 'onDevice')).not.toThrow();
  });

  it('openDeckModal reads tab from localStorage and clears title error', async () => {
    localStorage.setItem(DECK_MODAL_TAB_KEY, 'store');
    const ctx = mountDeck();
    ctx.newLocalDeckTitleError = 'x';
    ctx.deckSearchQuery = 'prior';
    await ctx.openDeckModal.call(ctx);
    expect(ctx.deckModalOpen).toBe(true);
    expect(ctx.deckModalTab).toBe('store');
    expect(ctx.newLocalDeckTitleError).toBe('');
    expect(ctx.deckSearchQuery).toBe('');
  });

  it('openDeckModal defaults tab when localStorage is invalid', async () => {
    localStorage.setItem(DECK_MODAL_TAB_KEY, 'bogus');
    const ctx = mountDeck();
    await ctx.openDeckModal.call(ctx);
    expect(ctx.deckModalTab).toBe('onDevice');
  });

  it('openDeckModal defaults tab when localStorage.getItem throws', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const ctx = mountDeck();
    await ctx.openDeckModal.call(ctx);
    expect(ctx.deckModalTab).toBe('onDevice');
  });

  it('closeDeckModal sets deckModalOpen false', () => {
    const ctx = mountDeck();
    ctx.deckModalOpen = true;
    ctx.closeDeckModal.call(ctx);
    expect(ctx.deckModalOpen).toBe(false);
  });

  it('closeDeckModal is a no-op while global dialog is open', () => {
    const ctx = mountDeck();
    ctx.deckModalOpen = true;
    alpineStub.rawStores.dialog = { open: true, type: 'confirm', title: 'Delete?', cancelLabelVisible: true };
    ctx.closeDeckModal.call(ctx);
    expect(ctx.deckModalOpen).toBe(true);
  });

  it('filteredOnDeviceDecks returns all decks when search is blank', () => {
    const ctx = mountDeck();
    const decks = [onDevice('a', 'Alpha'), onDevice('b', 'Beta')];
    ctx.onDeviceDecks = decks;
    ctx.deckSearchQuery = '   ';
    expect(ctx.filteredOnDeviceDecks.call(ctx)).toEqual(decks);
  });

  it('filteredOnDeviceDecks matches title case-insensitively', () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'Foo Bar'), onDevice('b', 'Other')];
    ctx.deckSearchQuery = 'FOO';
    expect(ctx.filteredOnDeviceDecks.call(ctx)).toEqual([onDevice('a', 'Foo Bar')]);
  });

  it('filteredOnDeviceDecks does not match description text', () => {
    const ctx = mountDeck();
    const onlyInDesc = onDevice('x', 'Short title', 'unique catalog blurb');
    ctx.onDeviceDecks = [onlyInDesc];
    ctx.deckSearchQuery = 'unique catalog';
    expect(ctx.filteredOnDeviceDecks.call(ctx)).toEqual([]);
  });

  it('filteredOnDeviceDecks returns empty when no title matches', () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'One'), onDevice('b', 'Two')];
    ctx.deckSearchQuery = 'zzz';
    expect(ctx.filteredOnDeviceDecks.call(ctx)).toEqual([]);
  });

  it('filteredCatalogOffers returns all offers when search is blank', () => {
    const ctx = mountDeck();
    const offers = [catalogOffer('c1', 'Cat'), catalogOffer('c2', 'Dog')];
    ctx.catalogOffers = offers;
    ctx.deckSearchQuery = '';
    expect(ctx.filteredCatalogOffers.call(ctx)).toEqual(offers);
  });

  it('filteredCatalogOffers matches title only', () => {
    const ctx = mountDeck();
    ctx.catalogOffers = [
      catalogOffer('c1', 'Rider Waite', false, 'Classic tarot deck'),
      catalogOffer('c2', 'Thoth', true, 'Crowley'),
    ];
    ctx.deckSearchQuery = 'rider';
    expect(ctx.filteredCatalogOffers.call(ctx)).toEqual([
      catalogOffer('c1', 'Rider Waite', false, 'Classic tarot deck'),
    ]);
  });

  it('filteredCatalogOffers does not match description text', () => {
    const ctx = mountDeck();
    ctx.catalogOffers = [catalogOffer('c1', 'Short', false, 'only here in description')];
    ctx.deckSearchQuery = 'only here';
    expect(ctx.filteredCatalogOffers.call(ctx)).toEqual([]);
  });

  it('refreshDeckLists logs and shows dialog when on-device list fails', async () => {
    deckMocks.listOnDeviceDeckEntries.mockResolvedValueOnce(err(qf));
    const ctx = mountDeck();
    await ctx.refreshDeckLists.call(ctx);
    expect(uiMocks.logError).toHaveBeenCalled();
    expect(uiMocks.showQueryFailureDialog).toHaveBeenCalledWith(qf);
  });

  it('refreshDeckLists loads catalog async and handles catalog failure', async () => {
    const v1 = [onDevice('a', 'A')];
    deckMocks.listOnDeviceDeckEntries.mockResolvedValueOnce(ok(v1)).mockResolvedValue(ok(v1));
    deckMocks.listCatalogDeckOffers.mockResolvedValueOnce(err(qf));
    const ctx = mountDeck();
    await ctx.refreshDeckLists.call(ctx);
    expect(ctx.onDeviceDecks).toEqual(v1);
    expect(ctx.catalogOffers).toEqual([]);
    await flushAsyncWork();
    expect(uiMocks.logError).toHaveBeenCalled();
  });

  it('refreshDeckLists updates catalog and on-device when both succeed', async () => {
    const first = [onDevice('a', 'A')];
    const offers = [catalogOffer('c1', 'Cat')];
    const second = [onDevice('b', 'B')];
    deckMocks.listOnDeviceDeckEntries
      .mockResolvedValueOnce(ok(first))
      .mockResolvedValueOnce(ok(second));
    deckMocks.listCatalogDeckOffers.mockResolvedValueOnce(ok(offers));
    const ctx = mountDeck();
    await ctx.refreshDeckLists.call(ctx);
    expect(ctx.onDeviceDecks).toEqual(first);
    await flushAsyncWork();
    expect(ctx.catalogOffers).toEqual(offers);
    expect(ctx.onDeviceDecks).toEqual(second);
  });

  it('refreshDeckLists keeps on-device list when post-catalog refresh fails', async () => {
    const first = [onDevice('a', 'A')];
    deckMocks.listOnDeviceDeckEntries
      .mockResolvedValueOnce(ok(first))
      .mockResolvedValueOnce(err(qf));
    deckMocks.listCatalogDeckOffers.mockResolvedValueOnce(ok([catalogOffer('x', 'X')]));
    const ctx = mountDeck();
    await ctx.refreshDeckLists.call(ctx);
    await flushAsyncWork();
    expect(ctx.onDeviceDecks).toEqual(first);
  });

  it('switchToDeck shows failure when getCardsByDeckId fails', async () => {
    deckMocks.getCardsByDeckId.mockResolvedValueOnce(err(qf));
    const ctx = mountDeck();
    await ctx.switchToDeck.call(ctx, 'd1');
    expect(uiMocks.logError).toHaveBeenCalled();
    expect(uiMocks.showQueryFailureDialog).toHaveBeenCalledWith(qf);
  });

  it('switchToDeck with keepDeckModalOpen leaves deck modal open', async () => {
    const ctx = mountDeck();
    ctx.deckModalOpen = true;
    await ctx.switchToDeck.call(ctx, 'deck-1', true);
    expect(ctx.deckModalOpen).toBe(true);
  });

  it('switchToDeck sets stores, title from on-device, localStorage, shuffle, closes modal', async () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('deck-1', 'Local title')];
    ctx.deckModalOpen = true;
    await ctx.switchToDeck.call(ctx, 'deck-1');
    expect(alpineStub.rawStores.shuffledCards).toEqual([sampleCard]);
    expect(alpineStub.rawStores.activeDeckId).toBe('deck-1');
    expect(alpineStub.rawStores.activeDeckTitle).toBe('Local title');
    expect(localStorage.getItem(testConsts.LAST_DECK_KEY)).toBe('deck-1');
    expect(ctx.shuffleDeck).toHaveBeenCalled();
    expect(ctx.deckModalOpen).toBe(false);
  });

  it('switchToDeck resolves title from catalog when not on device', async () => {
    const ctx = mountDeck();
    ctx.catalogOffers = [catalogOffer('cat-1', 'Catalog title')];
    await ctx.switchToDeck.call(ctx, 'cat-1');
    expect(alpineStub.rawStores.activeDeckTitle).toBe('Catalog title');
  });

  it('switchToDeck uses empty title when deck id is unknown', async () => {
    const ctx = mountDeck();
    await ctx.switchToDeck.call(ctx, 'missing');
    expect(alpineStub.rawStores.activeDeckTitle).toBe('');
  });

  it('createLocalDeckAction sets zod error for invalid title', async () => {
    const ctx = mountDeck();
    ctx.newLocalDeckTitle = '   ';
    await ctx.createLocalDeckAction.call(ctx);
    expect(ctx.newLocalDeckTitleError).not.toBe('');
    expect(localMocks.createLocalDeck).not.toHaveBeenCalled();
  });

  it('createLocalDeckAction creates deck and refreshes lists', async () => {
    const ctx = mountDeck();
    ctx.newLocalDeckTitle = '  My deck  ';
    await ctx.createLocalDeckAction.call(ctx);
    expect(ctx.newLocalDeckTitleError).toBe('');
    expect(localMocks.createLocalDeck).toHaveBeenCalledWith('My deck', null);
    expect(ctx.newLocalDeckTitle).toBe('');
    expect(deckMocks.listOnDeviceDeckEntries).toHaveBeenCalled();
  });

  it('downloadCatalogDeckAction refreshes lists when download is queued', async () => {
    cloudMocks.downloadCloudDeckToDevice.mockResolvedValueOnce(
      err({ kind: 'queued', message: 'Download queued.' }),
    );
    const ctx = mountDeck();
    const refreshSpy = vi.spyOn(ctx, 'refreshDeckLists');
    await ctx.downloadCatalogDeckAction.call(ctx, 'd1');
    expect(refreshSpy).toHaveBeenCalled();
  });

  it('onDeckDownloadComplete reloads cards when active deck matches', async () => {
    alpineStub.rawStores.activeDeckId = 'same';
    const ctx = mountDeck();
    await ctx.onDeckDownloadComplete.call(ctx, 'same');
    await flushAsyncWork();
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith('same');
    expect(ctx.shuffleDeck).toHaveBeenCalled();
  });

  it('downloadCatalogDeckAction opens dialog on download failure', async () => {
    cloudMocks.downloadCloudDeckToDevice.mockResolvedValueOnce(
      err({ kind: 'network', message: 'offline' }),
    );
    const ctx = mountDeck();
    await ctx.downloadCatalogDeckAction.call(ctx, 'd1');
    const dialog = alpineStub.rawStores.dialog as {
      open: boolean;
      title: string;
      onConfirm: () => void;
    };
    expect(dialog.open).toBe(true);
    expect(dialog.title).toBe('Download failed');
    expect(cloudMocks.downloadFailureMessage).toHaveBeenCalled();
    dialog.onConfirm();
  });

  it('downloadCatalogDeckAction refreshes only when active deck matches', async () => {
    alpineStub.rawStores.activeDeckId = 'other';
    const ctx = mountDeck();
    await ctx.downloadCatalogDeckAction.call(ctx, 'target');
    await flushAsyncWork();
    expect(ctx.shuffleDeck).not.toHaveBeenCalled();
  });

  it('downloadCatalogDeckAction reloads cards when active deck matches download id', async () => {
    alpineStub.rawStores.activeDeckId = 'same';
    const ctx = mountDeck();
    await ctx.downloadCatalogDeckAction.call(ctx, 'same');
    await flushAsyncWork();
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith('same');
    expect(ctx.shuffleDeck).toHaveBeenCalled();
  });

  it('downloadCatalogDeckAction shows dialog when reload cards fails for active deck', async () => {
    alpineStub.rawStores.activeDeckId = 'same';
    deckMocks.getCardsByDeckId.mockResolvedValueOnce(err(qf));
    const ctx = mountDeck();
    await ctx.downloadCatalogDeckAction.call(ctx, 'same');
    await flushAsyncWork();
    expect(uiMocks.showQueryFailureDialog).toHaveBeenCalledWith(qf);
  });

  it('removeCatalogInstallAction confirms delete without switching when deck was not active', async () => {
    alpineStub.rawStores.activeDeckId = 'still-active';
    deckMocks.getCardsByDeckId.mockClear();
    const ctx = mountDeck();
    const p = ctx.removeCatalogInstallAction.call(ctx, 'other-id');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith('other-id');
    expect(deckMocks.getCardsByDeckId).not.toHaveBeenCalled();
  });

  it('removeCatalogInstallAction returns when user cancels', async () => {
    const ctx = mountDeck();
    const p = ctx.removeCatalogInstallAction.call(ctx, 'd1');
    await Promise.resolve();
    const dialog = alpineStub.rawStores.dialog as { onCancel: () => void };
    dialog.onCancel();
    await p;
    expect(localMocks.deleteLocalDeck).not.toHaveBeenCalled();
  });

  it('removeCatalogInstallAction deletes and switches when active', async () => {
    alpineStub.rawStores.activeDeckId = 'gone';
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok([onDevice('next', 'Next')]));
    const ctx = mountDeck();
    const p = ctx.removeCatalogInstallAction.call(ctx, 'gone');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith('gone');
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith('next');
  });

  it('removeCatalogInstallAction picks default deck when lists are empty after delete', async () => {
    alpineStub.rawStores.activeDeckId = 'gone';
    const ctx = mountDeck();
    ctx.onDeviceDecks = [];
    ctx.catalogOffers = [];
    const p = ctx.removeCatalogInstallAction.call(ctx, 'gone');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith(testConsts.DEFAULT_DECK_ID);
  });

  it('removeCatalogInstallAction picks first catalog id by title sort when on-device empty', async () => {
    alpineStub.rawStores.activeDeckId = 'gone';
    const ctx = mountDeck();
    ctx.catalogOffers = [catalogOffer('b', 'B'), catalogOffer('a', 'A')];
    ctx.onDeviceDecks = [];
    ctx.refreshDeckLists = vi.fn(function (this: DeckCtx) {
      this.onDeviceDecks = [];
      return Promise.resolve();
    });
    const p = ctx.removeCatalogInstallAction.call(ctx, 'gone');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith('a');
  });

  it('deleteLocalDeckAction returns when user cancels', async () => {
    const ctx = mountDeck();
    const p = ctx.deleteLocalDeckAction.call(ctx, 'd1');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    await p;
    expect(localMocks.deleteLocalDeck).not.toHaveBeenCalled();
  });

  it('deleteLocalDeckAction deletes inactive deck without switching and keeps deck modal open', async () => {
    alpineStub.rawStores.activeDeckId = 'active';
    const ctx = mountDeck();
    ctx.deckModalOpen = true;
    const p = ctx.deleteLocalDeckAction.call(ctx, 'other');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith('other');
    expect(deckMocks.getCardsByDeckId).not.toHaveBeenCalled();
    expect(ctx.deckModalOpen).toBe(true);
  });

  it('deleteLocalDeckAction switches when deleted deck was active but keeps deck modal open', async () => {
    alpineStub.rawStores.activeDeckId = 'gone';
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok([onDevice('keep', 'Keep')]));
    const ctx = mountDeck();
    ctx.deckModalOpen = true;
    const p = ctx.deleteLocalDeckAction.call(ctx, 'gone');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith('keep');
    expect(ctx.deckModalOpen).toBe(true);
  });

  it('deleteLocalDeckAction falls back to default id when no next deck in lists', async () => {
    alpineStub.rawStores.activeDeckId = 'gone';
    const ctx = mountDeck();
    ctx.refreshDeckLists = vi.fn(function (this: DeckCtx) {
      this.onDeviceDecks = [];
      this.catalogOffers = [];
      return Promise.resolve();
    });
    const p = ctx.deleteLocalDeckAction.call(ctx, 'gone');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith(testConsts.DEFAULT_DECK_ID);
  });

  it('deleteLocalDeckAction picks catalog sort when on-device empty after refresh', async () => {
    alpineStub.rawStores.activeDeckId = 'gone';
    const ctx = mountDeck();
    ctx.catalogOffers = [catalogOffer('z', 'Z'), catalogOffer('m', 'M')];
    ctx.refreshDeckLists = vi.fn(function (this: DeckCtx) {
      this.onDeviceDecks = [];
      return Promise.resolve();
    });
    const p = ctx.deleteLocalDeckAction.call(ctx, 'gone');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith('m');
  });
});
