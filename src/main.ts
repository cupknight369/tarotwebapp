import Alpine from 'alpinejs'
import './input.css'

import { initAuthStore } from './stores/authStore.js'
import { initSettingsStore } from './stores/settingsStore.js'
import { startCardImagePrefetch } from './lib/cardImageUrls.js'
import {
  DEFAULT_DECK_ID,
  getCardsByDeckId,
  getKnownDeckIds,
  LAST_DECK_STORAGE_KEY,
  listCatalogDeckOffers,
  listOnDeviceDeckEntries,
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
import './components/DeckEditComponent'

declare global {
  interface Window { Alpine: typeof Alpine }
}

window.Alpine = Alpine

Alpine.store('shuffledCards', [])
/** Alpine stores must not use `null` — internal recursion expects an object. Use '' until bootstrap. */
Alpine.store('activeDeckId', '')
Alpine.store('activeDeckTitle', '')

async function bootstrapDeck(): Promise<void> {
  let deckId = localStorage.getItem(LAST_DECK_STORAGE_KEY)
  const [knownIds, catalogOffers, onDevice] = await Promise.all([
    getKnownDeckIds(),
    listCatalogDeckOffers(),
    listOnDeviceDeckEntries(),
  ])
  if (!deckId || !knownIds.has(deckId)) {
    const sorted = [...catalogOffers].sort((a, b) => a.title.localeCompare(b.title))
    deckId = sorted[0]?.id ?? onDevice[0]?.id ?? DEFAULT_DECK_ID
  }
  const cards = await getCardsByDeckId(deckId)
  const title =
    onDevice.find((d) => d.id === deckId)?.title ??
    catalogOffers.find((c) => c.id === deckId)?.title ??
    ''
  Alpine.store('shuffledCards', cards)
  Alpine.store('activeDeckId', deckId)
  Alpine.store('activeDeckTitle', title)
  localStorage.setItem(LAST_DECK_STORAGE_KEY, deckId)
}

;(async () => {
  await initAuthStore()
  startCardImagePrefetch()
  initSettingsStore()
  Alpine.start()
  try {
    await bootstrapDeck()
  } catch (e) {
    console.error('bootstrapDeck failed', e)
  }
})()
