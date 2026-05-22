import Alpine from 'alpinejs';
import { getCardsByDeckId } from '../lib/decks.js';
import { logError } from '../lib/logError.js';
import { queryFailureMessage } from '../lib/supabaseErrors.js';
import {
  addCardToLocalDeck,
  deleteLocalCards,
  getLocalCardsByIds,
  listLocalCardsByDeckId,
  updateLocalCard,
} from '../lib/localDecks.js';
import {
  listCorrespondencesGrouped,
  updateLocalCardCorrespondenceIds,
  type CorrespondenceGroupSection,
} from '../lib/localCorrespondences.js';
import type { TarotCard } from '../types/canvas.js';
import { addLocalCardFormSchema, saveLocalCardFormSchema } from '../validation/decks.js';
import { zodFirstIssue } from '../validation/zodErrors.js';

type OpenDeckEditDetail = { deckId?: string; deckTitle?: string };

type FormMode = 'edit' | 'add';

/**
 * @param query - Raw search string from the deck edit modal.
 * @param card - Card title and number to test.
 * @returns True when `query` is empty/whitespace, or when title contains the trimmed query
 *   case-insensitively, or when `String(card.num)` contains the trimmed query as a substring.
 */
function cardMatchesDeckEditSearch(query: string, card: { title: string; num: number }): boolean {
  const raw = query.trim();
  if (raw === '') return true;
  const q = raw.toLowerCase();
  if (card.title.toLowerCase().includes(q)) return true;
  return String(card.num).includes(raw);
}

/**
 * @param query - Raw search string from the deck edit correspondence filter.
 * @param section - Correspondence group and its items.
 * @returns Filtered section with items whose title matches the query case-insensitively, or
 *   all items when the group title matches; empty items when nothing matches.
 */
function filterCorrespondenceSectionBySearch(
  query: string,
  section: CorrespondenceGroupSection,
): CorrespondenceGroupSection {
  const raw = query.trim();
  if (raw === '') return section;
  const q = raw.toLowerCase();
  if (section.group.title.toLowerCase().includes(q)) return section;
  const items = section.items.filter((item) => item.title.toLowerCase().includes(q));
  return { group: section.group, items };
}

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
  deleteError: null as string | null,
  loadError: null as string | null,
  formMode: 'edit' as FormMode,
  selectedCardIds: [] as string[],
  editTitle: '',
  editNumber: 1,
  clearCensor: false,
  newCardTitle: '',
  newCardNumber: 1,
  cardSearchQuery: '',
  correspondenceSearchQuery: '',
  correspondenceSections: [] as CorrespondenceGroupSection[],
  selectedCorrespondenceIds: [] as string[],
  correspondenceAssignError: null as string | null,

  filteredDeckEditCards(): TarotCard[] {
    return this.cards.filter((c) => cardMatchesDeckEditSearch(this.cardSearchQuery, c));
  },

  filteredCorrespondenceSections(): CorrespondenceGroupSection[] {
    return this.correspondenceSections
      .map((sec) => filterCorrespondenceSectionBySearch(this.correspondenceSearchQuery, sec))
      .filter((sec) => sec.items.length > 0);
  },

  async onCorrespondencesChanged() {
    if (!this.open) return;
    await this.refreshCorrespondenceLibrary();
    await this.loadCorrespondenceSelection();
  },

  async refreshCorrespondenceLibrary() {
    try {
      this.correspondenceSections = await listCorrespondencesGrouped();
    } catch (e) {
      logError('deckEdit.refreshCorrespondenceLibrary', e);
    }
  },

  async loadCorrespondenceSelection() {
    this.correspondenceAssignError = null;
    if (this.selectedCardIds.length !== 1) {
      this.selectedCorrespondenceIds = [];
      return;
    }
    const id = this.selectedCardIds[0];
    try {
      const map = await getLocalCardsByIds([id]);
      const row = map.get(id);
      this.selectedCorrespondenceIds = [...(row?.correspondence_ids ?? [])];
    } catch (e) {
      logError('deckEdit.loadCorrespondenceSelection', e);
      this.selectedCorrespondenceIds = [];
    }
  },

  async setCorrespondenceChecked(correspondenceId: string, checked: boolean) {
    if (this.selectedCardIds.length !== 1 || !this.deckId) return;
    const cardId = this.selectedCardIds[0];
    const set = new Set(this.selectedCorrespondenceIds);
    if (checked) set.add(correspondenceId);
    else set.delete(correspondenceId);
    this.selectedCorrespondenceIds = [...set];
    try {
      await updateLocalCardCorrespondenceIds(cardId, this.selectedCorrespondenceIds);
      this.correspondenceAssignError = null;
      const activeId = Alpine.store('activeDeckId') as string;
      if (activeId === this.deckId) {
        const cardsRes = await getCardsByDeckId(this.deckId);
        if (cardsRes.ok) Alpine.store('shuffledCards', cardsRes.value);
      }
    } catch (e) {
      this.correspondenceAssignError =
        e instanceof Error ? e.message : 'Could not update correspondences';
      await this.loadCorrespondenceSelection();
    }
  },

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
    this.selectedCardIds = [];
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
      this.selectedCardIds = [];
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
    this.deleteError = null;
    this.loadError = null;
    this.cardSearchQuery = '';
    this.correspondenceSearchQuery = '';
    this.formMode = 'edit';
    this.loading = true;
    try {
      const localRows = await listLocalCardsByDeckId(deckId);
      this.localEmpty = localRows.length === 0;
      if (this.localEmpty) {
        this.cards = [];
        this.selectedCardIds = [];
        this.correspondenceSections = [];
        this.selectedCorrespondenceIds = [];
        this.resetForm();
        this.formMode = 'add';
        this.newCardTitle = '';
        this.newCardNumber = 1;
        this.clearAddFileInputs();
        return;
      }
      const cardsRes = await getCardsByDeckId(deckId);
      if (!cardsRes.ok) {
        logError('deckEdit.onOpen.getCardsByDeckId', cardsRes.error);
        this.loadError = queryFailureMessage(cardsRes.error);
        this.cards = [];
        this.selectedCardIds = [];
        this.correspondenceSections = [];
        return;
      }
      try {
        this.correspondenceSections = await listCorrespondencesGrouped();
      } catch (e) {
        logError('deckEdit.onOpen.listCorrespondencesGrouped', e);
        this.correspondenceSections = [];
      }
      this.cards = cardsRes.value;
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
    this.selectedCardIds = [];
    this.correspondenceSections = [];
    this.selectedCorrespondenceIds = [];
    this.correspondenceAssignError = null;
    this.saveError = null;
    this.addError = null;
    this.deleteError = null;
    this.loadError = null;
    this.formMode = 'edit';
    this.newCardTitle = '';
    this.newCardNumber = 1;
    this.cardSearchQuery = '';
    this.correspondenceSearchQuery = '';
    this.resetForm();
    this.clearAddFileInputs();
  },

  syncEditFormFromSingleSelection() {
    if (this.selectedCardIds.length !== 1) {
      this.resetForm();
      this.clearCensor = false;
      this.selectedCorrespondenceIds = [];
      return;
    }
    const id = this.selectedCardIds[0];
    this.clearCensor = false;
    this.clearFileInputs();
    const card = this.cards.find((c) => c.id === id);
    if (!card) {
      this.editTitle = '';
      this.editNumber = 1;
      this.selectedCorrespondenceIds = [];
      return;
    }
    this.editTitle = card.title;
    this.editNumber = card.num;
    void this.loadCorrespondenceSelection();
  },

  onGridCardClick(id: string, event: MouseEvent) {
    if (event.shiftKey && this.selectedCardIds.length > 0) {
      const idx = this.selectedCardIds.indexOf(id);
      if (idx >= 0) {
        this.selectedCardIds = this.selectedCardIds.filter((x) => x !== id);
      } else {
        this.selectedCardIds = [...this.selectedCardIds, id];
      }
      this.formMode = 'edit';
      this.syncEditFormFromSingleSelection();
      return;
    }
    this.selectCard(id);
  },

  selectCard(id: string | null) {
    if (!id) {
      this.selectedCardIds = [];
      this.correspondenceSearchQuery = '';
      this.resetForm();
      return;
    }
    this.formMode = 'edit';
    this.selectedCardIds = [id];
    this.correspondenceSearchQuery = '';
    this.syncEditFormFromSingleSelection();
  },

  async confirmAndDeleteSelectedCards() {
    if (!this.deckId || this.selectedCardIds.length === 0) return;
    const n = this.selectedCardIds.length;
    const title =
      n === 1 ? 'Delete this card from the deck?' : `Delete these ${n} cards from the deck?`;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        cancelLabelVisible: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;
    this.deleteError = null;
    const deckId = this.deckId;
    const ids = [...this.selectedCardIds];
    try {
      await deleteLocalCards(ids);
    } catch (e) {
      this.deleteError = e instanceof Error ? e.message : 'Could not delete card(s)';
      return;
    }
    const cardsRes = await getCardsByDeckId(deckId);
    if (!cardsRes.ok) {
      logError('deckEdit.confirmAndDeleteSelectedCards.getCardsByDeckId', cardsRes.error);
      this.deleteError = queryFailureMessage(cardsRes.error);
      return;
    }
    const localRows = await listLocalCardsByDeckId(deckId);
    this.localEmpty = localRows.length === 0;
    if (this.localEmpty) {
      this.cards = [];
      this.selectedCardIds = [];
      this.resetForm();
      this.formMode = 'add';
      this.newCardTitle = '';
      this.newCardNumber = 1;
      this.clearAddFileInputs();
    } else {
      this.cards = cardsRes.value;
      const remaining = new Set(this.cards.map((c) => c.id));
      const stillSelected = this.selectedCardIds.filter((x) => remaining.has(x));
      if (stillSelected.length === 1) {
        this.selectCard(stillSelected[0]);
      } else if (stillSelected.length > 1) {
        this.selectedCardIds = stillSelected;
        this.syncEditFormFromSingleSelection();
      } else {
        this.selectCard(this.cards[0]?.id ?? null);
      }
    }
    const activeId = Alpine.store('activeDeckId') as string;
    if (activeId === deckId) {
      Alpine.store('shuffledCards', this.cards);
    }
  },

  async submitAddCard() {
    if (!this.deckId) return;
    const mainInput = document.getElementById('deck-edit-add-main') as HTMLInputElement | null;
    const censorInput = document.getElementById('deck-edit-add-censor') as HTMLInputElement | null;
    const mainFile = mainInput?.files?.[0];
    const censorFile = censorInput?.files?.[0];
    const parsed = addLocalCardFormSchema.safeParse({
      title: this.newCardTitle,
      number: this.newCardNumber,
      mainFile,
      censorFile: censorFile ?? undefined,
    });
    if (!parsed.success) {
      this.addError = zodFirstIssue(parsed.error);
      return;
    }
    const { title, number, mainFile: imageFile, censorFile: censor } = parsed.data;
    this.addError = null;
    const deckId = this.deckId;
    try {
      const row = await addCardToLocalDeck({
        deckId,
        title,
        number,
        imageFile,
        censorFile: censor && censor.size > 0 ? censor : null,
      });
      this.clearAddFileInputs();
      this.newCardTitle = '';
      this.newCardNumber = 1;
      this.localEmpty = false;
      const cardsRes = await getCardsByDeckId(deckId);
      if (!cardsRes.ok) {
        logError('deckEdit.submitAddCard.getCardsByDeckId', cardsRes.error);
        this.addError = queryFailureMessage(cardsRes.error);
        return;
      }
      this.cards = cardsRes.value;
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
    if (
      !this.deckId ||
      this.selectedCardIds.length !== 1 ||
      this.localEmpty ||
      this.formMode !== 'edit'
    )
      return;
    const mainInput = document.getElementById('deck-edit-main') as HTMLInputElement | null;
    const censorInput = document.getElementById('deck-edit-censor') as HTMLInputElement | null;
    const mainFile = mainInput?.files?.[0];
    const censorFile = censorInput?.files?.[0];
    const parsed = saveLocalCardFormSchema.safeParse({
      title: this.editTitle,
      number: this.editNumber,
      mainFile: mainFile && mainFile.size > 0 ? mainFile : undefined,
      censorFile: censorFile && censorFile.size > 0 ? censorFile : undefined,
    });
    if (!parsed.success) {
      this.saveError = zodFirstIssue(parsed.error);
      return;
    }
    const { title, number: n } = parsed.data;
    this.saveError = null;
    const mainForUpload = mainFile && mainFile.size > 0 ? mainFile : null;
    const censorForUpload = censorFile && censorFile.size > 0 ? censorFile : null;
    try {
      await updateLocalCard({
        cardId: this.selectedCardIds[0],
        title,
        number: n,
        mainImageFile: mainForUpload,
        censorImageFile: this.clearCensor ? null : censorForUpload,
        censorClear: this.clearCensor,
      });
    } catch (e) {
      this.saveError = e instanceof Error ? e.message : 'Save failed';
      return;
    }
    this.clearFileInputs();
    this.clearCensor = false;
    const sel = this.selectedCardIds[0];
    const cardsRes = await getCardsByDeckId(this.deckId);
    if (!cardsRes.ok) {
      logError('deckEdit.saveCard.getCardsByDeckId', cardsRes.error);
      this.saveError = queryFailureMessage(cardsRes.error);
      return;
    }
    this.cards = cardsRes.value;
    this.selectCard(sel);
    const activeId = Alpine.store('activeDeckId') as string;
    if (activeId === this.deckId) {
      Alpine.store('shuffledCards', this.cards);
    }
  },
}));
