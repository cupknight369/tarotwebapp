import Alpine from 'alpinejs';
import { getCardsByDeckId } from '../lib/decks.js';
import { addCardToLocalDeck, listLocalCardsByDeckId, updateLocalCard } from '../lib/localDecks.js';
import type { TarotCard } from '../types/canvas.js';

type OpenDeckEditDetail = { deckId?: string; deckTitle?: string };

type FormMode = 'edit' | 'add';

function cryptoRandomInt(len: number): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const fraction = buf[0] / (0xffffffff + 1);
  return Math.floor(fraction * len);
}

/** Match CanvasCardComponent.shuffleDeck when the active deck’s card list changes. */
function shuffleShuffledStore(): void {
  const newArray = [...(Alpine.store('shuffledCards') as TarotCard[])];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = cryptoRandomInt(newArray.length);
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  Alpine.store('shuffledCards', newArray);
}

Alpine.data('deckEditComponent', () => ({
  open: false,
  deckId: null as string | null,
  deckTitle: '',
  cards: [] as TarotCard[],
  localEmpty: false,
  loading: false,
  saveError: null as string | null,
  addError: null as string | null,
  formMode: 'edit' as FormMode,
  selectedCardId: null as string | null,
  editTitle: '',
  editNumber: 1,
  clearCensor: false,
  newCardTitle: '',
  newCardNumber: 1,

  clearFileInputs() {
    const main = document.getElementById('deck-edit-main') as HTMLInputElement | null;
    const censor = document.getElementById('deck-edit-censor') as HTMLInputElement | null;
    if (main) main.value = '';
    if (censor) censor.value = '';
  },

  clearAddFileInputs() {
    const main = document.getElementById('deck-edit-add-main') as HTMLInputElement | null;
    const censor = document.getElementById('deck-edit-add-censor') as HTMLInputElement | null;
    if (main) main.value = '';
    if (censor) censor.value = '';
  },

  onClearCensorChange() {
    if (this.clearCensor) {
      const censor = document.getElementById('deck-edit-censor') as HTMLInputElement | null;
      if (censor) censor.value = '';
    }
  },

  resetForm() {
    this.editTitle = '';
    this.editNumber = 1;
    this.clearCensor = false;
    this.clearFileInputs();
  },

  startAddMode() {
    this.formMode = 'add';
    this.selectedCardId = null;
    this.addError = null;
    this.newCardTitle = '';
    this.newCardNumber = 1;
    this.clearAddFileInputs();
    this.resetForm();
  },

  cancelAddMode() {
    this.addError = null;
    this.clearAddFileInputs();
    if (this.cards.length > 0) {
      this.formMode = 'edit';
      this.selectCard(this.cards[0].id);
    } else {
      this.formMode = 'add';
      this.selectedCardId = null;
      this.newCardTitle = '';
      this.newCardNumber = 1;
    }
  },

  async onOpen(detail: OpenDeckEditDetail) {
    const deckId = detail?.deckId;
    if (!deckId) return;
    this.deckId = deckId;
    this.deckTitle = (detail?.deckTitle ?? '').trim();
    this.open = true;
    this.saveError = null;
    this.addError = null;
    this.formMode = 'edit';
    this.loading = true;
    try {
      const localRows = await listLocalCardsByDeckId(deckId);
      this.localEmpty = localRows.length === 0;
      if (this.localEmpty) {
        this.cards = [];
        this.selectedCardId = null;
        this.resetForm();
        this.formMode = 'add';
        this.newCardTitle = '';
        this.newCardNumber = 1;
        this.clearAddFileInputs();
        return;
      }
      this.cards = await getCardsByDeckId(deckId);
      const firstId = this.cards[0]?.id ?? null;
      this.selectCard(firstId);
    } finally {
      this.loading = false;
    }
  },

  close() {
    this.open = false;
    this.deckId = null;
    this.deckTitle = '';
    this.cards = [];
    this.localEmpty = false;
    this.selectedCardId = null;
    this.saveError = null;
    this.addError = null;
    this.formMode = 'edit';
    this.newCardTitle = '';
    this.newCardNumber = 1;
    this.resetForm();
    this.clearAddFileInputs();
  },

  selectCard(id: string | null) {
    if (!id) {
      this.selectedCardId = null;
      this.resetForm();
      return;
    }
    this.formMode = 'edit';
    this.selectedCardId = id;
    this.clearCensor = false;
    this.clearFileInputs();
    const card = this.cards.find((c) => c.id === id);
    if (!card) return;
    this.editTitle = card.title;
    this.editNumber = card.num;
  },

  async submitAddCard() {
    if (!this.deckId) return;
    const title = this.newCardTitle.trim();
    if (!title) {
      this.addError = 'Title is required';
      return;
    }
    const mainInput = document.getElementById('deck-edit-add-main') as HTMLInputElement | null;
    const censorInput = document.getElementById('deck-edit-add-censor') as HTMLInputElement | null;
    const mainFile = mainInput?.files?.[0];
    if (!mainFile) {
      this.addError = 'Main image is required';
      return;
    }
    const censorFile = censorInput?.files?.[0];
    this.addError = null;
    const deckId = this.deckId;
    try {
      const row = await addCardToLocalDeck({
        deckId,
        title,
        number: Number(this.newCardNumber) || 1,
        imageFile: mainFile,
        censorFile: censorFile && censorFile.size > 0 ? censorFile : null,
      });
      this.clearAddFileInputs();
      this.newCardTitle = '';
      this.newCardNumber = 1;
      this.localEmpty = false;
      this.cards = await getCardsByDeckId(deckId);
      this.formMode = 'edit';
      this.selectCard(row.id);
      const activeId = Alpine.store('activeDeckId') as string;
      if (activeId === deckId) {
        Alpine.store('shuffledCards', this.cards);
        shuffleShuffledStore();
      }
    } catch (e) {
      this.addError = e instanceof Error ? e.message : 'Could not add card';
    }
  },

  async saveCard() {
    if (!this.deckId || !this.selectedCardId || this.localEmpty || this.formMode !== 'edit') return;
    const title = this.editTitle.trim();
    if (!title) return;
    const n = Number(this.editNumber);
    if (!Number.isFinite(n)) return;
    this.saveError = null;
    const mainInput = document.getElementById('deck-edit-main') as HTMLInputElement | null;
    const censorInput = document.getElementById('deck-edit-censor') as HTMLInputElement | null;
    const mainFile = mainInput?.files?.[0];
    const censorFile = censorInput?.files?.[0];
    try {
      await updateLocalCard({
        cardId: this.selectedCardId,
        title,
        number: n,
        mainImageFile: mainFile && mainFile.size > 0 ? mainFile : null,
        censorImageFile: this.clearCensor
          ? null
          : censorFile && censorFile.size > 0
            ? censorFile
            : null,
        censorClear: this.clearCensor,
      });
    } catch (e) {
      this.saveError = e instanceof Error ? e.message : 'Save failed';
      return;
    }
    this.clearFileInputs();
    this.clearCensor = false;
    const sel = this.selectedCardId;
    this.cards = await getCardsByDeckId(this.deckId);
    this.selectCard(sel);
    const activeId = Alpine.store('activeDeckId') as string;
    if (activeId === this.deckId) {
      Alpine.store('shuffledCards', this.cards);
    }
  },
}));
