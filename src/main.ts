import Alpine from 'alpinejs'
import './input.css'

import { initAuthStore } from './stores/authStore.js'
import { initSettingsStore } from './stores/settingsStore.js'
import { startCardImagePrefetch } from './lib/cardImageUrls.js'
import {
  DEFAULT_DECK_ID,
  getCardsByDeckId,
  LAST_DECK_STORAGE_KEY,
  listDecks,
} from './lib/decks.js'
import './components/CanvasScaleComponent'
import './components/CanvasCardComponent'
import './components/CanvasTextLabelComponent'
import './components/CanvasComponent'
import './components/CanvasStateComponent'
import './components/CanvasDeckComponent'
import './components/DialogComponent'
import './components/SettingsComponent'
import './components/AuthComponent'

declare global {
  interface Window { Alpine: typeof Alpine }
}

window.Alpine = Alpine

Alpine.store('shuffledCards', [])
Alpine.store('activeDeckId', null as string | null)

async function bootstrapDeck(): Promise<void> {
  let deckId = localStorage.getItem(LAST_DECK_STORAGE_KEY)
  const decks = await listDecks()
  if (!deckId || !decks.some((d) => d.id === deckId)) {
    deckId = decks[0]?.id ?? DEFAULT_DECK_ID
  }
  const cards = await getCardsByDeckId(deckId)
  Alpine.store('shuffledCards', cards)
  Alpine.store('activeDeckId', deckId)
  localStorage.setItem(LAST_DECK_STORAGE_KEY, deckId)
}

;(async () => {
  await initAuthStore()
  startCardImagePrefetch()
  initSettingsStore()
  await bootstrapDeck()
  Alpine.start()
})()
