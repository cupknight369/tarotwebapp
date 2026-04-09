/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraggableCard, TarotCard, TextLabel } from '../../types/canvas.js';

const alpineStub = vi.hoisted(() => {
  const rawStores: Record<string, unknown> = {};
  let cardFactory: (() => object) | null = null;
  return {
    rawStores,
    getCardFactory: () => cardFactory,
    Alpine: {
      data(name: string, factory: () => object) {
        if (name === 'cardComponent') {
          cardFactory = factory;
        }
      },
      store(name: string, value?: unknown) {
        if (arguments.length >= 2) {
          rawStores[name] = value;
        }
        return rawStores[name];
      },
    },
  };
});

vi.mock('alpinejs', () => ({
  default: alpineStub.Alpine,
}));

vi.mock('../../lib/cardBlobUrls.js', () => ({
  revokeTarotCardBlobUrls: vi.fn(),
}));

import { revokeTarotCardBlobUrls } from '../../lib/cardBlobUrls.js';
import '../../components/CanvasCardComponent.js';

type DialogState = {
  open: boolean;
  type: string;
  title: string;
  inputMin: number;
  inputMax: number;
  inputDefault: string;
  onSubmit: (v: number) => void;
  onCancel: () => void;
};

type CardComponentApi = {
  draggableCards: DraggableCard[];
  maxZIndex: number;
  dirty: boolean;
  selectedCardIds: string[];
  textLabels: TextLabel[];
  showShuffledConfirmation: boolean;
  CARD_WIDTH: number;
  CARD_HEIGHT: number;
  getCardImg: (card: TarotCard, censored: boolean) => string;
  cardShowsPlaceholder: (card: TarotCard, censored: boolean) => boolean;
  shuffleDeck: () => void;
  openDrawByIndexDialog: (this: MergedCtx) => void;
  openDrawMultipleDialog: (this: MergedCtx) => void;
  addCardToCanvas: (this: MergedCtx, card: TarotCard) => void;
  generateCardId: () => string;
  cryptoRandomInt: (len: number) => number;
  drawMultipleCards: (num: number) => Set<number> | undefined;
  drawCardAt: (this: MergedCtx, x: number, y: number) => void;
  updateItem: (this: MergedCtx, id: string, newProps: Partial<DraggableCard>) => void;
  deleteCard: (this: MergedCtx, cardId: string) => void;
  deleteSelectedCards: (this: MergedCtx) => void;
  rotateCard: (
    this: MergedCtx,
    cardId: string,
    direction: 'clockwise' | 'counter-clockwise' | '180',
  ) => void;
};

type MergedCtx = CardComponentApi & {
  viewport: HTMLDivElement;
  offsetX: number;
  offsetY: number;
  scale: number;
  updateTextLabel: (id: string, props: Partial<TextLabel>) => void;
  screenToContent: (screenX: number, screenY: number) => { x: number; y: number };
  /** Optional override for dialog `onSubmit` tests. */
  drawMultipleCards?: (num: number) => Set<number> | undefined;
};

const baseCard: TarotCard = {
  id: 't1',
  deckId: 'd1',
  title: 'Star',
  num: 1,
  img: 'star.webp',
};

function viewportStub(width: number, height: number): HTMLDivElement {
  return {
    getBoundingClientRect: () => ({
      width,
      height,
      top: 0,
      left: 0,
      right: width,
      bottom: height,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  } as unknown as HTMLDivElement;
}

function mountBase(): CardComponentApi {
  const factory = alpineStub.getCardFactory();
  if (!factory) {
    throw new Error('cardComponent factory not registered');
  }
  return factory() as CardComponentApi;
}

function createMerged(base: CardComponentApi): MergedCtx {
  return {
    ...base,
    viewport: viewportStub(800, 600),
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    textLabels: [] as TextLabel[],
    updateTextLabel: vi.fn(),
    screenToContent: (x: number, y: number) => ({ x: x - 5, y: y - 7 }),
  };
}

describe('cardComponent (CanvasCardComponent.ts)', () => {
  beforeEach(() => {
    alpineStub.rawStores.shuffledCards = [];
    alpineStub.rawStores.activeDeckTitle = '';
    alpineStub.rawStores.dialog = undefined;
    vi.mocked(revokeTarotCardBlobUrls).mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('getCardImg returns empty string for invalidReference', () => {
    const c = mountBase();
    expect(c.getCardImg({ ...baseCard, invalidReference: true }, false)).toBe('');
  });

  it('getCardImg prefers censored image when requested', () => {
    const c = mountBase();
    expect(c.getCardImg({ ...baseCard, censoredImg: 'c.webp', img: 'u.webp' }, true)).toBe(
      'c.webp',
    );
  });

  it('getCardImg falls back to img when censored but no censoredImg', () => {
    const c = mountBase();
    expect(c.getCardImg(baseCard, true)).toBe('star.webp');
  });

  it('cardShowsPlaceholder is true for invalidReference or empty image URL', () => {
    const c = mountBase();
    expect(c.cardShowsPlaceholder({ ...baseCard, invalidReference: true }, false)).toBe(true);
    expect(c.cardShowsPlaceholder({ ...baseCard, img: '', invalidReference: false }, false)).toBe(
      true,
    );
  });

  it('cardShowsPlaceholder is false when a usable URL exists', () => {
    const c = mountBase();
    expect(c.cardShowsPlaceholder(baseCard, false)).toBe(false);
  });

  it('shuffleDeck permutes shuffledCards and toggles confirmation with a timer', () => {
    vi.useFakeTimers();
    const deck: TarotCard[] = [
      { ...baseCard, id: 'a' },
      { ...baseCard, id: 'b' },
      { ...baseCard, id: 'c' },
    ];
    alpineStub.rawStores.shuffledCards = [...deck];
    const c = mountBase();

    let i = 0;
    vi.spyOn(c, 'cryptoRandomInt').mockImplementation((len: number) => {
      i += 1;
      return (i * 7) % len;
    });

    c.shuffleDeck();

    const after = alpineStub.rawStores.shuffledCards as TarotCard[];
    expect(after).toHaveLength(3);
    expect(after.map((x) => x.id).sort()).toEqual(['a', 'b', 'c']);
    expect(c.showShuffledConfirmation).toBe(true);
    vi.advanceTimersByTime(3000);
    expect(c.showShuffledConfirmation).toBe(false);
  });

  it('cryptoRandomInt returns a value in [0, len)', () => {
    const c = mountBase();
    for (let len = 1; len <= 5; len += 1) {
      for (let i = 0; i < 20; i += 1) {
        const v = c.cryptoRandomInt(len);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThan(len);
      }
    }
  });

  it('drawMultipleCards returns undefined for out-of-range counts', () => {
    const c = mountBase();
    expect(c.drawMultipleCards(0)).toBeUndefined();
    expect(c.drawMultipleCards(11)).toBeUndefined();
  });

  it('drawMultipleCards returns undefined when the deck is empty', () => {
    alpineStub.rawStores.shuffledCards = [];
    const c = mountBase();
    expect(c.drawMultipleCards(3)).toBeUndefined();
  });

  it('drawMultipleCards returns a set of unique indices capped by deck size', () => {
    alpineStub.rawStores.shuffledCards = [
      baseCard,
      { ...baseCard, id: '2' },
      { ...baseCard, id: '3' },
    ];
    const c = mountBase();
    const draws = c.drawMultipleCards(10);
    expect(draws).toBeDefined();
    expect(draws!.size).toBe(3);
  });

  it('drawMultipleCards retries cryptoRandomInt when the same index is drawn twice', () => {
    alpineStub.rawStores.shuffledCards = [baseCard, { ...baseCard, id: '2' }];
    const c = mountBase();
    let n = 0;
    vi.spyOn(c, 'cryptoRandomInt').mockImplementation((len: number) => {
      const seq = [0, 0, 1];
      const v = seq[Math.min(n, seq.length - 1)] ?? 0;
      n += 1;
      return v % len;
    });
    const draws = c.drawMultipleCards(2);
    expect(draws!.size).toBe(2);
  });

  it('openDrawByIndexDialog wires onSubmit to addCardToCanvas', () => {
    alpineStub.rawStores.shuffledCards = [baseCard];
    alpineStub.rawStores.activeDeckTitle = 'My deck';
    const base = mountBase();
    const ctx = createMerged(base);
    ctx.draggableCards = [];
    ctx.maxZIndex = 0;
    ctx.dirty = false;

    base.openDrawByIndexDialog.call(ctx);
    const dialog = alpineStub.rawStores.dialog as DialogState;
    expect(dialog.title).toContain('0-0');
    dialog.onSubmit(0);

    expect(ctx.draggableCards).toHaveLength(1);
    expect(ctx.draggableCards[0].card.deckTitle).toBe('My deck');
    expect(ctx.dirty).toBe(true);
  });

  it('addCardToCanvas keeps an existing card deckTitle over the active deck title', () => {
    alpineStub.rawStores.activeDeckTitle = 'Store title';
    const base = mountBase();
    const ctx = createMerged(base);
    ctx.draggableCards = [];
    ctx.maxZIndex = 0;
    ctx.dirty = false;
    const withTitle: TarotCard = { ...baseCard, deckTitle: 'Embedded title' };
    base.addCardToCanvas.call(ctx, withTitle);
    expect(ctx.draggableCards[0].card.deckTitle).toBe('Embedded title');
  });

  it('openDrawByIndexDialog onCancel is safe to call', () => {
    alpineStub.rawStores.shuffledCards = [baseCard];
    const base = mountBase();
    const ctx = createMerged(base);
    base.openDrawByIndexDialog.call(ctx);
    const dialog = alpineStub.rawStores.dialog as DialogState;
    expect(() => dialog.onCancel()).not.toThrow();
  });

  it('openDrawByIndexDialog onSubmit ignores an out-of-range index', () => {
    alpineStub.rawStores.shuffledCards = [baseCard];
    const base = mountBase();
    const ctx = createMerged(base);
    ctx.draggableCards = [];
    base.openDrawByIndexDialog.call(ctx);
    const dialog = alpineStub.rawStores.dialog as DialogState;
    dialog.onSubmit(5);
    expect(ctx.draggableCards).toHaveLength(0);
  });

  it('openDrawByIndexDialog onSubmit does nothing when the deck is empty', () => {
    alpineStub.rawStores.shuffledCards = [];
    const base = mountBase();
    const ctx = createMerged(base);
    base.openDrawByIndexDialog.call(ctx);
    const dialog = alpineStub.rawStores.dialog as DialogState;
    dialog.onSubmit(0);
    expect(ctx.draggableCards).toHaveLength(0);
  });

  it('openDrawMultipleDialog is a no-op when the deck is empty', () => {
    alpineStub.rawStores.shuffledCards = [];
    const base = mountBase();
    const ctx = createMerged(base);
    base.openDrawMultipleDialog.call(ctx);
    expect(alpineStub.rawStores.dialog).toBeUndefined();
  });

  it('openDrawMultipleDialog draws several cards via onSubmit', () => {
    alpineStub.rawStores.shuffledCards = [
      baseCard,
      { ...baseCard, id: 'c2' },
      { ...baseCard, id: 'c3' },
    ];
    const base = mountBase();
    const ctx = createMerged(base);
    ctx.draggableCards = [];
    ctx.maxZIndex = 0;
    ctx.dirty = false;

    let idx = 0;
    vi.spyOn(base, 'cryptoRandomInt').mockImplementation((len: number) => {
      idx += 1;
      return idx % len;
    });

    base.openDrawMultipleDialog.call(ctx);
    const dialog = alpineStub.rawStores.dialog as DialogState;
    dialog.onSubmit(2);

    expect(ctx.draggableCards.length).toBe(2);
  });

  it('openDrawMultipleDialog onCancel is safe to call', () => {
    alpineStub.rawStores.shuffledCards = [baseCard, { ...baseCard, id: 'x' }];
    const base = mountBase();
    const ctx = createMerged(base);
    base.openDrawMultipleDialog.call(ctx);
    const dialog = alpineStub.rawStores.dialog as DialogState;
    expect(() => dialog.onCancel()).not.toThrow();
  });

  it('openDrawMultipleDialog onSubmit does nothing when drawMultipleCards returns undefined', () => {
    alpineStub.rawStores.shuffledCards = [baseCard, { ...baseCard, id: 'y' }];
    const base = mountBase();
    const ctx = createMerged(base);
    ctx.draggableCards = [];
    ctx.drawMultipleCards = (): undefined => undefined;
    base.openDrawMultipleDialog.call(ctx);
    const dialog = alpineStub.rawStores.dialog as DialogState;
    dialog.onSubmit(2);
    expect(ctx.draggableCards).toHaveLength(0);
  });

  it('updateItem updates an existing card and marks dirty', () => {
    const base = mountBase();
    const ctx = createMerged(base);
    const dc: DraggableCard = {
      card: baseCard,
      id: 'id-1',
      x: 0,
      y: 0,
      rotation: 0,
      zIndex: 1,
      opacity: 1,
      cursor: 'grab',
      display: 'block',
    };
    ctx.draggableCards = [dc];
    ctx.dirty = false;
    base.updateItem.call(ctx, 'id-1', { x: 99 });
    expect(ctx.draggableCards[0].x).toBe(99);
    expect(ctx.dirty).toBe(true);
  });

  it('updateItem ignores unknown ids', () => {
    const base = mountBase();
    const ctx = createMerged(base);
    ctx.draggableCards = [];
    ctx.dirty = false;
    base.updateItem.call(ctx, 'missing', { x: 1 });
    expect(ctx.draggableCards).toHaveLength(0);
    expect(ctx.dirty).toBe(false);
  });

  it('deleteCard revokes blob URLs and clears anchored text labels', () => {
    const base = mountBase();
    const ctx = createMerged(base);
    const blobCard: TarotCard = { ...baseCard, id: 'blob', img: 'blob:http://x/y' };
    ctx.draggableCards = [
      {
        card: blobCard,
        id: 'card-a',
        x: 0,
        y: 0,
        rotation: 0,
        zIndex: 1,
        opacity: 1,
        cursor: 'grab',
        display: 'block',
      },
    ];
    ctx.textLabels = [
      {
        id: 'lbl',
        text: 'hi',
        x: 0,
        y: 0,
        fontSize: 12,
        fontWeight: 400,
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#fff',
        zIndex: 1,
        cursor: 'default',
        display: 'block',
        anchorCardId: 'card-a',
        anchorPosition: 'above',
      } as TextLabel,
    ];
    ctx.dirty = false;

    base.deleteCard.call(ctx, 'card-a');

    expect(revokeTarotCardBlobUrls).toHaveBeenCalledWith(blobCard);
    expect(ctx.draggableCards).toHaveLength(0);
    expect(ctx.updateTextLabel).toHaveBeenCalledWith('lbl', {
      anchorCardId: null,
      anchorPosition: null,
    });
    expect(ctx.dirty).toBe(true);
  });

  it('deleteCard skips revoke when the id is not on the canvas', () => {
    const base = mountBase();
    const ctx = createMerged(base);
    ctx.draggableCards = [];
    base.deleteCard.call(ctx, 'missing');
    expect(revokeTarotCardBlobUrls).not.toHaveBeenCalled();
  });

  it('deleteSelectedCards revokes and clears selection', () => {
    const base = mountBase();
    const ctx = createMerged(base);
    const c1: TarotCard = { ...baseCard, id: '1', img: 'blob:http://a/b' };
    ctx.draggableCards = [
      {
        card: c1,
        id: 'a',
        x: 0,
        y: 0,
        rotation: 0,
        zIndex: 1,
        opacity: 1,
        cursor: 'grab',
        display: 'block',
      },
      {
        card: baseCard,
        id: 'b',
        x: 0,
        y: 0,
        rotation: 0,
        zIndex: 2,
        opacity: 1,
        cursor: 'grab',
        display: 'block',
      },
    ];
    ctx.selectedCardIds = ['a'];
    ctx.textLabels = [
      {
        id: 't1',
        text: '',
        x: 0,
        y: 0,
        fontSize: 12,
        fontWeight: 400,
        fontStyle: 'normal',
        textDecoration: 'none',
        color: '#fff',
        zIndex: 1,
        cursor: 'default',
        display: 'block',
        anchorCardId: 'a',
        anchorPosition: 'below',
      } as TextLabel,
    ];
    ctx.dirty = false;

    base.deleteSelectedCards.call(ctx);

    expect(revokeTarotCardBlobUrls).toHaveBeenCalledWith(c1);
    expect(ctx.draggableCards.map((d) => d.id)).toEqual(['b']);
    expect(ctx.selectedCardIds).toEqual([]);
    expect(ctx.dirty).toBe(true);
  });

  it('rotateCard adjusts rotation for each direction', () => {
    const base = mountBase();
    const ctx = createMerged(base);
    ctx.draggableCards = [
      {
        card: baseCard,
        id: 'r1',
        x: 0,
        y: 0,
        rotation: 10,
        zIndex: 1,
        opacity: 1,
        cursor: 'grab',
        display: 'block',
      },
    ];
    base.rotateCard.call(ctx, 'r1', 'clockwise');
    expect(ctx.draggableCards[0].rotation).toBe(100);
    base.rotateCard.call(ctx, 'r1', 'counter-clockwise');
    expect(ctx.draggableCards[0].rotation).toBe(10);
    base.rotateCard.call(ctx, 'r1', '180');
    expect(ctx.draggableCards[0].rotation).toBe(190);
  });

  it('rotateCard ignores unknown card ids', () => {
    const base = mountBase();
    const ctx = createMerged(base);
    ctx.draggableCards = [];
    base.rotateCard.call(ctx, 'nope', 'clockwise');
    expect(ctx.draggableCards).toHaveLength(0);
  });

  it('drawCardAt places a random card at content coordinates', () => {
    alpineStub.rawStores.shuffledCards = [baseCard];
    const base = mountBase();
    const ctx = createMerged(base);
    ctx.draggableCards = [];
    ctx.maxZIndex = 0;
    ctx.dirty = false;
    vi.spyOn(base, 'cryptoRandomInt').mockReturnValue(0);

    base.drawCardAt.call(ctx, 100, 200);

    expect(ctx.draggableCards).toHaveLength(1);
    expect(ctx.draggableCards[0].x).toBe(95);
    expect(ctx.draggableCards[0].y).toBe(193);
  });

  it('drawCardAt is a no-op when the deck is empty', () => {
    alpineStub.rawStores.shuffledCards = [];
    const base = mountBase();
    const ctx = createMerged(base);
    base.drawCardAt.call(ctx, 1, 2);
    expect(ctx.draggableCards).toHaveLength(0);
  });
});
