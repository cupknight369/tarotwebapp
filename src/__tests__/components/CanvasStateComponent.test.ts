/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ok, err } from '../../lib/result.js';
import type { DraggableCard, TarotCard, TextLabel } from '../../types/canvas.js';
import type { QueryFailure } from '../../lib/supabaseErrors.js';
import type { SavedReadingState } from '../../types/readingState.js';
import type { LocalCardRow } from '../../types/localDb.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const readingsMocks = vi.hoisted(() => ({
  saveLocalReading: vi.fn(),
  loadLocalReading: vi.fn(),
  listLocalReadings: vi.fn(),
  deleteLocalReading: vi.fn(),
}));

const decksMocks = vi.hoisted(() => ({
  getCardsByIds: vi.fn(),
}));

const uiMocks = vi.hoisted(() => ({
  logError: vi.fn(),
  showQueryFailureDialog: vi.fn(),
}));

const localDecksMocks = vi.hoisted(() => ({
  getCardImageRow: vi.fn(),
  getLocalCardsByIds: vi.fn(),
}));

const alpineStub = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'stateComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineStub.Alpine,
}));

vi.mock('../../lib/localReadings.js', () => ({
  saveLocalReading: readingsMocks.saveLocalReading,
  loadLocalReading: readingsMocks.loadLocalReading,
  listLocalReadings: readingsMocks.listLocalReadings,
  deleteLocalReading: readingsMocks.deleteLocalReading,
}));

vi.mock('../../lib/decks.js', () => ({
  getCardsByIds: decksMocks.getCardsByIds,
}));

vi.mock('../../lib/logError.js', () => ({
  logError: uiMocks.logError,
}));

vi.mock('../../lib/queryFailureUi.js', () => ({
  showQueryFailureDialog: uiMocks.showQueryFailureDialog,
}));

vi.mock('../../lib/localDecks.js', () => ({
  getCardImageRow: localDecksMocks.getCardImageRow,
  getLocalCardsByIds: localDecksMocks.getLocalCardsByIds,
}));

vi.mock('../../lib/cardBlobUrls.js', () => ({
  revokeTarotCardBlobUrls: vi.fn(),
}));

import { revokeTarotCardBlobUrls } from '../../lib/cardBlobUrls.js';
import '../../components/CanvasStateComponent.js';

const qf: QueryFailure = { kind: 'unknown', operation: 't', message: 'bad' };

function tarot(overrides: Partial<TarotCard> = {}): TarotCard {
  return {
    id: 'cid-1',
    deckId: 'deck-1',
    title: 'Star',
    num: 17,
    img: 's.webp',
    deckTitle: 'D',
    imageSourceLabel: 'src',
    censorImageSourceLabel: 'csrc',
    ...overrides,
  };
}

function draggable(overrides: Partial<DraggableCard> & { card?: TarotCard } = {}): DraggableCard {
  const { card, ...rest } = overrides;
  return {
    card: card ?? tarot(),
    id: 'dc-1',
    x: 10,
    y: 20,
    rotation: 0,
    zIndex: 3,
    opacity: 1,
    cursor: 'grab',
    display: 'block',
    ...rest,
  };
}

function textLabel(overrides: Partial<TextLabel> = {}): TextLabel {
  return {
    id: 'tl-1',
    text: 'hi',
    x: 1,
    y: 2,
    fontSize: 14,
    fontWeight: 400,
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#fff',
    zIndex: 2,
    cursor: 'grab',
    display: 'block',
    anchorCardId: null,
    anchorPosition: null,
    fixedWidth: false,
    fixedWidthPx: 0,
    ...overrides,
  };
}

type StateCtx = {
  dirty: boolean;
  loadedReadingId: string | null;
  loadModalOpen: boolean;
  loadModalConfirmingForId: string | null;
  localSavedReadings: { id: string; name: string; updated_at: string }[];
  saveAndLoadTargetId: string | null;
  readingSaveFlashVisible: boolean;
  _readingSaveFlashTimer: ReturnType<typeof setTimeout> | null;
  draggableCards: DraggableCard[];
  textLabels: TextLabel[];
  scale: number;
  offsetX: number;
  offsetY: number;
  maxZIndex: number;
  maxTextZIndex: number;
  selectedCardIds: string[];
  editingTextId: string | null;
  shuffleDeck: ReturnType<typeof vi.fn>;
  clearCanvas: ReturnType<typeof vi.fn>;
  showReadingSaveFlash: () => void;
  serializeState: () => Promise<SavedReadingState>;
  deserializeState: (s: SavedReadingState) => Promise<void>;
  createNewReading: () => Promise<void>;
  saveCurrentReading: (name?: string) => Promise<{ ok: boolean; error?: string }>;
  loadReadingById: (id: string) => Promise<void>;
  openLoadModal: () => Promise<void>;
  closeLoadModal: () => void;
  onSelectReadingToLoad: (id: string) => Promise<void>;
  saveAndLoad: (id: string) => Promise<void>;
  handleSaveClick: () => void;
  triggerTitleDialog: () => void;
  discardAndLoad: (id: string) => Promise<void>;
  cancelLoadConfirm: () => void;
  deleteReading: (id: string) => Promise<void>;
};

function mountFactory(): Omit<
  StateCtx,
  | 'draggableCards'
  | 'textLabels'
  | 'scale'
  | 'offsetX'
  | 'offsetY'
  | 'maxZIndex'
  | 'maxTextZIndex'
  | 'selectedCardIds'
  | 'editingTextId'
  | 'shuffleDeck'
  | 'clearCanvas'
> {
  const f = alpineStub.getFactory();
  if (!f) {
    throw new Error('stateComponent not registered');
  }
  return f() as StateCtx;
}

function createCtx(overrides: Partial<StateCtx> = {}): StateCtx {
  const base = mountFactory();
  return {
    ...base,
    draggableCards: [],
    textLabels: [],
    scale: 1,
    offsetX: 0,
    offsetY: 0,
    maxZIndex: 0,
    maxTextZIndex: 0,
    selectedCardIds: [],
    editingTextId: null,
    shuffleDeck: vi.fn(),
    clearCanvas: vi.fn(),
    ...overrides,
  };
}

async function flushPromises(n = 12): Promise<void> {
  for (let i = 0; i < n; i++) {
    await Promise.resolve();
  }
}

function pngBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes], { type: 'image/png' });
}

describe('stateComponent (CanvasStateComponent.ts)', () => {
  let createObjectURLSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(alpineStub.rawStores)) {
      delete alpineStub.rawStores[k];
    }
    localDecksMocks.getLocalCardsByIds.mockResolvedValue(new Map());
    localDecksMocks.getCardImageRow.mockResolvedValue(null);
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map<string, TarotCard>()));
    readingsMocks.saveLocalReading.mockResolvedValue({ id: 'saved-id' });
    readingsMocks.loadLocalReading.mockResolvedValue(null);
    readingsMocks.listLocalReadings.mockResolvedValue([]);
    readingsMocks.deleteLocalReading.mockResolvedValue({});
    createObjectURLSpy = vi.fn(() => 'blob:unit-test');
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('showReadingSaveFlash clears prior timer and hides after delay', () => {
    vi.useFakeTimers();
    const ctx = createCtx();
    ctx.showReadingSaveFlash.call(ctx);
    expect(ctx.readingSaveFlashVisible).toBe(true);
    expect(ctx._readingSaveFlashTimer).not.toBeNull();
    ctx.showReadingSaveFlash.call(ctx);
    vi.advanceTimersByTime(2200);
    expect(ctx.readingSaveFlashVisible).toBe(false);
    expect(ctx._readingSaveFlashTimer).toBeNull();
  });

  it('serializeState maps viewport, cards without local blobs, and text labels', async () => {
    const ctx = createCtx({
      scale: 2,
      offsetX: 5,
      offsetY: 7,
      draggableCards: [draggable()],
      textLabels: [textLabel({ anchorCardId: 'x', anchorPosition: 'above' })],
    });
    const state = await ctx.serializeState.call(ctx);
    expect(state.viewport).toEqual({ scale: 2, offsetX: 5, offsetY: 7 });
    expect(state.cards).toHaveLength(1);
    expect(state.cards[0]?.card_id).toBe('cid-1');
    expect(state.textLabels[0]?.anchorPosition).toBe('above');
  });

  it('serializeState embeds main and censored bytes when local card rows exist', async () => {
    const bytes = new Uint8Array([9, 8, 7]);
    const cBytes = new Uint8Array([1]);
    const mainBlob = pngBlob(bytes);
    const cenBlob = pngBlob(cBytes);
    localDecksMocks.getLocalCardsByIds.mockResolvedValue(
      new Map([
        [
          'cid-1',
          {
            imageBlobId: 'b-main',
            censorImageBlobId: 'b-cen',
          } as { imageBlobId: string; censorImageBlobId: string },
        ],
      ]),
    );
    localDecksMocks.getCardImageRow.mockImplementation((id: string) => {
      if (id === 'b-main') {
        return Promise.resolve({ blob: mainBlob, created_at: 't0', mimeType: 'image/png' });
      }
      if (id === 'b-cen') {
        return Promise.resolve({ blob: cenBlob, mimeType: undefined });
      }
      return Promise.resolve(null);
    });
    vi.spyOn(mainBlob, 'arrayBuffer').mockResolvedValue(bytes.buffer);
    vi.spyOn(cenBlob, 'arrayBuffer').mockResolvedValue(cBytes.buffer);

    const ctx = createCtx({ draggableCards: [draggable()] });
    const state = await ctx.serializeState.call(ctx);
    expect(state.cards[0]?.data?.length).toBe(3);
    expect(state.cards[0]?.mime_type).toBe('image/png');
    expect(state.cards[0]?.censored_data?.length).toBe(1);
    expect(state.cards[0]?.censored_mime_type).toBe('image/png');
  });

  it('serializeState skips bytes when getCardImageRow has no blob', async () => {
    const row: LocalCardRow = {
      id: 'cid-1',
      deck_id: 'deck-1',
      title: 'Star',
      number: 17,
      imageBlobId: 'bid',
      censorImageBlobId: null,
    };
    localDecksMocks.getLocalCardsByIds.mockResolvedValue(new Map([['cid-1', row]]));
    localDecksMocks.getCardImageRow.mockResolvedValue({
      blob: undefined as unknown as Blob,
      created_at: 't',
    });
    const ctx = createCtx({ draggableCards: [draggable()] });
    const state = await ctx.serializeState.call(ctx);
    expect(state.cards[0]?.data).toBeUndefined();
  });

  it('serializeState uses blob.type when mimeType missing and skips empty blobs', async () => {
    const bytes = new Uint8Array([1]);
    const blob = new Blob([bytes], { type: 'image/webp' });
    localDecksMocks.getLocalCardsByIds.mockResolvedValue(
      new Map([['cid-1', { imageBlobId: 'b1', censorImageBlobId: null as unknown as string }]]),
    );
    localDecksMocks.getCardImageRow.mockResolvedValue({
      blob,
      created_at: 't',
      mimeType: undefined,
    });
    vi.spyOn(blob, 'arrayBuffer').mockResolvedValue(bytes.buffer);

    const ctx = createCtx({ draggableCards: [draggable()] });
    const state = await ctx.serializeState.call(ctx);
    expect(state.cards[0]?.mime_type).toBe('image/webp');
  });

  it('serializeState omits mime_type when blob and mimeType are empty strings', async () => {
    const row: LocalCardRow = {
      id: 'cid-1',
      deck_id: 'deck-1',
      title: 'Star',
      number: 17,
      imageBlobId: 'bid',
      censorImageBlobId: null,
    };
    const bytes = new Uint8Array([1]);
    const blob = new Blob([bytes], { type: '' });
    localDecksMocks.getLocalCardsByIds.mockResolvedValue(new Map([['cid-1', row]]));
    localDecksMocks.getCardImageRow.mockResolvedValue({
      blob,
      created_at: 't',
      mimeType: '',
    });
    vi.spyOn(blob, 'arrayBuffer').mockResolvedValue(bytes.buffer);
    const ctx = createCtx({ draggableCards: [draggable()] });
    const state = await ctx.serializeState.call(ctx);
    expect(state.cards[0]?.mime_type).toBeUndefined();
    expect(state.cards[0]?.data?.length).toBe(1);
  });

  it('serializeState omits censored_mime_type when censor blob type is empty', async () => {
    const row: LocalCardRow = {
      id: 'cid-1',
      deck_id: 'deck-1',
      title: 'Star',
      number: 17,
      imageBlobId: 'b-main',
      censorImageBlobId: 'b-cen',
    };
    const mainBytes = new Uint8Array([1]);
    const cenBytes = new Uint8Array([2]);
    const mainBlob = new Blob([mainBytes], { type: 'image/png' });
    const cenBlob = new Blob([cenBytes], { type: '' });
    localDecksMocks.getLocalCardsByIds.mockResolvedValue(new Map([['cid-1', row]]));
    localDecksMocks.getCardImageRow.mockImplementation((id: string) => {
      if (id === 'b-main') {
        return Promise.resolve({ blob: mainBlob, mimeType: 'image/png' });
      }
      return Promise.resolve({ blob: cenBlob, mimeType: '' });
    });
    vi.spyOn(mainBlob, 'arrayBuffer').mockResolvedValue(mainBytes.buffer);
    vi.spyOn(cenBlob, 'arrayBuffer').mockResolvedValue(cenBytes.buffer);
    const ctx = createCtx({ draggableCards: [draggable()] });
    const state = await ctx.serializeState.call(ctx);
    expect(state.cards[0]?.censored_data?.length).toBe(1);
    expect(state.cards[0]?.censored_mime_type).toBeUndefined();
  });

  it('serializeState omits censored_data when censor image row has no blob', async () => {
    const row: LocalCardRow = {
      id: 'cid-1',
      deck_id: 'deck-1',
      title: 'Star',
      number: 17,
      imageBlobId: 'b-main',
      censorImageBlobId: 'b-cen',
    };
    const bytes = new Uint8Array([2]);
    const mainBlob = pngBlob(bytes);
    localDecksMocks.getLocalCardsByIds.mockResolvedValue(new Map([['cid-1', row]]));
    localDecksMocks.getCardImageRow.mockImplementation((id: string) => {
      if (id === 'b-main') {
        return Promise.resolve({ blob: mainBlob, created_at: 't', mimeType: 'image/png' });
      }
      return Promise.resolve({ blob: undefined as unknown as Blob });
    });
    vi.spyOn(mainBlob, 'arrayBuffer').mockResolvedValue(bytes.buffer);
    const ctx = createCtx({ draggableCards: [draggable()] });
    const state = await ctx.serializeState.call(ctx);
    expect(state.cards[0]?.data?.length).toBe(1);
    expect(state.cards[0]?.censored_data).toBeUndefined();
  });

  it('deserializeState logs and returns when getCardsByIds fails', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(err(qf));
    const ctx = createCtx({ draggableCards: [draggable()] });
    await ctx.deserializeState.call(ctx, minimalState());
    expect(uiMocks.logError).toHaveBeenCalled();
    expect(uiMocks.showQueryFailureDialog).toHaveBeenCalledWith(qf);
  });

  it('deserializeState revokes existing card blobs and restores from resolved catalog', async () => {
    const resolved = tarot({ id: 'cid-1', img: 'u', censoredImg: null });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
    const ctx = createCtx({
      draggableCards: [draggable({ card: tarot({ id: 'cid-1' }) })],
    });
    const state = minimalState({
      cards: [
        {
          id: 'dc-1',
          deck_id: 'deck-1',
          card_id: 'cid-1',
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    await ctx.deserializeState.call(ctx, state);
    expect(vi.mocked(revokeTarotCardBlobUrls)).toHaveBeenCalled();
    expect(ctx.draggableCards).toHaveLength(1);
    expect(ctx.draggableCards[0]?.card.img).toBe('u');
  });

  it('deserializeState restores embedded image with resolved merge and censored branch', async () => {
    const resolved = tarot({ id: 'cid-1', censoredImg: 'old-cen' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
    const data = new Uint8Array([1, 2]);
    const censored = new Uint8Array([3]);
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'cid-1',
          deck_title: 'DT',
          card_title: 'CT',
          image_source: 'is',
          censor_image_source: 'cis',
          card_number: 9,
          data,
          mime_type: '  ',
          censored_data: censored,
          censored_mime_type: '',
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    const c = ctx.draggableCards[0]?.card;
    expect(c?.img).toBe('blob:unit-test');
    expect(c?.invalidReference).toBe(false);
    expect(c?.deckTitle).toBe('DT');
    expect(c?.censorImageSourceLabel).toBe('cis');
  });

  it('deserializeState embedded merged uses resolved deckTitle when snapshot omits it', async () => {
    const resolved = tarot({ id: 'cid-1', deckTitle: 'CatalogDeck' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
    const data = new Uint8Array([1]);
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'cid-1',
          card_title: 'T',
          image_source: 'i',
          censor_image_source: null,
          card_number: 1,
          data,
          mime_type: 'image/png',
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.deckTitle).toBe('CatalogDeck');
  });

  it('deserializeState embedded censor uses octet-stream when mime is whitespace', async () => {
    const resolved = tarot({ id: 'cid-1' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
    const data = new Uint8Array([1]);
    const cen = new Uint8Array([2]);
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'cid-1',
          deck_title: 'D',
          card_title: 'T',
          image_source: 'i',
          censor_image_source: null,
          card_number: 1,
          data,
          mime_type: 'image/png',
          censored_data: cen,
          censored_mime_type: '  \t  ',
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(createObjectURLSpy).toHaveBeenCalled();
    expect(ctx.draggableCards[0]?.card.censoredImg).toBe('blob:unit-test');
  });

  it('deserializeState embedded keeps resolved censored when censored_data is empty', async () => {
    const resolved = tarot({ id: 'cid-1', censoredImg: 'blob:preserved' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
    const data = new Uint8Array([1]);
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'cid-1',
          deck_title: 'D',
          card_title: 'T',
          image_source: 'i',
          censor_image_source: null,
          card_number: 1,
          data,
          mime_type: 'image/png',
          censored_data: new Uint8Array(0),
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.censoredImg).toBe('blob:preserved');
  });

  it('deserializeState embedded resolved uses explicit null censor label', async () => {
    const resolved = tarot({ id: 'cid-1', censorImageSourceLabel: 'from-cat' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
    const data = new Uint8Array([1]);
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'cid-1',
          deck_title: 'D',
          card_title: 'T',
          image_source: 'i',
          censor_image_source: null,
          card_number: 1,
          data,
          mime_type: 'image/png',
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.censorImageSourceLabel).toBeNull();
  });

  it('deserializeState keeps resolved censoredImg when embedded main has no censor bytes', async () => {
    const resolved = tarot({
      id: 'cid-1',
      img: 'u',
      censoredImg: 'blob:resolved-cen',
    });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
    const data = new Uint8Array([1]);
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'cid-1',
          deck_title: 'D',
          card_title: 'T',
          image_source: 'i',
          censor_image_source: null,
          card_number: 1,
          data,
          mime_type: 'image/png',
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.censoredImg).toBe('blob:resolved-cen');
  });

  it('deserializeState orphan embedded uses default title and number', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    const data = new Uint8Array([1]);
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'only-bytes',
          image_source: 'i',
          data,
          mime_type: 'image/png',
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.title).toBe('Card');
    expect(ctx.draggableCards[0]?.card.num).toBe(0);
  });

  it('deserializeState builds card from embedded bytes without catalog row', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    const data = new Uint8Array([5]);
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'orphan',
          deck_title: 'D',
          card_title: 'T',
          image_source: 'i',
          censor_image_source: null,
          card_number: 1,
          data,
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.id).toBe('orphan');
    expect(ctx.draggableCards[0]?.card.invalidReference).toBe(false);
  });

  it('deserializeState uses non-embedded path with resolved card', async () => {
    const resolved = tarot({ id: 'x' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['x', resolved]])));
    const state = minimalState({
      cards: [
        {
          id: 'd1',
          deck_id: 'd',
          card_id: 'x',
          deck_title: 'NewD',
          card_title: 'NewT',
          image_source: 'NI',
          censor_image_source: undefined,
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.title).toBe('NewT');
    expect(ctx.draggableCards[0]?.card.censorImageSourceLabel).toBe('csrc');
  });

  it('deserializeState non-embedded resolved honors explicit null censor source', async () => {
    const resolved = tarot({ id: 'x', censorImageSourceLabel: 'from-resolved' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['x', resolved]])));
    const state = minimalState({
      cards: [
        {
          id: 'd1',
          deck_id: 'd',
          card_id: 'x',
          deck_title: 'D',
          card_title: 'T',
          image_source: 'I',
          censor_image_source: null,
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.censorImageSourceLabel).toBeNull();
  });

  it('deserializeState non-embedded resolved uses catalog imageSource when snapshot omits it', async () => {
    const resolved = tarot({ id: 'x', imageSourceLabel: 'cloud-key' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['x', resolved]])));
    const state = minimalState({
      cards: [
        {
          id: 'd1',
          deck_id: 'd',
          card_id: 'x',
          deck_title: 'D',
          card_title: 'T',
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.imageSourceLabel).toBe('cloud-key');
  });

  it('deserializeState non-embedded resolved falls back when snapshot fields omitted', async () => {
    const resolved = tarot({
      id: 'x',
      title: 'ResTitle',
      deckTitle: 'ResDeck',
      num: 42,
    });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['x', resolved]])));
    const state = minimalState({
      cards: [
        {
          id: 'd1',
          deck_id: 'd',
          card_id: 'x',
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.title).toBe('ResTitle');
    expect(ctx.draggableCards[0]?.card.deckTitle).toBe('ResDeck');
    expect(ctx.draggableCards[0]?.card.num).toBe(42);
  });

  it('deserializeState treats zero-length embedded data as absent', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    const state = minimalState({
      cards: [
        {
          id: 'd1',
          deck_id: 'd',
          card_id: 'missing',
          deck_title: 'D',
          card_title: 'C',
          image_source: 'I',
          censor_image_source: null,
          data: new Uint8Array(0),
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.invalidReference).toBe(true);
  });

  it('deserializeState marks invalidReference when no data and no catalog match', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    const state = minimalState({
      cards: [
        {
          id: 'd1',
          deck_id: 'd',
          card_id: 'missing',
          deck_title: 'D',
          card_title: 'C',
          image_source: 'I',
          censor_image_source: null,
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.invalidReference).toBe(true);
    expect(ctx.draggableCards[0]?.card.img).toBe('');
  });

  it('deserializeState invalid placeholder uses default title and number', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    const state = minimalState({
      cards: [
        {
          id: 'd1',
          deck_id: 'd',
          card_id: 'gone',
          image_source: 'I',
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.title).toBe('Card');
    expect(ctx.draggableCards[0]?.card.num).toBe(0);
    expect(ctx.draggableCards[0]?.card.deckTitle).toBeUndefined();
  });

  it('deserializeState applies viewport and resets selection state', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    const state = minimalState({
      viewport: { scale: 1.5, offsetX: 11, offsetY: 22 },
      cards: [],
    });
    const ctx = createCtx({
      scale: 1,
      selectedCardIds: ['a'],
      editingTextId: 'e',
      dirty: true,
    });
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.scale).toBe(1.5);
    expect(ctx.offsetX).toBe(11);
    expect(ctx.selectedCardIds).toEqual([]);
    expect(ctx.editingTextId).toBeNull();
    expect(ctx.dirty).toBe(false);
  });

  it('deserializeState skips viewport when absent', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    const state = minimalState({ cards: [] });
    delete (state as { viewport?: SavedReadingState['viewport'] }).viewport;
    const ctx = createCtx({ scale: 3, offsetX: 1, offsetY: 2 });
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.scale).toBe(3);
  });

  it('deserializeState maps text labels and maxTextZIndex', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    const state = minimalState({
      cards: [],
      textLabels: [
        {
          id: 't1',
          text: 'note',
          x: 1,
          y: 2,
          fontSize: 12,
          fontWeight: 700,
          fontStyle: 'italic',
          textDecoration: 'underline',
          color: '#000',
          zIndex: 5,
          anchorCardId: null,
          anchorPosition: 'right',
          fixedWidth: true,
          fixedWidthPx: 320,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.textLabels).toHaveLength(1);
    expect(ctx.textLabels[0]?.cursor).toBe('grab');
    expect(ctx.textLabels[0]?.fixedWidth).toBe(true);
    expect(ctx.textLabels[0]?.fixedWidthPx).toBe(320);
    expect(ctx.maxTextZIndex).toBe(5);
  });

  it('createNewReading shuffles immediately when clean slate', async () => {
    const ctx = createCtx({ dirty: false, loadedReadingId: null });
    const p = ctx.createNewReading.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await Promise.resolve();
    await p;
    expect(ctx.shuffleDeck).toHaveBeenCalled();
  });

  it('createNewReading returns when user cancels first dialog', async () => {
    const ctx = createCtx();
    const p = ctx.createNewReading.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    await p;
    expect(ctx.shuffleDeck).not.toHaveBeenCalled();
  });

  it('createNewReading saves then shuffles when loaded reading and user confirms save', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ id: 'r1' });
    const ctx = createCtx({ loadedReadingId: 'r1', dirty: true });
    const p = ctx.createNewReading.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await flushPromises();
    await p;
    expect(readingsMocks.saveLocalReading).toHaveBeenCalled();
    expect(ctx.shuffleDeck).toHaveBeenCalled();
    expect(ctx.loadedReadingId).toBeNull();
  });

  it('createNewReading opens save failure when save fails after confirm', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: 'nope' });
    const ctx = createCtx({ loadedReadingId: 'r1' });
    const p = ctx.createNewReading.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await flushPromises();
    await p;
    expect(ctx.shuffleDeck).not.toHaveBeenCalled();
    const dlg = alpineStub.rawStores.dialog as { title: string; onConfirm: () => void };
    expect(dlg.title).toContain('nope');
    dlg.onConfirm();
  });

  it('createNewReading save failure after loaded uses default when error missing', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: undefined } as unknown as {
      error: string;
    });
    const ctx = createCtx({ loadedReadingId: 'r1' });
    const p = ctx.createNewReading.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await flushPromises();
    await p;
    expect((alpineStub.rawStores.dialog as { title: string }).title).toContain(
      'Could not save reading',
    );
    expect(ctx.shuffleDeck).not.toHaveBeenCalled();
  });

  it('createNewReading shows input dialog when dirty without loaded id', async () => {
    const ctx = createCtx({ dirty: true, loadedReadingId: null });
    const p = ctx.createNewReading.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await Promise.resolve();
    await p;
    expect((alpineStub.rawStores.dialog as { type?: string }).type).toBe('inputText');
    expect(ctx.shuffleDeck).toHaveBeenCalled();
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
  });

  it('createNewReading inputText save failure uses fallback when error missing', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: undefined } as unknown as {
      error: string;
    });
    const ctx = createCtx({ dirty: true, loadedReadingId: null });
    const p = ctx.createNewReading.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await Promise.resolve();
    await p;
    (alpineStub.rawStores.dialog as { onSubmitText: (t: string) => void }).onSubmitText('T');
    await flushPromises();
    expect((alpineStub.rawStores.dialog as { title: string }).title).toContain(
      'Could not save reading',
    );
  });

  it('createNewReading inputText save failure opens confirm dialog', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: 'save-fail' });
    const ctx = createCtx({ dirty: true, loadedReadingId: null });
    const p = ctx.createNewReading.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await Promise.resolve();
    await p;
    const inputDlg = alpineStub.rawStores.dialog as { onSubmitText: (t: string) => void };
    inputDlg.onSubmitText('My title');
    await flushPromises();
    const failDlg = alpineStub.rawStores.dialog as { type?: string; title: string };
    expect(failDlg.type).toBe('confirm');
    expect(failDlg.title).toContain('save-fail');
  });

  it('createNewReading inputText save success calls showReadingSaveFlash', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ id: 'n' });
    const ctx = createCtx({ dirty: true, loadedReadingId: null });
    const flashSpy = vi.spyOn(ctx, 'showReadingSaveFlash');
    const p = ctx.createNewReading.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await Promise.resolve();
    await p;
    (alpineStub.rawStores.dialog as { onSubmitText: (t: string) => void }).onSubmitText('T');
    await flushPromises();
    expect(flashSpy).toHaveBeenCalled();
  });

  it('createNewReading skips save when user declines second prompt', async () => {
    const ctx = createCtx({ loadedReadingId: 'r1' });
    const p = ctx.createNewReading.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    await flushPromises();
    await p;
    expect(readingsMocks.saveLocalReading).not.toHaveBeenCalled();
    expect(ctx.shuffleDeck).toHaveBeenCalled();
  });

  it('saveCurrentReading updates existing id and clears dirty', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ id: 'keep' });
    const ctx = createCtx({ loadedReadingId: 'keep', dirty: true });
    const r = await ctx.saveCurrentReading.call(ctx);
    expect(r.ok).toBe(true);
    expect(readingsMocks.saveLocalReading).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
      'keep',
    );
    expect(ctx.dirty).toBe(false);
  });

  it('saveCurrentReading creates new reading with name', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ id: 'new' });
    const ctx = createCtx({ loadedReadingId: null });
    const r = await ctx.saveCurrentReading.call(ctx, 'Hello');
    expect(r.ok).toBe(true);
    expect(ctx.loadedReadingId).toBe('new');
    expect(readingsMocks.saveLocalReading).toHaveBeenCalledWith(expect.any(Object), 'Hello');
  });

  it('saveCurrentReading returns error from library', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: 'db' });
    const ctx = createCtx();
    const r = await ctx.saveCurrentReading.call(ctx);
    expect(r.ok).toBe(false);
    expect(r.error).toBe('db');
  });

  it('loadReadingById returns early when load yields null', async () => {
    readingsMocks.loadLocalReading.mockResolvedValue(null);
    const ctx = createCtx();
    await ctx.loadReadingById.call(ctx, 'nope');
    expect(decksMocks.getCardsByIds).not.toHaveBeenCalled();
  });

  it('loadReadingById deserializes and sets loaded id', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    readingsMocks.loadLocalReading.mockResolvedValue({
      state: minimalState({ cards: [] }),
      name: 'N',
    });
    const ctx = createCtx();
    await ctx.loadReadingById.call(ctx, 'rid');
    expect(ctx.loadedReadingId).toBe('rid');
  });

  it('openLoadModal and closeLoadModal manage flags', async () => {
    readingsMocks.listLocalReadings.mockResolvedValue([{ id: '1', name: 'A', updated_at: 't' }]);
    const ctx = createCtx();
    await ctx.openLoadModal.call(ctx);
    expect(ctx.loadModalOpen).toBe(true);
    expect(ctx.localSavedReadings).toHaveLength(1);
    ctx.closeLoadModal.call(ctx);
    expect(ctx.loadModalOpen).toBe(false);
    expect(ctx.loadModalConfirmingForId).toBeNull();
  });

  it('onSelectReadingToLoad defers when dirty', async () => {
    const ctx = createCtx({ dirty: true });
    await ctx.onSelectReadingToLoad.call(ctx, 'pending');
    expect(ctx.loadModalConfirmingForId).toBe('pending');
  });

  it('onSelectReadingToLoad loads when clean', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    readingsMocks.loadLocalReading.mockResolvedValue({
      state: minimalState({ cards: [] }),
      name: 'x',
    });
    const ctx = createCtx({ loadModalOpen: true });
    await ctx.onSelectReadingToLoad.call(ctx, 'z');
    expect(ctx.loadedReadingId).toBe('z');
    expect(ctx.loadModalOpen).toBe(false);
  });

  it('saveAndLoad saves then loads when reading is loaded', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ id: 'cur' });
    readingsMocks.loadLocalReading.mockResolvedValue({
      state: minimalState({ cards: [] }),
      name: 'x',
    });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    const ctx = createCtx({ loadedReadingId: 'cur', loadModalOpen: true });
    await ctx.saveAndLoad.call(ctx, 'other');
    expect(ctx.loadedReadingId).toBe('other');
    expect(ctx.loadModalOpen).toBe(false);
  });

  it('saveAndLoad opens failure dialog when save fails', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: 'x' });
    const ctx = createCtx({ loadedReadingId: 'cur' });
    await ctx.saveAndLoad.call(ctx, 'other');
    const dlg = alpineStub.rawStores.dialog as { title: string; onCancel: () => void };
    expect(dlg.title).toContain('x');
    dlg.onCancel();
  });

  it('saveAndLoad failure uses default message when error missing', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: undefined } as unknown as {
      error: string;
    });
    const ctx = createCtx({ loadedReadingId: 'cur' });
    await ctx.saveAndLoad.call(ctx, 'other');
    expect((alpineStub.rawStores.dialog as { title: string }).title).toContain(
      'Could not save reading',
    );
  });

  it('saveAndLoad sets target and opens title dialog when new', async () => {
    const ctx = createCtx({ loadedReadingId: null });
    const spy = vi.spyOn(ctx, 'triggerTitleDialog');
    await ctx.saveAndLoad.call(ctx, 'target');
    expect(ctx.saveAndLoadTargetId).toBe('target');
    expect(spy).toHaveBeenCalled();
  });

  it('handleSaveClick saves when loaded and shows flash on success', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ id: 'r' });
    const ctx = createCtx({ loadedReadingId: 'r' });
    ctx.handleSaveClick.call(ctx);
    await flushPromises();
    expect(ctx.readingSaveFlashVisible).toBe(true);
  });

  it('handleSaveClick opens failure dialog when save fails', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: 'fail' });
    const ctx = createCtx({ loadedReadingId: 'r' });
    ctx.handleSaveClick.call(ctx);
    await flushPromises();
    const dlg = alpineStub.rawStores.dialog as { title: string; onConfirm: () => void };
    expect(dlg.title).toContain('fail');
    dlg.onConfirm();
  });

  it('handleSaveClick failure uses default message when error missing', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: undefined } as unknown as {
      error: string;
    });
    const ctx = createCtx({ loadedReadingId: 'r' });
    ctx.handleSaveClick.call(ctx);
    await flushPromises();
    expect((alpineStub.rawStores.dialog as { title: string }).title).toContain(
      'Could not save reading',
    );
  });

  it('handleSaveClick opens title dialog when no loaded id', () => {
    const ctx = createCtx({ loadedReadingId: null });
    const spy = vi.spyOn(ctx, 'triggerTitleDialog');
    ctx.handleSaveClick.call(ctx);
    expect(spy).toHaveBeenCalled();
  });

  it('triggerTitleDialog save success skips load when no deferred target', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ id: 'n' });
    const ctx = createCtx({ saveAndLoadTargetId: null });
    const loadSpy = vi.spyOn(ctx, 'loadReadingById');
    ctx.triggerTitleDialog.call(ctx);
    (alpineStub.rawStores.dialog as { onSubmitText: (t: string) => void }).onSubmitText('T');
    await flushPromises(24);
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('triggerTitleDialog save success loads target and closes modal', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ id: 'n' });
    readingsMocks.loadLocalReading.mockResolvedValue({
      state: minimalState({ cards: [] }),
      name: 'x',
    });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    const ctx = createCtx({ saveAndLoadTargetId: 'tgt', loadModalOpen: true });
    ctx.triggerTitleDialog.call(ctx);
    const dlg = alpineStub.rawStores.dialog as { onSubmitText: (t: string) => void };
    dlg.onSubmitText('Title');
    await flushPromises();
    expect(ctx.loadedReadingId).toBe('tgt');
    expect(ctx.loadModalOpen).toBe(false);
    expect(ctx.saveAndLoadTargetId).toBeNull();
  });

  it('triggerTitleDialog onSubmit failure opens confirm dialog', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: 'bad' });
    const ctx = createCtx({ saveAndLoadTargetId: 'tgt' });
    ctx.triggerTitleDialog.call(ctx);
    (alpineStub.rawStores.dialog as { onSubmitText: (t: string) => void }).onSubmitText('T');
    await flushPromises();
    const failDlg = alpineStub.rawStores.dialog as { title: string; onConfirm: () => void };
    expect(failDlg.title).toContain('bad');
    failDlg.onConfirm();
  });

  it('triggerTitleDialog onSubmit failure uses fallback title when error missing', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: undefined } as unknown as {
      error: string;
    });
    const ctx = createCtx({ saveAndLoadTargetId: 'tgt' });
    ctx.triggerTitleDialog.call(ctx);
    (alpineStub.rawStores.dialog as { onSubmitText: (t: string) => void }).onSubmitText('T');
    await flushPromises(24);
    const failDlg = alpineStub.rawStores.dialog as { title: string };
    expect(failDlg.title).toContain('Could not save reading');
  });

  it('triggerTitleDialog onCancel clears target id', () => {
    const ctx = createCtx({ saveAndLoadTargetId: 'x' });
    ctx.triggerTitleDialog.call(ctx);
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    expect(ctx.saveAndLoadTargetId).toBeNull();
  });

  it('discardAndLoad loads and closes modal', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    readingsMocks.loadLocalReading.mockResolvedValue({
      state: minimalState({ cards: [] }),
      name: 'n',
    });
    const ctx = createCtx({ loadModalOpen: true });
    await ctx.discardAndLoad.call(ctx, 'id1');
    expect(ctx.loadedReadingId).toBe('id1');
    expect(ctx.loadModalOpen).toBe(false);
  });

  it('cancelLoadConfirm clears confirming id', () => {
    const ctx = createCtx({ loadModalConfirmingForId: 'q' });
    ctx.cancelLoadConfirm.call(ctx);
    expect(ctx.loadModalConfirmingForId).toBeNull();
  });

  it('deleteReading aborts when user cancels', async () => {
    const ctx = createCtx({ localSavedReadings: [{ id: 'a', name: 'A', updated_at: 't' }] });
    const p = ctx.deleteReading.call(ctx, 'a');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    await p;
    expect(readingsMocks.deleteLocalReading).not.toHaveBeenCalled();
  });

  it('deleteReading removes row and clears loaded id when matching', async () => {
    const ctx = createCtx({
      localSavedReadings: [
        { id: 'a', name: 'A', updated_at: 't' },
        { id: 'b', name: 'B', updated_at: 't' },
      ],
      loadedReadingId: 'a',
    });
    const p = ctx.deleteReading.call(ctx, 'a');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.localSavedReadings).toHaveLength(1);
    expect(ctx.loadedReadingId).toBeNull();
    expect(readingsMocks.deleteLocalReading).toHaveBeenCalledWith('a');
  });

  it('deleteReading keeps loaded id when deleting a different reading', async () => {
    const ctx = createCtx({
      localSavedReadings: [
        { id: 'a', name: 'A', updated_at: 't' },
        { id: 'b', name: 'B', updated_at: 't' },
      ],
      loadedReadingId: 'a',
    });
    const p = ctx.deleteReading.call(ctx, 'b');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.loadedReadingId).toBe('a');
    expect(ctx.localSavedReadings).toEqual([{ id: 'a', name: 'A', updated_at: 't' }]);
  });
});

function minimalState(overrides: Partial<SavedReadingState> = {}): SavedReadingState {
  return {
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    cards: [],
    textLabels: [],
    ...overrides,
  };
}
