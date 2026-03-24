import Alpine from 'alpinejs'
import type { DeckListEntry, MergedThis } from '../types/canvas.js'
import { getCardsByDeckId, LAST_DECK_STORAGE_KEY, listDecks } from '../lib/decks.js'

Alpine.data('deckComponent', () => ({
  deckModalOpen: false,
  deckList: [] as DeckListEntry[],

  async openDeckModal(this: MergedThis) {
    this.deckModalOpen = true
    const rows = await listDecks()
    this.deckList = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
    }))
  },

  closeDeckModal(this: MergedThis) {
    this.deckModalOpen = false
  },

  async switchToDeck(this: MergedThis, deckId: string) {
    const cards = await getCardsByDeckId(deckId)
    Alpine.store('shuffledCards', cards)
    Alpine.store('activeDeckId', deckId)
    localStorage.setItem(LAST_DECK_STORAGE_KEY, deckId)
    this.shuffleDeck()
    this.deckModalOpen = false
  },
}))
