/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ok, err } from '../../lib/result.js';
import type { QueryFailure } from '../../lib/supabaseErrors.js';
import type { TarotCard } from '../../types/canvas.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const decksMocks = vi.hoisted(() => ({
  getCardsByDeckId: vi.fn(),
}));

const logMocks = vi.hoisted(() => ({
  logError: vi.fn(),
  queryFailureMessage: vi.fn((f: QueryFailure) => f.message || 'fallback-msg'),
}));

const localMocks = vi.hoisted(() => ({
  listLocalCardsByDeckId: vi.fn(),
  addCardToLocalDeck: vi.fn(),
  updateLocalCard: vi.fn(),
  deleteLocalCards: vi.fn(),
}));

const alpineCapture = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'deckEditComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineCapture.Alpine,
}));

vi.mock('../../lib/decks.js', () => ({
  getCardsByDeckId: decksMocks.getCardsByDeckId,
}));

vi.mock('../../lib/logError.js', () => ({
  logError: logMocks.logError,
}));

vi.mock('../../lib/supabaseErrors.js', () => ({
  queryFailureMessage: logMocks.queryFailureMessage,
}));

vi.mock('../../lib/localDecks.js', () => ({
  listLocalCardsByDeckId: localMocks.listLocalCardsByDeckId,
  addCardToLocalDeck: localMocks.addCardToLocalDeck,
  updateLocalCard: localMocks.updateLocalCard,
  deleteLocalCards: localMocks.deleteLocalCards,
}));

import '../../components/DeckEditComponent.js';

const qf: QueryFailure = { kind: 'unknown', operation: 'op', message: 'query-bad' };

function tarot(overrides: Partial<TarotCard> = {}): TarotCard {
  return {
    id: 'card-1',
    deckId: 'deck-a',
    title: 'Star',
    num: 3,
    img: 'x.webp',
    ...overrides,
  };
}

function pngFile(name: string, size = 8): File {
  return new File([new Uint8Array(size)], name, { type: 'image/png' });
}

function ensureFileInput(id: string): HTMLInputElement {
  let el = document.getElementById(id) as HTMLInputElement | null;
  if (!el) {
    el = document.createElement('input');
    el.type = 'file';
    el.id = id;
    document.body.appendChild(el);
  }
  return el;
}

function setFilesOnInput(id: string, files: File[]): void {
  const el = ensureFileInput(id);
  const dt = new DataTransfer();
  for (const f of files) {
    dt.items.add(f);
  }
  Object.defineProperty(el, 'files', { value: dt.files, configurable: true });
}

type DeckEditCtx = {
  open: boolean;
  deckId: string | null;
  deckTitle: string;
  cards: TarotCard[];
  localEmpty: boolean;
  loading: boolean;
  saveError: string | null;
  addError: string | null;
  deleteError: string | null;
  loadError: string | null;
  formMode: 'edit' | 'add';
  selectedCardIds: string[];
  editTitle: string;
  editNumber: number;
  clearCensor: boolean;
  newCardTitle: string;
  newCardNumber: number;
  cardSearchQuery: string;
  filteredDeckEditCards: () => TarotCard[];
  clearFileInputs: () => void;
  clearAddFileInputs: () => void;
  onClearCensorChange: () => void;
  resetForm: () => void;
  startAddMode: () => void;
  cancelAddMode: () => void;
  onOpen: (detail: { deckId?: string; deckTitle?: string }) => Promise<void>;
  close: () => void;
  selectCard: (id: string | null) => void;
  onGridCardClick: (id: string, event: MouseEvent) => void;
  syncEditFormFromSingleSelection: () => void;
  confirmAndDeleteSelectedCards: () => Promise<void>;
  submitAddCard: () => Promise<void>;
  saveCard: () => Promise<void>;
};

function mount(): DeckEditCtx {
  const f = alpineCapture.getFactory();
  if (!f) {
    throw new Error('deckEditComponent not registered');
  }
  return f() as DeckEditCtx;
}

describe('deckEditComponent (DeckEditComponent.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.replaceChildren();
    alpineCapture.rawStores.activeDeckId = '';
    alpineCapture.rawStores.shuffledCards = [] as TarotCard[];
    localMocks.listLocalCardsByDeckId.mockResolvedValue([{ id: 'row' } as never]);
    decksMocks.getCardsByDeckId.mockResolvedValue(ok([tarot()]));
    localMocks.addCardToLocalDeck.mockResolvedValue({ id: 'new-id' });
    localMocks.updateLocalCard.mockResolvedValue(undefined);
    localMocks.deleteLocalCards.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('clearFileInputs and clearAddFileInputs reset input values when present', () => {
    setFilesOnInput('deck-edit-main', [pngFile('a.png')]);
    setFilesOnInput('deck-edit-censor', [pngFile('b.png')]);
    setFilesOnInput('deck-edit-add-main', [pngFile('c.png')]);
    setFilesOnInput('deck-edit-add-censor', [pngFile('d.png')]);
    const main = ensureFileInput('deck-edit-main');
    const censor = ensureFileInput('deck-edit-censor');
    const addMain = ensureFileInput('deck-edit-add-main');
    const addCensor = ensureFileInput('deck-edit-add-censor');
    const ctx = mount();
    ctx.clearFileInputs.call(ctx);
    ctx.clearAddFileInputs.call(ctx);
    expect(main.value).toBe('');
    expect(censor.value).toBe('');
    expect(addMain.value).toBe('');
    expect(addCensor.value).toBe('');
  });

  it('onClearCensorChange clears censor file input when clearCensor is true', () => {
    setFilesOnInput('deck-edit-censor', [pngFile('c.png')]);
    const censor = ensureFileInput('deck-edit-censor');
    const ctx = mount();
    ctx.clearCensor = true;
    ctx.onClearCensorChange.call(ctx);
    expect(censor.value).toBe('');
  });

  it('onClearCensorChange does nothing when clearCensor is false', () => {
    setFilesOnInput('deck-edit-censor', [pngFile('keep.png')]);
    const censor = ensureFileInput('deck-edit-censor');
    const ctx = mount();
    ctx.clearCensor = false;
    ctx.onClearCensorChange.call(ctx);
    expect(censor.files?.length).toBe(1);
  });

  it('onClearCensorChange is safe when censor input is missing from DOM', () => {
    document.body.replaceChildren();
    const ctx = mount();
    ctx.clearCensor = true;
    expect(() => ctx.onClearCensorChange.call(ctx)).not.toThrow();
  });

  it('resetForm clears edit fields and file inputs', () => {
    setFilesOnInput('deck-edit-main', [pngFile('m.png')]);
    setFilesOnInput('deck-edit-censor', [pngFile('c.png')]);
    const ctx = mount();
    ctx.editTitle = 't';
    ctx.editNumber = 9;
    ctx.clearCensor = true;
    ctx.resetForm.call(ctx);
    expect(ctx.editTitle).toBe('');
    expect(ctx.editNumber).toBe(1);
    expect(ctx.clearCensor).toBe(false);
    expect((document.getElementById('deck-edit-main') as HTMLInputElement).value).toBe('');
  });

  it('startAddMode switches to add and clears add state', () => {
    const ctx = mount();
    ctx.formMode = 'edit';
    ctx.selectedCardIds = ['x'];
    ctx.addError = 'e';
    ctx.newCardTitle = 'old';
    ctx.newCardNumber = 99;
    setFilesOnInput('deck-edit-add-main', [pngFile('f.png')]);
    ctx.startAddMode.call(ctx);
    expect(ctx.formMode).toBe('add');
    expect(ctx.selectedCardIds).toEqual([]);
    expect(ctx.addError).toBeNull();
    expect(ctx.newCardTitle).toBe('');
    expect(ctx.newCardNumber).toBe(1);
  });

  it('cancelAddMode returns to edit and selects first card when cards exist', () => {
    const ctx = mount();
    ctx.cards = [tarot({ id: 'a' }), tarot({ id: 'b', title: 'B', num: 2 })];
    ctx.formMode = 'add';
    ctx.selectedCardIds = [];
    ctx.cancelAddMode.call(ctx);
    expect(ctx.formMode).toBe('edit');
    expect(ctx.selectedCardIds).toEqual(['a']);
    expect(ctx.editTitle).toBe('Star');
  });

  it('cancelAddMode stays in add when there are no cards', () => {
    const ctx = mount();
    ctx.cards = [];
    ctx.formMode = 'add';
    ctx.newCardTitle = 'x';
    ctx.cancelAddMode.call(ctx);
    expect(ctx.formMode).toBe('add');
    expect(ctx.selectedCardIds).toEqual([]);
    expect(ctx.newCardTitle).toBe('');
  });

  it('onOpen returns immediately without deckId', async () => {
    const ctx = mount();
    await ctx.onOpen.call(ctx, {});
    expect(ctx.open).toBe(false);
    expect(localMocks.listLocalCardsByDeckId).not.toHaveBeenCalled();
  });

  it('onOpen enters add mode when local deck has no rows', async () => {
    localMocks.listLocalCardsByDeckId.mockResolvedValue([]);
    const ctx = mount();
    await ctx.onOpen.call(ctx, { deckId: 'd1', deckTitle: '  My Deck  ' });
    expect(ctx.open).toBe(true);
    expect(ctx.deckId).toBe('d1');
    expect(ctx.deckTitle).toBe('My Deck');
    expect(ctx.localEmpty).toBe(true);
    expect(ctx.formMode).toBe('add');
    expect(ctx.cards).toEqual([]);
    expect(ctx.loading).toBe(false);
  });

  it('onOpen sets loadError when getCardsByDeckId fails', async () => {
    decksMocks.getCardsByDeckId.mockResolvedValue(err(qf));
    const ctx = mount();
    await ctx.onOpen.call(ctx, { deckId: 'd1' });
    expect(ctx.loadError).toBeTruthy();
    expect(logMocks.logError).toHaveBeenCalled();
    expect(logMocks.queryFailureMessage).toHaveBeenCalledWith(qf);
    expect(ctx.cards).toEqual([]);
    expect(ctx.loading).toBe(false);
  });

  it('onOpen uses empty deckTitle when detail omits it', async () => {
    const ctx = mount();
    await ctx.onOpen.call(ctx, { deckId: 'd1' });
    expect(ctx.deckTitle).toBe('');
  });

  it('onOpen loads cards and selects first on success', async () => {
    const ctx = mount();
    await ctx.onOpen.call(ctx, { deckId: 'd1', deckTitle: 'T' });
    expect(ctx.cards).toHaveLength(1);
    expect(ctx.selectedCardIds).toEqual(['card-1']);
    expect(ctx.editTitle).toBe('Star');
    expect(ctx.formMode).toBe('edit');
    expect(ctx.loading).toBe(false);
  });

  it('onOpen clears cardSearchQuery', async () => {
    const ctx = mount();
    ctx.cardSearchQuery = '  moon  ';
    await ctx.onOpen.call(ctx, { deckId: 'd1', deckTitle: 'T' });
    expect(ctx.cardSearchQuery).toBe('');
  });

  it('filteredDeckEditCards returns all cards when query is blank or whitespace', () => {
    const ctx = mount();
    ctx.cards = [
      tarot({ id: 'a', title: 'Moon', num: 2 }),
      tarot({ id: 'b', title: 'Sun', num: 17 }),
    ];
    ctx.cardSearchQuery = '';
    expect(ctx.filteredDeckEditCards.call(ctx)).toHaveLength(2);
    ctx.cardSearchQuery = '   ';
    expect(ctx.filteredDeckEditCards.call(ctx)).toHaveLength(2);
  });

  it('filteredDeckEditCards matches title case-insensitively', () => {
    const ctx = mount();
    ctx.cards = [
      tarot({ id: 'a', title: 'The Moon', num: 1 }),
      tarot({ id: 'b', title: 'Sun', num: 2 }),
    ];
    ctx.cardSearchQuery = 'moon';
    expect(ctx.filteredDeckEditCards.call(ctx).map((c) => c.id)).toEqual(['a']);
    ctx.cardSearchQuery = 'THE MOON';
    expect(ctx.filteredDeckEditCards.call(ctx).map((c) => c.id)).toEqual(['a']);
  });

  it('filteredDeckEditCards matches card number as substring', () => {
    const ctx = mount();
    ctx.cards = [tarot({ id: 'a', title: 'A', num: 3 }), tarot({ id: 'b', title: 'B', num: 17 })];
    ctx.cardSearchQuery = '17';
    expect(ctx.filteredDeckEditCards.call(ctx).map((c) => c.id)).toEqual(['b']);
    ctx.cardSearchQuery = '7';
    expect(ctx.filteredDeckEditCards.call(ctx).map((c) => c.id)).toEqual(['b']);
  });

  it('filteredDeckEditCards returns empty when nothing matches', () => {
    const ctx = mount();
    ctx.cards = [tarot({ id: 'a', title: 'Moon', num: 1 })];
    ctx.cardSearchQuery = 'xyz';
    expect(ctx.filteredDeckEditCards.call(ctx)).toEqual([]);
  });

  it('close resets all panel state', async () => {
    const ctx = mount();
    await ctx.onOpen.call(ctx, { deckId: 'd1' });
    ctx.editTitle = 'x';
    ctx.cardSearchQuery = 'filter-me';
    ctx.open = true;
    setFilesOnInput('deck-edit-main', [pngFile('f.png')]);
    ctx.close.call(ctx);
    expect(ctx.open).toBe(false);
    expect(ctx.deckId).toBeNull();
    expect(ctx.cards).toEqual([]);
    expect(ctx.selectedCardIds).toEqual([]);
    expect(ctx.saveError).toBeNull();
    expect(ctx.deleteError).toBeNull();
    expect(ctx.formMode).toBe('edit');
    expect(ctx.cardSearchQuery).toBe('');
  });

  it('selectCard with null clears selection and resets form', () => {
    const ctx = mount();
    ctx.selectedCardIds = ['x'];
    ctx.editTitle = 'keep';
    ctx.selectCard.call(ctx, null);
    expect(ctx.selectedCardIds).toEqual([]);
    expect(ctx.editTitle).toBe('');
  });

  it('selectCard with unknown id leaves edit fields unset', () => {
    const ctx = mount();
    ctx.cards = [tarot({ id: 'only' })];
    ctx.editTitle = '';
    ctx.selectCard.call(ctx, 'missing');
    expect(ctx.selectedCardIds).toEqual(['missing']);
    expect(ctx.editTitle).toBe('');
  });

  it('selectCard fills edit fields for a known card', () => {
    const ctx = mount();
    ctx.cards = [tarot({ id: 'c1', title: 'Moon', num: 7 })];
    ctx.selectCard.call(ctx, 'c1');
    expect(ctx.editTitle).toBe('Moon');
    expect(ctx.editNumber).toBe(7);
    expect(ctx.formMode).toBe('edit');
  });

  it('onGridCardClick with shift adds to selection', () => {
    const ctx = mount();
    ctx.cards = [tarot({ id: 'a', title: 'A', num: 1 }), tarot({ id: 'b', title: 'B', num: 2 })];
    ctx.formMode = 'edit';
    ctx.selectedCardIds = ['a'];
    ctx.onGridCardClick.call(ctx, 'b', new MouseEvent('click', { shiftKey: true }));
    expect(ctx.selectedCardIds).toEqual(['a', 'b']);
  });

  it('onGridCardClick with shift removes when already selected', () => {
    const ctx = mount();
    ctx.cards = [tarot({ id: 'a' }), tarot({ id: 'b' })];
    ctx.selectedCardIds = ['a', 'b'];
    ctx.formMode = 'edit';
    ctx.onGridCardClick.call(ctx, 'a', new MouseEvent('click', { shiftKey: true }));
    expect(ctx.selectedCardIds).toEqual(['b']);
  });

  it('onGridCardClick without shift replaces selection', () => {
    const ctx = mount();
    ctx.cards = [tarot({ id: 'a' }), tarot({ id: 'b', title: 'B', num: 2 })];
    ctx.selectedCardIds = ['a'];
    ctx.formMode = 'edit';
    ctx.onGridCardClick.call(ctx, 'b', new MouseEvent('click', { shiftKey: false }));
    expect(ctx.selectedCardIds).toEqual(['b']);
    expect(ctx.editTitle).toBe('B');
  });

  it('confirmAndDeleteSelectedCards returns when cancelled', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['c1'];
    ctx.cards = [tarot({ id: 'c1' })];
    const p = ctx.confirmAndDeleteSelectedCards.call(ctx);
    const dlg = alpineCapture.rawStores.dialog as {
      open: boolean;
      onCancel?: () => void;
    };
    expect(dlg.open).toBe(true);
    dlg.onCancel?.();
    await p;
    expect(localMocks.deleteLocalCards).not.toHaveBeenCalled();
  });

  it('confirmAndDeleteSelectedCards deletes and refreshes one card', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['old'];
    ctx.cards = [tarot({ id: 'old' }), tarot({ id: 'keep' })];
    const remaining = [tarot({ id: 'keep' })];
    decksMocks.getCardsByDeckId.mockResolvedValue(ok(remaining));
    localMocks.listLocalCardsByDeckId.mockResolvedValue([{ id: 'row' } as never]);

    const p = ctx.confirmAndDeleteSelectedCards.call(ctx);
    const dlg = alpineCapture.rawStores.dialog as { onConfirm?: () => void };
    dlg.onConfirm?.();
    await p;

    expect(localMocks.deleteLocalCards).toHaveBeenCalledWith(['old']);
    expect(ctx.cards).toEqual(remaining);
    expect(ctx.selectedCardIds).toEqual(['keep']);
  });

  it('confirmAndDeleteSelectedCards deletes multiple ids', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['x', 'y'];
    ctx.cards = [tarot({ id: 'x' }), tarot({ id: 'y' }), tarot({ id: 'z' })];
    const remaining = [tarot({ id: 'z' })];
    decksMocks.getCardsByDeckId.mockResolvedValue(ok(remaining));
    localMocks.listLocalCardsByDeckId.mockResolvedValue([{ id: 'row' } as never]);

    const p = ctx.confirmAndDeleteSelectedCards.call(ctx);
    (alpineCapture.rawStores.dialog as { onConfirm?: () => void }).onConfirm?.();
    await p;

    expect(localMocks.deleteLocalCards).toHaveBeenCalledWith(['x', 'y']);
    expect(ctx.selectedCardIds).toEqual(['z']);
  });

  it('confirmAndDeleteSelectedCards updates shuffledCards when active deck matches', async () => {
    alpineCapture.rawStores.activeDeckId = 'd1';
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['old'];
    ctx.cards = [tarot({ id: 'old' }), tarot({ id: 'keep' })];
    const remaining = [tarot({ id: 'keep' })];
    decksMocks.getCardsByDeckId.mockResolvedValue(ok(remaining));
    localMocks.listLocalCardsByDeckId.mockResolvedValue([{ id: 'row' } as never]);

    const p = ctx.confirmAndDeleteSelectedCards.call(ctx);
    (alpineCapture.rawStores.dialog as { onConfirm?: () => void }).onConfirm?.();
    await p;

    expect(alpineCapture.rawStores.shuffledCards).toEqual(remaining);
  });

  it('confirmAndDeleteSelectedCards sets deleteError when deleteLocalCards throws', async () => {
    localMocks.deleteLocalCards.mockRejectedValueOnce(new Error('idb'));
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['c1'];
    const p = ctx.confirmAndDeleteSelectedCards.call(ctx);
    (alpineCapture.rawStores.dialog as { onConfirm?: () => void }).onConfirm?.();
    await p;
    expect(ctx.deleteError).toBe('idb');
    expect(decksMocks.getCardsByDeckId).not.toHaveBeenCalled();
  });

  it('confirmAndDeleteSelectedCards sets deleteError when refresh fails', async () => {
    decksMocks.getCardsByDeckId.mockResolvedValue(err(qf));
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['c1'];
    const p = ctx.confirmAndDeleteSelectedCards.call(ctx);
    (alpineCapture.rawStores.dialog as { onConfirm?: () => void }).onConfirm?.();
    await p;
    expect(ctx.deleteError).toBe('query-bad');
    expect(logMocks.logError).toHaveBeenCalled();
  });

  it('confirmAndDeleteSelectedCards enters add mode when last local card removed', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['only'];
    ctx.cards = [tarot({ id: 'only' })];
    decksMocks.getCardsByDeckId.mockResolvedValue(ok([]));
    localMocks.listLocalCardsByDeckId.mockResolvedValue([]);

    const p = ctx.confirmAndDeleteSelectedCards.call(ctx);
    (alpineCapture.rawStores.dialog as { onConfirm?: () => void }).onConfirm?.();
    await p;

    expect(ctx.localEmpty).toBe(true);
    expect(ctx.formMode).toBe('add');
    expect(ctx.cards).toEqual([]);
    expect(ctx.selectedCardIds).toEqual([]);
  });

  it('submitAddCard returns when deckId missing', async () => {
    const ctx = mount();
    ctx.deckId = null;
    await ctx.submitAddCard.call(ctx);
    expect(localMocks.addCardToLocalDeck).not.toHaveBeenCalled();
  });

  it('submitAddCard sets addError when validation fails', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.newCardTitle = '';
    setFilesOnInput('deck-edit-add-main', [pngFile('m.png')]);
    await ctx.submitAddCard.call(ctx);
    expect(ctx.addError).toBeTruthy();
    expect(localMocks.addCardToLocalDeck).not.toHaveBeenCalled();
  });

  it('submitAddCard adds card, refreshes list, selects new row, shuffles when deck active', async () => {
    const randSpy = vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr) => {
      const a = arr as Uint32Array;
      a[0] = 0;
      return arr;
    });
    alpineCapture.rawStores.activeDeckId = 'd1';
    alpineCapture.rawStores.shuffledCards = [tarot({ id: 'old' }), tarot({ id: 'old2' })];

    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.newCardTitle = 'Added';
    ctx.newCardNumber = 5;
    setFilesOnInput('deck-edit-add-main', [pngFile('main.png')]);
    setFilesOnInput('deck-edit-add-censor', [new File([], 'empty.png', { type: 'image/png' })]);

    const afterAdd = [tarot({ id: 'new-id', title: 'Added' }), tarot({ id: 'second', title: 'B' })];
    decksMocks.getCardsByDeckId.mockResolvedValue(ok(afterAdd));

    try {
      await ctx.submitAddCard.call(ctx);

      expect(localMocks.addCardToLocalDeck).toHaveBeenCalledWith(
        expect.objectContaining({
          deckId: 'd1',
          title: 'Added',
          number: 5,
          censorFile: null,
        }),
      );
      expect(ctx.cards).toEqual(afterAdd);
      expect(ctx.formMode).toBe('edit');
      expect(ctx.selectedCardIds).toEqual(['new-id']);
      expect(ctx.addError).toBeNull();
      const shuffled = alpineCapture.rawStores.shuffledCards as TarotCard[];
      expect(shuffled).toHaveLength(2);
      expect(new Set(shuffled.map((c) => c.id))).toEqual(new Set(['new-id', 'second']));
      expect(randSpy).toHaveBeenCalled();
    } finally {
      randSpy.mockRestore();
    }
  });

  it('submitAddCard sets addError when refresh getCardsByDeckId fails', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.newCardTitle = 'Ok';
    ctx.newCardNumber = 1;
    setFilesOnInput('deck-edit-add-main', [pngFile('m.png')]);
    decksMocks.getCardsByDeckId.mockResolvedValue(err(qf));
    await ctx.submitAddCard.call(ctx);
    expect(ctx.addError).toBe('query-bad');
    expect(logMocks.logError).toHaveBeenCalled();
  });

  it('submitAddCard maps non-Error throws to generic message', async () => {
    localMocks.addCardToLocalDeck.mockRejectedValue('boom');
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.newCardTitle = 'Ok';
    ctx.newCardNumber = 1;
    setFilesOnInput('deck-edit-add-main', [pngFile('m.png')]);
    await ctx.submitAddCard.call(ctx);
    expect(ctx.addError).toBe('Could not add card');
  });

  it('submitAddCard surfaces Error message from addCardToLocalDeck', async () => {
    localMocks.addCardToLocalDeck.mockRejectedValue(new Error('quota exceeded'));
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.newCardTitle = 'Ok';
    ctx.newCardNumber = 1;
    setFilesOnInput('deck-edit-add-main', [pngFile('m.png')]);
    await ctx.submitAddCard.call(ctx);
    expect(ctx.addError).toBe('quota exceeded');
  });

  it('saveCard returns when prerequisites missing', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = [];
    ctx.localEmpty = false;
    ctx.formMode = 'edit';
    await ctx.saveCard.call(ctx);
    expect(localMocks.updateLocalCard).not.toHaveBeenCalled();

    ctx.selectedCardIds = ['c1'];
    ctx.localEmpty = true;
    await ctx.saveCard.call(ctx);
    expect(localMocks.updateLocalCard).not.toHaveBeenCalled();

    ctx.localEmpty = false;
    ctx.formMode = 'add';
    await ctx.saveCard.call(ctx);
    expect(localMocks.updateLocalCard).not.toHaveBeenCalled();

    ctx.formMode = 'edit';
    ctx.selectedCardIds = ['a', 'b'];
    await ctx.saveCard.call(ctx);
    expect(localMocks.updateLocalCard).not.toHaveBeenCalled();
  });

  it('saveCard sets saveError on validation failure', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['c1'];
    ctx.localEmpty = false;
    ctx.formMode = 'edit';
    ctx.editTitle = '   ';
    await ctx.saveCard.call(ctx);
    expect(ctx.saveError).toBeTruthy();
    expect(localMocks.updateLocalCard).not.toHaveBeenCalled();
  });

  it('saveCard calls updateLocalCard and refreshes on success', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['c1'];
    ctx.editTitle = 'Renamed';
    ctx.editNumber = 4;
    ctx.clearCensor = false;
    const refreshed = [tarot({ id: 'c1', title: 'Renamed', num: 4 })];
    decksMocks.getCardsByDeckId.mockResolvedValue(ok(refreshed));
    alpineCapture.rawStores.activeDeckId = 'd1';

    await ctx.saveCard.call(ctx);

    expect(localMocks.updateLocalCard).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'c1',
        title: 'Renamed',
        number: 4,
        censorClear: false,
      }),
    );
    expect(ctx.cards).toEqual(refreshed);
    expect(ctx.saveError).toBeNull();
    expect(alpineCapture.rawStores.shuffledCards).toEqual(refreshed);
  });

  it('saveCard passes censor clear and null censor file when clearCensor', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['c1'];
    ctx.editTitle = 'T';
    ctx.editNumber = 1;
    ctx.clearCensor = true;
    setFilesOnInput('deck-edit-censor', [pngFile('c.png')]);
    decksMocks.getCardsByDeckId.mockResolvedValue(ok([tarot()]));
    await ctx.saveCard.call(ctx);
    expect(localMocks.updateLocalCard).toHaveBeenCalledWith(
      expect.objectContaining({
        censorClear: true,
        censorImageFile: null,
      }),
    );
  });

  it('saveCard sets saveError when updateLocalCard throws', async () => {
    localMocks.updateLocalCard.mockRejectedValue(new Error('disk full'));
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['c1'];
    ctx.editTitle = 'T';
    ctx.editNumber = 1;
    await ctx.saveCard.call(ctx);
    expect(ctx.saveError).toBe('disk full');
  });

  it('saveCard sets saveError when refresh fails after successful save', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['c1'];
    ctx.editTitle = 'T';
    ctx.editNumber = 1;
    decksMocks.getCardsByDeckId.mockResolvedValue(err(qf));
    await ctx.saveCard.call(ctx);
    expect(ctx.saveError).toBe('query-bad');
    expect(logMocks.logError).toHaveBeenCalled();
  });

  it('saveCard uses generic message when update throws non-Error', async () => {
    localMocks.updateLocalCard.mockRejectedValue(404);
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['c1'];
    ctx.editTitle = 'T';
    ctx.editNumber = 1;
    await ctx.saveCard.call(ctx);
    expect(ctx.saveError).toBe('Save failed');
  });

  it('submitAddCard does not shuffle store when another deck is active', async () => {
    alpineCapture.rawStores.activeDeckId = 'other-deck';
    alpineCapture.rawStores.shuffledCards = [tarot({ id: 'x' })];

    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.newCardTitle = 'N';
    ctx.newCardNumber = 2;
    setFilesOnInput('deck-edit-add-main', [pngFile('m.png')]);
    const afterAdd = [tarot({ id: 'n1' })];
    decksMocks.getCardsByDeckId.mockResolvedValue(ok(afterAdd));

    await ctx.submitAddCard.call(ctx);

    expect(alpineCapture.rawStores.shuffledCards as TarotCard[]).toEqual([tarot({ id: 'x' })]);
  });

  it('saveCard does not replace shuffledCards when another deck is active', async () => {
    alpineCapture.rawStores.activeDeckId = 'other';
    alpineCapture.rawStores.shuffledCards = [tarot({ id: 'keep' })];
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['c1'];
    ctx.editTitle = 'T';
    ctx.editNumber = 1;
    decksMocks.getCardsByDeckId.mockResolvedValue(ok([tarot({ id: 'c1' })]));

    await ctx.saveCard.call(ctx);

    expect(alpineCapture.rawStores.shuffledCards as TarotCard[]).toEqual([tarot({ id: 'keep' })]);
  });

  it('onOpen selects null when getCards returns empty array', async () => {
    decksMocks.getCardsByDeckId.mockResolvedValue(ok([]));
    const ctx = mount();
    await ctx.onOpen.call(ctx, { deckId: 'd1' });
    expect(ctx.cards).toEqual([]);
    expect(ctx.selectedCardIds).toEqual([]);
    expect(ctx.loading).toBe(false);
  });

  it('clearFileInputs is safe when edit inputs are absent from DOM', () => {
    document.body.replaceChildren();
    const ctx = mount();
    expect(() => ctx.clearFileInputs.call(ctx)).not.toThrow();
  });

  it('clearAddFileInputs is safe when add inputs are absent from DOM', () => {
    document.body.replaceChildren();
    const ctx = mount();
    expect(() => ctx.clearAddFileInputs.call(ctx)).not.toThrow();
  });

  it('submitAddCard passes censor file when non-empty image', async () => {
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.newCardTitle = 'WithCen';
    ctx.newCardNumber = 1;
    setFilesOnInput('deck-edit-add-main', [pngFile('main.png')]);
    setFilesOnInput('deck-edit-add-censor', [pngFile('cen.png', 12)]);
    decksMocks.getCardsByDeckId.mockResolvedValue(ok([tarot({ id: 'nc' })]));

    await ctx.submitAddCard.call(ctx);

    expect(localMocks.addCardToLocalDeck).toHaveBeenCalled();
    const addArg = localMocks.addCardToLocalDeck.mock.calls[0]?.[0] as
      | { censorFile?: File | null }
      | undefined;
    expect(addArg?.censorFile).toBeInstanceOf(File);
    expect(addArg?.censorFile?.name).toBe('cen.png');
  });

  it('saveCard uploads new main and censor files when provided', async () => {
    const mainF = pngFile('nm.png', 20);
    const cenF = pngFile('nc.png', 15);
    setFilesOnInput('deck-edit-main', [mainF]);
    setFilesOnInput('deck-edit-censor', [cenF]);
    const ctx = mount();
    ctx.deckId = 'd1';
    ctx.selectedCardIds = ['c1'];
    ctx.editTitle = 'T';
    ctx.editNumber = 1;
    ctx.clearCensor = false;
    decksMocks.getCardsByDeckId.mockResolvedValue(ok([tarot({ id: 'c1' })]));

    await ctx.saveCard.call(ctx);

    expect(localMocks.updateLocalCard).toHaveBeenCalledWith(
      expect.objectContaining({
        mainImageFile: mainF,
        censorImageFile: cenF,
        censorClear: false,
      }),
    );
  });
});
