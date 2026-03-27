import Alpine from 'alpinejs'
import type { DeckListEntry, MergedThis } from '../types/canvas.js'
import {
  DEFAULT_DECK_ID,
  getCardsByDeckId,
  LAST_DECK_STORAGE_KEY,
  listDecks,
} from '../lib/decks.js'
import { addCardToLocalDeck, createLocalDeck, deleteLocalDeck } from '../lib/localDecks.js'

Alpine.data('deckComponent', () => ({
  deckModalOpen: false,
  deckList: [] as DeckListEntry[],
  newLocalDeckTitle: '',
  addCardDeckId: null as string | null,
  addCardTitle: '',
  addCardNumber: 1,

  async openDeckModal(this: MergedThis) {
    this.deckModalOpen = true
    const rows = await listDecks()
    this.deckList = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      source: r.source,
    }))
  },

  closeDeckModal(this: MergedThis) {
    this.deckModalOpen = false
    this.addCardDeckId = null
  },

  async switchToDeck(this: MergedThis, deckId: string) {
    const cards = await getCardsByDeckId(deckId)
    const rows = await listDecks()
    Alpine.store('shuffledCards', cards)
    Alpine.store('activeDeckId', deckId)
    Alpine.store('activeDeckTitle', rows.find((d) => d.id === deckId)?.title ?? '')
    localStorage.setItem(LAST_DECK_STORAGE_KEY, deckId)
    this.shuffleDeck()
    this.deckModalOpen = false
  },

  async createLocalDeckAction(this: MergedThis) {
    const title = this.newLocalDeckTitle.trim()
    if (!title) return
    await createLocalDeck(title, null)
    this.newLocalDeckTitle = ''
    const rows = await listDecks()
    this.deckList = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      source: r.source,
    }))
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
    const mainInput = this.$refs.addCardMainFile as HTMLInputElement | undefined
    const file = mainInput?.files?.[0]
    if (!file) return
    const censorInput = this.$refs.addCardCensorFile as HTMLInputElement | undefined
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
    const rows = await listDecks()
    this.deckList = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      source: r.source,
    }))
  },

  async deleteLocalDeckAction(this: MergedThis, deckId: string): Promise<void> {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: 'Delete this local deck and all of its cards?',
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

    const rows = await listDecks()
    this.deckList = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      source: r.source,
    }))

    if (wasActive) {
      const nextId =
        rows.find((d) => d.source === 'cloud')?.id ??
        rows[0]?.id ??
        DEFAULT_DECK_ID
      await this.switchToDeck(nextId)
    }
  },
}))
