/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ok, err } from '../../lib/result.js';
import type { DraggableCard, TarotCard, TextLabel } from '../../types/canvas.js';
import type { QueryFailure } from '../../lib/supabaseErrors.js';
import type { SavedReadingState } from '../../types/readingState.js';
import type { LocalCardRow } from '../../types/localDb.js';
import { DEFAULT_READING_GROUP_ID } from '../../types/localDb.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const readingsMocks = vi.hoisted(() => ({
  saveLocalReading: vi.fn(),
  loadLocalReading: vi.fn(),
  listLocalReadings: vi.fn(),
  listReadingsGrouped: vi.fn(),
  listReadingGroups: vi.fn(),
  createReadingGroup: vi.fn(),
  putReadingGroup: vi.fn(),
  deleteReadingGroup: vi.fn(),
  assignReadingToGroup: vi.fn(),
  renameLocalReading: vi.fn(),
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
  listReadingsGrouped: readingsMocks.listReadingsGrouped,
  listReadingGroups: readingsMocks.listReadingGroups,
  createReadingGroup: readingsMocks.createReadingGroup,
  putReadingGroup: readingsMocks.putReadingGroup,
  deleteReadingGroup: readingsMocks.deleteReadingGroup,
  assignReadingToGroup: readingsMocks.assignReadingToGroup,
  renameLocalReading: readingsMocks.renameLocalReading,
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
    fontProfileId: null,
    ...overrides,
  };
}

type StateCtx = {
  dirty: boolean;
  loadedReadingId: string | null;
  loadModalOpen: boolean;
  loadModalConfirmingForId: string | null;
  loadModalEditingReadingId: string | null;
  loadModalEditingTitle: string;
  loadModalSearchQuery: string;
  loadModalReadingsPending: boolean;
  loadModalSelectedReadingIds: string[];
  localSavedReadings: { id: string; name: string; updated_at: string; group_id: string }[];
  saveAndLoadTargetId: string | null;
  readingSaveFlashVisible: boolean;
  _readingSaveFlashTimer: ReturnType<typeof setTimeout> | null;
  _ctrlDLastDrawAtMs: number | null;
  draggableCards: DraggableCard[];
  textLabels: TextLabel[];
  scale: number;
  offsetX: number;
  offsetY: number;
  maxZIndex: number;
  maxTextZIndex: number;
  selectedCardIds: string[];
  editingTextId: string | null;
  viewport: HTMLDivElement | null;
  contextMenu: {
    open: boolean;
    x: number;
    y: number;
    contentX: number;
    contentY: number;
    cardId: string | null;
    textId: string | null;
  };
  shuffleDeck: ReturnType<typeof vi.fn>;
  clearCanvas: ReturnType<typeof vi.fn>;
  drawCardAt: ReturnType<typeof vi.fn>;
  showReadingSaveFlash: () => void;
  serializeState: () => Promise<SavedReadingState>;
  deserializeState: (s: SavedReadingState) => Promise<void>;
  createNewReading: () => Promise<void>;
  saveCurrentReading: (name?: string) => Promise<{ ok: boolean; error?: string }>;
  loadReadingById: (id: string) => Promise<void>;
  openLoadModal: () => Promise<void>;
  filteredLoadModalReadings: () => { id: string; name: string; updated_at: string }[];
  closeLoadModal: () => void;
  onSelectReadingToLoad: (id: string) => Promise<void>;
  saveAndLoad: (id: string) => Promise<void>;
  handleSaveClick: () => void;
  handleSaveShortcut: (event: KeyboardEvent) => void;
  handleDrawCardShortcut: (event: KeyboardEvent) => void;
  handleDrawByNameShortcut: (event: KeyboardEvent) => void;
  handleDrawByIndexShortcut: (event: KeyboardEvent) => void;
  handleAddTextShortcut: (event: KeyboardEvent) => void;
  handleRandomNumberShortcut: (event: KeyboardEvent) => void;
  openRandomNumberModal: (screenX: number, screenY: number) => void;
  closeRandomNumberModal: () => void;
  generateRandomNumber: () => void;
  addRandomNumberResultToCanvas: () => void;
  addTextLabelWithTextAt: (screenX: number, screenY: number, text: string) => void;
  randomNumberModalOpen: boolean;
  randomNumberLowerBound: string;
  randomNumberUpperBound: string;
  randomNumberResult: number | null;
  randomNumberError: string | null;
  randomNumberScreenX: number | null;
  randomNumberScreenY: number | null;
  handleShuffleShortcut: (event: KeyboardEvent) => void;
  handleNextDeckShortcut: (event: KeyboardEvent) => void;
  handlePreviousDeckShortcut: (event: KeyboardEvent) => void;
  handleSwitchDeckByNameShortcut: (event: KeyboardEvent) => void;
  handleOpenDeckModalShortcut: (event: KeyboardEvent) => void;
  handleOpenReadingsModalShortcut: (event: KeyboardEvent) => void;
  handleOpenSettingsModalShortcut: (event: KeyboardEvent) => void;
  handleOpenAccountModalShortcut: (event: KeyboardEvent) => void;
  handleOpenCorrespondenceManagerShortcut: (event: KeyboardEvent) => void;
  handleOpenKeyboardShortcutsShortcut: (event: KeyboardEvent) => void;
  handleClearCanvasShortcut: (event: KeyboardEvent) => void;
  handleNewReadingShortcut: (event: KeyboardEvent) => void;
  handleEscapeShortcut: (event: KeyboardEvent) => void;
  promptClearCanvas: () => void;
  triggerTitleDialog: () => void;
  discardAndLoad: (id: string) => Promise<void>;
  cancelLoadConfirm: () => void;
  startLoadModalTitleEdit: (reading: { id: string; name: string; updated_at: string }) => void;
  commitLoadModalTitleEdit: () => Promise<void>;
  cancelLoadModalTitleEdit: () => void;
  deleteReading: (id: string) => Promise<void>;
  isLoadModalReadingSelected: (id: string) => boolean;
  toggleLoadModalReadingSelection: (id: string) => void;
  isLoadModalReadingGroupSelected: (groupId: string) => boolean;
  toggleLoadModalReadingGroupSelection: (groupId: string) => void;
  selectAllLoadModalReadings: () => void;
  clearLoadModalReadingSelection: () => void;
  confirmAndDeleteSelectedLoadModalReadings: () => Promise<void>;
  refreshLoadModalReadings: () => Promise<void>;
  filteredLoadModalGroupedSections: () => import('../../types/readingState.js').ReadingGroupSection[];
  loadModalReadingsInFilteredGroup: (
    groupId: string,
  ) => { id: string; name: string; updated_at: string; group_id: string }[];
  isLoadModalGroupCollapsed: (groupId: string) => boolean;
  toggleLoadModalGroupCollapsed: (groupId: string) => void;
  addLoadModalGroup: () => Promise<void>;
  startRenameLoadModalGroup: (g: { id: string; title: string }) => void;
  cancelRenameLoadModalGroup: () => void;
  saveRenameLoadModalGroup: () => Promise<void>;
  confirmDeleteLoadModalGroup: (g: { id: string; title: string }) => Promise<void>;
  assignReadingGroup: (readingId: string, groupId: string) => Promise<void>;
  loadModalGroupedSections: import('../../types/readingState.js').ReadingGroupSection[];
  loadModalReadingGroups: { id: string; title: string }[];
  loadModalCollapsedGroupIds: Record<string, boolean>;
  loadModalNewGroupTitle: string;
  loadModalRenamingGroupId: string | null;
  loadModalRenameGroupTitle: string;
  loadModalGroupError: string | null;
  $nextTick: (cb?: () => void) => void;
  $refs: Record<string, HTMLElement>;
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
    drawCardAt: vi.fn(),
    $nextTick: (cb?: () => void) => {
      cb?.();
    },
    $refs: {},
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
    readingsMocks.listReadingsGrouped.mockResolvedValue([]);
    readingsMocks.listReadingGroups.mockResolvedValue([
      { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
    ]);
    readingsMocks.assignReadingToGroup.mockResolvedValue({});
    readingsMocks.renameLocalReading.mockResolvedValue({ updated_at: '2024-03-15T10:00:00.000Z' });
    readingsMocks.deleteLocalReading.mockResolvedValue({});
    createObjectURLSpy = vi.fn(() => 'blob:unit-test');
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: createObjectURLSpy,
      revokeObjectURL: vi.fn(),
    });
    window.draggableZoneComponent = undefined;
    window.authComponent = undefined;
    window.correspondenceManagerComponent = undefined;
  });

  afterEach(() => {
    window.draggableZoneComponent = undefined;
    window.authComponent = undefined;
    window.correspondenceManagerComponent = undefined;
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
      textLabels: [
        textLabel({ anchorCardId: 'x', anchorPosition: 'above', fontProfileId: 'fp-1' }),
      ],
    });
    const state = await ctx.serializeState.call(ctx);
    expect(state.viewport).toEqual({ scale: 2, offsetX: 5, offsetY: 7 });
    expect(state.cards).toHaveLength(1);
    expect(state.cards[0]?.card_id).toBe('cid-1');
    expect(state.textLabels[0]?.anchorPosition).toBe('above');
    expect(state.textLabels[0]?.fontProfileId).toBe('fp-1');
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
      correspondence_ids: [],
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
      new Map([
        [
          'cid-1',
          {
            imageBlobId: 'b1',
            censorImageBlobId: null as unknown as string,
            correspondence_ids: [],
          },
        ],
      ]),
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
      correspondence_ids: [],
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
      correspondence_ids: [],
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
      correspondence_ids: [],
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
          fontProfileId: 'fp-saved',
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.textLabels).toHaveLength(1);
    expect(ctx.textLabels[0]?.cursor).toBe('grab');
    expect(ctx.textLabels[0]?.fixedWidth).toBe(true);
    expect(ctx.textLabels[0]?.fixedWidthPx).toBe(320);
    expect(ctx.textLabels[0]?.fontProfileId).toBe('fp-saved');
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
    readingsMocks.listReadingsGrouped.mockResolvedValue([
      {
        group: { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
        items: [{ id: '1', name: 'A', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID }],
      },
    ]);
    const ctx = createCtx({
      loadModalEditingReadingId: 'stale',
      loadModalEditingTitle: 'draft',
      loadModalSearchQuery: 'stale filter',
      loadModalSelectedReadingIds: ['stale-selection'],
    });
    const openPromise = ctx.openLoadModal.call(ctx);
    expect(ctx.loadModalOpen).toBe(true);
    expect(ctx.loadModalReadingsPending).toBe(true);
    await openPromise;
    expect(ctx.loadModalReadingsPending).toBe(false);
    expect(ctx.localSavedReadings).toHaveLength(1);
    expect(ctx.loadModalEditingReadingId).toBeNull();
    expect(ctx.loadModalEditingTitle).toBe('');
    expect(ctx.loadModalSearchQuery).toBe('');
    expect(ctx.loadModalSelectedReadingIds).toEqual([]);
    ctx.closeLoadModal.call(ctx);
    expect(ctx.loadModalOpen).toBe(false);
    expect(ctx.loadModalConfirmingForId).toBeNull();
  });

  it('openLoadModal focuses the search input after readings load', async () => {
    readingsMocks.listReadingsGrouped.mockResolvedValue([]);
    const focus = vi.fn();
    const ctx = createCtx();
    ctx.$refs.loadModalSearchInput = { focus } as unknown as HTMLElement;
    await ctx.openLoadModal.call(ctx);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  describe('filteredLoadModalReadings', () => {
    it('returns all readings when search is blank or whitespace', () => {
      const list = [
        { id: '1', name: 'Alpha', updated_at: 't1', group_id: DEFAULT_READING_GROUP_ID },
        { id: '2', name: 'Beta', updated_at: 't2', group_id: DEFAULT_READING_GROUP_ID },
      ];
      const ctx = createCtx({ localSavedReadings: list, loadModalSearchQuery: '' });
      expect(ctx.filteredLoadModalReadings.call(ctx)).toEqual(list);
      ctx.loadModalSearchQuery = '   ';
      expect(ctx.filteredLoadModalReadings.call(ctx)).toEqual(list);
    });

    it('matches title case-insensitively by substring', () => {
      const ctx = createCtx({
        localSavedReadings: [
          { id: '1', name: 'Foo Bar', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
          { id: '2', name: 'Other', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
        ],
        loadModalSearchQuery: 'FOO',
      });
      expect(ctx.filteredLoadModalReadings.call(ctx)).toEqual([
        { id: '1', name: 'Foo Bar', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
      ]);
    });

    it('returns empty when no title matches', () => {
      const ctx = createCtx({
        localSavedReadings: [{ id: '1', name: 'Alpha', updated_at: 't' }],
        loadModalSearchQuery: 'zzz',
      });
      expect(ctx.filteredLoadModalReadings.call(ctx)).toEqual([]);
    });

    it('matches empty name against Untitled Reading label', () => {
      const ctx = createCtx({
        localSavedReadings: [
          { id: '1', name: '', updated_at: 't' },
          { id: '2', name: 'Named', updated_at: 't' },
        ],
        loadModalSearchQuery: 'untitled',
      });
      expect(ctx.filteredLoadModalReadings.call(ctx)).toEqual([
        { id: '1', name: '', updated_at: 't' },
      ]);
    });
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

  it('handleSaveShortcut triggers save click and prevents default', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const saveSpy = vi.spyOn(ctx, 'handleSaveClick');
    ctx.handleSaveShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(saveSpy).toHaveBeenCalledTimes(1);
  });

  it('handleSaveShortcut ignores editable targets', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const input = document.createElement('input');
    const event = {
      target: input,
      preventDefault,
    } as unknown as KeyboardEvent;
    const saveSpy = vi.spyOn(ctx, 'handleSaveClick');
    ctx.handleSaveShortcut.call(ctx, event);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('handleShuffleShortcut shuffles deck and prevents default', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    ctx.handleShuffleShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(ctx.shuffleDeck).toHaveBeenCalledTimes(1);
  });

  it('handleShuffleShortcut ignores editable targets', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('textarea'),
      preventDefault,
    } as unknown as KeyboardEvent;
    ctx.handleShuffleShortcut.call(ctx, event);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(ctx.shuffleDeck).not.toHaveBeenCalled();
  });

  it('handleNextDeckShortcut dispatches cycle-deck forward and prevents default', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const listener = vi.fn();
    window.addEventListener('cycle-deck', listener);
    ctx.handleNextDeckShortcut.call(ctx, event);
    window.removeEventListener('cycle-deck', listener);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ direction: 1 });
  });

  it('handlePreviousDeckShortcut ignores editable targets', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('input'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const listener = vi.fn();
    window.addEventListener('cycle-deck', listener);
    ctx.handlePreviousDeckShortcut.call(ctx, event);
    window.removeEventListener('cycle-deck', listener);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('handleSwitchDeckByNameShortcut dispatches switch-deck-by-name and prevents default', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const listener = vi.fn();
    window.addEventListener('switch-deck-by-name', listener);
    ctx.handleSwitchDeckByNameShortcut.call(ctx, event);
    window.removeEventListener('switch-deck-by-name', listener);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('handleSwitchDeckByNameShortcut ignores editable targets', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('textarea'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const listener = vi.fn();
    window.addEventListener('switch-deck-by-name', listener);
    ctx.handleSwitchDeckByNameShortcut.call(ctx, event);
    window.removeEventListener('switch-deck-by-name', listener);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('handleOpenDeckModalShortcut dispatches open-deck-modal and prevents default', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const listener = vi.fn();
    window.addEventListener('open-deck-modal', listener);
    ctx.handleOpenDeckModalShortcut.call(ctx, event);
    window.removeEventListener('open-deck-modal', listener);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('handleOpenReadingsModalShortcut opens load modal and prevents default', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const openSpy = vi.spyOn(ctx, 'openLoadModal').mockResolvedValue(undefined);
    ctx.handleOpenReadingsModalShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it('handleOpenSettingsModalShortcut opens settings and prevents default', () => {
    alpineStub.rawStores.settings = { open: false };
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    ctx.handleOpenSettingsModalShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect((alpineStub.rawStores.settings as { open: boolean }).open).toBe(true);
  });

  it('handleOpenAccountModalShortcut dispatches open-account-modal and prevents default', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const listener = vi.fn();
    window.addEventListener('open-account-modal', listener);
    ctx.handleOpenAccountModalShortcut.call(ctx, event);
    window.removeEventListener('open-account-modal', listener);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('handleOpenCorrespondenceManagerShortcut dispatches open-correspondence-manager and prevents default', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const listener = vi.fn();
    window.addEventListener('open-correspondence-manager', listener);
    ctx.handleOpenCorrespondenceManagerShortcut.call(ctx, event);
    window.removeEventListener('open-correspondence-manager', listener);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('handleOpenCorrespondenceManagerShortcut ignores editable targets', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const input = document.createElement('input');
    const event = {
      target: input,
      preventDefault,
    } as unknown as KeyboardEvent;
    const listener = vi.fn();
    window.addEventListener('open-correspondence-manager', listener);
    ctx.handleOpenCorrespondenceManagerShortcut.call(ctx, event);
    window.removeEventListener('open-correspondence-manager', listener);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('handleOpenKeyboardShortcutsShortcut dispatches open-keyboard-shortcuts and prevents default', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const listener = vi.fn();
    window.addEventListener('open-keyboard-shortcuts', listener);
    ctx.handleOpenKeyboardShortcutsShortcut.call(ctx, event);
    window.removeEventListener('open-keyboard-shortcuts', listener);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('handleOpenKeyboardShortcutsShortcut ignores editable targets', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const input = document.createElement('input');
    const event = {
      target: input,
      preventDefault,
    } as unknown as KeyboardEvent;
    const listener = vi.fn();
    window.addEventListener('open-keyboard-shortcuts', listener);
    ctx.handleOpenKeyboardShortcutsShortcut.call(ctx, event);
    window.removeEventListener('open-keyboard-shortcuts', listener);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('handleClearCanvasShortcut opens confirm dialog and prevents default', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    ctx.handleClearCanvasShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect((alpineStub.rawStores.dialog as { title: string }).title).toContain('clear the canvas');
  });

  it('promptClearCanvas confirm calls clearCanvas on draggableZoneComponent', () => {
    const clearCanvas = vi.fn();
    window.draggableZoneComponent = {
      clearCanvas,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = createCtx();
    ctx.promptClearCanvas.call(ctx);
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    expect(clearCanvas).toHaveBeenCalledTimes(1);
  });

  it('handleNewReadingShortcut starts createNewReading and prevents default', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const createSpy = vi.spyOn(ctx, 'createNewReading').mockResolvedValue(undefined);
    ctx.handleNewReadingShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('handleDrawCardShortcut uses context menu coordinates when open', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const drawCardAt = vi.fn();
    window.draggableZoneComponent = {
      contextMenu: {
        open: true,
        x: 120,
        y: 240,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      getContextMenuScreenPosition: () => ({ x: 120, y: 240 }),
      drawCardAt,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleDrawCardShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(drawCardAt).toHaveBeenCalledWith(120, 240);
  });

  it('handleDrawCardShortcut uses last pointer location when context menu is closed', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const drawCardAt = vi.fn();
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      drawCardAt,
      lastPointerScreenX: 333,
      lastPointerScreenY: 444,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleDrawCardShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(drawCardAt).toHaveBeenCalledWith(333, 444);
  });

  it('handleDrawCardShortcut throttles repeated keydown to once per second', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const ctx = createCtx();
    const drawCardAt = vi.fn();
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      drawCardAt,
      lastPointerScreenX: 100,
      lastPointerScreenY: 200,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;

    const first = {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
      repeat: false,
    } as unknown as KeyboardEvent;
    ctx.handleDrawCardShortcut.call(ctx, first);
    expect(drawCardAt).toHaveBeenCalledTimes(1);

    vi.setSystemTime(10_500);
    const heldTooSoon = {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
      repeat: true,
    } as unknown as KeyboardEvent;
    ctx.handleDrawCardShortcut.call(ctx, heldTooSoon);
    expect(drawCardAt).toHaveBeenCalledTimes(1);

    vi.setSystemTime(11_100);
    const heldAfterOneSecond = {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
      repeat: true,
    } as unknown as KeyboardEvent;
    ctx.handleDrawCardShortcut.call(ctx, heldAfterOneSecond);
    expect(drawCardAt).toHaveBeenCalledTimes(2);
  });

  it('handleDrawByNameShortcut opens at context menu when open', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const openDrawByNameFromContextMenu = vi.fn();
    const openDrawByNameAt = vi.fn();
    window.draggableZoneComponent = {
      contextMenu: {
        open: true,
        x: 120,
        y: 240,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      getContextMenuScreenPosition: () => ({ x: 120, y: 240 }),
      openDrawByNameFromContextMenu,
      openDrawByNameAt,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleDrawByNameShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(openDrawByNameFromContextMenu).toHaveBeenCalledTimes(1);
    expect(openDrawByNameAt).not.toHaveBeenCalled();
  });

  it('handleDrawByNameShortcut opens at last pointer when context menu is closed', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const openDrawByNameFromContextMenu = vi.fn();
    const openDrawByNameAt = vi.fn();
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 120,
        y: 240,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      openDrawByNameFromContextMenu,
      openDrawByNameAt,
      lastPointerScreenX: 333,
      lastPointerScreenY: 444,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleDrawByNameShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(openDrawByNameFromContextMenu).not.toHaveBeenCalled();
    expect(openDrawByNameAt).toHaveBeenCalledWith(333, 444);
  });

  it('handleDrawByIndexShortcut opens draw-by-index dialog at context menu when open', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const openDrawByIndexDialog = vi.fn();
    window.draggableZoneComponent = {
      contextMenu: {
        open: true,
        x: 120,
        y: 240,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      getContextMenuScreenPosition: () => ({ x: 120, y: 240 }),
      openDrawByIndexDialog,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleDrawByIndexShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(openDrawByIndexDialog).toHaveBeenCalledWith(120, 240);
  });

  it('handleDrawByIndexShortcut opens draw-by-index dialog at last pointer position', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const openDrawByIndexDialog = vi.fn();
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      openDrawByIndexDialog,
      lastPointerScreenX: 333,
      lastPointerScreenY: 444,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleDrawByIndexShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(openDrawByIndexDialog).toHaveBeenCalledWith(333, 444);
  });

  it('handleDrawByIndexShortcut ignores editable targets', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('input'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const openDrawByIndexDialog = vi.fn();
    window.draggableZoneComponent = {
      openDrawByIndexDialog,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleDrawByIndexShortcut.call(ctx, event);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(openDrawByIndexDialog).not.toHaveBeenCalled();
  });

  it('handleAddTextShortcut uses context menu coordinates when open', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const addTextAt = vi.fn();
    window.draggableZoneComponent = {
      contextMenu: {
        open: true,
        x: 120,
        y: 240,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      getContextMenuScreenPosition: () => ({ x: 120, y: 240 }),
      addTextAt,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleAddTextShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(addTextAt).toHaveBeenCalledWith(120, 240);
  });

  it('handleAddTextShortcut uses last pointer location when context menu is closed', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const addTextAt = vi.fn();
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      addTextAt,
      lastPointerScreenX: 333,
      lastPointerScreenY: 444,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleAddTextShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(addTextAt).toHaveBeenCalledWith(333, 444);
  });

  it('handleRandomNumberShortcut opens modal at context menu when open', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      code: 'Digit3',
      ctrlKey: true,
      shiftKey: true,
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    window.draggableZoneComponent = {
      contextMenu: {
        open: true,
        x: 120,
        y: 240,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      getContextMenuScreenPosition: () => ({ x: 120, y: 240 }),
      lastPointerScreenX: null,
      lastPointerScreenY: null,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleRandomNumberShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(ctx.randomNumberModalOpen).toBe(true);
    expect(ctx.randomNumberScreenX).toBe(120);
    expect(ctx.randomNumberScreenY).toBe(240);
  });

  it('handleRandomNumberShortcut opens modal at last pointer position', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      code: 'Digit3',
      ctrlKey: true,
      shiftKey: true,
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      lastPointerScreenX: 333,
      lastPointerScreenY: 444,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleRandomNumberShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(ctx.randomNumberModalOpen).toBe(true);
    expect(ctx.randomNumberScreenX).toBe(333);
    expect(ctx.randomNumberScreenY).toBe(444);
  });

  it('handleRandomNumberShortcut ignores editable targets', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      code: 'Digit3',
      ctrlKey: true,
      shiftKey: true,
      target: document.createElement('input'),
      preventDefault,
    } as unknown as KeyboardEvent;
    ctx.handleRandomNumberShortcut.call(ctx, event);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(ctx.randomNumberModalOpen).toBe(false);
  });

  it('handleRandomNumberShortcut ignores non-Digit3 keys and missing modifiers', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const base = {
      target: document.createElement('div'),
      preventDefault,
    };
    ctx.handleRandomNumberShortcut.call(ctx, {
      ...base,
      code: 'Digit3',
      ctrlKey: true,
      shiftKey: false,
    } as unknown as KeyboardEvent);
    ctx.handleRandomNumberShortcut.call(ctx, {
      ...base,
      code: 'KeyS',
      ctrlKey: true,
      shiftKey: true,
    } as unknown as KeyboardEvent);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(ctx.randomNumberModalOpen).toBe(false);
  });

  it('generateRandomNumber sets result and clears error on valid bounds', () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr) => {
      (arr as Uint32Array)[0] = 0;
      return arr;
    });
    const ctx = createCtx({
      randomNumberLowerBound: '1',
      randomNumberUpperBound: '12',
      randomNumberResult: 99,
      randomNumberError: 'old',
    });
    ctx.generateRandomNumber.call(ctx);
    expect(ctx.randomNumberError).toBeNull();
    expect(ctx.randomNumberResult).toBe(1);
  });

  it('generateRandomNumber sets error and clears result on invalid bounds', () => {
    const ctx = createCtx({
      randomNumberLowerBound: '10',
      randomNumberUpperBound: '3',
      randomNumberResult: 7,
    });
    ctx.generateRandomNumber.call(ctx);
    expect(ctx.randomNumberError).toBe('Upper bound must be larger than lower bound');
    expect(ctx.randomNumberResult).toBeNull();
  });

  it('closeRandomNumberModal preserves bounds and result', () => {
    const ctx = createCtx({
      randomNumberModalOpen: true,
      randomNumberLowerBound: '2',
      randomNumberUpperBound: '20',
      randomNumberResult: 15,
      randomNumberError: 'err',
    });
    ctx.closeRandomNumberModal.call(ctx);
    expect(ctx.randomNumberModalOpen).toBe(false);
    expect(ctx.randomNumberLowerBound).toBe('2');
    expect(ctx.randomNumberUpperBound).toBe('20');
    expect(ctx.randomNumberResult).toBe(15);
    expect(ctx.randomNumberError).toBe('err');
  });

  it('reopenRandomNumberModal preserves prior state', () => {
    const ctx = createCtx({
      randomNumberLowerBound: '5',
      randomNumberUpperBound: '50',
      randomNumberResult: 42,
    });
    ctx.openRandomNumberModal.call(ctx, 10, 20);
    expect(ctx.randomNumberModalOpen).toBe(true);
    expect(ctx.randomNumberLowerBound).toBe('5');
    expect(ctx.randomNumberUpperBound).toBe('50');
    expect(ctx.randomNumberResult).toBe(42);
  });

  it('addRandomNumberResultToCanvas calls addTextLabelWithTextAt at anchor', () => {
    const addTextLabelWithTextAt = vi.fn();
    const ctx = createCtx({
      randomNumberModalOpen: true,
      randomNumberResult: 8,
      randomNumberScreenX: 100,
      randomNumberScreenY: 200,
    });
    window.draggableZoneComponent = {
      addTextLabelWithTextAt,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.addRandomNumberResultToCanvas.call(ctx);
    expect(addTextLabelWithTextAt).toHaveBeenCalledWith(100, 200, '8');
    expect(ctx.randomNumberModalOpen).toBe(false);
  });

  it('addRandomNumberResultToCanvas no-ops without result or anchor', () => {
    const addTextLabelWithTextAt = vi.fn();
    const ctx = createCtx({
      randomNumberResult: null,
      randomNumberScreenX: 100,
      randomNumberScreenY: 200,
    });
    window.draggableZoneComponent = {
      addTextLabelWithTextAt,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.addRandomNumberResultToCanvas.call(ctx);
    expect(addTextLabelWithTextAt).not.toHaveBeenCalled();
  });

  it('handleEscapeShortcut closes random number modal when open', () => {
    const ctx = createCtx({ randomNumberModalOpen: true });
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    ctx.handleEscapeShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(ctx.randomNumberModalOpen).toBe(false);
  });

  it('handleEscapeShortcut closes account modal when open', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const closeAccountMenu = vi.fn();
    window.authComponent = {
      isAccountMenuOpen: true,
      closeAccountMenu,
    };
    ctx.handleEscapeShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(closeAccountMenu).toHaveBeenCalledTimes(1);
  });

  it('handleEscapeShortcut closes correspondences manager before settings', () => {
    alpineStub.rawStores.settings = { open: true };
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const handleManagerEscape = vi.fn(() => true);
    window.correspondenceManagerComponent = { handleManagerEscape };
    ctx.handleEscapeShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(handleManagerEscape).toHaveBeenCalledTimes(1);
    expect((alpineStub.rawStores.settings as { open: boolean }).open).toBe(true);
  });

  it('handleEscapeShortcut commits active text edit', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const event = {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent;
    const commitEditTextLabel = vi.fn();
    window.draggableZoneComponent = {
      editingTextId: 'label-1',
      commitEditTextLabel,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleEscapeShortcut.call(ctx, event);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(commitEditTextLabel).toHaveBeenCalledTimes(1);
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

  it('cancelLoadConfirm clears confirming id and title edit state', () => {
    const ctx = createCtx({
      loadModalConfirmingForId: 'q',
      loadModalEditingReadingId: 'e',
      loadModalEditingTitle: 'x',
    });
    ctx.cancelLoadConfirm.call(ctx);
    expect(ctx.loadModalConfirmingForId).toBeNull();
    expect(ctx.loadModalEditingReadingId).toBeNull();
    expect(ctx.loadModalEditingTitle).toBe('');
  });

  it('commitLoadModalTitleEdit does not call rename when trimmed title is empty', async () => {
    const ctx = createCtx({
      loadModalEditingReadingId: '1',
      loadModalEditingTitle: '   ',
      localSavedReadings: [{ id: '1', name: 'A', updated_at: 't' }],
    });
    await ctx.commitLoadModalTitleEdit.call(ctx);
    expect(readingsMocks.renameLocalReading).not.toHaveBeenCalled();
  });

  it('commitLoadModalTitleEdit updates list and clears editing on success', async () => {
    readingsMocks.renameLocalReading.mockResolvedValue({ updated_at: 'new-ts' });
    readingsMocks.listReadingsGrouped.mockResolvedValue([
      {
        group: { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
        items: [{ id: '1', name: 'Hi', updated_at: 'new-ts', group_id: DEFAULT_READING_GROUP_ID }],
      },
    ]);
    const ctx = createCtx({
      loadModalEditingReadingId: '1',
      loadModalEditingTitle: '  Hi  ',
      localSavedReadings: [{ id: '1', name: 'A', updated_at: 'old' }],
    });
    await ctx.commitLoadModalTitleEdit.call(ctx);
    expect(readingsMocks.renameLocalReading).toHaveBeenCalledWith('1', 'Hi');
    expect(ctx.localSavedReadings[0]).toEqual({
      id: '1',
      name: 'Hi',
      updated_at: 'new-ts',
      group_id: DEFAULT_READING_GROUP_ID,
    });
    expect(ctx.loadModalEditingReadingId).toBeNull();
    expect(ctx.loadModalEditingTitle).toBe('');
  });

  it('commitLoadModalTitleEdit opens failure dialog when rename fails', async () => {
    readingsMocks.renameLocalReading.mockResolvedValue({ error: 'eek' });
    const ctx = createCtx({
      loadModalEditingReadingId: '1',
      loadModalEditingTitle: 'Ok',
      localSavedReadings: [{ id: '1', name: 'A', updated_at: 't' }],
    });
    await ctx.commitLoadModalTitleEdit.call(ctx);
    expect((alpineStub.rawStores.dialog as { title: string }).title).toContain('eek');
    expect(ctx.loadModalEditingReadingId).toBe('1');
  });

  it('cancelLoadModalTitleEdit clears editing without renaming', () => {
    const ctx = createCtx({
      loadModalEditingReadingId: '1',
      loadModalEditingTitle: 'x',
    });
    ctx.cancelLoadModalTitleEdit.call(ctx);
    expect(readingsMocks.renameLocalReading).not.toHaveBeenCalled();
    expect(ctx.loadModalEditingReadingId).toBeNull();
    expect(ctx.loadModalEditingTitle).toBe('');
  });

  it('startLoadModalTitleEdit sets draft title state', () => {
    const ctx = createCtx();
    ctx.startLoadModalTitleEdit.call(ctx, { id: 'a', name: 'N', updated_at: 'u' });
    expect(ctx.loadModalEditingReadingId).toBe('a');
    expect(ctx.loadModalEditingTitle).toBe('N');
  });

  it('closeLoadModal clears title edit state', () => {
    const ctx = createCtx({
      loadModalOpen: true,
      loadModalEditingReadingId: '1',
      loadModalEditingTitle: 'draft',
    });
    ctx.closeLoadModal.call(ctx);
    expect(ctx.loadModalEditingReadingId).toBeNull();
    expect(ctx.loadModalEditingTitle).toBe('');
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
    readingsMocks.listReadingsGrouped.mockResolvedValue([
      {
        group: { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
        items: [{ id: 'b', name: 'B', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID }],
      },
    ]);
    const ctx = createCtx({
      loadModalOpen: true,
      localSavedReadings: [
        { id: 'a', name: 'A', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
        { id: 'b', name: 'B', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
      ],
      loadedReadingId: 'a',
    });
    const p = ctx.deleteReading.call(ctx, 'a');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.localSavedReadings).toHaveLength(1);
    expect(ctx.loadedReadingId).toBeNull();
    expect(ctx.loadModalOpen).toBe(true);
    expect(readingsMocks.deleteLocalReading).toHaveBeenCalledWith('a');
    expect(readingsMocks.listReadingsGrouped).toHaveBeenCalled();
  });

  it('deleteReading keeps loaded id when deleting a different reading', async () => {
    readingsMocks.listReadingsGrouped.mockResolvedValue([
      {
        group: { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
        items: [{ id: 'a', name: 'A', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID }],
      },
    ]);
    const ctx = createCtx({
      localSavedReadings: [
        { id: 'a', name: 'A', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
        { id: 'b', name: 'B', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
      ],
      loadedReadingId: 'a',
    });
    const p = ctx.deleteReading.call(ctx, 'b');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.loadedReadingId).toBe('a');
    expect(ctx.localSavedReadings).toEqual([
      { id: 'a', name: 'A', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
    ]);
  });

  it('deleteReading clears title edit state when deleting the edited reading', async () => {
    const ctx = createCtx({
      localSavedReadings: [{ id: 'a', name: 'A', updated_at: 't' }],
      loadModalEditingReadingId: 'a',
      loadModalEditingTitle: 'edit',
    });
    const p = ctx.deleteReading.call(ctx, 'a');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.loadModalEditingReadingId).toBeNull();
    expect(ctx.loadModalEditingTitle).toBe('');
  });

  it('deleteReading removes deleted id from loadModalSelectedReadingIds', async () => {
    const ctx = createCtx({
      localSavedReadings: [
        { id: 'a', name: 'A', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
        { id: 'b', name: 'B', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
      ],
      loadModalSelectedReadingIds: ['a', 'b'],
    });
    const p = ctx.deleteReading.call(ctx, 'a');
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.loadModalSelectedReadingIds).toEqual(['b']);
  });

  it('isLoadModalReadingSelected and toggleLoadModalReadingSelection add and remove ids', () => {
    const ctx = createCtx();
    expect(ctx.isLoadModalReadingSelected.call(ctx, 'a')).toBe(false);
    ctx.toggleLoadModalReadingSelection.call(ctx, 'a');
    expect(ctx.isLoadModalReadingSelected.call(ctx, 'a')).toBe(true);
    expect(ctx.loadModalSelectedReadingIds).toEqual(['a']);
    ctx.toggleLoadModalReadingSelection.call(ctx, 'a');
    expect(ctx.isLoadModalReadingSelected.call(ctx, 'a')).toBe(false);
    expect(ctx.loadModalSelectedReadingIds).toEqual([]);
  });

  it('toggleLoadModalReadingGroupSelection selects and deselects readings in filtered group', () => {
    const sections = [
      {
        group: { id: 'g1', title: 'Client' },
        items: [
          { id: 'r1', name: 'A', updated_at: 't', group_id: 'g1' },
          { id: 'r2', name: 'B', updated_at: 't', group_id: 'g1' },
        ],
      },
      {
        group: { id: 'g2', title: 'Personal' },
        items: [{ id: 'r3', name: 'Daily', updated_at: 't', group_id: 'g2' }],
      },
    ];
    const ctx = createCtx({ loadModalGroupedSections: sections, loadModalSearchQuery: '' });
    ctx.toggleLoadModalReadingGroupSelection.call(ctx, 'g1');
    expect(ctx.loadModalSelectedReadingIds).toEqual(['r1', 'r2']);
    expect(ctx.isLoadModalReadingGroupSelected.call(ctx, 'g1')).toBe(true);
    expect(ctx.isLoadModalReadingGroupSelected.call(ctx, 'g2')).toBe(false);
    ctx.toggleLoadModalReadingGroupSelection.call(ctx, 'g1');
    expect(ctx.loadModalSelectedReadingIds).toEqual([]);
  });

  it('toggleLoadModalReadingGroupSelection respects search filter within group', () => {
    const sections = [
      {
        group: { id: 'g1', title: 'Client' },
        items: [
          { id: 'r1', name: 'Alpha', updated_at: 't', group_id: 'g1' },
          { id: 'r2', name: 'Beta', updated_at: 't', group_id: 'g1' },
        ],
      },
    ];
    const ctx = createCtx({
      loadModalGroupedSections: sections,
      localSavedReadings: sections[0].items,
      loadModalSearchQuery: 'alpha',
    });
    ctx.toggleLoadModalReadingGroupSelection.call(ctx, 'g1');
    expect(ctx.loadModalSelectedReadingIds).toEqual(['r1']);
    expect(ctx.isLoadModalReadingGroupSelected.call(ctx, 'g1')).toBe(true);
  });

  it('isLoadModalReadingGroupSelected is false when group has no visible readings', () => {
    const ctx = createCtx({
      loadModalGroupedSections: [{ group: { id: 'g1', title: 'Empty' }, items: [] }],
    });
    expect(ctx.isLoadModalReadingGroupSelected.call(ctx, 'g1')).toBe(false);
    ctx.toggleLoadModalReadingGroupSelection.call(ctx, 'g1');
    expect(ctx.loadModalSelectedReadingIds).toEqual([]);
  });

  it('selectAllLoadModalReadings selects filtered reading ids only', () => {
    const ctx = createCtx({
      localSavedReadings: [
        { id: 'a', name: 'Alpha', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
        { id: 'b', name: 'Beta', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
        { id: 'c', name: 'Alpine', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
      ],
      loadModalSearchQuery: 'al',
    });
    ctx.selectAllLoadModalReadings.call(ctx);
    expect(ctx.loadModalSelectedReadingIds).toEqual(['a', 'c']);
  });

  it('clearLoadModalReadingSelection empties loadModalSelectedReadingIds', () => {
    const ctx = createCtx({ loadModalSelectedReadingIds: ['a', 'b'] });
    ctx.clearLoadModalReadingSelection.call(ctx);
    expect(ctx.loadModalSelectedReadingIds).toEqual([]);
  });

  it('confirmAndDeleteSelectedLoadModalReadings is a no-op when nothing is selected', async () => {
    const ctx = createCtx();
    await ctx.confirmAndDeleteSelectedLoadModalReadings.call(ctx);
    expect(alpineStub.rawStores.dialog).toBeUndefined();
    expect(readingsMocks.deleteLocalReading).not.toHaveBeenCalled();
  });

  it('confirmAndDeleteSelectedLoadModalReadings returns when user cancels', async () => {
    const ctx = createCtx({ loadModalSelectedReadingIds: ['a', 'b'] });
    const p = ctx.confirmAndDeleteSelectedLoadModalReadings.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    await p;
    expect(readingsMocks.deleteLocalReading).not.toHaveBeenCalled();
    expect(ctx.loadModalSelectedReadingIds).toEqual(['a', 'b']);
  });

  it('confirmAndDeleteSelectedLoadModalReadings deletes multiple readings and clears selection', async () => {
    readingsMocks.listReadingsGrouped.mockResolvedValue([
      {
        group: { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
        items: [{ id: 'b', name: 'B', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID }],
      },
    ]);
    const ctx = createCtx({
      localSavedReadings: [
        { id: 'a', name: 'A', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
        { id: 'b', name: 'B', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
      ],
      loadModalSelectedReadingIds: ['a', 'b'],
    });
    const p = ctx.confirmAndDeleteSelectedLoadModalReadings.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(readingsMocks.deleteLocalReading).toHaveBeenCalledWith('a');
    expect(readingsMocks.deleteLocalReading).toHaveBeenCalledWith('b');
    expect(ctx.loadModalSelectedReadingIds).toEqual([]);
    expect(ctx.localSavedReadings).toHaveLength(1);
  });

  it('confirmAndDeleteSelectedLoadModalReadings uses singular confirm title for one reading', async () => {
    const ctx = createCtx({ loadModalSelectedReadingIds: ['solo'] });
    const p = ctx.confirmAndDeleteSelectedLoadModalReadings.call(ctx);
    await Promise.resolve();
    const dialog = alpineStub.rawStores.dialog as { title: string; onCancel: () => void };
    expect(dialog.title).toBe('Delete this saved reading?');
    dialog.onCancel();
    await p;
  });

  it('confirmAndDeleteSelectedLoadModalReadings uses plural confirm title for multiple readings', async () => {
    const ctx = createCtx({ loadModalSelectedReadingIds: ['a', 'b'] });
    const p = ctx.confirmAndDeleteSelectedLoadModalReadings.call(ctx);
    await Promise.resolve();
    const dialog = alpineStub.rawStores.dialog as { title: string; onCancel: () => void };
    expect(dialog.title).toBe('Delete these 2 saved readings?');
    dialog.onCancel();
    await p;
  });

  it('confirmAndDeleteSelectedLoadModalReadings clears loadedReadingId when deleted', async () => {
    readingsMocks.listReadingsGrouped.mockResolvedValue([
      {
        group: { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
        items: [{ id: 'b', name: 'B', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID }],
      },
    ]);
    const ctx = createCtx({
      localSavedReadings: [
        { id: 'a', name: 'A', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
        { id: 'b', name: 'B', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
      ],
      loadedReadingId: 'a',
      loadModalSelectedReadingIds: ['a'],
    });
    const p = ctx.confirmAndDeleteSelectedLoadModalReadings.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.loadedReadingId).toBeNull();
  });

  it('confirmAndDeleteSelectedLoadModalReadings keeps loadedReadingId when deleting other readings', async () => {
    readingsMocks.listReadingsGrouped.mockResolvedValue([
      {
        group: { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
        items: [{ id: 'a', name: 'A', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID }],
      },
    ]);
    const ctx = createCtx({
      localSavedReadings: [
        { id: 'a', name: 'A', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
        { id: 'b', name: 'B', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
      ],
      loadedReadingId: 'a',
      loadModalSelectedReadingIds: ['b'],
    });
    const p = ctx.confirmAndDeleteSelectedLoadModalReadings.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.loadedReadingId).toBe('a');
  });

  it('confirmAndDeleteSelectedLoadModalReadings clears title edit state when edited reading is deleted', async () => {
    readingsMocks.listReadingsGrouped.mockResolvedValue([]);
    const ctx = createCtx({
      localSavedReadings: [
        { id: 'a', name: 'A', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
      ],
      loadModalEditingReadingId: 'a',
      loadModalEditingTitle: 'edit',
      loadModalSelectedReadingIds: ['a'],
    });
    const p = ctx.confirmAndDeleteSelectedLoadModalReadings.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.loadModalEditingReadingId).toBeNull();
    expect(ctx.loadModalEditingTitle).toBe('');
  });

  it('toggleLoadModalGroupCollapsed tracks collapsed state per group', () => {
    const ctx = createCtx();
    expect(ctx.isLoadModalGroupCollapsed.call(ctx, 'g1')).toBe(false);
    ctx.toggleLoadModalGroupCollapsed.call(ctx, 'g1');
    expect(ctx.isLoadModalGroupCollapsed.call(ctx, 'g1')).toBe(true);
    ctx.toggleLoadModalGroupCollapsed.call(ctx, 'g1');
    expect(ctx.isLoadModalGroupCollapsed.call(ctx, 'g1')).toBe(false);
  });

  it('filteredLoadModalGroupedSections filters by group title or reading title', () => {
    const sections = [
      {
        group: { id: 'g1', title: 'Client Work' },
        items: [
          { id: 'r1', name: 'Spread A', updated_at: 't', group_id: 'g1' },
          { id: 'r2', name: 'Other', updated_at: 't', group_id: 'g1' },
        ],
      },
      {
        group: { id: 'g2', title: 'Personal' },
        items: [{ id: 'r3', name: 'Daily', updated_at: 't', group_id: 'g2' }],
      },
    ];
    const ctx = createCtx({ loadModalGroupedSections: sections, loadModalSearchQuery: 'client' });
    const out = ctx.filteredLoadModalGroupedSections.call(ctx);
    expect(out).toHaveLength(1);
    expect(out[0].group.title).toBe('Client Work');
    expect(out[0].items).toHaveLength(2);
  });

  it('assignReadingGroup refreshes grouped sections after success', async () => {
    readingsMocks.assignReadingToGroup.mockResolvedValue({});
    readingsMocks.listReadingsGrouped.mockResolvedValue([
      {
        group: { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
        items: [{ id: 'r1', name: 'Moved', updated_at: 't', group_id: 'g2' }],
      },
    ]);
    const ctx = createCtx();
    await ctx.assignReadingGroup.call(ctx, 'r1', 'g2');
    expect(readingsMocks.assignReadingToGroup).toHaveBeenCalledWith('r1', 'g2');
    expect(ctx.localSavedReadings[0]?.name).toBe('Moved');
  });

  it('assignReadingGroup sets loadModalGroupError when assignment fails', async () => {
    readingsMocks.assignReadingToGroup.mockResolvedValue({ error: 'Group not found' });
    const ctx = createCtx();
    await ctx.assignReadingGroup.call(ctx, 'r1', 'bad-group');
    expect(ctx.loadModalGroupError).toBe('Group not found');
    expect(readingsMocks.listReadingsGrouped).not.toHaveBeenCalled();
  });

  it('refreshLoadModalReadings falls back to flat list when grouped load fails', async () => {
    readingsMocks.listReadingsGrouped.mockRejectedValue(new Error('db fail'));
    readingsMocks.listLocalReadings.mockResolvedValue([
      { id: 'r1', name: 'One', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID },
    ]);
    const ctx = createCtx();
    await ctx.refreshLoadModalReadings.call(ctx);
    expect(uiMocks.logError).toHaveBeenCalledWith(
      'stateComponent.refreshLoadModalReadings',
      expect.any(Error),
    );
    expect(ctx.loadModalGroupError).toBe('Could not load saved readings.');
    expect(ctx.loadModalGroupedSections).toEqual([
      {
        group: { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
        items: [{ id: 'r1', name: 'One', updated_at: 't', group_id: DEFAULT_READING_GROUP_ID }],
      },
    ]);
    expect(ctx.loadModalReadingsPending).toBe(false);
  });

  it('addLoadModalGroup creates group and refreshes list on success', async () => {
    readingsMocks.createReadingGroup.mockResolvedValue({ id: 'g-new', title: 'Client Work' });
    readingsMocks.listReadingsGrouped.mockResolvedValue([
      {
        group: { id: 'g-new', title: 'Client Work' },
        items: [],
      },
    ]);
    const ctx = createCtx({ loadModalNewGroupTitle: '  Client Work  ' });
    await ctx.addLoadModalGroup.call(ctx);
    expect(readingsMocks.createReadingGroup).toHaveBeenCalledWith('Client Work');
    expect(ctx.loadModalNewGroupTitle).toBe('');
    expect(ctx.loadModalGroupError).toBeNull();
    expect(ctx.loadModalGroupedSections[0]?.group.title).toBe('Client Work');
  });

  it('addLoadModalGroup sets validation error for empty title', async () => {
    const ctx = createCtx({ loadModalNewGroupTitle: '   ' });
    await ctx.addLoadModalGroup.call(ctx);
    expect(readingsMocks.createReadingGroup).not.toHaveBeenCalled();
    expect(ctx.loadModalGroupError).toBeTruthy();
  });

  it('addLoadModalGroup sets loadModalGroupError when create fails', async () => {
    readingsMocks.createReadingGroup.mockRejectedValue(new Error('duplicate title'));
    const ctx = createCtx({ loadModalNewGroupTitle: 'Dup' });
    await ctx.addLoadModalGroup.call(ctx);
    expect(ctx.loadModalGroupError).toBe('duplicate title');
    expect(uiMocks.logError).toHaveBeenCalledWith(
      'stateComponent.addLoadModalGroup',
      expect.any(Error),
    );
  });

  it('addLoadModalGroup uses generic message for non-Error throws', async () => {
    readingsMocks.createReadingGroup.mockRejectedValue('nope');
    const ctx = createCtx({ loadModalNewGroupTitle: 'X' });
    await ctx.addLoadModalGroup.call(ctx);
    expect(ctx.loadModalGroupError).toBe('Could not create group');
  });

  it('startRenameLoadModalGroup and cancelRenameLoadModalGroup manage rename draft', () => {
    const ctx = createCtx();
    ctx.startRenameLoadModalGroup.call(ctx, { id: 'g1', title: 'Old Name' });
    expect(ctx.loadModalRenamingGroupId).toBe('g1');
    expect(ctx.loadModalRenameGroupTitle).toBe('Old Name');
    expect(ctx.loadModalGroupError).toBeNull();
    ctx.cancelRenameLoadModalGroup.call(ctx);
    expect(ctx.loadModalRenamingGroupId).toBeNull();
    expect(ctx.loadModalRenameGroupTitle).toBe('');
  });

  it('saveRenameLoadModalGroup returns early when no group is being renamed', async () => {
    const ctx = createCtx({ loadModalRenamingGroupId: null });
    await ctx.saveRenameLoadModalGroup.call(ctx);
    expect(readingsMocks.putReadingGroup).not.toHaveBeenCalled();
  });

  it('saveRenameLoadModalGroup validates title and renames on success', async () => {
    readingsMocks.putReadingGroup.mockResolvedValue(undefined);
    readingsMocks.listReadingsGrouped.mockResolvedValue([
      {
        group: { id: 'g1', title: 'Renamed' },
        items: [],
      },
    ]);
    const ctx = createCtx({
      loadModalRenamingGroupId: 'g1',
      loadModalRenameGroupTitle: '  Renamed  ',
    });
    await ctx.saveRenameLoadModalGroup.call(ctx);
    expect(readingsMocks.putReadingGroup).toHaveBeenCalledWith({ id: 'g1', title: 'Renamed' });
    expect(ctx.loadModalRenamingGroupId).toBeNull();
    expect(ctx.loadModalGroupedSections[0]?.group.title).toBe('Renamed');
  });

  it('saveRenameLoadModalGroup sets validation error for empty title', async () => {
    const ctx = createCtx({
      loadModalRenamingGroupId: 'g1',
      loadModalRenameGroupTitle: '   ',
    });
    await ctx.saveRenameLoadModalGroup.call(ctx);
    expect(readingsMocks.putReadingGroup).not.toHaveBeenCalled();
    expect(ctx.loadModalGroupError).toBeTruthy();
  });

  it('saveRenameLoadModalGroup sets loadModalGroupError when rename fails', async () => {
    readingsMocks.putReadingGroup.mockRejectedValue(new Error('conflict'));
    const ctx = createCtx({
      loadModalRenamingGroupId: 'g1',
      loadModalRenameGroupTitle: 'New',
    });
    await ctx.saveRenameLoadModalGroup.call(ctx);
    expect(ctx.loadModalGroupError).toBe('conflict');
    expect(uiMocks.logError).toHaveBeenCalledWith(
      'stateComponent.saveRenameLoadModalGroup',
      expect.any(Error),
    );
  });

  it('saveRenameLoadModalGroup uses generic message for non-Error throws', async () => {
    readingsMocks.putReadingGroup.mockRejectedValue('fail');
    const ctx = createCtx({
      loadModalRenamingGroupId: 'g1',
      loadModalRenameGroupTitle: 'New',
    });
    await ctx.saveRenameLoadModalGroup.call(ctx);
    expect(ctx.loadModalGroupError).toBe('Rename failed');
  });

  it('confirmDeleteLoadModalGroup is a no-op for the default group', async () => {
    const ctx = createCtx();
    await ctx.confirmDeleteLoadModalGroup.call(ctx, {
      id: DEFAULT_READING_GROUP_ID,
      title: 'Default',
    });
    expect(readingsMocks.deleteReadingGroup).not.toHaveBeenCalled();
  });

  it('confirmDeleteLoadModalGroup returns when user cancels', async () => {
    const ctx = createCtx();
    const promise = ctx.confirmDeleteLoadModalGroup.call(ctx, { id: 'g1', title: 'Work' });
    await flushPromises();
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    await promise;
    expect(readingsMocks.deleteReadingGroup).not.toHaveBeenCalled();
  });

  it('confirmDeleteLoadModalGroup deletes group and refreshes on confirm', async () => {
    readingsMocks.deleteReadingGroup.mockResolvedValue(undefined);
    readingsMocks.listReadingsGrouped.mockResolvedValue([]);
    const ctx = createCtx();
    const promise = ctx.confirmDeleteLoadModalGroup.call(ctx, { id: 'g1', title: 'Work' });
    await flushPromises();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await promise;
    expect(readingsMocks.deleteReadingGroup).toHaveBeenCalledWith('g1');
    expect(ctx.loadModalGroupError).toBeNull();
  });

  it('confirmDeleteLoadModalGroup sets loadModalGroupError when delete fails', async () => {
    readingsMocks.deleteReadingGroup.mockRejectedValue(new Error('locked'));
    const ctx = createCtx();
    const promise = ctx.confirmDeleteLoadModalGroup.call(ctx, { id: 'g1', title: 'Work' });
    await flushPromises();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await promise;
    expect(ctx.loadModalGroupError).toBe('locked');
    expect(uiMocks.logError).toHaveBeenCalledWith(
      'stateComponent.confirmDeleteLoadModalGroup',
      expect.any(Error),
    );
  });

  it('confirmDeleteLoadModalGroup uses generic message for non-Error throws', async () => {
    readingsMocks.deleteReadingGroup.mockRejectedValue('fail');
    const ctx = createCtx();
    const promise = ctx.confirmDeleteLoadModalGroup.call(ctx, { id: 'g1', title: 'Work' });
    await flushPromises();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await promise;
    expect(ctx.loadModalGroupError).toBe('Delete failed');
  });

  it('filteredLoadModalGroupedSections keeps empty groups when search is blank', () => {
    const ctx = createCtx({
      loadModalSearchQuery: '',
      loadModalGroupedSections: [
        {
          group: { id: 'g-empty', title: 'Empty Group' },
          items: [],
        },
      ],
    });
    const out = ctx.filteredLoadModalGroupedSections.call(ctx);
    expect(out).toHaveLength(1);
    expect(out[0].items).toEqual([]);
  });

  it('loadModalReadingsInFilteredGroup returns empty when group is missing', () => {
    const ctx = createCtx({
      loadModalGroupedSections: [
        {
          group: { id: 'g1', title: 'One' },
          items: [{ id: 'r1', name: 'A', updated_at: 't', group_id: 'g1' }],
        },
      ],
    });
    expect(ctx.loadModalReadingsInFilteredGroup.call(ctx, 'missing')).toEqual([]);
  });

  it('toggleLoadModalReadingGroupSelection is a no-op when filtered group has no readings', () => {
    const ctx = createCtx({
      loadModalGroupedSections: [{ group: { id: 'g-empty', title: 'Empty' }, items: [] }],
      loadModalSelectedReadingIds: ['r1'],
    });
    ctx.toggleLoadModalReadingGroupSelection.call(ctx, 'g-empty');
    expect(ctx.loadModalSelectedReadingIds).toEqual(['r1']);
  });

  it('addRandomNumberResultToCanvas no-ops when anchor coordinates are missing', () => {
    const addTextLabelWithTextAt = vi.fn();
    window.draggableZoneComponent = {
      addTextLabelWithTextAt,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = createCtx({
      randomNumberResult: 7,
      randomNumberScreenX: null,
      randomNumberScreenY: 200,
    });
    ctx.addRandomNumberResultToCanvas.call(ctx);
    expect(addTextLabelWithTextAt).not.toHaveBeenCalled();
  });

  it('handleRandomNumberShortcut opens modal at viewport center when no pointer is stored', () => {
    const ctx = createCtx();
    const viewport = document.createElement('div');
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      width: 400,
      height: 300,
      right: 410,
      bottom: 320,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect);
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport,
    } as unknown as typeof window.draggableZoneComponent;
    const event = {
      code: 'Digit3',
      ctrlKey: true,
      shiftKey: true,
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
    ctx.handleRandomNumberShortcut.call(ctx, event);
    expect(ctx.randomNumberModalOpen).toBe(true);
    expect(ctx.randomNumberScreenX).toBe(210);
    expect(ctx.randomNumberScreenY).toBe(170);
  });

  it('handleRandomNumberShortcut returns early when canvas component is missing', () => {
    const ctx = createCtx();
    window.draggableZoneComponent = undefined;
    const event = {
      code: 'Digit3',
      ctrlKey: true,
      shiftKey: true,
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
    ctx.handleRandomNumberShortcut.call(ctx, event);
    expect(ctx.randomNumberModalOpen).toBe(false);
  });

  it('handleRandomNumberShortcut returns early when viewport is missing', () => {
    const ctx = createCtx();
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    const event = {
      code: 'Digit3',
      ctrlKey: true,
      shiftKey: true,
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
    ctx.handleRandomNumberShortcut.call(ctx, event);
    expect(ctx.randomNumberModalOpen).toBe(false);
  });

  it('handleDrawCardShortcut draws at viewport center when no pointer is stored', () => {
    const drawCardAt = vi.fn();
    const viewport = document.createElement('div');
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 100,
      right: 200,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      drawCardAt,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = createCtx();
    ctx.handleDrawCardShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(drawCardAt).toHaveBeenCalledWith(100, 50);
  });

  it('handleDrawCardShortcut ignores editable targets and missing canvas', () => {
    const ctx = createCtx();
    const input = document.createElement('input');
    const drawCardAt = vi.fn();
    window.draggableZoneComponent = {
      drawCardAt,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleDrawCardShortcut.call(ctx, {
      target: input,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(drawCardAt).not.toHaveBeenCalled();
    window.draggableZoneComponent = undefined;
    ctx.handleDrawCardShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
  });

  it('handleDrawByNameShortcut opens at viewport center and ignores editable targets', () => {
    const openDrawByNameAt = vi.fn();
    const viewport = document.createElement('div');
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 200,
      right: 300,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      openDrawByNameAt,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = createCtx();
    ctx.handleDrawByNameShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(openDrawByNameAt).toHaveBeenCalledWith(150, 100);
    window.draggableZoneComponent = undefined;
    ctx.handleDrawByNameShortcut.call(ctx, {
      target: document.createElement('textarea'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
  });

  it('handleDrawByIndexShortcut opens at viewport center and returns when canvas is missing', () => {
    const openDrawByIndexDialog = vi.fn();
    const viewport = document.createElement('div');
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      openDrawByIndexDialog,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = createCtx();
    ctx.handleDrawByIndexShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(openDrawByIndexDialog).toHaveBeenCalledWith(50, 50);
    window.draggableZoneComponent = undefined;
    ctx.handleDrawByIndexShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
  });

  it('handleAddTextShortcut adds text at viewport center and ignores editable targets', () => {
    const addTextAt = vi.fn();
    const viewport = document.createElement('div');
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 200,
      right: 400,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      addTextAt,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = createCtx();
    ctx.handleAddTextShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(addTextAt).toHaveBeenCalledWith(200, 100);
    window.draggableZoneComponent = undefined;
    ctx.handleAddTextShortcut.call(ctx, {
      target: document.createElement('input'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
  });

  it('handlePreviousDeckShortcut dispatches cycle-deck backward', () => {
    const ctx = createCtx();
    const listener = vi.fn();
    window.addEventListener('cycle-deck', listener);
    ctx.handlePreviousDeckShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    window.removeEventListener('cycle-deck', listener);
    expect(listener).toHaveBeenCalledWith(expect.objectContaining({ detail: { direction: -1 } }));
  });

  it('shortcut handlers ignore contenteditable targets', () => {
    const ctx = createCtx();
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    const preventDefault = vi.fn();
    const event = { target: editable, preventDefault } as unknown as KeyboardEvent;
    ctx.handleOpenDeckModalShortcut.call(ctx, event);
    ctx.handleOpenReadingsModalShortcut.call(ctx, event);
    ctx.handleOpenSettingsModalShortcut.call(ctx, event);
    ctx.handleOpenAccountModalShortcut.call(ctx, event);
    ctx.handleClearCanvasShortcut.call(ctx, event);
    ctx.handleNewReadingShortcut.call(ctx, event);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('handleEscapeShortcut closes open dialog via onCancel', () => {
    const onCancel = vi.fn();
    alpineStub.rawStores.dialog = { open: true, onCancel };
    const ctx = createCtx();
    const stopImmediatePropagation = vi.fn();
    ctx.handleEscapeShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
      stopImmediatePropagation,
    } as unknown as KeyboardEvent);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect((alpineStub.rawStores.dialog as { open: boolean }).open).toBe(false);
    expect(stopImmediatePropagation).toHaveBeenCalledTimes(1);
  });

  it('handleEscapeShortcut closes settings when open and correspondence manager does not handle escape', () => {
    alpineStub.rawStores.settings = { open: true };
    window.correspondenceManagerComponent = { handleManagerEscape: vi.fn(() => false) };
    const ctx = createCtx();
    ctx.handleEscapeShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect((alpineStub.rawStores.settings as { open: boolean }).open).toBe(false);
  });

  it('handleEscapeShortcut closes deck modal and storage info panel', () => {
    const closeDeckModal = vi.fn();
    const closeStorageAdditionalInfo = vi.fn();
    window.draggableZoneComponent = {
      deckModalOpen: true,
      closeDeckModal,
      storageAdditionalInfoOpen: false,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = createCtx();
    ctx.handleEscapeShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(closeDeckModal).toHaveBeenCalledTimes(1);

    window.draggableZoneComponent = {
      deckModalOpen: false,
      closeDeckModal,
      storageAdditionalInfoOpen: true,
      closeStorageAdditionalInfo,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleEscapeShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(closeStorageAdditionalInfo).toHaveBeenCalledTimes(1);
  });

  it('handleEscapeShortcut cancels load modal title edit and closes load modal', () => {
    const ctx = createCtx({
      loadModalEditingReadingId: 'r1',
      loadModalEditingTitle: 'Draft',
    });
    ctx.handleEscapeShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(ctx.loadModalEditingReadingId).toBeNull();
    expect(ctx.loadModalEditingTitle).toBe('');

    const openCtx = createCtx({ loadModalOpen: true });
    openCtx.handleEscapeShortcut.call(openCtx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(openCtx.loadModalOpen).toBe(false);
  });

  it('createNewReading clears canvas even when draggableZoneComponent is missing', async () => {
    window.draggableZoneComponent = undefined;
    const ctx = createCtx({ dirty: false, loadedReadingId: null });
    const promise = ctx.createNewReading.call(ctx);
    await flushPromises();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await promise;
    expect(ctx.loadedReadingId).toBeNull();
    expect(ctx.dirty).toBe(false);
    expect(ctx.shuffleDeck).toHaveBeenCalled();
  });

  it('commitLoadModalTitleEdit returns early when no reading is being edited', async () => {
    const ctx = createCtx({ loadModalEditingReadingId: null });
    await ctx.commitLoadModalTitleEdit.call(ctx);
    expect(readingsMocks.renameLocalReading).not.toHaveBeenCalled();
  });

  it('handleNextDeckShortcut ignores editable targets', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    const listener = vi.fn();
    window.addEventListener('cycle-deck', listener);
    ctx.handleNextDeckShortcut.call(ctx, {
      target: document.createElement('input'),
      preventDefault,
    } as unknown as KeyboardEvent);
    window.removeEventListener('cycle-deck', listener);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
  });

  it('handleDrawCardShortcut returns early when viewport is missing', () => {
    const drawCardAt = vi.fn();
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      drawCardAt,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = createCtx();
    ctx.handleDrawCardShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(drawCardAt).not.toHaveBeenCalled();
  });

  it('handleDrawByNameShortcut returns early when canvas or viewport is missing', () => {
    const openDrawByNameAt = vi.fn();
    const ctx = createCtx();
    window.draggableZoneComponent = undefined;
    ctx.handleDrawByNameShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);

    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      openDrawByNameAt,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleDrawByNameShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(openDrawByNameAt).not.toHaveBeenCalled();
  });

  it('handleDrawByIndexShortcut returns early when viewport is missing', () => {
    const openDrawByIndexDialog = vi.fn();
    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      openDrawByIndexDialog,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = createCtx();
    ctx.handleDrawByIndexShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(openDrawByIndexDialog).not.toHaveBeenCalled();
  });

  it('handleAddTextShortcut returns early when canvas or viewport is missing', () => {
    const addTextAt = vi.fn();
    const ctx = createCtx();
    window.draggableZoneComponent = undefined;
    ctx.handleAddTextShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);

    window.draggableZoneComponent = {
      contextMenu: {
        open: false,
        x: 0,
        y: 0,
        contentX: 0,
        contentY: 0,
        cardId: null,
        textId: null,
      },
      addTextAt,
      lastPointerScreenX: null,
      lastPointerScreenY: null,
      viewport: null,
    } as unknown as typeof window.draggableZoneComponent;
    ctx.handleAddTextShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(addTextAt).not.toHaveBeenCalled();
  });

  it('promptClearCanvas cancel is a no-op', () => {
    const clearCanvas = vi.fn();
    window.draggableZoneComponent = {
      clearCanvas,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = createCtx();
    ctx.promptClearCanvas.call(ctx);
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    expect(clearCanvas).not.toHaveBeenCalled();
  });

  it('startLoadModalTitleEdit treats missing name as empty string', () => {
    const ctx = createCtx();
    ctx.startLoadModalTitleEdit.call(ctx, {
      id: 'r1',
      name: undefined as unknown as string,
      updated_at: 't',
    });
    expect(ctx.loadModalEditingTitle).toBe('');
  });

  it('deserializeState embedded resolved uses resolved censoredImg when snapshot has no censor bytes', async () => {
    const resolved = tarot({ censoredImg: 'blob:censored' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([[resolved.id, resolved]])));
    const state = minimalState({
      cards: [
        {
          id: 'dc1',
          deck_id: resolved.deckId,
          card_id: resolved.id,
          deck_title: resolved.deckTitle,
          card_title: resolved.title,
          image_source: resolved.imageSourceLabel,
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
          card_number: resolved.num,
          data: new Uint8Array([1, 2, 3]),
          mime_type: 'image/png',
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.draggableCards[0]?.card.censoredImg).toBe('blob:censored');
  });

  it('deserializeState maps text label defaults when optional fields are absent', async () => {
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map()));
    const state = minimalState({
      textLabels: [
        {
          id: 'tl1',
          text: 'note',
          x: 1,
          y: 2,
          fontSize: 12,
          fontWeight: 400,
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#000',
          zIndex: 1,
          anchorCardId: null,
          anchorPosition: null,
        },
      ],
    });
    const ctx = createCtx();
    await ctx.deserializeState.call(ctx, state);
    expect(ctx.textLabels[0]).toMatchObject({
      fixedWidth: false,
      fixedWidthPx: 0,
      fontProfileId: null,
    });
  });

  it('createNewReading inputText onCancel is a no-op', async () => {
    const ctx = createCtx({ dirty: true, loadedReadingId: null });
    const promise = ctx.createNewReading.call(ctx);
    await flushPromises();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await flushPromises();
    const inputDlg = alpineStub.rawStores.dialog as { onCancel: () => void };
    inputDlg.onCancel();
    await promise;
    expect(ctx.shuffleDeck).toHaveBeenCalled();
  });

  it('handleEscapeShortcut does nothing when no overlay is open', () => {
    const ctx = createCtx();
    const preventDefault = vi.fn();
    ctx.handleEscapeShortcut.call(ctx, {
      target: document.createElement('div'),
      preventDefault,
    } as unknown as KeyboardEvent);
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('deserializeState embedded resolved falls back to catalog censor label when snapshot omits it', async () => {
    const resolved = tarot({ id: 'cid-1', censorImageSourceLabel: 'catalog-censor' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'cid-1',
          card_title: 'T',
          image_source: 'i',
          card_number: 1,
          data: new Uint8Array([1]),
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
    expect(ctx.draggableCards[0]?.card.censorImageSourceLabel).toBe('catalog-censor');
  });

  it('deserializeState non-embedded resolved falls back to catalog censor label when snapshot omits it', async () => {
    const resolved = tarot({ id: 'cid-1', censorImageSourceLabel: 'catalog-censor' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'cid-1',
          card_title: 'T',
          image_source: 'i',
          card_number: 1,
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
    expect(ctx.draggableCards[0]?.card.censorImageSourceLabel).toBe('catalog-censor');
  });

  it('openSaveFailureDialog onCancel is a no-op', async () => {
    readingsMocks.saveLocalReading.mockResolvedValue({ error: 'fail' });
    const ctx = createCtx({ loadedReadingId: 'r1' });
    ctx.handleSaveClick.call(ctx);
    await flushPromises();
    const dlg = alpineStub.rawStores.dialog as { onCancel: () => void };
    dlg.onCancel();
  });

  it('serializeState writes null censor_image_source when label is missing', async () => {
    const ctx = createCtx({
      draggableCards: [draggable({ card: tarot({ censorImageSourceLabel: null }) })],
    });
    const state = await ctx.serializeState.call(ctx);
    expect(state.cards[0]?.censor_image_source).toBeNull();
  });

  it('serializeState preserves censor_image_source when label is set', async () => {
    const ctx = createCtx({
      draggableCards: [draggable({ card: tarot({ censorImageSourceLabel: 'c-src' }) })],
    });
    const state = await ctx.serializeState.call(ctx);
    expect(state.cards[0]?.censor_image_source).toBe('c-src');
  });

  it('deserializeState embedded resolved keeps explicit null censor label over catalog', async () => {
    const resolved = tarot({ id: 'cid-1', censorImageSourceLabel: 'catalog-censor' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
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
          data: new Uint8Array([1]),
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

  it('deserializeState embedded resolved without censor bytes keeps catalog censored image', async () => {
    const resolved = tarot({ id: 'cid-1', censoredImg: 'blob:catalog-censor' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'cid-1',
          card_title: 'T',
          image_source: 'i',
          card_number: 1,
          data: new Uint8Array([1]),
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
    expect(ctx.draggableCards[0]?.card.censoredImg).toBe('blob:catalog-censor');
  });

  it('deserializeState embedded censored bytes use octet-stream when mime type is absent', async () => {
    const resolved = tarot({ id: 'cid-1' });
    decksMocks.getCardsByIds.mockResolvedValue(ok(new Map([['cid-1', resolved]])));
    const state = minimalState({
      cards: [
        {
          id: 'dc',
          deck_id: 'd',
          card_id: 'cid-1',
          card_title: 'T',
          image_source: 'i',
          card_number: 1,
          data: new Uint8Array([1]),
          mime_type: 'image/png',
          censored_data: new Uint8Array([2, 3]),
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
    expect(createObjectURLSpy).toHaveBeenCalledWith(expect.any(Blob));
    const blobArg = createObjectURLSpy.mock.calls.at(-1)?.[0] as Blob;
    expect(blobArg.type).toBe('application/octet-stream');
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
