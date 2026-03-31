import Alpine from 'alpinejs'
import type { CatalogDeckOffer, DeckModalTab, MergedThis, OnDeviceDeckEntry } from '../types/canvas.js'
import {
  DEFAULT_DECK_ID,
  getCardsByDeckId,
  LAST_DECK_STORAGE_KEY,
  listCatalogDeckOffers,
  listOnDeviceDeckEntries,
} from '../lib/decks.js'
import { downloadCloudDeckToDevice } from '../lib/cloudDeckDownload.js'
import { addCardToLocalDeck, createLocalDeck, deleteLocalDeck } from '../lib/localDecks.js'

export const DECK_MODAL_TAB_KEY = 'deck_modal_tab'

function readDeckModalTab(): DeckModalTab {
  try {
    const v = localStorage.getItem(DECK_MODAL_TAB_KEY)
    if (v === 'store' || v === 'onDevice') return v
  } catch {
    /* ignore */
  }
  return 'onDevice'
}

function persistDeckModalTab(tab: DeckModalTab): void {
  try {
    localStorage.setItem(DECK_MODAL_TAB_KEY, tab)
  } catch {
    /* ignore */
  }
}

Alpine.data('deckComponent', () => ({
  deckModalOpen: false,
  deckModalTab: 'onDevice' as DeckModalTab,
  catalogOffers: [] as CatalogDeckOffer[],
  onDeviceDecks: [] as OnDeviceDeckEntry[],
  newLocalDeckTitle: '',
  addCardDeckId: null as string | null,
  addCardTitle: '',
  addCardNumber: 1,

  setDeckModalTab(this: MergedThis, tab: DeckModalTab) {
    this.deckModalTab = tab
    persistDeckModalTab(tab)
  },

  async refreshDeckLists(this: MergedThis) {
    const [catalog, onDevice] = await Promise.all([listCatalogDeckOffers(), listOnDeviceDeckEntries()])
    this.catalogOffers = catalog
    this.onDeviceDecks = onDevice
  },

  async openDeckModal(this: MergedThis) {
    this.deckModalOpen = true
    this.deckModalTab = readDeckModalTab()
    await this.refreshDeckLists()
  },

  closeDeckModal(this: MergedThis) {
    this.deckModalOpen = false
    this.addCardDeckId = null
  },

  async switchToDeck(this: MergedThis, deckId: string) {
    const cards = await getCardsByDeckId(deckId)
    const title =
      this.onDeviceDecks.find((d) => d.id === deckId)?.title ??
      this.catalogOffers.find((c) => c.id === deckId)?.title ??
      ''
    Alpine.store('shuffledCards', cards)
    Alpine.store('activeDeckId', deckId)
    Alpine.store('activeDeckTitle', title)
    localStorage.setItem(LAST_DECK_STORAGE_KEY, deckId)
    this.shuffleDeck()
    this.deckModalOpen = false
  },

  async createLocalDeckAction(this: MergedThis) {
    const title = this.newLocalDeckTitle.trim()
    if (!title) return
    await createLocalDeck(title, null)
    this.newLocalDeckTitle = ''
    await this.refreshDeckLists()
  },

  async downloadCatalogDeckAction(this: MergedThis, deckId: string) {
    try {
      await downloadCloudDeckToDevice(deckId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Download failed'
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: msg,
        confirmLabel: 'Ok',
        cancelLabelVisible: false,
        onConfirm: () => {},
      })
      return
    }
    await this.refreshDeckLists()
    const activeId = Alpine.store('activeDeckId') as string
    if (activeId === deckId) {
      const cards = await getCardsByDeckId(deckId)
      Alpine.store('shuffledCards', cards)
      this.shuffleDeck()
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
      })
    })
    if (!confirmed) return

    const wasActive = (Alpine.store('activeDeckId') as string) === deckId
    await deleteLocalDeck(deckId)
    await this.refreshDeckLists()

    if (wasActive) {
      const sorted = [...this.catalogOffers].sort((a, b) => a.title.localeCompare(b.title))
      const nextId =
        this.onDeviceDecks[0]?.id ?? sorted[0]?.id ?? DEFAULT_DECK_ID
      await this.switchToDeck(nextId)
    }
  },

  startAddCard(this: MergedThis, deckId: string) {
    this.addCardDeckId = deckId
    this.addCardTitle = ''
    this.addCardNumber = 1
  },

  cancelAddCard(this: MergedThis) {
    this.addCardDeckId = null
  },

  async submitAddCard(this: MergedThis) {
    const deckId = this.addCardDeckId
    if (!deckId) return
    const title = this.addCardTitle.trim()
    if (!title) return
    const mainInput = document.getElementById(`add-card-main-${deckId}`) as HTMLInputElement | null
    const file = mainInput?.files?.[0]
    if (!file) return
    const censorInput = document.getElementById(`add-card-censor-${deckId}`) as HTMLInputElement | null
    const censorFile = censorInput?.files?.[0]
    await addCardToLocalDeck({
      deckId,
      title,
      number: Number(this.addCardNumber) || 1,
      imageFile: file,
      censorFile: censorFile && censorFile.size > 0 ? censorFile : null,
    })
    if (mainInput) mainInput.value = ''
    if (censorInput) censorInput.value = ''
    this.addCardDeckId = null
    const activeId = Alpine.store('activeDeckId') as string
    if (activeId === deckId) {
      const cards = await getCardsByDeckId(deckId)
      Alpine.store('shuffledCards', cards)
      this.shuffleDeck()
    }
    await this.refreshDeckLists()
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
      })
    })
    if (!confirmed) return

    if (this.addCardDeckId === deckId) {
      this.addCardDeckId = null
    }

    const wasActive = (Alpine.store('activeDeckId') as string) === deckId
    await deleteLocalDeck(deckId)
    await this.refreshDeckLists()

    if (wasActive) {
      const sorted = [...this.catalogOffers].sort((a, b) => a.title.localeCompare(b.title))
      const nextId =
        this.onDeviceDecks[0]?.id ?? sorted[0]?.id ?? DEFAULT_DECK_ID
      await this.switchToDeck(nextId)
    }
  },
}))
