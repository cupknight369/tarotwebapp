import Alpine from 'alpinejs';
import './input.css';

import { initAuthStore } from './stores/authStore.js';
import { initSettingsStore } from './stores/settingsStore.js';
import { startCardImagePrefetch } from './lib/cardImageUrls.js';
import {
  DEFAULT_DECK_ID,
  getCardsByDeckId,
  getKnownDeckIds,
  LAST_DECK_STORAGE_KEY,
  listCatalogDeckOffers,
  listOnDeviceDeckEntries,
} from './lib/decks.js';
import { logError } from './lib/logError.js';
import { showQueryFailureDialog } from './lib/queryFailureUi.js';
import './components/CanvasScaleComponent';
import './components/CanvasCardComponent';
import './components/CanvasTextLabelComponent';
import './components/CanvasComponent';
import './components/CanvasStateComponent';
import './components/CanvasDeckComponent';
import './components/DialogComponent';
import './components/SettingsComponent';
import './components/AuthComponent';
import './components/DeckEditComponent';

declare global {
  interface Window {
    Alpine: typeof Alpine;
  }
}

window.Alpine = Alpine;

Alpine.store('shuffledCards', []);
/** Alpine stores must not use `null` — internal recursion expects an object. Use '' until bootstrap. */
Alpine.store('activeDeckId', '');
Alpine.store('activeDeckTitle', '');

/** Loads the last or default deck into Alpine stores and persists `last_deck_id`. */
async function bootstrapDeck(): Promise<void> {
  let deckId = localStorage.getItem(LAST_DECK_STORAGE_KEY);
  const [knownRes, catalogRes, onDeviceRes] = await Promise.all([
    getKnownDeckIds(),
    listCatalogDeckOffers(),
    listOnDeviceDeckEntries(),
  ]);
  const firstFailure =
    !knownRes.ok ? knownRes.error : !catalogRes.ok ? catalogRes.error : !onDeviceRes.ok ? onDeviceRes.error : null;
  if (firstFailure) {
    logError('bootstrapDeck.loadDeckLists', firstFailure);
    showQueryFailureDialog(firstFailure);
  }
  const knownIds = knownRes.ok ? knownRes.value : new Set<string>();
  const catalogOffers = catalogRes.ok ? catalogRes.value : [];
  const onDevice = onDeviceRes.ok ? onDeviceRes.value : [];

  if (!deckId || !knownIds.has(deckId)) {
    const sorted = [...catalogOffers].sort((a, b) => a.title.localeCompare(b.title));
    deckId = sorted[0]?.id ?? onDevice[0]?.id ?? DEFAULT_DECK_ID;
  }
  const cardsRes = await getCardsByDeckId(deckId);
  if (!cardsRes.ok) {
    logError('bootstrapDeck.getCardsByDeckId', cardsRes.error);
    showQueryFailureDialog(cardsRes.error);
    Alpine.store('shuffledCards', []);
    Alpine.store('activeDeckId', deckId);
    Alpine.store('activeDeckTitle', '');
    localStorage.setItem(LAST_DECK_STORAGE_KEY, deckId);
    return;
  }
  const cards = cardsRes.value;
  const title =
    onDevice.find((d) => d.id === deckId)?.title ??
    catalogOffers.find((c) => c.id === deckId)?.title ??
    '';
  Alpine.store('shuffledCards', cards);
  Alpine.store('activeDeckId', deckId);
  Alpine.store('activeDeckTitle', title);
  localStorage.setItem(LAST_DECK_STORAGE_KEY, deckId);
}

void (async () => {
  await initAuthStore();
  startCardImagePrefetch();
  initSettingsStore();
  Alpine.start();
  try {
    await bootstrapDeck();
  } catch (e) {
    logError('bootstrapDeck.unexpected', e);
  }
})();
