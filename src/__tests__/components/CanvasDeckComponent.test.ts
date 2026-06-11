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
  selectedDeckIds: string[];
  newLocalDeckTitle: string;
  newLocalDeckTitleError: string;
  shuffleDeck: ReturnType<typeof vi.fn>;
  setDeckModalTab: (tab: 'onDevice' | 'store') => void;
  isDeckSelected: (deckId: string) => boolean;
  toggleDeckSelection: (deckId: string) => void;
  selectAllDecks: () => void;
  clearDeckSelection: () => void;
  filteredOnDeviceDecks: () => OnDeviceDeckEntry[];
  filteredCatalogOffers: () => CatalogDeckOffer[];
  openDeckModal: () => Promise<void>;
  closeDeckModal: () => void;
  refreshDeckLists: () => Promise<void>;
  switchToDeck: (deckId: string) => Promise<void>;
  cycleDeck: (direction: 1 | -1) => Promise<void>;
  onCycleDeckEvent: (event: Event) => void;
  onOpenDeckModalEvent: () => void;
  onDecksChanged: () => void;
  createLocalDeckAction: () => Promise<void>;
  downloadCatalogDeckAction: (deckId: string) => Promise<void>;
  onDeckDownloadComplete: (deckId: string) => Promise<void>;
  removeCatalogInstallAction: (deckId: string) => Promise<void>;
  deleteLocalDeckAction: (deckId: string) => Promise<void>;
  confirmAndDeleteSelectedDecks: () => Promise<void>;
  switchDeckByName: null | { query: string; highlightIndex: number };
  switchDeckByNameMatches: () => OnDeviceDeckEntry[];
  onSwitchDeckByNameEvent: () => void;
  openSwitchDeckByName: () => Promise<void>;
  onSwitchDeckByNameQueryInput: (value: string) => void;
  moveSwitchDeckByNameHighlight: (delta: 1 | -1) => void;
  onSwitchDeckByNameKeydown: (event: KeyboardEvent) => void;
  confirmSwitchDeckByNameSelection: (deck?: OnDeviceDeckEntry) => Promise<void>;
  cancelSwitchDeckByName: () => void;
  handleDeckEscape: () => void;
  $nextTick: (cb?: () => void) => void;
  $refs: Record<string, HTMLElement>;
};

function mountDeck(): DeckCtx {
  const factory = alpineStub.getFactory();
  if (!factory) {
    throw new Error('deckComponent factory not registered');
  }
  const base = factory() as DeckCtx;
  return {
    ...base,
    shuffleDeck: vi.fn(),
    $nextTick: (cb?: () => void) => {
      cb?.();
    },
    $refs: {},
  };
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
    ctx.selectedDeckIds = ['d1'];
    await ctx.openDeckModal.call(ctx);
    expect(ctx.deckModalOpen).toBe(true);
    expect(ctx.deckModalTab).toBe('store');
    expect(ctx.newLocalDeckTitleError).toBe('');
    expect(ctx.deckSearchQuery).toBe('');
    expect(ctx.selectedDeckIds).toEqual([]);
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

  it('openDeckModal focuses the search input after deck lists load', async () => {
    const focus = vi.fn();
    const ctx = mountDeck();
    ctx.$refs.deckModalSearchInput = { focus } as unknown as HTMLElement;
    await ctx.openDeckModal.call(ctx);
    expect(focus).toHaveBeenCalledTimes(1);
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
    alpineStub.rawStores.dialog = {
      open: true,
      type: 'confirm',
      title: 'Delete?',
      cancelLabelVisible: true,
    };
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

  it('cycleDeck switches to the next on-device deck in title order', async () => {
    const decks = [onDevice('a', 'Alpha'), onDevice('b', 'Beta'), onDevice('c', 'Gamma')];
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok(decks));
    alpineStub.rawStores.activeDeckId = 'b';
    const ctx = mountDeck();
    const switchSpy = vi.spyOn(ctx, 'switchToDeck').mockResolvedValue(undefined);
    await ctx.cycleDeck.call(ctx, 1);
    expect(switchSpy).toHaveBeenCalledWith('c');
  });

  it('cycleDeck wraps backward to the last deck', async () => {
    const decks = [onDevice('a', 'Alpha'), onDevice('b', 'Beta')];
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok(decks));
    alpineStub.rawStores.activeDeckId = 'a';
    const ctx = mountDeck();
    const switchSpy = vi.spyOn(ctx, 'switchToDeck').mockResolvedValue(undefined);
    await ctx.cycleDeck.call(ctx, -1);
    expect(switchSpy).toHaveBeenCalledWith('b');
  });

  it('cycleDeck is a no-op with zero or one on-device deck', async () => {
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok([onDevice('solo', 'Solo')]));
    alpineStub.rawStores.activeDeckId = 'solo';
    const ctx = mountDeck();
    const switchSpy = vi.spyOn(ctx, 'switchToDeck').mockResolvedValue(undefined);
    await ctx.cycleDeck.call(ctx, 1);
    expect(switchSpy).not.toHaveBeenCalled();
  });

  it('openSwitchDeckByName refreshes decks and opens picker', async () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'Alpha')];
    const refreshSpy = vi.spyOn(ctx, 'refreshDeckLists').mockResolvedValue(undefined);
    await ctx.openSwitchDeckByName.call(ctx);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(ctx.switchDeckByName).toEqual({ query: '', highlightIndex: 0 });
  });

  it('switchDeckByNameMatches returns sorted on-device decks filtered by query', () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('b', 'Beta'), onDevice('a', 'Alpha'), onDevice('c', 'Alpine')];
    ctx.switchDeckByName = { query: 'al', highlightIndex: 0 };
    expect(ctx.switchDeckByNameMatches.call(ctx)).toEqual([
      onDevice('a', 'Alpha'),
      onDevice('c', 'Alpine'),
    ]);
  });

  it('confirmSwitchDeckByNameSelection switches to highlighted deck and closes picker', async () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'Alpha'), onDevice('b', 'Beta')];
    ctx.switchDeckByName = { query: '', highlightIndex: 1 };
    const switchSpy = vi.spyOn(ctx, 'switchToDeck').mockResolvedValue(undefined);
    await ctx.confirmSwitchDeckByNameSelection.call(ctx);
    expect(switchSpy).toHaveBeenCalledWith('b');
    expect(ctx.switchDeckByName).toBeNull();
  });

  it('handleDeckEscape cancels switch deck by name before closing modal', () => {
    const ctx = mountDeck();
    ctx.switchDeckByName = { query: 'x', highlightIndex: 0 };
    ctx.deckModalOpen = true;
    ctx.handleDeckEscape.call(ctx);
    expect(ctx.switchDeckByName).toBeNull();
    expect(ctx.deckModalOpen).toBe(true);
  });

  it('handleDeckEscape closes deck modal when picker is closed', () => {
    const ctx = mountDeck();
    ctx.deckModalOpen = true;
    ctx.handleDeckEscape.call(ctx);
    expect(ctx.deckModalOpen).toBe(false);
  });

  it('onSwitchDeckByNameKeydown escape cancels picker', () => {
    const ctx = mountDeck();
    ctx.switchDeckByName = { query: 'a', highlightIndex: 0 };
    const preventDefault = vi.fn();
    ctx.onSwitchDeckByNameKeydown.call(ctx, {
      key: 'Escape',
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(ctx.switchDeckByName).toBeNull();
  });

  it('onOpenDeckModalEvent opens deck modal', async () => {
    const ctx = mountDeck();
    const openSpy = vi.spyOn(ctx, 'openDeckModal').mockResolvedValue(undefined);
    ctx.onOpenDeckModalEvent.call(ctx);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('cycleDeck shows failure when listOnDeviceDeckEntries fails', async () => {
    deckMocks.listOnDeviceDeckEntries.mockResolvedValueOnce(err(qf));
    const ctx = mountDeck();
    await ctx.cycleDeck.call(ctx, 1);
    expect(uiMocks.logError).toHaveBeenCalled();
    expect(uiMocks.showQueryFailureDialog).toHaveBeenCalledWith(qf);
  });

  it('onCycleDeckEvent delegates to cycleDeck', async () => {
    const ctx = mountDeck();
    const cycleSpy = vi.spyOn(ctx, 'cycleDeck').mockResolvedValue(undefined);
    ctx.onCycleDeckEvent.call(ctx, new CustomEvent('cycle-deck', { detail: { direction: -1 } }));
    expect(cycleSpy).toHaveBeenCalledWith(-1);
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

  it('isDeckSelected and toggleDeckSelection add and remove deck ids', () => {
    const ctx = mountDeck();
    expect(ctx.isDeckSelected.call(ctx, 'a')).toBe(false);
    ctx.toggleDeckSelection.call(ctx, 'a');
    expect(ctx.isDeckSelected.call(ctx, 'a')).toBe(true);
    expect(ctx.selectedDeckIds).toEqual(['a']);
    ctx.toggleDeckSelection.call(ctx, 'a');
    expect(ctx.isDeckSelected.call(ctx, 'a')).toBe(false);
    expect(ctx.selectedDeckIds).toEqual([]);
  });

  it('selectAllDecks selects filtered on-device deck ids only', () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'Alpha'), onDevice('b', 'Beta'), onDevice('c', 'Alpine')];
    ctx.deckSearchQuery = 'al';
    ctx.selectAllDecks.call(ctx);
    expect(ctx.selectedDeckIds).toEqual(['a', 'c']);
  });

  it('clearDeckSelection empties selectedDeckIds', () => {
    const ctx = mountDeck();
    ctx.selectedDeckIds = ['a', 'b'];
    ctx.clearDeckSelection.call(ctx);
    expect(ctx.selectedDeckIds).toEqual([]);
  });

  it('confirmAndDeleteSelectedDecks is a no-op when nothing is selected', async () => {
    const ctx = mountDeck();
    await ctx.confirmAndDeleteSelectedDecks.call(ctx);
    expect(alpineStub.rawStores.dialog).toBeUndefined();
    expect(localMocks.deleteLocalDeck).not.toHaveBeenCalled();
  });

  it('confirmAndDeleteSelectedDecks returns when user cancels', async () => {
    const ctx = mountDeck();
    ctx.selectedDeckIds = ['d1', 'd2'];
    const p = ctx.confirmAndDeleteSelectedDecks.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    await p;
    expect(localMocks.deleteLocalDeck).not.toHaveBeenCalled();
    expect(ctx.selectedDeckIds).toEqual(['d1', 'd2']);
  });

  it('confirmAndDeleteSelectedDecks deletes multiple inactive decks and clears selection', async () => {
    alpineStub.rawStores.activeDeckId = 'active';
    const ctx = mountDeck();
    ctx.deckModalOpen = true;
    ctx.selectedDeckIds = ['other-1', 'other-2'];
    const p = ctx.confirmAndDeleteSelectedDecks.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith('other-1');
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith('other-2');
    expect(deckMocks.getCardsByDeckId).not.toHaveBeenCalled();
    expect(ctx.selectedDeckIds).toEqual([]);
    expect(ctx.deckModalOpen).toBe(true);
  });

  it('confirmAndDeleteSelectedDecks uses singular confirm title for one deck', async () => {
    const ctx = mountDeck();
    ctx.selectedDeckIds = ['solo'];
    const p = ctx.confirmAndDeleteSelectedDecks.call(ctx);
    await Promise.resolve();
    const dialog = alpineStub.rawStores.dialog as { title: string; onCancel: () => void };
    expect(dialog.title).toBe('Delete this deck and all of its cards?');
    dialog.onCancel();
    await p;
  });

  it('confirmAndDeleteSelectedDecks uses plural confirm title for multiple decks', async () => {
    const ctx = mountDeck();
    ctx.selectedDeckIds = ['a', 'b'];
    const p = ctx.confirmAndDeleteSelectedDecks.call(ctx);
    await Promise.resolve();
    const dialog = alpineStub.rawStores.dialog as { title: string; onCancel: () => void };
    expect(dialog.title).toBe('Delete these 2 decks and all of their cards?');
    dialog.onCancel();
    await p;
  });

  it('confirmAndDeleteSelectedDecks switches when active deck is in selection', async () => {
    alpineStub.rawStores.activeDeckId = 'gone';
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok([onDevice('keep', 'Keep')]));
    const ctx = mountDeck();
    ctx.deckModalOpen = true;
    ctx.selectedDeckIds = ['gone', 'other'];
    const p = ctx.confirmAndDeleteSelectedDecks.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith('gone');
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith('other');
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith('keep');
    expect(ctx.selectedDeckIds).toEqual([]);
    expect(ctx.deckModalOpen).toBe(true);
  });

  it('confirmAndDeleteSelectedDecks falls back to default id when no next deck', async () => {
    alpineStub.rawStores.activeDeckId = 'gone';
    const ctx = mountDeck();
    ctx.selectedDeckIds = ['gone'];
    ctx.refreshDeckLists = vi.fn(function (this: DeckCtx) {
      this.onDeviceDecks = [];
      this.catalogOffers = [];
      return Promise.resolve();
    });
    const p = ctx.confirmAndDeleteSelectedDecks.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith(testConsts.DEFAULT_DECK_ID);
  });

  it('confirmAndDeleteSelectedDecks picks catalog sort when on-device empty after refresh', async () => {
    alpineStub.rawStores.activeDeckId = 'gone';
    const ctx = mountDeck();
    ctx.selectedDeckIds = ['gone'];
    ctx.catalogOffers = [catalogOffer('z', 'Z'), catalogOffer('m', 'M')];
    ctx.refreshDeckLists = vi.fn(function (this: DeckCtx) {
      this.onDeviceDecks = [];
      return Promise.resolve();
    });
    const p = ctx.confirmAndDeleteSelectedDecks.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith('m');
  });

  it('deleteLocalDeckAction removes deleted id from selectedDeckIds', async () => {
    alpineStub.rawStores.activeDeckId = 'active';
    const ctx = mountDeck();
    ctx.selectedDeckIds = ['other', 'active'];
    const p = ctx.deleteLocalDeckAction.call(ctx, 'other');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.selectedDeckIds).toEqual(['active']);
  });

  it('openDeckModal reads onDevice tab from localStorage', async () => {
    localStorage.setItem(DECK_MODAL_TAB_KEY, 'onDevice');
    const ctx = mountDeck();
    await ctx.openDeckModal.call(ctx);
    expect(ctx.deckModalTab).toBe('onDevice');
  });

  it('onDecksChanged refreshes deck lists', () => {
    const ctx = mountDeck();
    const refreshSpy = vi.spyOn(ctx, 'refreshDeckLists').mockResolvedValue(undefined);
    ctx.onDecksChanged.call(ctx);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('switchDeckByNameMatches returns empty when picker is closed', () => {
    const ctx = mountDeck();
    ctx.switchDeckByName = null;
    expect(ctx.switchDeckByNameMatches.call(ctx)).toEqual([]);
  });

  it('switchDeckByNameMatches caps results at eight decks', () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = Array.from({ length: 10 }, (_, i) =>
      onDevice(`d${i}`, `Match ${i.toString().padStart(2, '0')}`),
    );
    ctx.switchDeckByName = { query: 'match', highlightIndex: 0 };
    expect(ctx.switchDeckByNameMatches.call(ctx)).toHaveLength(8);
  });

  it('onSwitchDeckByNameEvent opens the name picker', async () => {
    const ctx = mountDeck();
    const openSpy = vi.spyOn(ctx, 'openSwitchDeckByName').mockResolvedValue(undefined);
    ctx.onSwitchDeckByNameEvent.call(ctx);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('openSwitchDeckByName focuses the name input', async () => {
    const focus = vi.fn();
    const ctx = mountDeck();
    ctx.$refs.switchDeckByNameInput = { focus } as unknown as HTMLElement;
    await ctx.openSwitchDeckByName.call(ctx);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('onSwitchDeckByNameQueryInput is a no-op when picker is closed', () => {
    const ctx = mountDeck();
    ctx.switchDeckByName = null;
    ctx.onSwitchDeckByNameQueryInput.call(ctx, 'alpha');
    expect(ctx.switchDeckByName).toBeNull();
  });

  it('onSwitchDeckByNameQueryInput updates query and resets highlight when there are no matches', () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'Alpha')];
    ctx.switchDeckByName = { query: '', highlightIndex: 2 };
    ctx.onSwitchDeckByNameQueryInput.call(ctx, 'zzz');
    expect(ctx.switchDeckByName).toEqual({ query: 'zzz', highlightIndex: 0 });
  });

  it('onSwitchDeckByNameQueryInput clamps highlight when matches shrink', () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'Alpha'), onDevice('b', 'Alpine'), onDevice('c', 'Alps')];
    ctx.switchDeckByName = { query: 'al', highlightIndex: 5 };
    ctx.onSwitchDeckByNameQueryInput.call(ctx, 'alpha');
    expect(ctx.switchDeckByName?.highlightIndex).toBe(0);
    expect(ctx.switchDeckByName?.query).toBe('alpha');
  });

  it('moveSwitchDeckByNameHighlight is a no-op when picker is closed', () => {
    const ctx = mountDeck();
    ctx.switchDeckByName = null;
    ctx.moveSwitchDeckByNameHighlight.call(ctx, 1);
    expect(ctx.switchDeckByName).toBeNull();
  });

  it('moveSwitchDeckByNameHighlight is a no-op when there are no matches', () => {
    const ctx = mountDeck();
    ctx.switchDeckByName = { query: 'none', highlightIndex: 0 };
    ctx.moveSwitchDeckByNameHighlight.call(ctx, 1);
    expect(ctx.switchDeckByName?.highlightIndex).toBe(0);
  });

  it('moveSwitchDeckByNameHighlight wraps forward and backward through matches', () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'Alpha'), onDevice('b', 'Beta')];
    ctx.switchDeckByName = { query: '', highlightIndex: 1 };
    ctx.moveSwitchDeckByNameHighlight.call(ctx, 1);
    expect(ctx.switchDeckByName?.highlightIndex).toBe(0);
    ctx.moveSwitchDeckByNameHighlight.call(ctx, -1);
    expect(ctx.switchDeckByName?.highlightIndex).toBe(1);
  });

  it('onSwitchDeckByNameKeydown is a no-op when picker is closed', () => {
    const ctx = mountDeck();
    ctx.switchDeckByName = null;
    const preventDefault = vi.fn();
    ctx.onSwitchDeckByNameKeydown.call(ctx, {
      key: 'ArrowDown',
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('onSwitchDeckByNameKeydown moves highlight on arrow keys', () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'Alpha'), onDevice('b', 'Beta')];
    ctx.switchDeckByName = { query: '', highlightIndex: 0 };
    const preventDefault = vi.fn();
    ctx.onSwitchDeckByNameKeydown.call(ctx, {
      key: 'ArrowDown',
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(ctx.switchDeckByName?.highlightIndex).toBe(1);
    ctx.onSwitchDeckByNameKeydown.call(ctx, {
      key: 'ArrowUp',
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(ctx.switchDeckByName?.highlightIndex).toBe(0);
  });

  it('onSwitchDeckByNameKeydown confirms selection on Enter', async () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'Alpha')];
    ctx.switchDeckByName = { query: '', highlightIndex: 0 };
    const confirmSpy = vi
      .spyOn(ctx, 'confirmSwitchDeckByNameSelection')
      .mockResolvedValue(undefined);
    const preventDefault = vi.fn();
    ctx.onSwitchDeckByNameKeydown.call(ctx, {
      key: 'Enter',
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it('confirmSwitchDeckByNameSelection is a no-op when picker is closed', async () => {
    const ctx = mountDeck();
    ctx.switchDeckByName = null;
    const switchSpy = vi.spyOn(ctx, 'switchToDeck').mockResolvedValue(undefined);
    await ctx.confirmSwitchDeckByNameSelection.call(ctx);
    expect(switchSpy).not.toHaveBeenCalled();
  });

  it('confirmSwitchDeckByNameSelection returns without switching when there are no matches', async () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'Alpha')];
    ctx.switchDeckByName = { query: 'missing', highlightIndex: 0 };
    const switchSpy = vi.spyOn(ctx, 'switchToDeck').mockResolvedValue(undefined);
    await ctx.confirmSwitchDeckByNameSelection.call(ctx);
    expect(switchSpy).not.toHaveBeenCalled();
    expect(ctx.switchDeckByName).toEqual({ query: 'missing', highlightIndex: 0 });
  });

  it('confirmSwitchDeckByNameSelection switches to an explicitly passed deck', async () => {
    const ctx = mountDeck();
    ctx.switchDeckByName = { query: '', highlightIndex: 0 };
    const explicit = onDevice('picked', 'Picked');
    const switchSpy = vi.spyOn(ctx, 'switchToDeck').mockResolvedValue(undefined);
    await ctx.confirmSwitchDeckByNameSelection.call(ctx, explicit);
    expect(switchSpy).toHaveBeenCalledWith('picked');
    expect(ctx.switchDeckByName).toBeNull();
  });

  it('cancelSwitchDeckByName closes the picker', () => {
    const ctx = mountDeck();
    ctx.switchDeckByName = { query: 'a', highlightIndex: 0 };
    ctx.cancelSwitchDeckByName.call(ctx);
    expect(ctx.switchDeckByName).toBeNull();
  });

  it('handleDeckEscape is a no-op when neither picker nor modal is open', () => {
    const ctx = mountDeck();
    ctx.deckModalOpen = false;
    ctx.switchDeckByName = null;
    ctx.handleDeckEscape.call(ctx);
    expect(ctx.deckModalOpen).toBe(false);
  });

  it('onCycleDeckEvent ignores events with invalid direction', async () => {
    const ctx = mountDeck();
    const cycleSpy = vi.spyOn(ctx, 'cycleDeck').mockResolvedValue(undefined);
    ctx.onCycleDeckEvent.call(ctx, new CustomEvent('cycle-deck', { detail: { direction: 0 } }));
    ctx.onCycleDeckEvent.call(ctx, new CustomEvent('cycle-deck', { detail: {} }));
    expect(cycleSpy).not.toHaveBeenCalled();
  });

  it('cycleDeck starts from the first deck when active id is unknown', async () => {
    const decks = [onDevice('a', 'Alpha'), onDevice('b', 'Beta')];
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok(decks));
    alpineStub.rawStores.activeDeckId = 'missing';
    const ctx = mountDeck();
    const switchSpy = vi.spyOn(ctx, 'switchToDeck').mockResolvedValue(undefined);
    await ctx.cycleDeck.call(ctx, 1);
    expect(switchSpy).toHaveBeenCalledWith('b');
  });

  it('cycleDeck is a no-op when the next deck id matches the active id', async () => {
    const decks = [onDevice('dup', 'First'), onDevice('dup', 'Second')];
    deckMocks.listOnDeviceDeckEntries.mockResolvedValue(ok(decks));
    alpineStub.rawStores.activeDeckId = 'dup';
    const ctx = mountDeck();
    const switchSpy = vi.spyOn(ctx, 'switchToDeck').mockResolvedValue(undefined);
    await ctx.cycleDeck.call(ctx, 1);
    expect(switchSpy).not.toHaveBeenCalled();
  });

  it('onDeckDownloadComplete updates active title from catalog when deck is not on device', async () => {
    alpineStub.rawStores.activeDeckId = 'cat-1';
    alpineStub.rawStores.activeDeckTitle = 'Old title';
    deckMocks.listCatalogDeckOffers.mockResolvedValue(ok([catalogOffer('cat-1', 'Catalog title')]));
    const ctx = mountDeck();
    ctx.onDeviceDecks = [];
    await ctx.onDeckDownloadComplete.call(ctx, 'cat-1');
    await flushAsyncWork();
    expect(alpineStub.rawStores.activeDeckTitle).toBe('Catalog title');
  });

  it('onDeckDownloadComplete skips title update when deck title cannot be resolved', async () => {
    alpineStub.rawStores.activeDeckId = 'missing';
    alpineStub.rawStores.activeDeckTitle = 'Keep me';
    const ctx = mountDeck();
    ctx.onDeviceDecks = [];
    ctx.catalogOffers = [];
    await ctx.onDeckDownloadComplete.call(ctx, 'missing');
    await flushAsyncWork();
    expect(alpineStub.rawStores.activeDeckTitle).toBe('Keep me');
    expect(deckMocks.getCardsByDeckId).toHaveBeenCalledWith('missing');
  });

  it('onSwitchDeckByNameQueryInput keeps highlight in range when multiple decks match', () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('b', 'Beta'), onDevice('a', 'Alpha')];
    ctx.switchDeckByName = { query: '', highlightIndex: 5 };
    ctx.onSwitchDeckByNameQueryInput.call(ctx, 'a');
    expect(ctx.switchDeckByName?.query).toBe('a');
    expect(ctx.switchDeckByName?.highlightIndex).toBe(1);
  });

  it('onSwitchDeckByNameKeydown ignores unrelated keys', () => {
    const ctx = mountDeck();
    ctx.onDeviceDecks = [onDevice('a', 'Alpha')];
    ctx.switchDeckByName = { query: '', highlightIndex: 0 };
    const preventDefault = vi.fn();
    ctx.onSwitchDeckByNameKeydown.call(ctx, {
      key: 'a',
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(ctx.switchDeckByName).toEqual({ query: '', highlightIndex: 0 });
  });

  it('onDeckDownloadComplete shows failure when reload cards fails', async () => {
    alpineStub.rawStores.activeDeckId = 'same';
    deckMocks.getCardsByDeckId.mockResolvedValueOnce(err(qf));
    const ctx = mountDeck();
    await ctx.onDeckDownloadComplete.call(ctx, 'same');
    await flushAsyncWork();
    expect(uiMocks.showQueryFailureDialog).toHaveBeenCalledWith(qf);
  });
});
