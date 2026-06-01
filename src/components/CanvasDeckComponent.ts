import Alpine from 'alpinejs';
import type {
  CatalogDeckOffer,
  DeckModalTab,
  MergedThis,
  OnDeviceDeckEntry,
} from '../types/canvas.js';
import type { DialogStoreState } from '../types/dialog.js';
import {
  DEFAULT_DECK_ID,
  getCardsByDeckId,
  LAST_DECK_STORAGE_KEY,
  listCatalogDeckOffers,
  listOnDeviceDeckEntries,
} from '../lib/decks.js';
import { downloadCloudDeckToDevice, downloadFailureMessage } from '../lib/cloudDeckDownload.js';
import { logError } from '../lib/logError.js';
import { showQueryFailureDialog } from '../lib/queryFailureUi.js';
import { createLocalDeck, deleteLocalDeck } from '../lib/localDecks.js';
import { localDeckTitleSchema } from '../validation/decks.js';
import { zodFirstIssue } from '../validation/zodErrors.js';

export const DECK_MODAL_TAB_KEY = 'deck_modal_tab';

function readDeckModalTab(): DeckModalTab {
  try {
    const v = localStorage.getItem(DECK_MODAL_TAB_KEY);
    if (v === 'store' || v === 'onDevice') return v;
  } catch {
    /* ignore */
  }
  return 'onDevice';
}

function persistDeckModalTab(tab: DeckModalTab): void {
  try {
    localStorage.setItem(DECK_MODAL_TAB_KEY, tab);
  } catch {
    /* ignore */
  }
}

/**
 * @param query - Raw search string from the deck modal (title-only match).
 * @param title - Deck title to test.
 * @returns True when `query` is empty/whitespace or when `title` contains the trimmed query,
 *   case-insensitively.
 */
function deckTitleMatchesSearch(query: string, title: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  return title.toLowerCase().includes(q);
}

const SWITCH_DECK_BY_NAME_MATCH_LIMIT = 8;

Alpine.data('deckComponent', () => ({
  deckModalOpen: false,
  deckModalTab: 'onDevice' as DeckModalTab,
  catalogOffers: [] as CatalogDeckOffer[],
  onDeviceDecks: [] as OnDeviceDeckEntry[],
  deckSearchQuery: '',
  newLocalDeckTitle: '',
  newLocalDeckTitleError: '',
  switchDeckByName: null as null | {
    query: string;
    highlightIndex: number;
  },

  setDeckModalTab(this: MergedThis, tab: DeckModalTab) {
    this.deckModalTab = tab;
    persistDeckModalTab(tab);
  },

  filteredOnDeviceDecks(this: MergedThis): OnDeviceDeckEntry[] {
    return this.onDeviceDecks.filter((d) => deckTitleMatchesSearch(this.deckSearchQuery, d.title));
  },

  filteredCatalogOffers(this: MergedThis): CatalogDeckOffer[] {
    return this.catalogOffers.filter((c) => deckTitleMatchesSearch(this.deckSearchQuery, c.title));
  },

  switchDeckByNameMatches(this: MergedThis): OnDeviceDeckEntry[] {
    if (!this.switchDeckByName) {
      return [];
    }
    const query = this.switchDeckByName.query;
    const filtered = this.onDeviceDecks.filter((d) => deckTitleMatchesSearch(query, d.title));
    filtered.sort((a, b) => a.title.localeCompare(b.title));
    return filtered.slice(0, SWITCH_DECK_BY_NAME_MATCH_LIMIT);
  },

  onDecksChanged(this: MergedThis) {
    void this.refreshDeckLists();
  },

  async refreshDeckLists(this: MergedThis) {
    const onDeviceRes = await listOnDeviceDeckEntries();
    if (!onDeviceRes.ok) {
      logError('deckComponent.refreshDeckLists.onDevice', onDeviceRes.error);
      showQueryFailureDialog(onDeviceRes.error);
      return;
    }
    this.onDeviceDecks = onDeviceRes.value;

    this.catalogOffers = [];
    void (async () => {
      const catalogRes = await listCatalogDeckOffers();
      if (!catalogRes.ok) {
        logError('deckComponent.refreshDeckLists.catalog', catalogRes.error);
        return;
      }
      this.catalogOffers = catalogRes.value;
      const refreshed = await listOnDeviceDeckEntries();
      if (refreshed.ok) {
        this.onDeviceDecks = refreshed.value;
      }
    })();
  },

  async openDeckModal(this: MergedThis) {
    this.deckModalOpen = true;
    this.deckSearchQuery = '';
    this.newLocalDeckTitleError = '';
    this.deckModalTab = readDeckModalTab();
    await this.refreshDeckLists();
    this.$nextTick(() => {
      const el = this.$refs.deckModalSearchInput as HTMLInputElement | undefined;
      el?.focus();
    });
  },

  closeDeckModal(this: MergedThis) {
    const dialog = Alpine.store('dialog') as DialogStoreState | undefined;
    if (dialog?.open) {
      return;
    }
    this.deckModalOpen = false;
  },

  async cycleDeck(this: MergedThis, direction: 1 | -1): Promise<void> {
    const onDeviceRes = await listOnDeviceDeckEntries();
    if (!onDeviceRes.ok) {
      logError('deckComponent.cycleDeck', onDeviceRes.error);
      showQueryFailureDialog(onDeviceRes.error);
      return;
    }
    const decks = onDeviceRes.value;
    if (decks.length <= 1) {
      return;
    }
    this.onDeviceDecks = decks;
    const activeId = Alpine.store('activeDeckId') as string;
    const currentIndex = decks.findIndex((d) => d.id === activeId);
    const startIndex = currentIndex >= 0 ? currentIndex : 0;
    const nextIndex = (startIndex + direction + decks.length) % decks.length;
    const nextDeck = decks[nextIndex];
    if (nextDeck.id === activeId) {
      return;
    }
    await this.switchToDeck(nextDeck.id);
  },

  onCycleDeckEvent(this: MergedThis, event: Event): void {
    const detail = (event as CustomEvent<{ direction: 1 | -1 }>).detail;
    if (detail?.direction !== 1 && detail?.direction !== -1) {
      return;
    }
    void this.cycleDeck(detail.direction);
  },

  onOpenDeckModalEvent(this: MergedThis): void {
    void this.openDeckModal();
  },

  onSwitchDeckByNameEvent(this: MergedThis): void {
    void this.openSwitchDeckByName();
  },

  async openSwitchDeckByName(this: MergedThis): Promise<void> {
    await this.refreshDeckLists();
    this.switchDeckByName = {
      query: '',
      highlightIndex: 0,
    };
    this.$nextTick(() => {
      const el = this.$refs.switchDeckByNameInput as HTMLInputElement | undefined;
      el?.focus();
    });
  },

  onSwitchDeckByNameQueryInput(this: MergedThis, value: string): void {
    if (!this.switchDeckByName) {
      return;
    }
    const filtered = this.onDeviceDecks.filter((d) => deckTitleMatchesSearch(value, d.title));
    filtered.sort((a, b) => a.title.localeCompare(b.title));
    const matchCount = Math.min(filtered.length, SWITCH_DECK_BY_NAME_MATCH_LIMIT);
    let highlightIndex = this.switchDeckByName.highlightIndex;
    if (matchCount === 0) {
      highlightIndex = 0;
    } else {
      highlightIndex = Math.min(highlightIndex, matchCount - 1);
    }
    this.switchDeckByName = {
      ...this.switchDeckByName,
      query: value,
      highlightIndex,
    };
  },

  moveSwitchDeckByNameHighlight(this: MergedThis, delta: 1 | -1): void {
    if (!this.switchDeckByName) {
      return;
    }
    const matches = this.switchDeckByNameMatches();
    const n = matches.length;
    if (n === 0) {
      return;
    }
    const idx = (this.switchDeckByName.highlightIndex + delta + n) % n;
    this.switchDeckByName = { ...this.switchDeckByName, highlightIndex: idx };
  },

  onSwitchDeckByNameKeydown(this: MergedThis, event: KeyboardEvent): void {
    if (!this.switchDeckByName) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveSwitchDeckByNameHighlight(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveSwitchDeckByNameHighlight(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      void this.confirmSwitchDeckByNameSelection();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelSwitchDeckByName();
    }
  },

  async confirmSwitchDeckByNameSelection(
    this: MergedThis,
    deck?: OnDeviceDeckEntry,
  ): Promise<void> {
    const picker = this.switchDeckByName;
    if (!picker) {
      return;
    }
    const matches = this.switchDeckByNameMatches();
    let chosen: OnDeviceDeckEntry | undefined = deck;
    if (!chosen) {
      if (matches.length === 0) {
        return;
      }
      const idx = Math.min(Math.max(0, picker.highlightIndex), matches.length - 1);
      chosen = matches[idx];
    }
    this.switchDeckByName = null;
    await this.switchToDeck(chosen.id);
  },

  cancelSwitchDeckByName(this: MergedThis): void {
    this.switchDeckByName = null;
  },

  handleDeckEscape(this: MergedThis): void {
    if (this.switchDeckByName) {
      this.cancelSwitchDeckByName();
      return;
    }
    if (this.deckModalOpen) {
      this.closeDeckModal();
    }
  },

  async switchToDeck(this: MergedThis, deckId: string, keepDeckModalOpen = false) {
    const cardsRes = await getCardsByDeckId(deckId);
    if (!cardsRes.ok) {
      logError('deckComponent.switchToDeck', cardsRes.error);
      showQueryFailureDialog(cardsRes.error);
      return;
    }
    const cards = cardsRes.value;
    const title =
      this.onDeviceDecks.find((d) => d.id === deckId)?.title ??
      this.catalogOffers.find((c) => c.id === deckId)?.title ??
      '';
    Alpine.store('shuffledCards', cards);
    Alpine.store('activeDeckId', deckId);
    Alpine.store('activeDeckTitle', title);
    localStorage.setItem(LAST_DECK_STORAGE_KEY, deckId);
    this.shuffleDeck();
    if (!keepDeckModalOpen) {
      this.deckModalOpen = false;
    }
  },

  async createLocalDeckAction(this: MergedThis) {
    const parsed = localDeckTitleSchema.safeParse(this.newLocalDeckTitle);
    if (!parsed.success) {
      this.newLocalDeckTitleError = zodFirstIssue(parsed.error);
      return;
    }
    this.newLocalDeckTitleError = '';
    await createLocalDeck(parsed.data, null);
    this.newLocalDeckTitle = '';
    await this.refreshDeckLists();
  },

  async downloadCatalogDeckAction(this: MergedThis, deckId: string) {
    const downloadRes = await downloadCloudDeckToDevice(deckId);
    if (!downloadRes.ok) {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: downloadFailureMessage(downloadRes.error),
        confirmLabel: 'Ok',
        cancelLabelVisible: false,
        onConfirm: () => {},
      });
      if (downloadRes.error.kind === 'queued') {
        await this.refreshDeckLists();
      }
      return;
    }
    await this.finishDownloadedDeck(deckId);
  },

  async onDeckDownloadComplete(this: MergedThis, deckId: string) {
    await this.finishDownloadedDeck(deckId);
  },

  async finishDownloadedDeck(this: MergedThis, deckId: string) {
    await this.refreshDeckLists();
    const activeId = Alpine.store('activeDeckId') as string;
    if (activeId === deckId) {
      const title =
        this.onDeviceDecks.find((d) => d.id === deckId)?.title ??
        this.catalogOffers.find((c) => c.id === deckId)?.title ??
        '';
      if (title) {
        Alpine.store('activeDeckTitle', title);
      }
      const cardsRes = await getCardsByDeckId(deckId);
      if (!cardsRes.ok) {
        logError('deckComponent.finishDownloadedDeck.reloadCards', cardsRes.error);
        showQueryFailureDialog(cardsRes.error);
        return;
      }
      Alpine.store('shuffledCards', cardsRes.value);
      this.shuffleDeck();
    }
  },

  async removeCatalogInstallAction(this: MergedThis, deckId: string) {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: 'Remove this deck from this device?',
        confirmLabel: 'Remove',
        cancelLabel: 'Cancel',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;

    const wasActive = (Alpine.store('activeDeckId') as string) === deckId;
    await deleteLocalDeck(deckId);
    await this.refreshDeckLists();

    if (wasActive) {
      const sorted = [...this.catalogOffers].sort((a, b) => a.title.localeCompare(b.title));
      const nextId = this.onDeviceDecks[0]?.id ?? sorted[0]?.id ?? DEFAULT_DECK_ID;
      await this.switchToDeck(nextId);
    }
  },

  async deleteLocalDeckAction(this: MergedThis, deckId: string): Promise<void> {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: 'Delete this deck and all of its cards?',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;

    const wasActive = (Alpine.store('activeDeckId') as string) === deckId;
    await deleteLocalDeck(deckId);
    await this.refreshDeckLists();

    if (wasActive) {
      const sorted = [...this.catalogOffers].sort((a, b) => a.title.localeCompare(b.title));
      const nextId = this.onDeviceDecks[0]?.id ?? sorted[0]?.id ?? DEFAULT_DECK_ID;
      await this.switchToDeck(nextId, true);
    }
    this.deckModalOpen = true;
  },
}));
