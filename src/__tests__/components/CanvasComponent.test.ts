/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';

import type {
  DraggableCard,
  MouseLikeEvent,
  MergedThis,
  TarotCard,
  TextLabel,
} from '../../types/canvas.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';
import {
  isPointerInteractionLocked,
  lockPointerInteraction,
  resetPointerInteractionLock,
} from '../../lib/pointerInteractionLock.js';

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

const aggregateCardTitleCountsMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/cardCanvasCounts.js', () => ({
  aggregateCardTitleCounts: aggregateCardTitleCountsMock,
}));

const aggregateCorrespondenceCountsMock = vi.hoisted(() => vi.fn());
const resolveCorrespondenceCountEntriesMock = vi.hoisted(() => vi.fn());

const resolveCorrespondenceDisplaysMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/correspondenceCanvasCounts.js', () => ({
  aggregateCorrespondenceCounts: aggregateCorrespondenceCountsMock,
  resolveCorrespondenceCountEntries: resolveCorrespondenceCountEntriesMock,
  resolveCorrespondenceDisplays: resolveCorrespondenceDisplaysMock,
  shouldShowCorrespondenceOnCanvas: vi.fn(
    (s: {
      showCorrespondenceThumbnailsOnCanvas: boolean;
      showCorrespondenceCountBarOnCanvas: boolean;
    }) => s.showCorrespondenceThumbnailsOnCanvas || s.showCorrespondenceCountBarOnCanvas,
  ),
  correspondenceMetaEqual: vi.fn(
    (
      a: { correspondence_ids?: readonly string[]; correspondenceDisplays?: readonly unknown[] },
      b: {
        correspondence_ids?: readonly string[];
        correspondenceDisplays?: readonly unknown[];
      },
    ) =>
      JSON.stringify(a.correspondence_ids ?? []) === JSON.stringify(b.correspondence_ids ?? []) &&
      JSON.stringify(a.correspondenceDisplays ?? []) ===
        JSON.stringify(b.correspondenceDisplays ?? []),
  ),
}));

const getCardsByIdsMock = vi.hoisted(() => vi.fn());

vi.mock('../../lib/decks.js', () => ({
  getCardsByIds: getCardsByIdsMock,
}));

import { err, ok } from '../../lib/result.js';
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
    fontProfileId: null,
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
    selectedTextIds: [] as string[],
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
    activeTouchId: null as number | null,
    touchStartPos: null as MergedThis['touchStartPos'],
    touchGestureStarted: false,
    lastCanvasTap: null as MergedThis['lastCanvasTap'],
    selectionBox: null as MergedThis['selectionBox'],
    selectionBoxStyle: '',
    contextMenu: {
      open: false,
      x: 0,
      y: 0,
      contentX: 0,
      contentY: 0,
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
    getTextLabelBounds(l: TextLabel) {
      return { left: l.x, top: l.y, width: 100, height: 24 };
    },
    commitEditTextLabel: vi.fn(function (this: MergedThis) {
      this.editingTextId = null;
    }),
    startEditingTextLabel: vi.fn(function (this: MergedThis, label: TextLabel) {
      this.editingTextId = label.id;
    }),
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
    resetPointerInteractionLock();
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

  it('closeContextMenu hides menu without clearing target ids during transition', () => {
    const c = mountCanvas();
    const inst = createMerged();
    inst.contextMenu = {
      open: true,
      x: 1,
      y: 2,
      contentX: 0,
      contentY: 0,
      cardId: 'c',
      textId: 't',
    };
    c.closeContextMenu.call(inst);
    expect(inst.contextMenu.open).toBe(false);
    expect(inst.contextMenu.cardId).toBe('c');
    expect(inst.contextMenu.textId).toBe('t');
  });

  it('handleContextMenuTouchDismiss closes menu on outside touch', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.contextMenu = {
      open: true,
      x: 0,
      y: 0,
      contentX: 0,
      contentY: 0,
      cardId: null,
      textId: null,
    };
    const outside = ctx.viewport!;
    c.handleContextMenuTouchDismiss.call(ctx, {
      target: outside,
    } as TouchEvent);
    expect(ctx.contextMenu.open).toBe(false);
  });

  it('handleContextMenuTouchDismiss keeps menu open for touches inside menu', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.contextMenu = {
      open: true,
      x: 0,
      y: 0,
      contentX: 0,
      contentY: 0,
      cardId: 'c1',
      textId: null,
    };
    const menu = document.createElement('div');
    menu.setAttribute('data-context-menu', '');
    const item = document.createElement('button');
    menu.append(item);
    c.handleContextMenuTouchDismiss.call(ctx, { target: item } as TouchEvent);
    expect(ctx.contextMenu.open).toBe(true);
    expect(ctx.contextMenu.cardId).toBe('c1');
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

  it('openDrawByIndexFromContextMenu opens dialog at menu coords and closes context menu', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.contextMenu = {
      open: true,
      x: 12,
      y: 34,
      contentX: 0,
      contentY: 0,
      cardId: null,
      textId: null,
    };
    ctx.openDrawByIndexDialog = vi.fn();
    c.openDrawByIndexFromContextMenu.call(ctx);
    expect(ctx.openDrawByIndexDialog).toHaveBeenCalledWith(12, 34);
    expect(ctx.contextMenu.open).toBe(false);
  });

  it('openRandomNumberModalFromContextMenu opens modal at menu coords and closes context menu', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.contextMenu = {
      open: true,
      x: 12,
      y: 34,
      contentX: 0,
      contentY: 0,
      cardId: null,
      textId: null,
    };
    ctx.openRandomNumberModal = vi.fn();
    ctx.closeContextMenu = vi.fn();
    c.openRandomNumberModalFromContextMenu.call(ctx);
    expect(ctx.openRandomNumberModal).toHaveBeenCalledWith(12, 34);
    expect(ctx.closeContextMenu).toHaveBeenCalledTimes(1);
  });

  it('canvas markup includes generate random number context menu item', async () => {
    const html = await readFile('src/components/CanvasComponent.html', 'utf-8');
    expect(html).toContain('Generate random number');
    expect(html).toContain('openRandomNumberModalFromContextMenu()');
    expect(html).toContain('@keydown.window="handleRandomNumberShortcut($event)"');
    expect(html).toContain('randomNumberModalOpen');
  });

  it('canvas markup includes edit action in text context menu', async () => {
    const html = await readFile('src/components/CanvasComponent.html', 'utf-8');
    expect(html).toContain('editTextLabelFromContextMenu()');
    expect(html).toMatch(/contextMenu\.textId[\s\S]*?Edit[\s\S]*?Delete/);
  });

  it('text label double-click opens context menu instead of direct edit', async () => {
    const html = await readFile('src/components/CanvasComponent.html', 'utf-8');
    expect(html).toContain('@dblclick.stop="onContextMenu($event)"');
    expect(html).not.toContain('@dblclick.stop="startEditingTextLabel(label)"');
  });

  it('card wrapper applies rotation so hit area matches the visible image', async () => {
    const html = await readFile('src/components/CanvasComponent.html', 'utf-8');
    expect(html).toMatch(
      /:id="draggableCard\.id"[\s\S]*?transform: rotate\(\$\{draggableCard\.rotation\}deg\)/,
    );
    expect(html).not.toContain('transform: rotate(${draggableCard.rotation}deg); max-width: 150px');
  });

  it('editTextLabelFromContextMenu opens edit and closes context menu', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const label = mkLabel('tl1', null);
    ctx.textLabels = [label];
    ctx.contextMenu = {
      open: true,
      x: 10,
      y: 20,
      contentX: 0,
      contentY: 0,
      cardId: null,
      textId: 'tl1',
    };
    const startEdit = vi.spyOn(ctx, 'startEditingTextLabel');
    c.editTextLabelFromContextMenu.call(ctx);
    expect(ctx.contextMenu.open).toBe(false);
    expect(startEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'tl1' }));
    expect(ctx.editingTextId).toBe('tl1');
  });

  it('editTextLabelFromContextMenu closes menu before starting edit', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const label = mkLabel('tl1', null);
    ctx.textLabels = [label];
    ctx.contextMenu = {
      open: true,
      x: 10,
      y: 20,
      contentX: 0,
      contentY: 0,
      cardId: null,
      textId: 'tl1',
    };
    const order: string[] = [];
    ctx.closeContextMenu = vi.fn(function (this: MergedThis) {
      order.push('close');
      c.closeContextMenu.call(this);
    });
    ctx.startEditingTextLabel = vi.fn(function (this: MergedThis, l: TextLabel) {
      order.push('edit');
      this.editingTextId = l.id;
    });
    ctx.$nextTick = ((fn: () => void) => {
      order.push('tick');
      fn();
    }) as MergedThis['$nextTick'];
    c.editTextLabelFromContextMenu.call(ctx);
    expect(order).toEqual(['close', 'tick', 'edit']);
  });

  it('editTextLabelFromContextMenu closes menu when label is missing', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.textLabels = [];
    ctx.contextMenu = {
      open: true,
      x: 10,
      y: 20,
      contentX: 0,
      contentY: 0,
      cardId: null,
      textId: 'missing',
    };
    c.editTextLabelFromContextMenu.call(ctx);
    expect(ctx.editingTextId).toBeNull();
    expect(ctx.contextMenu.open).toBe(false);
  });

  it('openDrawByNameFromContextMenu opens picker at menu coords and closes context menu', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.contextMenu = {
      open: true,
      x: 12,
      y: 34,
      contentX: 0,
      contentY: 0,
      cardId: null,
      textId: null,
    };
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

  it('Draw card here uses context menu screen position helper', async () => {
    const html = await readFile('src/components/CanvasComponent.html', 'utf-8');
    expect(html).toContain('Draw card here');
    expect(html).toContain('drawCardAtContextMenu()');
    expect(html).not.toContain('drawCardAt($event.clientX, $event.clientY)');
    expect(html).toContain('data-context-menu');
    expect(html).toMatch(
      /x-ref="emptyCanvasMessage"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>[\s\S]*?data-context-menu[\s\S]*?fixed z-\[10000\]/,
    );
  });

  it('onContextMenu stores screen and content coordinates', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.offsetX = 10;
    ctx.offsetY = 20;
    ctx.scale = 2;
    vi.spyOn(ctx.viewport!, 'getBoundingClientRect').mockReturnValue({
      ...domRect(1000, 800),
      left: 40,
      top: 20,
      right: 1040,
      bottom: 820,
      x: 40,
      y: 20,
    } as DOMRect);
    c.onContextMenu.call(ctx, {
      clientX: 140,
      clientY: 120,
      target: ctx.viewport!,
      preventDefault: vi.fn(),
    });
    expect(ctx.contextMenu).toMatchObject({
      open: true,
      x: 140,
      y: 120,
      contentX: 45,
      contentY: 40,
    });
  });

  it('getContextMenuScreenPosition returns stored screen coordinates', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.offsetX = 10;
    ctx.offsetY = 20;
    ctx.scale = 2;
    vi.spyOn(ctx.viewport!, 'getBoundingClientRect').mockReturnValue({
      ...domRect(1000, 800),
      left: 40,
      top: 20,
      right: 1040,
      bottom: 820,
      x: 40,
      y: 20,
    } as DOMRect);
    ctx.contextMenu = {
      open: true,
      x: 140,
      y: 120,
      contentX: 45,
      contentY: 40,
      cardId: null,
      textId: null,
    };
    expect(c.getContextMenuScreenPosition.call(ctx)).toEqual({ x: 140, y: 120 });
  });

  it('drawCardAtContextMenu draws at content position of menu anchor', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.offsetX = 10;
    ctx.offsetY = 20;
    ctx.scale = 2;
    vi.spyOn(ctx.viewport!, 'getBoundingClientRect').mockReturnValue({
      ...domRect(1000, 800),
      left: 40,
      top: 20,
      right: 1040,
      bottom: 820,
      x: 40,
      y: 20,
    } as DOMRect);
    ctx.contextMenu = {
      open: true,
      x: 140,
      y: 120,
      contentX: 45,
      contentY: 40,
      cardId: null,
      textId: null,
    };
    ctx.drawCardAtContent = vi.fn();
    c.drawCardAtContextMenu.call(ctx);
    expect(ctx.drawCardAtContent).toHaveBeenCalledWith(45, 40);
    expect(ctx.contextMenu.open).toBe(false);
  });

  it('canvas markup includes bottom-right copyright notice', async () => {
    const html = await readFile('src/components/CanvasComponent.html', 'utf-8');
    expect(html).toContain('© Cup Knight Tarot');
    expect(html).toContain('new Date().getFullYear()');
    expect(html).toContain('All rights');
    expect(html).toContain('reserved.');
    expect(html).toContain('absolute bottom-3 right-3');
    expect(html).toMatch(
      /absolute bottom-3 right-3[\s\S]*?max-w-\[calc\(50%-0\.75rem\)\][\s\S]*?© Cup Knight Tarot/,
    );
  });

  it('canvas context menu includes overlay visibility toggle', async () => {
    const html = await readFile('src/components/CanvasComponent.html', 'utf-8');
    expect(html).toContain('toggleCanvasOverlaysFromContextMenu()');
    expect(html).toContain(
      "$store.canvasOverlays.visible ? 'Hide overlay elements' : 'Show overlay elements'",
    );
    expect(html).toContain('$store.canvasOverlays.visible');
  });

  it('canvas toolbar uses half-width layout and stacks on narrow screens', async () => {
    const html = await readFile('src/components/CanvasComponent.html', 'utf-8');
    expect(html).toMatch(
      /fixed top-2 right-2[\s\S]*?max-w-\[calc\(50%-0\.5rem\)\][\s\S]*?flex-wrap items-center justify-end/,
    );
    expect(html).toContain('max-[36rem]:top-28');
  });

  it('active deck and trademark overlays each stay within half the canvas width', async () => {
    const html = await readFile('src/components/CanvasComponent.html', 'utf-8');
    expect(html).toMatch(
      /absolute bottom-3 left-3[\s\S]*?max-w-\[calc\(50%-0\.75rem\)\][\s\S]*?Active deck/,
    );
    expect(html).toMatch(
      /absolute bottom-3 right-3[\s\S]*?max-w-\[calc\(50%-0\.75rem\)\][\s\S]*?© Cup Knight Tarot/,
    );
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
      preventDefault: vi.fn(),
    };
    c.onMouseDown.call(ctx, ev);
    expect(ev.preventDefault).toHaveBeenCalled();
    expect(ctx.isPanning).toBe(true);
    expect(isPointerInteractionLocked()).toBe(true);
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

  it('onMouseDown ignores interactive controls inside a text label', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.textLabels = [mkLabel('tl1', null)];
    const wrap = document.createElement('div');
    wrap.setAttribute('data-text-id', 'tl1');
    const button = document.createElement('button');
    wrap.append(button);
    c.onMouseDown.call(ctx, {
      clientX: 100,
      clientY: 200,
      target: button,
      ctrlKey: false,
    });
    expect(ctx.draggingTextId).toBeNull();
    expect(ctx.textDragStart).toBeNull();
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
    lockPointerInteraction();
    c.onMouseUp.call(ctx, { clientX: 0, clientY: 0, target: null });
    expect(ctx.isPanning).toBe(false);
    expect(isPointerInteractionLocked()).toBe(false);
    expect(ctx.dirty).toBe(true);
  });

  it('onMouseUp completes selection and picks overlapping cards and text labels', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.selectionBox = { startX: 0, startY: 0, currentX: 200, currentY: 200 };
    ctx.draggableCards = [mkCard('a', 10, 10), mkCard('b', 500, 500)];
    ctx.textLabels = [mkLabel('tl1', null), mkLabel('far-text', null)];
    ctx.textLabels[0]!.x = 20;
    ctx.textLabels[0]!.y = 20;
    ctx.textLabels[1]!.x = 900;
    ctx.textLabels[1]!.y = 900;
    c.onMouseUp.call(ctx, { clientX: 0, clientY: 0, target: null });
    expect(ctx.selectedCardIds).toEqual(['a']);
    expect(ctx.selectedTextIds).toEqual(['tl1']);
    expect(ctx.selectionBox).toBeNull();
  });

  it('onMouseMove drags a mixed group of selected cards and text labels', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const el = document.createElement('div');
    el.id = 'a';
    ctx.draggableCards = [mkCard('a', 0, 0)];
    ctx.textLabels = [{ ...mkLabel('tl1', null), x: 50, y: 10 }];
    ctx.selectedCardIds = ['a'];
    ctx.selectedTextIds = ['tl1'];
    ctx.draggingCard = el;
    ctx.dragStart = { startCardX: 0, startCardY: 0, startDropX: 0, startDropY: 0 };
    ctx.groupDragOffsets = { a: { dx: 0, dy: 0 }, tl1: { dx: 50, dy: 10 } };
    c.onMouseMove.call(ctx, { clientX: 40, clientY: 40, target: null });
    expect(ctx.draggableCards.find((x) => x.id === 'a')?.x).toBe(40);
    expect(ctx.textLabels.find((l) => l.id === 'tl1')?.x).toBe(90);
    expect(ctx.textLabels.find((l) => l.id === 'tl1')?.y).toBe(50);
  });

  it('onMouseDown drags a selected text label with grouped cards', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.draggableCards = [mkCard('card-1', 0, 0)];
    ctx.textLabels = [{ ...mkLabel('tl1', null), x: 10, y: 20 }];
    ctx.selectedCardIds = ['card-1'];
    ctx.selectedTextIds = ['tl1'];
    const wrap = document.createElement('div');
    wrap.setAttribute('data-text-id', 'tl1');
    c.onMouseDown.call(ctx, {
      clientX: 5,
      clientY: 6,
      target: wrap,
      ctrlKey: false,
    });
    expect(ctx.draggingTextId).toBe('tl1');
    expect(ctx.groupDragOffsets).toEqual({
      'card-1': { dx: -10, dy: -20 },
      tl1: { dx: 0, dy: 0 },
    });
  });

  it('onMouseUp completes selection and picks overlapping cards', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.selectionBox = { startX: 0, startY: 0, currentX: 200, currentY: 200 };
    ctx.draggableCards = [mkCard('a', 10, 10), mkCard('b', 500, 500)];
    c.onMouseUp.call(ctx, { clientX: 0, clientY: 0, target: null });
    expect(ctx.selectedCardIds).toEqual(['a']);
    expect(ctx.selectedTextIds).toEqual([]);
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

  it('onTouchStart two-finger pinch initializes pinch state', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const t0 = touch(0, 0, 0);
    const t1 = touch(1, 10, 10);
    c.onTouchStart.call(ctx, touchEv([t0, t1], [t0, t1]));
    expect(ctx.pinchStartDistance).toBeGreaterThan(0);
    expect(ctx.activeTouchId).toBeNull();
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

  it('onTouchMove pinch applies canvas zoom sensitivity from settings', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    alpineStub.rawStores.settings = { canvasZoomSensitivity: 50 };
    ctx.pinchStartDistance = 100;
    ctx.pinchStartScale = 1;
    ctx.scale = 1;
    ctx.clamp = (v: number) => v;
    const t0 = touch(0, 0, 0);
    const t1 = touch(1, 200, 0);
    c.onTouchMove.call(ctx, touchEv([t0, t1], [t0, t1]));
    const zoomMock = mockFromCtx(ctx, 'zoomAt') as { mock: { calls: [number, number, number][] } };
    expect(zoomMock.mock.calls[0]).toEqual([100, 0, 1.5]);
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

  it('onTouchMove single touch forwards to mouse handlers after slop exceeded', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(7, 50, 60);
    c.onTouchStart.call(ctx, touchEv([t0], [t0]));
    const move = touchEv([touch(7, 65, 75)], [touch(7, 65, 75)]);
    c.onTouchMove.call(ctx, move);
    expect(ctx.touchGestureStarted).toBe(true);
  });

  it('onTouchMove after gesture started only forwards mouse move', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(8, 1, 1);
    c.onTouchStart.call(ctx, touchEv([t0], [t0]));
    c.onTouchMove.call(ctx, touchEv([touch(8, 15, 15)], [touch(8, 15, 15)]));
    const md = vi.spyOn(ctx, 'onMouseDown');
    c.onTouchMove.call(ctx, touchEv([touch(8, 20, 20)], [touch(8, 20, 20)]));
    expect(md.mock.calls.length).toBe(0);
  });

  it('onTouchEnd double-tap on canvas opens context menu and resets pinch', () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000);
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const first = touch(4, 5, 5);
    ctx.onTouchStart.call(ctx, touchEv([first], [first]));
    ctx.onTouchEnd.call(ctx, touchEv([], [first]));
    expect(ctx.lastCanvasTap).toMatchObject({ tapKey: 'canvas' });

    vi.setSystemTime(1_200);
    ctx.pinchStartDistance = 50;
    const second = touch(4, 6, 6);
    const cm = vi.spyOn(ctx, 'onContextMenu');
    ctx.onTouchStart.call(ctx, touchEv([second], [second]));
    ctx.onTouchEnd.call(ctx, touchEv([], [second]));
    expect(ctx.pinchStartDistance).toBe(0);
    expect(cm.mock.calls.length).toBeGreaterThan(0);
    expect(ctx.lastCanvasTap).toBeNull();
    vi.useRealTimers();
  });

  it('onTouchEnd calls onMouseUp when gesture started', () => {
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(5, 1, 1);
    ctx.onTouchStart.call(ctx, touchEv([t0], [t0]));
    ctx.onTouchMove.call(ctx, touchEv([touch(5, 20, 20)], [touch(5, 20, 20)]));
    const mu = vi.spyOn(ctx, 'onMouseUp');
    ctx.onTouchEnd.call(ctx, touchEv([], [touch(5, 20, 20)]));
    expect(mu.mock.calls.length).toBeGreaterThan(0);
  });

  it('onTouchCancel delegates to onTouchEnd', () => {
    const ctx = createMerged();
    const end = vi.spyOn(ctx, 'onTouchEnd');
    const e = touchEv([], []);
    ctx.onTouchCancel.call(ctx, e);
    expect(end.mock.calls[0]?.[0]).toBe(e);
  });

  it('onTouchStart two-finger pinch sets pinch distance', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const t0 = touch(0, 0, 0);
    const t1 = touch(1, 10, 0);
    c.onTouchStart.call(ctx, touchEv([t0, t1], [t0, t1]));
    expect(ctx.pinchStartDistance).toBe(10);
  });

  it('onTouchStart skips canvas handling for interactive targets', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const button = document.createElement('button');
    spyElementFromPoint(button);
    const t0 = touch(0, 10, 10);
    const ev = touchEv([t0], [t0]);
    c.onTouchStart.call(ctx, ev);
    expect(ev.preventDefault).not.toHaveBeenCalled();
    expect(ctx.activeTouchId).toBeNull();
  });

  it('onTouchEnd quick tap outside edit panel commits text edit', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.editingTextId = 'tl1';
    ctx.textLabels = [mkLabel('tl1', null)];
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(9, 50, 50);
    c.onTouchStart.call(ctx, touchEv([t0], [t0]));
    c.onTouchEnd.call(ctx, touchEv([], [t0]));
    expect(ctx.commitEditTextLabel).toHaveBeenCalled();
    expect(ctx.editingTextId).toBeNull();
  });

  it('onTouchEnd quick tap inside edit panel does not commit text edit', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.editingTextId = 'tl1';
    ctx.textLabels = [mkLabel('tl1', null)];
    const panel = document.createElement('div');
    panel.setAttribute('data-text-edit-panel', '');
    spyElementFromPoint(panel);
    const t0 = touch(10, 20, 20);
    c.onTouchStart.call(ctx, touchEv([t0], [t0]));
    c.onTouchEnd.call(ctx, touchEv([], [t0]));
    expect(ctx.commitEditTextLabel).not.toHaveBeenCalled();
    expect(ctx.editingTextId).toBe('tl1');
  });

  it('onTouchEnd double-tap on text label opens context menu', () => {
    vi.useFakeTimers();
    vi.setSystemTime(5_000);
    const c = mountCanvas();
    const ctx = createMerged();
    const label = mkLabel('tl1', null);
    ctx.textLabels = [label];
    const wrap = document.createElement('div');
    wrap.setAttribute('data-text-id', 'tl1');
    const span = document.createElement('span');
    wrap.append(span);
    spyElementFromPoint(span);

    const first = touch(11, 40, 40);
    c.onTouchStart.call(ctx, touchEv([first], [first]));
    c.onTouchEnd.call(ctx, touchEv([], [first]));
    expect(ctx.lastCanvasTap).toMatchObject({ tapKey: 'text:tl1' });

    vi.setSystemTime(5_200);
    const second = touch(11, 42, 41);
    const cm = vi.spyOn(ctx, 'onContextMenu');
    c.onTouchStart.call(ctx, touchEv([second], [second]));
    c.onTouchEnd.call(ctx, touchEv([], [second]));
    expect(cm.mock.calls.length).toBeGreaterThan(0);
    expect(ctx.lastCanvasTap).toBeNull();
    vi.useRealTimers();
  });

  it('onTouchEnd double-tap on card opens card context menu', () => {
    vi.useFakeTimers();
    vi.setSystemTime(6_000);
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.draggableCards = [mkCard('cd1', 0, 0)];
    const card = document.createElement('div');
    card.id = 'cd1';
    const img = document.createElement('img');
    card.append(img);
    ctx.viewport!.append(card);
    spyElementFromPoint(img);

    const first = touch(20, 30, 30);
    c.onTouchStart.call(ctx, touchEv([first], [first]));
    c.onTouchEnd.call(ctx, touchEv([], [first]));
    expect(ctx.lastCanvasTap).toMatchObject({ tapKey: 'card:cd1' });

    vi.setSystemTime(6_200);
    const second = touch(20, 32, 31);
    const cm = vi.spyOn(ctx, 'onContextMenu');
    c.onTouchStart.call(ctx, touchEv([second], [second]));
    c.onTouchEnd.call(ctx, touchEv([], [second]));
    expect(cm.mock.calls.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('onTouchMove clears pending canvas double-tap after movement beyond slop', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.lastCanvasTap = { tapKey: 'text:tl1', time: Date.now(), x: 1, y: 2 };
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(12, 0, 0);
    c.onTouchStart.call(ctx, touchEv([t0], [t0]));
    c.onTouchMove.call(ctx, touchEv([touch(12, 15, 15)], [touch(12, 15, 15)]));
    expect(ctx.lastCanvasTap).toBeNull();
  });

  it('onTouchMove sub-slop jitter preserves pending canvas double-tap', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.lastCanvasTap = { tapKey: 'text:tl1', time: Date.now(), x: 1, y: 2 };
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(12, 0, 0);
    c.onTouchStart.call(ctx, touchEv([t0], [t0]));
    c.onTouchMove.call(ctx, touchEv([touch(12, 4, 4)], [touch(12, 4, 4)]));
    expect(ctx.lastCanvasTap).toMatchObject({ tapKey: 'text:tl1' });
    expect(ctx.touchGestureStarted).toBe(false);
  });

  it('onTouchEnd double-tap still works after sub-slop touchmove jitter', () => {
    vi.useFakeTimers();
    vi.setSystemTime(7_000);
    const c = mountCanvas();
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);

    const first = touch(13, 50, 50);
    c.onTouchStart.call(ctx, touchEv([first], [first]));
    c.onTouchMove.call(ctx, touchEv([touch(13, 52, 51)], [touch(13, 52, 51)]));
    c.onTouchEnd.call(ctx, touchEv([], [first]));
    expect(ctx.lastCanvasTap).toMatchObject({ tapKey: 'canvas' });

    vi.setSystemTime(7_200);
    const second = touch(13, 51, 51);
    const cm = vi.spyOn(ctx, 'onContextMenu');
    c.onTouchStart.call(ctx, touchEv([second], [second]));
    c.onTouchMove.call(ctx, touchEv([touch(13, 53, 52)], [touch(13, 53, 52)]));
    c.onTouchEnd.call(ctx, touchEv([], [second]));
    expect(cm.mock.calls.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('onTouchMove two-finger pinch zooms when pinch distance is set', () => {
    const c = mountCanvas();
    const ctx = createMerged();
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
    ctx.contextMenu = {
      open: false,
      x: 0,
      y: 0,
      contentX: 0,
      contentY: 0,
      cardId: null,
      textId: null,
    };
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

  it('onTouchEnd quick tap synthesizes mouse up without opening context menu', () => {
    const ctx = createMerged();
    spyElementFromPoint(ctx.viewport);
    const t0 = touch(9, 1, 1);
    ctx.onTouchStart.call(ctx, touchEv([t0], [t0]));
    const cm = vi.spyOn(ctx, 'onContextMenu');
    const mu = vi.spyOn(ctx, 'onMouseUp');
    ctx.onTouchEnd.call(ctx, touchEv([], [t0]));
    expect(cm.mock.calls.length).toBe(0);
    expect(mu.mock.calls.length).toBe(1);
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

  describe('showCorrespondenceThumbnailsOnCanvas', () => {
    it('reflects showCorrespondenceThumbnailsOnCanvas setting only', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      alpineStub.rawStores.settings = {
        showCorrespondenceThumbnailsOnCanvas: false,
        showCorrespondenceCountBarOnCanvas: true,
      };
      expect(c.showCorrespondenceThumbnailsOnCanvas.call(ctx)).toBe(false);

      alpineStub.rawStores.settings = {
        showCorrespondenceThumbnailsOnCanvas: true,
        showCorrespondenceCountBarOnCanvas: false,
      };
      expect(c.showCorrespondenceThumbnailsOnCanvas.call(ctx)).toBe(true);
    });
  });

  describe('hydrateCanvasCardCorrespondenceDisplays', () => {
    beforeEach(() => {
      getCardsByIdsMock.mockReset();
      resolveCorrespondenceDisplaysMock.mockReset();
      alpineStub.rawStores.settings = {
        showCorrespondenceThumbnailsOnCanvas: true,
        showCorrespondenceCountBarOnCanvas: false,
      };
    });

    it('merges correspondence displays from deck lookup onto canvas cards', async () => {
      const c = mountCanvas();
      const ctx = createMerged();
      const card = mkCard('1');
      card.card.id = 'deck-card-1';
      ctx.draggableCards = [card];
      getCardsByIdsMock.mockResolvedValue(
        ok(
          new Map([
            [
              'deck-card-1',
              {
                id: 'deck-card-1',
                deckId: 'd',
                title: 'T',
                num: 1,
                img: 'i.webp',
                correspondence_ids: ['corr-x'],
                correspondenceDisplays: [{ id: 'corr-x', title: 'Moon', thumbnailUrl: null }],
              },
            ],
          ]),
        ),
      );

      await c.hydrateCanvasCardCorrespondenceDisplays.call(ctx);

      expect(getCardsByIdsMock).toHaveBeenCalledWith(['deck-card-1']);
      expect(ctx.draggableCards[0]?.card.correspondenceDisplays).toEqual([
        { id: 'corr-x', title: 'Moon', thumbnailUrl: null },
      ]);
    });

    it('hydrates when only showCorrespondenceCountBarOnCanvas is enabled', async () => {
      alpineStub.rawStores.settings = {
        showCorrespondenceThumbnailsOnCanvas: false,
        showCorrespondenceCountBarOnCanvas: true,
      };
      const c = mountCanvas();
      const ctx = createMerged();
      const card = mkCard('1');
      card.card.id = 'deck-card-2';
      ctx.draggableCards = [card];
      getCardsByIdsMock.mockResolvedValue(
        ok(
          new Map([
            [
              'deck-card-2',
              {
                id: 'deck-card-2',
                deckId: 'd',
                title: 'T',
                num: 1,
                img: 'i.webp',
                correspondence_ids: ['corr-y'],
                correspondenceDisplays: [{ id: 'corr-y', title: 'Sun', thumbnailUrl: null }],
              },
            ],
          ]),
        ),
      );

      await c.hydrateCanvasCardCorrespondenceDisplays.call(ctx);

      expect(getCardsByIdsMock).toHaveBeenCalled();
      expect(ctx.draggableCards[0]?.card.correspondenceDisplays).toHaveLength(1);
    });

    it('resolves displays when deck lookup returns ids but no displays', async () => {
      const c = mountCanvas();
      const ctx = createMerged();
      const card = mkCard('1');
      card.card.id = 'deck-card-3';
      ctx.draggableCards = [card];
      getCardsByIdsMock.mockResolvedValue(
        ok(
          new Map([
            [
              'deck-card-3',
              {
                id: 'deck-card-3',
                deckId: 'd',
                title: 'T',
                num: 1,
                img: 'i.webp',
                correspondence_ids: ['corr-z'],
                correspondenceDisplays: [],
              },
            ],
          ]),
        ),
      );
      resolveCorrespondenceDisplaysMock.mockResolvedValue([
        { id: 'corr-z', title: 'Star', thumbnailUrl: null },
      ]);

      await c.hydrateCanvasCardCorrespondenceDisplays.call(ctx);

      expect(resolveCorrespondenceDisplaysMock).toHaveBeenCalledWith(['corr-z']);
      expect(ctx.draggableCards[0]?.card.correspondenceDisplays).toEqual([
        { id: 'corr-z', title: 'Star', thumbnailUrl: null },
      ]);
    });

    it('skips when correspondence canvas display is disabled', async () => {
      alpineStub.rawStores.settings = {
        showCorrespondenceThumbnailsOnCanvas: false,
        showCorrespondenceCountBarOnCanvas: false,
      };
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.draggableCards = [mkCard('1')];

      await c.hydrateCanvasCardCorrespondenceDisplays.call(ctx);

      expect(getCardsByIdsMock).not.toHaveBeenCalled();
    });
  });

  describe('refreshCorrespondenceCountBar', () => {
    beforeEach(() => {
      aggregateCorrespondenceCountsMock.mockReset();
      resolveCorrespondenceCountEntriesMock.mockReset();
      alpineStub.rawStores.settings = {
        showCorrespondenceCountBarOnCanvas: true,
      };
    });

    it('clears entries when setting is off', async () => {
      alpineStub.rawStores.settings = { showCorrespondenceCountBarOnCanvas: false };
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.correspondenceBarEntries = [{ id: 'x', title: 'X', count: 1, thumbnailUrl: null }];
      ctx.draggableCards = [mkCard('1')];

      await c.refreshCorrespondenceCountBar.call(ctx);

      expect(ctx.correspondenceBarEntries).toEqual([]);
      expect(aggregateCorrespondenceCountsMock).not.toHaveBeenCalled();
    });

    it('clears entries when no correspondences on canvas', async () => {
      const c = mountCanvas();
      const ctx = createMerged();
      aggregateCorrespondenceCountsMock.mockReturnValue(new Map());

      await c.refreshCorrespondenceCountBar.call(ctx);

      expect(ctx.correspondenceBarEntries).toEqual([]);
      expect(resolveCorrespondenceCountEntriesMock).not.toHaveBeenCalled();
    });

    it('resolves and assigns entries from draggable cards', async () => {
      const c = mountCanvas();
      const ctx = createMerged();
      const card = mkCard('1');
      card.card.correspondence_ids = ['corr-a'];
      ctx.draggableCards = [card];
      const counts = new Map([['corr-a', 2]]);
      const resolved = [{ id: 'corr-a', title: 'Herb', count: 2, thumbnailUrl: 'blob:t' }];
      aggregateCorrespondenceCountsMock.mockReturnValue(counts);
      resolveCorrespondenceCountEntriesMock.mockResolvedValue(resolved);

      await c.refreshCorrespondenceCountBar.call(ctx);

      expect(aggregateCorrespondenceCountsMock).toHaveBeenCalledWith(ctx.draggableCards);
      expect(resolveCorrespondenceCountEntriesMock).toHaveBeenCalledWith(counts);
      expect(ctx.correspondenceBarEntries).toEqual(resolved);
    });

    it('ignores stale empty-count refresh when a newer refresh runs synchronously', async () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.correspondenceBarEntries = [{ id: 'old', title: 'Old', count: 99, thumbnailUrl: null }];
      const newer = [{ id: 'new', title: 'New', count: 1, thumbnailUrl: null }];
      aggregateCorrespondenceCountsMock
        .mockImplementationOnce(() => {
          void c.refreshCorrespondenceCountBar.call(ctx);
          return new Map();
        })
        .mockReturnValueOnce(new Map([['a', 1]]));
      resolveCorrespondenceCountEntriesMock.mockResolvedValue(newer);

      await c.refreshCorrespondenceCountBar.call(ctx);

      expect(ctx.correspondenceBarEntries).toEqual(newer);
    });

    it('ignores stale async results when a newer refresh runs', async () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.draggableCards = [mkCard('1')];
      aggregateCorrespondenceCountsMock.mockReturnValue(new Map([['a', 1]]));
      let resolveLate: (v: typeof ctx.correspondenceBarEntries) => void;
      const latePromise = new Promise<typeof ctx.correspondenceBarEntries>((r) => {
        resolveLate = r;
      });
      resolveCorrespondenceCountEntriesMock
        .mockReturnValueOnce(latePromise)
        .mockResolvedValueOnce([{ id: 'b', title: 'New', count: 1, thumbnailUrl: null }]);

      void c.refreshCorrespondenceCountBar.call(ctx);
      await c.refreshCorrespondenceCountBar.call(ctx);

      expect(ctx.correspondenceBarEntries).toEqual([
        { id: 'b', title: 'New', count: 1, thumbnailUrl: null },
      ]);

      resolveLate!([{ id: 'a', title: 'Stale', count: 9, thumbnailUrl: null }]);
      await Promise.resolve();

      expect(ctx.correspondenceBarEntries).toEqual([
        { id: 'b', title: 'New', count: 1, thumbnailUrl: null },
      ]);
    });
  });

  describe('refreshCardCountBar', () => {
    beforeEach(() => {
      aggregateCardTitleCountsMock.mockReset();
      alpineStub.rawStores.settings = {
        showCardCountBarOnCanvas: true,
      };
    });

    it('clears entries when setting is off', () => {
      alpineStub.rawStores.settings = { showCardCountBarOnCanvas: false };
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.cardCountBarEntries = [{ title: 'The Fool', count: 2 }];
      ctx.draggableCards = [mkCard('1')];

      c.refreshCardCountBar.call(ctx);

      expect(ctx.cardCountBarEntries).toEqual([]);
      expect(aggregateCardTitleCountsMock).not.toHaveBeenCalled();
    });

    it('assigns aggregated entries from draggable cards', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.draggableCards = [mkCard('1'), mkCard('2')];
      const aggregated = [
        { title: 'The Fool', count: 2 },
        { title: 'The Magician', count: 1 },
      ];
      aggregateCardTitleCountsMock.mockReturnValue(aggregated);

      c.refreshCardCountBar.call(ctx);

      expect(aggregateCardTitleCountsMock).toHaveBeenCalledWith(ctx.draggableCards);
      expect(ctx.cardCountBarEntries).toEqual(aggregated);
    });

    it('clears entries when aggregation returns empty', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.draggableCards = [];
      aggregateCardTitleCountsMock.mockReturnValue([]);

      c.refreshCardCountBar.call(ctx);

      expect(ctx.cardCountBarEntries).toEqual([]);
    });
  });

  describe('drawByName picker', () => {
    beforeEach(() => {
      alpineStub.rawStores.shuffledCards = [
        { id: 'c1', deckId: 'd', title: 'The Star', num: 1, img: 'a.webp' },
        { id: 'c2', deckId: 'd', title: 'The Moon', num: 2, img: 'b.webp' },
      ];
    });

    it('drawByNameMatches returns empty when picker is closed', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.drawByName = null;
      expect(c.drawByNameMatches.call(ctx)).toEqual([]);
    });

    it('openDrawByNameAt focuses the search input', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      const focus = vi.fn();
      ctx.$refs.drawByNameInput = { focus } as unknown as HTMLInputElement;
      c.openDrawByNameAt.call(ctx, 10, 20);
      expect(ctx.drawByName).toEqual({
        screenX: 10,
        screenY: 20,
        query: '',
        highlightIndex: 0,
      });
      expect(focus).toHaveBeenCalledTimes(1);
    });

    it('onDrawByNameQueryInput is a no-op when picker is closed', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.drawByName = null;
      c.onDrawByNameQueryInput.call(ctx, 'star');
      expect(ctx.drawByName).toBeNull();
    });

    it('onDrawByNameQueryInput resets highlight when there are no matches', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.drawByName = { screenX: 0, screenY: 0, query: '', highlightIndex: 2 };
      c.onDrawByNameQueryInput.call(ctx, '   ');
      expect(ctx.drawByName?.highlightIndex).toBe(0);
      expect(ctx.drawByName?.query).toBe('   ');
    });

    it('onDrawByNameQueryInput clamps highlight to three matches', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      alpineStub.rawStores.shuffledCards = [
        { id: 'a', deckId: 'd', title: 'The Ace', num: 0, img: 'a.webp' },
        { id: 'b', deckId: 'd', title: 'The Two', num: 1, img: 'b.webp' },
        { id: 'c', deckId: 'd', title: 'The Three', num: 2, img: 'c.webp' },
        { id: 'd', deckId: 'd', title: 'The Four', num: 3, img: 'd.webp' },
      ];
      ctx.drawByName = { screenX: 0, screenY: 0, query: 'the', highlightIndex: 5 };
      c.onDrawByNameQueryInput.call(ctx, 'the');
      expect(ctx.drawByName?.highlightIndex).toBe(2);
    });

    it('moveDrawByNameHighlight wraps through matches', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.drawByName = { screenX: 0, screenY: 0, query: 'moon', highlightIndex: 0 };
      c.moveDrawByNameHighlight.call(ctx, -1);
      expect(ctx.drawByName?.highlightIndex).toBe(0);
      c.moveDrawByNameHighlight.call(ctx, 1);
      expect(ctx.drawByName?.highlightIndex).toBe(0);
    });

    it('moveDrawByNameHighlight is a no-op when picker is closed or there are no matches', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.drawByName = null;
      c.moveDrawByNameHighlight.call(ctx, 1);
      ctx.drawByName = { screenX: 0, screenY: 0, query: 'missing', highlightIndex: 0 };
      c.moveDrawByNameHighlight.call(ctx, 1);
      expect(ctx.drawByName?.highlightIndex).toBe(0);
    });

    it('onDrawByNameKeydown handles arrow, enter, escape, and ignores other keys', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.addCardToCanvas = vi.fn((card: TarotCard) => {
        ctx.draggableCards = [...ctx.draggableCards, { ...mkCard('placed'), card }];
      });
      ctx.drawByName = { screenX: 0, screenY: 0, query: 'star', highlightIndex: 0 };
      const preventDefault = vi.fn();
      c.onDrawByNameKeydown.call(ctx, { key: 'ArrowDown', preventDefault } as KeyboardEvent);
      expect(preventDefault).toHaveBeenCalled();
      c.onDrawByNameKeydown.call(ctx, { key: 'ArrowUp', preventDefault } as KeyboardEvent);
      c.onDrawByNameKeydown.call(ctx, { key: 'Enter', preventDefault } as KeyboardEvent);
      expect(ctx.addCardToCanvas).toHaveBeenCalled();
      ctx.drawByName = { screenX: 0, screenY: 0, query: 'star', highlightIndex: 0 };
      c.onDrawByNameKeydown.call(ctx, { key: 'Escape', preventDefault } as KeyboardEvent);
      expect(ctx.drawByName).toBeNull();
      ctx.drawByName = { screenX: 0, screenY: 0, query: 'star', highlightIndex: 0 };
      c.onDrawByNameKeydown.call(ctx, { key: 'a', preventDefault } as KeyboardEvent);
      expect(ctx.drawByName?.query).toBe('star');
    });

    it('confirmDrawByNameSelection uses an explicitly passed card', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.drawByName = { screenX: 50, screenY: 60, query: '', highlightIndex: 0 };
      ctx.addCardToCanvas = vi.fn((card: TarotCard) => {
        ctx.draggableCards = [...ctx.draggableCards, { ...mkCard('placed'), card }];
      });
      const explicit = { id: 'picked', deckId: 'd', title: 'Picked', num: 0, img: 'x.webp' };
      c.confirmDrawByNameSelection.call(ctx, explicit);
      expect(ctx.drawByName).toBeNull();
      expect(ctx.addCardToCanvas).toHaveBeenCalledWith(explicit);
    });

    it('confirmDrawByNameSelection returns without drawing when there are no matches', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.drawByName = { screenX: 0, screenY: 0, query: 'missing', highlightIndex: 0 };
      ctx.addCardToCanvas = vi.fn();
      c.confirmDrawByNameSelection.call(ctx);
      expect(ctx.addCardToCanvas).not.toHaveBeenCalled();
      expect(ctx.drawByName).toEqual({
        screenX: 0,
        screenY: 0,
        query: 'missing',
        highlightIndex: 0,
      });
    });

    it('confirmDrawByNameSelection is a no-op when picker is closed', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.drawByName = null;
      ctx.addCardToCanvas = vi.fn();
      c.confirmDrawByNameSelection.call(ctx);
      expect(ctx.addCardToCanvas).not.toHaveBeenCalled();
    });

    it('onDrawByNameKeydown is a no-op when picker is closed', () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.drawByName = null;
      c.onDrawByNameKeydown.call(ctx, {
        key: 'Enter',
        preventDefault: vi.fn(),
      } as KeyboardEvent);
      expect(ctx.drawByName).toBeNull();
    });
  });

  it('showCorrespondenceOnCanvas reflects settings', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    alpineStub.rawStores.settings = {
      showCorrespondenceThumbnailsOnCanvas: true,
      showCorrespondenceCountBarOnCanvas: false,
    };
    expect(c.showCorrespondenceOnCanvas.call(ctx)).toBe(true);
  });

  it('onCorrespondencesChanged hydrates cards and refreshes the count bar', async () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const hydrateSpy = vi
      .spyOn(ctx, 'hydrateCanvasCardCorrespondenceDisplays')
      .mockResolvedValue(undefined);
    const refreshSpy = vi.spyOn(ctx, 'refreshCorrespondenceCountBar').mockResolvedValue(undefined);
    await c.onCorrespondencesChanged.call(ctx);
    expect(hydrateSpy).toHaveBeenCalledTimes(1);
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  describe('hydrateCanvasCardCorrespondenceDisplays edge cases', () => {
    beforeEach(() => {
      alpineStub.rawStores.settings = {
        showCorrespondenceThumbnailsOnCanvas: true,
        showCorrespondenceCountBarOnCanvas: false,
      };
      getCardsByIdsMock.mockReset();
      resolveCorrespondenceDisplaysMock.mockReset();
    });

    it('skips lookup when canvas cards have no ids', async () => {
      const c = mountCanvas();
      const ctx = createMerged();
      ctx.draggableCards = [{ ...mkCard('1'), card: { ...mkCard('1').card, id: '' } }];
      await c.hydrateCanvasCardCorrespondenceDisplays.call(ctx);
      expect(getCardsByIdsMock).not.toHaveBeenCalled();
    });

    it('ignores failed deck lookups and stale hydration generations', async () => {
      const c = mountCanvas();
      const ctx = createMerged();
      const card = mkCard('1');
      card.card.id = 'deck-1';
      ctx.draggableCards = [card];
      getCardsByIdsMock.mockResolvedValue(
        err({ kind: 'unknown', operation: 't', message: 'fail' }),
      );
      await c.hydrateCanvasCardCorrespondenceDisplays.call(ctx);
      expect(ctx.draggableCards[0]?.card.correspondenceDisplays).toBeUndefined();

      let resolveLate: (value: ReturnType<typeof ok<Map<string, TarotCard>>>) => void;
      const late = new Promise<ReturnType<typeof ok<Map<string, TarotCard>>>>((r) => {
        resolveLate = r;
      });
      getCardsByIdsMock.mockReturnValueOnce(late);
      void c.hydrateCanvasCardCorrespondenceDisplays.call(ctx);
      await c.hydrateCanvasCardCorrespondenceDisplays.call(ctx);
      resolveLate!(
        ok(
          new Map([
            [
              'deck-1',
              {
                id: 'deck-1',
                deckId: 'd',
                title: 'Late',
                num: 1,
                img: 'i.webp',
                correspondence_ids: ['late'],
              },
            ],
          ]),
        ),
      );
      await Promise.resolve();
      expect(ctx.draggableCards[0]?.card.correspondence_ids).toBeUndefined();
    });

    it('keeps cards unchanged when lookup misses or metadata already matches', async () => {
      const c = mountCanvas();
      const ctx = createMerged();
      const unchanged = mkCard('1');
      unchanged.card.id = 'deck-unchanged';
      unchanged.card.correspondence_ids = ['same'];
      unchanged.card.correspondenceDisplays = [{ id: 'same', title: 'Same', thumbnailUrl: null }];
      const missing = mkCard('2');
      missing.card.id = 'deck-missing';
      ctx.draggableCards = [unchanged, missing];
      getCardsByIdsMock.mockResolvedValue(
        ok(
          new Map([
            [
              'deck-unchanged',
              {
                id: 'deck-unchanged',
                deckId: 'd',
                title: 'T',
                num: 1,
                img: 'i.webp',
                correspondence_ids: ['same'],
                correspondenceDisplays: [{ id: 'same', title: 'Same', thumbnailUrl: null }],
              },
            ],
          ]),
        ),
      );
      const before = ctx.draggableCards;
      await c.hydrateCanvasCardCorrespondenceDisplays.call(ctx);
      expect(ctx.draggableCards).toBe(before);
      expect(missing.card.correspondence_ids).toBeUndefined();
    });

    it('defaults missing correspondence fields from deck lookup', async () => {
      const c = mountCanvas();
      const ctx = createMerged();
      const card = mkCard('1');
      card.card.id = 'deck-defaults';
      card.card.correspondence_ids = ['old'];
      ctx.draggableCards = [card];
      getCardsByIdsMock.mockResolvedValue(
        ok(
          new Map([
            [
              'deck-defaults',
              {
                id: 'deck-defaults',
                deckId: 'd',
                title: 'T',
                num: 1,
                img: 'i.webp',
              },
            ],
          ]),
        ),
      );
      await c.hydrateCanvasCardCorrespondenceDisplays.call(ctx);
      expect(ctx.draggableCards[0]?.card.correspondence_ids).toEqual([]);
      expect(ctx.draggableCards[0]?.card.correspondenceDisplays).toEqual([]);
    });
  });

  it('applyGroupDragAt skips unknown group member ids', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.groupDragOffsets = { ghost: { dx: 0, dy: 0 } };
    c.applyGroupDragAt.call(ctx, 10, 10);
    expect(ctx.textLabels).toHaveLength(0);
  });

  it('onMouseDown ignores resize handles without a parent text id', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const handle = document.createElement('div');
    handle.setAttribute('data-text-resize', '');
    c.onMouseDown.call(ctx, {
      clientX: 100,
      clientY: 200,
      target: handle,
      ctrlKey: false,
    });
    expect(ctx.resizingTextId).toBeNull();
  });

  it('onTouchEnd double-tap ignores missing labels', () => {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    const c = mountCanvas();
    const ctx = createMerged();
    const wrap = document.createElement('div');
    wrap.setAttribute('data-text-id', 'missing');
    spyElementFromPoint(wrap);
    const first = touch(30, 40, 40);
    c.onTouchStart.call(ctx, touchEv([first], [first]));
    c.onTouchEnd.call(ctx, touchEv([], [first]));
    vi.setSystemTime(10_200);
    const second = touch(30, 42, 41);
    const cm = vi.spyOn(ctx, 'onContextMenu');
    c.onTouchStart.call(ctx, touchEv([second], [second]));
    c.onTouchEnd.call(ctx, touchEv([], [second]));
    expect(cm).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('buildGroupDragOffsets skips missing labels and anchored labels tied to selected cards', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.draggableCards = [mkCard('anchor', 0, 0)];
    ctx.textLabels = [
      { ...mkLabel('floating', null), x: 20, y: 10 },
      { ...mkLabel('anchored', 'anchor'), x: 5, y: 5 },
    ];
    ctx.selectedCardIds = ['anchor'];
    ctx.selectedTextIds = ['floating', 'anchored', 'ghost'];
    const offsets = c.buildGroupDragOffsets.call(ctx, 0, 0);
    expect(offsets.anchor).toEqual({ dx: 0, dy: 0 });
    expect(offsets.floating).toEqual({ dx: 20, dy: 10 });
    expect(offsets.anchored).toBeUndefined();
    expect(offsets.ghost).toBeUndefined();
  });

  it('applyGroupDragAt clears anchors when dragging anchored labels in a group', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.textLabels = [{ ...mkLabel('tl1', 'c1'), x: 10, y: 10 }];
    ctx.groupDragOffsets = { tl1: { dx: 0, dy: 0 } };
    c.applyGroupDragAt.call(ctx, 30, 40);
    expect(ctx.textLabels[0]?.x).toBe(30);
    expect(ctx.textLabels[0]?.y).toBe(40);
    expect(ctx.textLabels[0]?.anchorCardId).toBeNull();
    expect(ctx.textLabels[0]?.anchorPosition).toBeNull();
  });

  it('applyGroupDragAt is a no-op without group drag offsets', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.groupDragOffsets = null;
    ctx.textLabels = [mkLabel('tl1', null)];
    c.applyGroupDragAt.call(ctx, 10, 10);
    expect(ctx.textLabels[0]?.x).toBe(100);
  });

  it('onMouseMove group drag uses text drag start when card drag start is absent', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.textLabels = [{ ...mkLabel('tl1', null), x: 0, y: 0 }];
    ctx.groupDragOffsets = { tl1: { dx: 0, dy: 0 } };
    ctx.textDragStart = { startX: 0, startY: 0, startDropX: 0, startDropY: 0 };
    ctx.dragStart = null;
    c.onMouseMove.call(ctx, { clientX: 40, clientY: 50, target: null });
    expect(ctx.textLabels[0]?.x).toBe(40);
    expect(ctx.textLabels[0]?.y).toBe(50);
  });

  it('onMouseUp commits a grouped text-label drag and refreshes anchored labels', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.draggableCards = [mkCard('card-1', 0, 0)];
    ctx.textLabels = [
      { ...mkLabel('floating', null), x: 10, y: 10 },
      { ...mkLabel('anchored', 'card-1'), x: 1, y: 2 },
    ];
    ctx.draggingTextId = 'floating';
    ctx.textDragStart = { startX: 10, startY: 10, startDropX: 0, startDropY: 0 };
    ctx.groupDragOffsets = {
      'card-1': { dx: 0, dy: 0 },
      floating: { dx: 10, dy: 10 },
    };
    c.onMouseUp.call(ctx, { clientX: 20, clientY: 20, target: null, preventDefault: vi.fn() });
    expect(ctx.groupDragOffsets).toBeNull();
    expect(ctx.draggingTextId).toBeNull();
    expect(ctx.textLabels.find((l) => l.id === 'anchored')?.x).toBe(1);
  });

  it('onMouseUp group card drag updates mixed text offsets', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const el = document.createElement('div');
    el.id = 'card-1';
    ctx.draggableCards = [mkCard('card-1', 0, 0)];
    ctx.textLabels = [{ ...mkLabel('tl1', null), x: 5, y: 5 }];
    ctx.selectedCardIds = ['card-1'];
    ctx.draggingCard = el;
    ctx.dragStart = { startCardX: 0, startCardY: 0, startDropX: 0, startDropY: 0 };
    ctx.groupDragOffsets = {
      'card-1': { dx: 0, dy: 0 },
      tl1: { dx: 5, dy: 5 },
    };
    c.onMouseUp.call(ctx, { clientX: 30, clientY: 0, target: null, preventDefault: vi.fn() });
    expect(ctx.textLabels[0]?.x).toBe(35);
    expect(ctx.textLabels[0]?.y).toBe(5);
  });

  it('onMouseDown resize handle uses default width when fixedWidthPx is zero', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.textLabels = [{ ...mkLabel('tl1', null), fixedWidth: true, fixedWidthPx: 0 }];
    const wrap = document.createElement('div');
    wrap.setAttribute('data-text-id', 'tl1');
    const handle = document.createElement('div');
    handle.setAttribute('data-text-resize', '');
    wrap.append(handle);
    c.onMouseDown.call(ctx, {
      clientX: 100,
      clientY: 200,
      target: handle,
      ctrlKey: false,
    });
    expect(ctx.resizingTextId).toBe('tl1');
    expect(ctx.textResizeStart?.startWidthPx).toBe(240);
  });

  it('handleContextMenuTouchDismiss returns early when menu is closed', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.contextMenu.open = false;
    c.handleContextMenuTouchDismiss.call(ctx, { target: document.body } as TouchEvent);
    expect(ctx.contextMenu.open).toBe(false);
  });

  it('init storage and context-menu listeners run their handlers', async () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    const base = mountCanvas();
    const ctx = createMerged(base);
    vi.spyOn(ctx.viewport!, 'addEventListener').mockImplementation(() => {});
    const dc = document.createElement('div');
    dc.id = 'draggable-container';
    document.body.append(dc);
    vi.spyOn(document, 'querySelector').mockReturnValue(dc);
    const docAddSpy = vi.spyOn(document, 'addEventListener');
    const storageCheckSpy = vi
      .spyOn(ctx, 'runStartupStorageWarningCheck')
      .mockResolvedValue(undefined);

    base.init.call(ctx);

    const touchListener = ctx._contextMenuTouchDismissListener;
    expect(touchListener).toBeTypeOf('function');
    ctx.contextMenu = {
      open: true,
      x: 0,
      y: 0,
      contentX: 0,
      contentY: 0,
      cardId: null,
      textId: null,
    };
    touchListener!.call(ctx, { target: ctx.viewport } as TouchEvent);
    expect(ctx.contextMenu.open).toBe(false);

    const storageListener = ctx._storageWarningStartupListener;
    expect(storageListener).toBeTypeOf('function');
    storageListener!.call(ctx);
    expect(storageCheckSpy).toHaveBeenCalledTimes(1);
    expect(docAddSpy).toHaveBeenCalledWith('touchstart', touchListener, { capture: true });

    vi.unstubAllGlobals();
    dc.remove();
  });

  it('onTouchMove returns when the touch began on an interactive target', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const button = document.createElement('button');
    spyElementFromPoint(button);
    const t0 = touch(20, 10, 10);
    c.onTouchStart.call(ctx, touchEv([t0], [t0]));
    ctx.touchStartPos = { clientX: 10, clientY: 10, target: button };
    ctx.activeTouchId = 20;
    const mm = vi.spyOn(ctx, 'onMouseMove');
    c.onTouchMove.call(ctx, touchEv([touch(20, 12, 12)], [touch(20, 12, 12)]));
    expect(mm).not.toHaveBeenCalled();
  });

  it('onTouchEnd clears lastCanvasTap when text edit mode is active', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const wrap = document.createElement('div');
    wrap.setAttribute('data-text-id', 'tl1');
    ctx.textLabels = [mkLabel('tl1', null)];
    ctx.editingTextId = 'other';
    ctx.touchStartPos = { clientX: 10, clientY: 10, target: wrap };
    ctx.activeTouchId = 21;
    ctx.lastCanvasTap = { tapKey: 'text:tl1', time: Date.now(), x: 1, y: 2 };
    c.onTouchEnd.call(ctx, touchEv([], [touch(21, 10, 10)]));
    expect(ctx.lastCanvasTap).toBeNull();
  });

  it('onTouchEnd skips quick-tap handling when touchStartPos is missing', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    ctx.activeTouchId = 55;
    ctx.touchStartPos = null;
    ctx.touchGestureStarted = false;
    const md = vi.spyOn(ctx, 'onMouseDown');
    const mu = vi.spyOn(ctx, 'onMouseUp');
    c.onTouchEnd.call(ctx, touchEv([], [touch(55, 10, 10)]));
    expect(md).not.toHaveBeenCalled();
    expect(mu).not.toHaveBeenCalled();
    expect(ctx.activeTouchId).toBeNull();
  });

  it('onTouchEnd skips mouse synthesis for interactive quick-tap targets', () => {
    const c = mountCanvas();
    const ctx = createMerged();
    const button = document.createElement('button');
    ctx.touchStartPos = { clientX: 10, clientY: 10, target: button };
    ctx.activeTouchId = 40;
    const md = vi.spyOn(ctx, 'onMouseDown');
    const mu = vi.spyOn(ctx, 'onMouseUp');
    c.onTouchEnd.call(ctx, touchEv([], [touch(40, 10, 10)]));
    expect(md).not.toHaveBeenCalled();
    expect(mu).not.toHaveBeenCalled();
  });
});
