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

Alpine.data('deckComponent', () => ({
  deckModalOpen: false,
  deckModalTab: 'onDevice' as DeckModalTab,
  catalogOffers: [] as CatalogDeckOffer[],
  onDeviceDecks: [] as OnDeviceDeckEntry[],
  deckSearchQuery: '',
  newLocalDeckTitle: '',
  newLocalDeckTitleError: '',

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
  },

  closeDeckModal(this: MergedThis) {
    const dialog = Alpine.store('dialog') as DialogStoreState | undefined;
    if (dialog?.open) {
      return;
    }
    this.deckModalOpen = false;
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
