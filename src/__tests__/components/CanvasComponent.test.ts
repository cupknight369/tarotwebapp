/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DraggableCard,
  MouseLikeEvent,
  MergedThis,
  TarotCard,
  TextLabel,
} from '../../types/canvas.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const alpineStub = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'canvasComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineStub.Alpine,
}));

vi.mock('../../lib/cardBlobUrls.js', () => ({
  revokeTarotCardBlobUrls: vi.fn(),
}));

const openSettingsExportConfirmMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/openSettingsExportConfirm.js', () => ({
  openSettingsExportConfirm: openSettingsExportConfirmMock,
}));

import { revokeTarotCardBlobUrls } from '../../lib/cardBlobUrls.js';
import { STORAGE_WARNING_DISMISSED_SESSION_KEY } from '../../lib/storageWarning.js';
import '../../components/CanvasComponent.js';

function makeTouchList(touches: Touch[]): TouchList {
  const arr = touches.slice();
  return {
    length: arr.length,
    item: (i: number) => arr[i] ?? null,
    ...Object.fromEntries(arr.map((t, i) => [i, t])),
  } as unknown as TouchList;
}

function touch(identifier: number, clientX: number, clientY: number): Touch {
  return { identifier, clientX, clientY } as Touch;
}

function mockCallCount(fn: unknown): number {
  return (fn as { mock: { calls: unknown[] } }).mock.calls.length;
}

function mockFromCtx(ctx: MergedThis, key: 'shuffleDeck' | 'zoomAt'): unknown {
  return Reflect.get(ctx, key);
}

function spyElementFromPoint(returnValue: Element | null): void {
  vi.spyOn(document, 'elementFromPoint').mockReturnValue(returnValue);
}

function touchEv(
  touches: Touch[],
  changed: Touch[],
): TouchEvent & { preventDefault: ReturnType<typeof vi.fn> } {
  const preventDefault = vi.fn();
  return {
    touches: makeTouchList(touches),
    changedTouches: makeTouchList(changed),
    preventDefault,
  } as unknown as TouchEvent & { preventDefault: ReturnType<typeof vi.fn> };
}

function mkCard(id: string, x = 50, y = 50): DraggableCard {
  return {
    card: { id: `c-${id}`, deckId: 'd', title: 'T', num: 1, img: 'i.webp' },
    id,
    x,
    y,
    rotation: 0,
    zIndex: 1,
    opacity: 1,
    cursor: 'grab',
    display: 'block',
  };
}

function mkLabel(id: string, anchor: string | null): TextLabel {
  return {
    id,
    text: 'hi',
    x: 100,
    y: 100,
    fontSize: 14,
    fontWeight: 400,
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#fff',
    zIndex: 2,
    cursor: 'grab',
    display: 'block',
    anchorCardId: anchor,
    anchorPosition: anchor ? 'above' : null,
    fixedWidth: false,
    fixedWidthPx: 0,
  };
}

function mountCanvas() {
  const factory = alpineStub.getFactory();
  if (!factory) {
    throw new Error('canvasComponent not registered');
  }
  return factory() as Record<string, unknown> & MergedThis;
}

function domRect(width: number, height: number): DOMRect {
  return {
    left: 0,
    top: 0,
    width,
    height,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect;
}

/** Viewport div with a stable 1000×800 bounding rect (real DOM so `closest` exists). */
function viewport1000x800(): HTMLDivElement {
  const el = document.createElement('div');
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(domRect(1000, 800));
  return el;
}

/**
 * Builds a merged Alpine `this` for canvasComponent. Pass the same `base` from
 * `mountCanvas()` when spying methods, because each factory call returns a new object.
 */
function createMerged(base?: ReturnType<typeof mountCanvas>): MergedThis {
  const b = base ?? mountCanvas();
  const viewportEl = document.createElement('div');
  vi.spyOn(viewportEl, 'getBoundingClientRect').mockReturnValue(domRect(1000, 800));

  const contentEl = document.createElement('div');
  Object.defineProperties(contentEl, {
    offsetWidth: { configurable: true, value: 2000 },
    offsetHeight: { configurable: true, value: 1500 },
  });

  const emptyMsg = document.createElement('div');

  const dragContainerEl = document.createElement('div');
  vi.spyOn(dragContainerEl, 'getBoundingClientRect').mockReturnValue(domRect(1000, 800));
  Object.defineProperties(dragContainerEl, {
    clientLeft: { configurable: true, value: 0 },
    clientTop: { configurable: true, value: 0 },
  });

  const ctx = {
    ...b,
    offsetX: 0,
    offsetY: 0,
    scale: 1,
    minScale: 0.25,
    maxScale: 4,
    clamp: (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v)),
    zoomAt: vi.fn(),
    shuffleDeck: vi.fn(),
    draggableCards: [] as DraggableCard[],
    textLabels: [] as TextLabel[],
    maxZIndex: 0,
    maxTextZIndex: 0,
    draggingTextId: null as string | null,
    textDragStart: null as MergedThis['textDragStart'],
    resizingTextId: null as string | null,
    textResizeStart: null as MergedThis['textResizeStart'],
    draggingCard: null as HTMLElement | null,
    dragStart: null as MergedThis['dragStart'],
    selectedCardIds: [] as string[],
    isPanning: false,
    dirty: false,
    CARD_WIDTH: 150,
    CARD_HEIGHT: 231,
    pendingAnchor: null as MergedThis['pendingAnchor'],
    editingTextId: null as string | null,
    viewport: viewportEl,
    content: contentEl,
    emptyCanvasMessage: emptyMsg,
    dragContainer: dragContainerEl,
    pinchStartDistance: 0,
    pinchStartScale: 1,
    longPressTimerId: null as ReturnType<typeof setTimeout> | null,
    activeTouchId: null as number | null,
    touchStartPos: null as MergedThis['touchStartPos'],
    longPressActivated: false,
    touchMovedAfterLongPress: false,
    touchGestureStarted: false,
    selectionBox: null as MergedThis['selectionBox'],
    selectionBoxStyle: '',
    contextMenu: {
      open: false,
      x: 0,
      y: 0,
      cardId: null as string | null,
      textId: null as string | null,
    },
    drawByName: null as MergedThis['drawByName'],
    storageWarningVisible: b.storageWarningVisible,
    storageAdditionalInfoOpen: b.storageAdditionalInfoOpen,
    _storageWarningStartupListener: b._storageWarningStartupListener,
    groupDragOffsets: null as MergedThis['groupDragOffsets'],
    updateTextLabel(id: string, props: Partial<TextLabel>) {
      const i = ctx.textLabels.findIndex((l) => l.id === id);
      if (i >= 0) {
        ctx.textLabels[i] = { ...ctx.textLabels[i], ...props };
      }
      ctx.dirty = true;
    },
    updateItem(id: string, props: Partial<DraggableCard>) {
      const i = ctx.draggableCards.findIndex((c) => c.id === id);
      if (i >= 0) {
        ctx.draggableCards[i] = { ...ctx.draggableCards[i], ...props };
      }
      ctx.dirty = true;
    },
    getTextLabelPosition(l: TextLabel) {
      return { x: l.x, y: l.y };
    },
    $refs: {
      viewport: viewportEl,
      content: contentEl,
      emptyCanvasMessage: emptyMsg,
    },
    $nextTick: (cb: () => void) => {
      cb();
    },
  } as MergedThis;

  return ctx;
}

describe('canvasComponent (CanvasComponent.ts)', () => {
  beforeEach(() => {
    vi.mocked(revokeTarotCardBlobUrls).mockClear();
    openSettingsExportConfirmMock.mockClear();
    delete (window as unknown as { draggableZoneComponent?: unknown }).draggableZoneComponent;
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('boxesOverlap detects separation and intersection', () => {
    const c = mountCanvas();
    const a = { left: 0, top: 0, width: 10, height: 10 };
    const b = { left: 20, top: 0, width: 10, height: 10 };
    expect(c.boxesOverlap(a, b)).toBe(false);
    expect(c.boxesOverlap(a, { left: 5, top: 5, width: 10, height: 10 })).toBe(true);
  });

  it('screenToContent returns zeros without viewport', () => {
    const c = mountCanvas();
    expect(
      c.screenToContent.call(
        { viewport: null, offsetX: 0, offsetY: 0, scale: 1 } as MergedThis,
        50,
        60,
      ),
    ).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('screenToContent maps coordinates with viewport and offsets', () => {
    const c = mountCanvas();
    const viewport = viewport1000x800();
    const ctx = { viewport, offsetX: 10, offsetY: 20, scale: 2 } as MergedThis;
    expect(c.screenToContent.call(ctx, 100, 200)).toEqual({ x: 45, y: 90 });
  });

  it('updateSelectionBoxStyle clears or formats the style', () => {
    const c = mountCanvas();
    const inst = { selectionBox: null, selectionBoxStyle: 'x' } as MergedThis;
    c.updateSelectionBoxStyle.call(inst);
    expect(inst.selectionBoxStyle).toBe('');

    inst.selectionBox = { startX: 10, startY: 20, currentX: 30, currentY: 50 };
    c.updateSelectionBoxStyle.call(inst);
    expect(inst.selectionBoxStyle).toContain('left: 10px');
    expect(inst.selectionBoxStyle).toContain('width: 20px');
    expect(inst.selectionBoxStyle).toContain('height: 30px');
  });

  it('touchToMouseLike maps touch to MouseLikeEvent', () => {
    const c = mountCanvas();
    const t = touch(1, 42, 43);
    const el = document.createElement('div');
    const ev = c.touchToMouseLike(t, el);
    expect(ev.clientX).toBe(42);
    expect(ev.target).toBe(el);
    spyElementFromPoint(el);
    const ev2 = c.touchToMouseLike(touch(2, 1, 2));
    expect(ev2.target).toBe(el);
  });

  it('getTouchById finds touches in touches or changedTouches', () => {
    const c = mountCanvas();
    const ta = touch(1, 0, 0);
    const tb = touch(2, 0, 0);
    const e1 = touchEv([ta], [ta]);
    expect(c.getTouchById(e1, 1)).toBe(ta);
    const e2 = touchEv([], [tb]);
    expect(c.getTouchById(e2, 2)).toBe(tb);
    expect(c.getTouchById(e2, 99)).toBeNull();
  });

  it('centerViewport no-ops without viewport or content', () => {
    const c = mountCanvas();
    const before = { offsetX: 5, offsetY: 6 } as MergedThis;
    c.centerViewport.call({
      ...before,
      viewport: null,
      content: document.createElement('div'),
    } as MergedThis);
    expect(before.offsetX).toBe(5);
  });

  it('centerViewport centers offsets', () => {
    const c = mountCanvas();
    const viewport = viewport1000x800();
    const content = document.createElement('div');
    Object.defineProperties(content, {
      offsetWidth: { configurable: true, value: 400 },
      offsetHeight: { configurable: true, value: 300 },
    });
    const ctx = { viewport, content, offsetX: 0, offsetY: 0 } as MergedThis;
    c.centerViewport.call(ctx);
    expect(ctx.offsetX).toBe(300);
    expect(ctx.offsetY).toBe(250);
  });

  it('closeContextMenu resets menu state', () => {
    const c = mountCanvas();
    const inst = {
      contextMenu: { open: true, x: 1, y: 2, cardId: 'c', textId: 't' },
    } as MergedThis;
    c.closeContextMenu.call(inst);
    expect(inst.contextMenu.open).toBe(false);
    expect(inst.contextMenu.cardId).toBeNull();
    expect(inst.contextMenu.textId).toBeNull();
  });

  it('clearDragState skips cursor when viewport is null', () => {
    const c = mountCanvas();
    c.clearDragState.call({
      isPanning: true,
      draggingCard: null,
      dragStart: null,
      draggingTextId: null,
      textDragStart: null,
      selectionBox: null,
      selectionBoxStyle: '',
      groupDragOffsets: null,
      viewport: null,
    } as unknown as MergedThis);
  });

  it('clearDragState resets interaction fields', () => {
    const c = mountCanvas();
    const vp = viewport1000x800();
    const inst = {
      isPanning: true,
      draggingCard: document.createElement('div'),
      dragStart: { startCardX: 0, startCardY: 0, startDropX: 0, startDropY: 0 },
      draggingTextId: 't',
      textDragStart: { startX: 0, startY: 0, startDropX: 0, startDropY: 0 },
      resizingTextId: 'r',
      textResizeStart: { startWidthPx: 100, startDropX: 0 },
      selectionBox: { startX: 0, startY: 0, currentX: 1, currentY: 1 },
      selectionBoxStyle: 'x',
      groupDragOffsets: {},
      viewport: vp,
    } as unknown as MergedThis;
    c.clearDragState.call(inst);
    expect(inst.isPanning).toBe(false);
    expect(inst.draggingCard).toBeNull();
    expect(inst.resizingTextId).toBeNull();
    expect(inst.textResizeStart).toBeNull();
    expect(inst.selectionBox).toBeNull();
    expect(vp.style.cursor).toBe('grab');
  });

  it('clearCanvas revokes blobs and resets state', () => {
    const ctx = createMerged();
    const blobCard = { ...mkCard('a').card, img: 'blob:http://x/y' };
    ctx.draggableCards = [{ ...mkCard('a'), card: blobCard }];
    ctx.textLabels = [mkLabel('l1', null)];
    ctx.maxZIndex = 5;
    ctx.dirty = false;
    ctx.drawByName = {
      screenX: 0,
      screenY: 0,
      query: 'x',
      highlightIndex: 0,
    };
    const cv = vi.spyOn(ctx, 'centerViewport');
    ctx.clearCanvas.call(ctx);
    expect(revokeTarotCardBlobUrls).toHaveBeenCalledWith(blobCard);
    expect(ctx.draggableCards).toHaveLength(0);
    expect(ctx.textLabels).toHaveLength(0);
    expect(ctx.drawByName).toBeNull();
    expect(ctx.scale).toBe(1);
    expect(ctx.dirty).toBe(true);
    expect(cv.mock.calls.length).toBeGreaterThan(0);
  });

  it('openDrawByNameFromContextMenu opens picker at menu coords and closes context menu', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.contextMenu = { open: true, x: 12, y: 34, cardId: null, textId: null };
    ctx.$nextTick = ((fn: () => void) => {
      fn();
    }) as MergedThis['$nextTick'];
    ctx.$refs = {};
    c.openDrawByNameFromContextMenu.call(ctx);
    expect(ctx.contextMenu.open).toBe(false);
    expect(ctx.drawByName).toEqual({
      screenX: 12,
      screenY: 34,
      query: '',
      highlightIndex: 0,
    });
  });

  it('confirmDrawByNameSelection clears picker, adds card, and positions at screenToContent', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    alpineStub.rawStores.shuffledCards = [
      { id: 'cid', deckId: 'd', title: 'Star', num: 1, img: 'x' },
    ];
    ctx.drawByName = {
      screenX: 100,
      screenY: 200,
      query: 'Sta',
      highlightIndex: 0,
    };
    ctx.$nextTick = ((fn: () => void) => {
      fn();
    }) as MergedThis['$nextTick'];
    const addCardToCanvasSpy = vi.fn((card: TarotCard) => {
      ctx.draggableCards = [
        ...ctx.draggableCards,
        {
          id: 'placed-1',
          card,
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 1,
          opacity: 1,
          cursor: 'grab',
          display: 'block',
        },
      ];
    });
    ctx.addCardToCanvas = addCardToCanvasSpy;
    c.confirmDrawByNameSelection.call(ctx);
    expect(ctx.drawByName).toBeNull();
    expect(addCardToCanvasSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'cid', title: 'Star' }),
    );
    const placed = ctx.draggableCards[ctx.draggableCards.length - 1];
    expect(placed.x).toBe(100);
    expect(placed.y).toBe(200);
  });

  it('init wires DOM, shuffleDeck, listeners, and centers after rAF', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    const base = mountCanvas();
    const ctx = createMerged(base);
    const listeners: Record<string, EventListener> = {};
    vi.spyOn(ctx.viewport!, 'addEventListener').mockImplementation((type, fn) => {
      listeners[String(type)] = fn as EventListener;
    });
    const dc = document.createElement('div');
    dc.id = 'draggable-container';
    document.body.append(dc);
    vi.spyOn(document, 'querySelector').mockReturnValue(dc);
    const winAddSpy = vi.spyOn(window, 'addEventListener');

    base.init.call(ctx);

    expect(winAddSpy).toHaveBeenCalledWith('cktarot-check-storage-warning', expect.any(Function));
    winAddSpy.mockRestore();

    spyElementFromPoint(ctx.viewport);

    expect(mockCallCount(mockFromCtx(ctx, 'shuffleDeck'))).toBeGreaterThan(0);
    expect((window as unknown as { draggableZoneComponent: unknown }).draggableZoneComponent).toBe(
      ctx,
    );
    expect(ctx.dragContainer).toBe(dc);
    expect(listeners.touchstart).toBeDefined();
    expect(ctx.offsetX).toBe(-500);
    expect(ctx.offsetY).toBe(-350);

    const ts = touchEv([touch(0, 1, 1)], [touch(0, 1, 1)]);
    const te = touchEv([], [touch(0, 1, 1)]);
    const tc = touchEv([], []);
    if (listeners.touchstart) listeners.touchstart(ts);
    if (listeners.touchmove) listeners.touchmove(ts);
    if (listeners.touchend) listeners.touchend(te);
    if (listeners.touchcancel) listeners.touchcancel(tc);

    vi.unstubAllGlobals();
    dc.remove();
  });

  it('onMouseDown starts panning on empty canvas', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const ev: MouseLikeEvent = {
      clientX: 50,
      clientY: 60,
      target: ctx.viewport!,
      ctrlKey: false,
    };
    c.onMouseDown.call(ctx, ev);
    expect(ctx.isPanning).toBe(true);
    expect(ctx.panStartX).toBe(50);
    expect(ctx.panStartY).toBe(60);
  });

  it('onMouseDown with ctrl starts selection box', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const ev: MouseLikeEvent = {
      clientX: 100,
      clientY: 200,
      target: ctx.content!,
      ctrlKey: true,
    };
    c.onMouseDown.call(ctx, ev);
    expect(ctx.selectionBox).toEqual({
      startX: 100,
      startY: 200,
      currentX: 100,
      currentY: 200,
    });
  });

  it('onMouseDown drags a card and supports group selection', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const cardEl = document.createElement('div');
    cardEl.id = 'card-1';
    ctx.draggableCards = [mkCard('card-1', 10, 20), mkCard('card-2', 30, 40)];
    ctx.selectedCardIds = ['card-1', 'card-2'];
    const ev: MouseLikeEvent = {
      clientX: 5,
      clientY: 6,
      target: cardEl,
      ctrlKey: false,
    };
    c.onMouseDown.call(ctx, ev);
    expect(ctx.draggingCard).toBe(cardEl);
    expect(ctx.groupDragOffsets).toEqual({
      'card-1': { dx: 0, dy: 0 },
      'card-2': { dx: 20, dy: 20 },
    });
  });

  it('onMouseDown clears selection when dragging an unselected card', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const cardEl = document.createElement('div');
    cardEl.id = 'solo';
    ctx.draggableCards = [mkCard('solo', 0, 0)];
    ctx.selectedCardIds = ['other'];
    c.onMouseDown.call(ctx, {
      clientX: 0,
      clientY: 0,
      target: cardEl,
      ctrlKey: false,
    });
    expect(ctx.selectedCardIds).toEqual([]);
    expect(ctx.groupDragOffsets).toBeNull();
  });

  it('onMouseDown selects text label when target has data-text-id', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.textLabels = [mkLabel('tl1', null)];
    const span = document.createElement('span');
    span.setAttribute('data-text-id', 'tl1');
    const ev: MouseLikeEvent = {
      clientX: 100,
      clientY: 200,
      target: span,
      ctrlKey: false,
    };
    c.onMouseDown.call(ctx, ev);
    expect(ctx.draggingTextId).toBe('tl1');
    expect(ctx.textDragStart).not.toBeNull();
  });

  it('onMouseDown on text resize handle starts resize, not label drag', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.textLabels = [{ ...mkLabel('tl1', null), fixedWidth: true, fixedWidthPx: 200 }];
    const wrap = document.createElement('div');
    wrap.setAttribute('data-text-id', 'tl1');
    const handle = document.createElement('div');
    handle.setAttribute('data-text-resize', '');
    wrap.append(handle);
    const ev: MouseLikeEvent = {
      clientX: 100,
      clientY: 200,
      target: handle,
      ctrlKey: false,
    };
    c.onMouseDown.call(ctx, ev);
    expect(ctx.draggingTextId).toBeNull();
    expect(ctx.textDragStart).toBeNull();
    expect(ctx.resizingTextId).toBe('tl1');
    expect(ctx.textResizeStart).toMatchObject({ startWidthPx: 200, startDropX: 100 });
  });

  it('onMouseMove resizes fixed-width label when resizingTextId is set', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.resizingTextId = 't1';
    ctx.textResizeStart = { startWidthPx: 100, startDropX: 100 };
    ctx.textLabels = [{ ...mkLabel('t1', null), fixedWidth: true, fixedWidthPx: 100 }];
    c.onMouseMove.call(ctx, { clientX: 200, clientY: 100, target: null });
    expect(ctx.textLabels[0]?.fixedWidthPx).toBe(200);
  });

  it('onMouseUp clears text resize without pending anchor', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.resizingTextId = 't1';
    ctx.textResizeStart = { startWidthPx: 200, startDropX: 0 };
    ctx.textLabels = [{ ...mkLabel('t1', null), fixedWidth: true, fixedWidthPx: 200 }];
    c.onMouseUp.call(ctx, {
      clientX: 0,
      clientY: 0,
      target: null,
      preventDefault: vi.fn(),
    });
    expect(ctx.resizingTextId).toBeNull();
    expect(ctx.textResizeStart).toBeNull();
    expect(ctx.pendingAnchor).toBeNull();
  });

  it('onMouseMove updates pan offset', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.isPanning = true;
    ctx.panStartX = 10;
    ctx.panStartY = 20;
    c.onMouseMove.call(ctx, { clientX: 50, clientY: 70, target: null });
    expect(ctx.offsetX).toBe(40);
    expect(ctx.offsetY).toBe(50);
  });

  it('onMouseMove drags a text label by pointer delta', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.draggingTextId = 't1';
    ctx.textDragStart = { startX: 10, startY: 20, startDropX: 100, startDropY: 100 };
    ctx.textLabels = [mkLabel('t1', null)];
    c.onMouseMove.call(ctx, { clientX: 200, clientY: 250, target: null });
    const label = ctx.textLabels.find((l) => l.id === 't1');
    expect(label?.x).toBe(110);
    expect(label?.y).toBe(170);
  });

  it('onMouseMove drags a single card', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const el = document.createElement('div');
    el.id = 'c1';
    ctx.draggableCards = [mkCard('c1', 10, 10)];
    ctx.draggingCard = el;
    ctx.dragStart = { startCardX: 10, startCardY: 10, startDropX: 0, startDropY: 0 };
    ctx.groupDragOffsets = null;
    c.onMouseMove.call(ctx, { clientX: 100, clientY: 100, target: null });
    expect(ctx.draggableCards[0]?.x).toBe(110);
    expect(ctx.draggableCards[0]?.y).toBe(110);
  });

  it('onMouseMove drags a group of selected cards', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const el = document.createElement('div');
    el.id = 'a';
    ctx.draggableCards = [mkCard('a', 0, 0), mkCard('b', 10, 5)];
    ctx.draggingCard = el;
    ctx.dragStart = { startCardX: 0, startCardY: 0, startDropX: 0, startDropY: 0 };
    ctx.groupDragOffsets = { a: { dx: 0, dy: 0 }, b: { dx: 10, dy: 5 } };
    c.onMouseMove.call(ctx, { clientX: 50, clientY: 50, target: null });
    expect(ctx.draggableCards.find((x) => x.id === 'a')?.x).toBe(50);
    expect(ctx.draggableCards.find((x) => x.id === 'b')?.x).toBe(60);
  });

  it('onMouseMove updates selection box current corner', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.selectionBox = { startX: 0, startY: 0, currentX: 0, currentY: 0 };
    c.onMouseMove.call(ctx, { clientX: 100, clientY: 200, target: null });
    expect(ctx.selectionBox).toMatchObject({ currentX: 100, currentY: 200 });
  });

  it('onMouseUp ends panning and marks dirty', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.isPanning = true;
    ctx.viewport = viewport1000x800();
    c.onMouseUp.call(ctx, { clientX: 0, clientY: 0, target: null });
    expect(ctx.isPanning).toBe(false);
    expect(ctx.dirty).toBe(true);
  });

  it('onMouseUp completes selection and picks overlapping cards', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.selectionBox = { startX: 0, startY: 0, currentX: 200, currentY: 200 };
    ctx.draggableCards = [mkCard('a', 10, 10), mkCard('b', 500, 500)];
    c.onMouseUp.call(ctx, { clientX: 0, clientY: 0, target: null });
    expect(ctx.selectedCardIds).toEqual(['a']);
    expect(ctx.selectionBox).toBeNull();
  });

  it('onMouseUp drops text and sets pendingAnchor when overlapping a card', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.draggingTextId = 'tl1';
    ctx.textDragStart = { startX: 100, startY: 100, startDropX: 0, startDropY: 0 };
    ctx.textLabels = [mkLabel('tl1', null)];
    ctx.draggableCards = [mkCard('c1', 100, 100)];
    c.onMouseUp.call(ctx, {
      clientX: 0,
      clientY: 0,
      target: null,
      preventDefault: vi.fn(),
    });
    expect(ctx.pendingAnchor?.textId).toBe('tl1');
    expect(ctx.pendingAnchor?.cardId).toBe('c1');
  });

  it('onMouseUp without preventDefault still completes', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.isPanning = true;
    c.onMouseUp.call(ctx, { clientX: 0, clientY: 0, target: null } as MouseLikeEvent);
    expect(ctx.isPanning).toBe(false);
  });

  it('onMouseUp commits a single card drag', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const el = document.createElement('div');
    el.id = 'one';
    ctx.draggableCards = [mkCard('one', 0, 0)];
    ctx.draggingCard = el;
    ctx.dragStart = { startCardX: 0, startCardY: 0, startDropX: 0, startDropY: 0 };
    ctx.groupDragOffsets = null;
    c.onMouseUp.call(ctx, { clientX: 100, clientY: 50, target: null, preventDefault: vi.fn() });
    expect(ctx.draggingCard).toBeNull();
    expect(ctx.draggableCards[0]?.x).toBe(100);
    expect(ctx.draggableCards[0]?.y).toBe(50);
    expect(ctx.draggableCards[0]?.cursor).toBe('grab');
  });

  it('onMouseUp commits a group drag and refreshes anchored labels', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const el = document.createElement('div');
    el.id = 'a';
    ctx.draggableCards = [mkCard('a', 0, 0), mkCard('b', 20, 0)];
    ctx.textLabels = [{ ...mkLabel('lbl', 'a'), x: 5, y: 5 }];
    ctx.selectedCardIds = ['a', 'b'];
    ctx.draggingCard = el;
    ctx.dragStart = { startCardX: 0, startCardY: 0, startDropX: 0, startDropY: 0 };
    ctx.groupDragOffsets = { a: { dx: 0, dy: 0 }, b: { dx: 20, dy: 0 } };
    c.onMouseUp.call(ctx, { clientX: 30, clientY: 0, target: null, preventDefault: vi.fn() });
    expect(ctx.groupDragOffsets).toBeNull();
    const lbl = ctx.textLabels.find((l) => l.id === 'lbl');
    expect(lbl?.x).toBe(5);
    expect(lbl?.y).toBe(5);
  });

  it('onContextMenu opens for text, card ancestor, and empty canvas', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.textLabels = [mkLabel('t1', null)];
    const span = document.createElement('span');
    span.setAttribute('data-text-id', 't1');
    c.onContextMenu.call(ctx, {
      clientX: 1,
      clientY: 2,
      target: span,
      preventDefault: vi.fn(),
    });
    expect(ctx.contextMenu).toMatchObject({ open: true, textId: 't1', cardId: null });

    const cardInner = document.createElement('span');
    const cardWrap = document.createElement('div');
    cardWrap.id = 'cd1';
    cardWrap.append(cardInner);
    ctx.draggableCards = [mkCard('cd1')];
    c.onContextMenu.call(ctx, {
      clientX: 5,
      clientY: 6,
      target: cardInner,
      preventDefault: vi.fn(),
    });
    expect(ctx.contextMenu.cardId).toBe('cd1');

    c.onContextMenu.call(ctx, {
      clientX: 0,
      clientY: 0,
      target: ctx.viewport!,
      preventDefault: vi.fn(),
    });
    expect(ctx.contextMenu.open).toBe(true);
    expect(ctx.contextMenu.cardId).toBeNull();
    expect(ctx.contextMenu.textId).toBeNull();
  });

  it('onContextMenu uses emptyCanvasMessage.contains for canvas hit', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const inner = document.createElement('span');
    vi.spyOn(ctx.emptyCanvasMessage!, 'contains').mockReturnValue(true);
    c.onContextMenu.call(ctx, {
      clientX: 0,
      clientY: 0,
      target: inner,
      preventDefault: vi.fn(),
    });
    expect(ctx.contextMenu.open).toBe(true);
  });

  it('onTouchStart returns early without viewport', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.viewport = null;
    c.onTouchStart.call(ctx, touchEv([touch(0, 0, 0)], [touch(0, 0, 0)]));
  });

  it('onTouchMove and onTouchEnd return early without viewport', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.viewport = null;
    c.onTouchMove.call(ctx, touchEv([], []));
    c.onTouchEnd.call(ctx, touchEv([], []));
  });

  it('onTouchMove single touch returns when active touch is missing', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(1, 0, 0);
    c.onTouchStart.call(ctx, touchEv([t0], [t0]));
    c.onTouchMove.call(ctx, touchEv([touch(2, 5, 5)], [touch(2, 5, 5)]));
  });

  it('onTouchStart two-finger pinch clears long-press timer', () => {
    vi.useFakeTimers();
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.longPressTimerId = setTimeout(() => {}, 9999);
    const t0 = touch(0, 0, 0);
    const t1 = touch(1, 10, 10);
    c.onTouchStart.call(ctx, touchEv([t0, t1], [t0, t1]));
    expect(ctx.longPressTimerId).toBeNull();
    expect(ctx.pinchStartDistance).toBeGreaterThan(0);
  });

  it('onTouchMove pinch skips zoom when actual scale factor is 1', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.pinchStartDistance = 100;
    ctx.pinchStartScale = 1;
    ctx.scale = 1;
    const t0 = touch(0, 0, 0);
    const t1 = touch(1, 100, 0);
    const e = touchEv([t0, t1], [t0, t1]);
    c.onTouchMove.call(ctx, e);
    expect(mockCallCount(mockFromCtx(ctx, 'zoomAt'))).toBe(0);
  });

  it('onTouchMove pinch calls zoomAt when scale factor changes', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.pinchStartDistance = 100;
    ctx.pinchStartScale = 1;
    ctx.scale = 1;
    ctx.clamp = (v: number) => v;
    const t0 = touch(0, 0, 0);
    const t1 = touch(1, 200, 0);
    c.onTouchMove.call(ctx, touchEv([t0, t1], [t0, t1]));
    const zoomMock = mockFromCtx(ctx, 'zoomAt') as { mock: { calls: [number, number, number][] } };
    expect(zoomMock.mock.calls[0]).toEqual([100, 0, 2]);
  });

  it('onTouchMove two-finger clears an active long-press timer', () => {
    vi.useFakeTimers();
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.longPressTimerId = setTimeout(() => {}, 9999);
    ctx.pinchStartDistance = 80;
    ctx.pinchStartScale = 1;
    ctx.scale = 1;
    const t0 = touch(0, 0, 0);
    const t1 = touch(1, 80, 0);
    c.onTouchMove.call(ctx, touchEv([t0, t1], [t0, t1]));
    expect(ctx.longPressTimerId).toBeNull();
  });

  it('onTouchMove pinch returns early when pinchStartDistance is zero', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.pinchStartDistance = 0;
    const t0 = touch(0, 0, 0);
    const t1 = touch(1, 50, 0);
    c.onTouchMove.call(ctx, touchEv([t0, t1], [t0, t1]));
    expect(mockCallCount(mockFromCtx(ctx, 'zoomAt'))).toBe(0);
  });

  it('onTouchMove single touch forwards to mouse handlers', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(7, 50, 60);
    c.onTouchStart.call(ctx, touchEv([t0], [t0]));
    const move = touchEv([touch(7, 55, 65)], [touch(7, 55, 65)]);
    c.onTouchMove.call(ctx, move);
    expect(ctx.touchGestureStarted).toBe(true);
  });

  it('onTouchMove after gesture started only forwards mouse move', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(8, 1, 1);
    c.onTouchStart.call(ctx, touchEv([t0], [t0]));
    c.onTouchMove.call(ctx, touchEv([touch(8, 5, 5)], [touch(8, 5, 5)]));
    const md = vi.spyOn(ctx, 'onMouseDown');
    c.onTouchMove.call(ctx, touchEv([touch(8, 9, 9)], [touch(8, 9, 9)]));
    expect(md.mock.calls.length).toBe(0);
  });

  it('onTouchMove long-press path invokes mouse down and move once', () => {
    vi.useFakeTimers();
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(3, 10, 10);
    ctx.onTouchStart.call(ctx, touchEv([t0], [t0]));
    vi.advanceTimersByTime(500);
    const md = vi.spyOn(ctx, 'onMouseDown');
    const mm = vi.spyOn(ctx, 'onMouseMove');
    const move = touchEv([touch(3, 20, 20)], [touch(3, 20, 20)]);
    ctx.onTouchMove.call(ctx, move);
    expect(md.mock.calls.length).toBeGreaterThan(0);
    expect(mm.mock.calls.length).toBeGreaterThan(0);
    const move2 = touchEv([touch(3, 30, 30)], [touch(3, 30, 30)]);
    ctx.onTouchMove.call(ctx, move2);
    expect(mm.mock.calls.length).toBeGreaterThan(1);
  });

  it('onTouchEnd resets pinch and opens context menu after long press', () => {
    vi.useFakeTimers();
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(4, 5, 5);
    ctx.onTouchStart.call(ctx, touchEv([t0], [t0]));
    vi.advanceTimersByTime(500);
    ctx.pinchStartDistance = 50;
    const cm = vi.spyOn(ctx, 'onContextMenu');
    const end = touchEv([], [t0]);
    ctx.onTouchEnd.call(ctx, end);
    expect(ctx.pinchStartDistance).toBe(0);
    expect(cm.mock.calls.length).toBeGreaterThan(0);
  });

  it('onTouchEnd calls onMouseUp when gesture started', () => {
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(5, 1, 1);
    ctx.onTouchStart.call(ctx, touchEv([t0], [t0]));
    ctx.onTouchMove.call(ctx, touchEv([touch(5, 10, 10)], [touch(5, 10, 10)]));
    const mu = vi.spyOn(ctx, 'onMouseUp');
    ctx.onTouchEnd.call(ctx, touchEv([], [touch(5, 10, 10)]));
    expect(mu.mock.calls.length).toBeGreaterThan(0);
  });

  it('onTouchCancel delegates to onTouchEnd', () => {
    const ctx = createMerged();
    const end = vi.spyOn(ctx, 'onTouchEnd');
    const e = touchEv([], []);
    ctx.onTouchCancel.call(ctx, e);
    expect(end.mock.calls[0]?.[0]).toBe(e);
  });

  it('onTouchStart two-finger ignores absent long-press timer', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.longPressTimerId = null;
    const t0 = touch(0, 0, 0);
    const t1 = touch(1, 10, 0);
    c.onTouchStart.call(ctx, touchEv([t0, t1], [t0, t1]));
    expect(ctx.pinchStartDistance).toBe(10);
  });

  it('onTouchStart single-finger replaces an existing long-press timer', () => {
    vi.useFakeTimers();
    const c = mountCanvas();
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const first = touch(0, 0, 0);
    c.onTouchStart.call(ctx, touchEv([first], [first]));
    const prior = ctx.longPressTimerId;
    const second = touch(1, 1, 1);
    c.onTouchStart.call(ctx, touchEv([second], [second]));
    expect(ctx.longPressTimerId).not.toBe(prior);
  });

  it('onTouchMove two-finger pinch skips clearing when no long-press timer', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.longPressTimerId = null;
    ctx.pinchStartDistance = 100;
    ctx.pinchStartScale = 1;
    ctx.scale = 1;
    const t0 = touch(0, 0, 0);
    const t1 = touch(1, 50, 0);
    c.onTouchMove.call(ctx, touchEv([t0, t1], [t0, t1]));
    expect(mockCallCount(mockFromCtx(ctx, 'zoomAt'))).toBeGreaterThan(0);
  });

  it('onTouchMove ignores zero active touches', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    c.onTouchMove.call(ctx, touchEv([], []));
  });

  it('onTouchStart ignores zero or three touches', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    c.onTouchStart.call(ctx, touchEv([], []));
    const a = touch(0, 0, 0);
    const b = touch(1, 1, 0);
    const d = touch(2, 2, 0);
    c.onTouchStart.call(ctx, touchEv([a, b, d], [a, b, d]));
  });

  it('onMouseDown returns when target is not a card or empty hit target', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const inner = document.createElement('span');
    ctx.content!.append(inner);
    c.onMouseDown.call(ctx, {
      clientX: 1,
      clientY: 1,
      target: inner,
      ctrlKey: false,
    });
    expect(ctx.isPanning).toBe(false);
    expect(ctx.draggingCard).toBeNull();
  });

  it('onMouseMove returns when draggingCard is set but dragStart is null', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.draggingCard = document.createElement('div');
    ctx.dragStart = null;
    c.onMouseMove.call(ctx, { clientX: 0, clientY: 0, target: null });
  });

  it('onMouseUp skips viewport cursor when viewport is null', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.isPanning = true;
    ctx.viewport = null;
    c.onMouseUp.call(ctx, { clientX: 0, clientY: 0, target: null, preventDefault: vi.fn() });
    expect(ctx.isPanning).toBe(false);
  });

  it('onMouseUp text drop skips pending anchor when label is already anchored', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.draggingTextId = 't1';
    ctx.textDragStart = { startX: 0, startY: 0, startDropX: 0, startDropY: 0 };
    ctx.textLabels = [mkLabel('t1', 'c1')];
    ctx.draggableCards = [mkCard('c1', 500, 500)];
    c.onMouseUp.call(ctx, { clientX: 0, clientY: 0, target: null, preventDefault: vi.fn() });
    expect(ctx.pendingAnchor).toBeNull();
  });

  it('onMouseUp text drop does not set pendingAnchor when no card overlaps', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.draggingTextId = 't1';
    ctx.textDragStart = { startX: 0, startY: 0, startDropX: 0, startDropY: 0 };
    ctx.textLabels = [mkLabel('t1', null)];
    ctx.draggableCards = [mkCard('far', 5000, 5000)];
    c.onMouseUp.call(ctx, { clientX: 0, clientY: 0, target: null, preventDefault: vi.fn() });
    expect(ctx.pendingAnchor).toBeNull();
  });

  it('onMouseUp group drag ignores labels anchored to cards outside the move set', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const el = document.createElement('div');
    el.id = 'a';
    ctx.draggableCards = [mkCard('a', 0, 0), mkCard('cOther', 100, 0)];
    ctx.textLabels = [{ ...mkLabel('floating', 'cOther'), x: 1, y: 2 }];
    ctx.selectedCardIds = ['a'];
    ctx.draggingCard = el;
    ctx.dragStart = { startCardX: 0, startCardY: 0, startDropX: 0, startDropY: 0 };
    ctx.groupDragOffsets = { a: { dx: 0, dy: 0 } };
    const spy = vi.spyOn(ctx, 'updateTextLabel');
    c.onMouseUp.call(ctx, { clientX: 10, clientY: 0, target: null, preventDefault: vi.fn() });
    expect(spy.mock.calls.filter((c) => c[0] === 'floating')).toHaveLength(0);
  });

  it('onContextMenu does nothing when target is outside the canvas', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.contextMenu = { open: false, x: 0, y: 0, cardId: null, textId: null };
    const foreign = document.createElement('div');
    document.body.append(foreign);
    c.onContextMenu.call(ctx, {
      clientX: 0,
      clientY: 0,
      target: foreign,
      preventDefault: vi.fn(),
    });
    expect(ctx.contextMenu.open).toBe(false);
    foreign.remove();
  });

  it('onTouchEnd does not open menu or mouse-up when tap ends without gesture', () => {
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(9, 1, 1);
    ctx.onTouchStart.call(ctx, touchEv([t0], [t0]));
    const cm = vi.spyOn(ctx, 'onContextMenu');
    const mu = vi.spyOn(ctx, 'onMouseUp');
    ctx.onTouchEnd.call(ctx, touchEv([], [t0]));
    expect(cm.mock.calls.length).toBe(0);
    expect(mu.mock.calls.length).toBe(0);
  });

  it('onTouchMove single-finger returns when activeTouchId is null', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.activeTouchId = null;
    ctx.touchStartPos = { clientX: 0, clientY: 0, target: ctx.viewport };
    c.onTouchMove.call(ctx, touchEv([touch(0, 5, 5)], [touch(0, 5, 5)]));
  });

  it('onMouseDown group offsets skip missing card ids in selection', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const el = document.createElement('div');
    el.id = 'real';
    ctx.draggableCards = [mkCard('real', 0, 0)];
    ctx.selectedCardIds = ['real', 'missing'];
    c.onMouseDown.call(ctx, {
      clientX: 0,
      clientY: 0,
      target: el,
      ctrlKey: false,
    });
    expect(ctx.groupDragOffsets).toEqual({ real: { dx: 0, dy: 0 } });
  });

  it('onContextMenu omits preventDefault when handler is absent', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.textLabels = [mkLabel('x', null)];
    const span = document.createElement('span');
    span.setAttribute('data-text-id', 'x');
    const base = { clientX: 0, clientY: 0, target: span } as MouseLikeEvent;
    c.onContextMenu.call(ctx, base);
    expect(ctx.contextMenu.textId).toBe('x');

    const wrap = document.createElement('div');
    wrap.id = 'cid';
    ctx.draggableCards = [mkCard('cid')];
    c.onContextMenu.call(ctx, {
      clientX: 0,
      clientY: 0,
      target: wrap,
    } as MouseLikeEvent);
    expect(ctx.contextMenu.cardId).toBe('cid');

    c.onContextMenu.call(ctx, {
      clientX: 0,
      clientY: 0,
      target: ctx.viewport!,
    } as MouseLikeEvent);
    expect(ctx.contextMenu.open).toBe(true);
  });

  it('runStartupStorageWarningCheck shows warning when remaining storage is below 20%', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 85, quota: 100 }),
      },
    });
    const c = mountCanvas();
    const ctx = createMerged();
    await c.runStartupStorageWarningCheck.call(ctx);
    expect(ctx.storageWarningVisible).toBe(true);
    vi.unstubAllGlobals();
  });

  it('runStartupStorageWarningCheck does not show when at least 20% remains', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 80, quota: 100 }),
      },
    });
    const c = mountCanvas();
    const ctx = createMerged();
    await c.runStartupStorageWarningCheck.call(ctx);
    expect(ctx.storageWarningVisible).toBe(false);
    vi.unstubAllGlobals();
  });

  it('runStartupStorageWarningCheck no-ops when dismissed this session', async () => {
    sessionStorage.setItem(STORAGE_WARNING_DISMISSED_SESSION_KEY, '1');
    const estimate = vi.fn().mockResolvedValue({ usage: 99, quota: 100 });
    vi.stubGlobal('navigator', {
      storage: { estimate },
    });
    const c = mountCanvas();
    const ctx = createMerged();
    await c.runStartupStorageWarningCheck.call(ctx);
    expect(ctx.storageWarningVisible).toBe(false);
    expect(estimate).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('runStartupStorageWarningCheck no-ops when storage estimate is unavailable', async () => {
    vi.stubGlobal('navigator', { storage: {} });
    const c = mountCanvas();
    const ctx = createMerged();
    await c.runStartupStorageWarningCheck.call(ctx);
    expect(ctx.storageWarningVisible).toBe(false);
    vi.unstubAllGlobals();
  });

  it('dismissStorageWarning persists session flag and closes panels', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.storageWarningVisible = true;
    ctx.storageAdditionalInfoOpen = true;
    c.dismissStorageWarning.call(ctx);
    expect(sessionStorage.getItem(STORAGE_WARNING_DISMISSED_SESSION_KEY)).toBe('1');
    expect(ctx.storageWarningVisible).toBe(false);
    expect(ctx.storageAdditionalInfoOpen).toBe(false);
  });

  it('openStorageAdditionalInfo and closeStorageAdditionalInfo toggle modal flag', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    c.openStorageAdditionalInfo.call(ctx);
    expect(ctx.storageAdditionalInfoOpen).toBe(true);
    c.closeStorageAdditionalInfo.call(ctx);
    expect(ctx.storageAdditionalInfoOpen).toBe(false);
  });

  it('exportFromStorageWarning delegates to openSettingsExportConfirm', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    c.exportFromStorageWarning.call(ctx);
    expect(openSettingsExportConfirmMock).toHaveBeenCalledTimes(1);
  });
});
