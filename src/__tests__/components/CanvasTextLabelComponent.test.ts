/**
 * @vitest-environment happy-dom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  DraggableCard,
  TarotCard,
  TextLabel,
  TextLabelAnchorPosition,
} from '../../types/canvas.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const alpineStub = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'textLabelComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineStub.Alpine,
}));

import '../../components/CanvasTextLabelComponent.js';

const tarot = (id: string): TarotCard => ({
  id,
  deckId: 'd',
  title: 'T',
  num: 1,
  img: 'x.webp',
});

function card(dcId: string, x: number, y: number): DraggableCard {
  return {
    card: tarot('c'),
    id: dcId,
    x,
    y,
    rotation: 0,
    zIndex: 1,
    opacity: 1,
    cursor: 'grab',
    display: 'block',
  };
}

function label(overrides: Partial<TextLabel> = {}): TextLabel {
  return {
    id: 'lbl-1',
    text: 'hi',
    x: 5,
    y: 6,
    fontSize: 16,
    fontWeight: 400,
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#e5e7eb',
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

type TextLabelCtx = {
  textLabels: TextLabel[];
  maxTextZIndex: number;
  draggingTextId: string | null;
  textDragStart: unknown;
  editingTextId: string | null;
  pendingAnchor: unknown;
  TEXT_ANCHOR_GAP: number;
  TEXT_LABEL_DEFAULT_HEIGHT: number;
  generateTextId: () => string;
  addTextAt: (screenX: number, screenY: number) => void;
  addTextLabelWithTextAt: (screenX: number, screenY: number, text: string) => void;
  getTextLabelPosition: (l: TextLabel) => { x: number; y: number };
  getTextLabelBounds: (l: TextLabel) => {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  getTextLabelStyle: (l: TextLabel) => string;
  updateTextLabel: (id: string, p: Partial<TextLabel>) => void;
  deleteTextLabel: (id: string) => void;
  setTextLabelAnchor: (textId: string, cardId: string, position: TextLabelAnchorPosition) => void;
  cancelPendingAnchor: () => void;
  commitEditTextLabel: () => void;
  setTextLabelFixedWidthToggle: (id: string, enabled: boolean) => void;
  $nextTick: (cb?: () => void) => void;
  screenToContent: (sx: number, sy: number) => { x: number; y: number };
  draggableCards: DraggableCard[];
  dirty: boolean;
  CARD_WIDTH: number;
  CARD_HEIGHT: number;
};

function mount(overrides: Partial<TextLabelCtx> = {}): TextLabelCtx {
  const f = alpineStub.getFactory();
  if (!f) {
    throw new Error('textLabelComponent factory not registered');
  }
  const base = f() as Omit<
    TextLabelCtx,
    'screenToContent' | 'draggableCards' | 'dirty' | 'CARD_WIDTH' | 'CARD_HEIGHT'
  >;
  return {
    ...base,
    $nextTick: (cb?: () => void) => {
      cb?.();
    },
    screenToContent: (sx, sy) => ({ x: sx + 1, y: sy + 2 }),
    draggableCards: [],
    dirty: false,
    CARD_WIDTH: 200,
    CARD_HEIGHT: 280,
    ...overrides,
  };
}

describe('textLabelComponent (CanvasTextLabelComponent.ts)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('generateTextId returns a text- prefixed id', () => {
    const ctx = mount();
    expect(ctx.generateTextId.call(ctx)).toMatch(/^text-\d+-[a-z0-9]+$/);
  });

  it('addTextAt maps screen to content, appends label, bumps z-index and dirty', () => {
    const ctx = mount({ maxTextZIndex: 3, textLabels: [] });
    ctx.addTextAt.call(ctx, 100, 200);
    expect(ctx.textLabels).toHaveLength(1);
    expect(ctx.editingTextId).toBe(ctx.textLabels[0]?.id ?? null);
    expect(ctx.textLabels[0]?.x).toBe(101);
    expect(ctx.textLabels[0]?.y).toBe(202);
    expect(ctx.textLabels[0]?.text).toBe('Edit Text');
    expect(ctx.textLabels[0]?.zIndex).toBe(4);
    expect(ctx.maxTextZIndex).toBe(4);
    expect(ctx.dirty).toBe(true);
  });

  it('addTextLabelWithTextAt places label with given text, enters edit mode, dirty/z-index', () => {
    const ctx = mount({ maxTextZIndex: 2, textLabels: [] });
    ctx.addTextLabelWithTextAt.call(ctx, 50, 60, '42');
    expect(ctx.textLabels).toHaveLength(1);
    expect(ctx.textLabels[0]?.text).toBe('42');
    expect(ctx.textLabels[0]?.x).toBe(51);
    expect(ctx.textLabels[0]?.y).toBe(62);
    expect(ctx.textLabels[0]?.zIndex).toBe(3);
    expect(ctx.maxTextZIndex).toBe(3);
    expect(ctx.editingTextId).toBe(ctx.textLabels[0]?.id ?? null);
    expect(ctx.dirty).toBe(true);
  });

  it('addTextLabelWithTextAt ignores invalid text', () => {
    const ctx = mount({ maxTextZIndex: 2, textLabels: [] });
    const longText = 'x'.repeat(10001);
    ctx.addTextLabelWithTextAt.call(ctx, 0, 0, longText);
    expect(ctx.textLabels).toHaveLength(0);
    expect(ctx.dirty).toBe(false);
  });

  it('getTextLabelPosition returns label coordinates when unanchored', () => {
    const ctx = mount();
    const l = label({ x: 9, y: 11, anchorCardId: null, anchorPosition: null });
    expect(ctx.getTextLabelPosition.call(ctx, l)).toEqual({ x: 9, y: 11 });
  });

  it('getTextLabelBounds uses default width for auto-sized labels', () => {
    const ctx = mount();
    const l = label({ x: 9, y: 11, anchorCardId: null, anchorPosition: null });
    expect(ctx.getTextLabelBounds.call(ctx, l)).toEqual({
      left: 9,
      top: 11,
      width: 100,
      height: 24,
    });
  });

  it('getTextLabelBounds uses fixed width when enabled', () => {
    const ctx = mount();
    const l = label({ x: 0, y: 0, fixedWidth: true, fixedWidthPx: 180 });
    expect(ctx.getTextLabelBounds.call(ctx, l)).toEqual({
      left: 0,
      top: 0,
      width: 180,
      height: 24,
    });
  });

  it('getTextLabelPosition returns label coordinates when anchor position missing', () => {
    const ctx = mount({ draggableCards: [card('c1', 0, 0)] });
    const l = label({ anchorCardId: 'c1', anchorPosition: null });
    expect(ctx.getTextLabelPosition.call(ctx, l)).toEqual({ x: l.x, y: l.y });
  });

  it('getTextLabelPosition returns label coordinates when anchor card missing', () => {
    const ctx = mount({ draggableCards: [] });
    const l = label({ anchorCardId: 'missing', anchorPosition: 'above' });
    expect(ctx.getTextLabelPosition.call(ctx, l)).toEqual({ x: l.x, y: l.y });
  });

  it.each([
    ['above', { x: 100, y: 100 - 10 - 24 }],
    ['below', { x: 100, y: 100 + 280 + 10 + 24 }],
    ['left', { x: 100 - 10, y: 100 }],
    ['right', { x: 100 + 200 + 10, y: 100 }],
  ] as const)('getTextLabelPosition places label %s relative to card', (pos, expected) => {
    const ctx = mount({ draggableCards: [card('c1', 100, 100)] });
    const l = label({ anchorCardId: 'c1', anchorPosition: pos });
    expect(ctx.getTextLabelPosition.call(ctx, l)).toEqual(expected);
  });

  it('getTextLabelPosition falls through default for unknown anchor at runtime', () => {
    const ctx = mount({ draggableCards: [card('c1', 50, 60)] });
    const l = label({
      x: 1,
      y: 2,
      anchorCardId: 'c1',
      anchorPosition: 'above',
    });
    (l as { anchorPosition: string }).anchorPosition = 'diagonal';
    expect(ctx.getTextLabelPosition.call(ctx, l)).toEqual({ x: 1, y: 2 });
  });

  it('getTextLabelStyle includes base layout for a simple label', () => {
    const ctx = mount();
    const l = label({ id: 'a', fontSize: 14, color: '#ff0000' });
    const s = ctx.getTextLabelStyle.call(ctx, l);
    expect(s).toContain('left: 5px');
    expect(s).toContain('top: 6px');
    expect(s).toContain('font-size: 14px');
    expect(s).toContain('color: #ff0000');
    expect(s).not.toContain('writing-mode');
  });

  it('getTextLabelStyle adds vertical layout and rotation for left anchor when not editing', () => {
    const ctx = mount({
      draggableCards: [card('c1', 0, 0)],
      editingTextId: null,
    });
    const l = label({ id: 'L', anchorCardId: 'c1', anchorPosition: 'left' });
    const s = ctx.getTextLabelStyle.call(ctx, l);
    expect(s).toContain('writing-mode: vertical-lr');
    expect(s).toContain('min-height: 280px');
    expect(s).toContain('translateY(110%) rotate(180deg)');
  });

  it('getTextLabelStyle adds vertical layout without rotation for right anchor when not editing', () => {
    const ctx = mount({
      draggableCards: [card('c1', 0, 0)],
      editingTextId: null,
    });
    const l = label({ id: 'R', anchorCardId: 'c1', anchorPosition: 'right' });
    const s = ctx.getTextLabelStyle.call(ctx, l);
    expect(s).toContain('writing-mode: vertical-lr');
    expect(s).not.toContain('rotate(180deg)');
  });

  it('getTextLabelStyle omits vertical extras while editing that label', () => {
    const ctx = mount({
      draggableCards: [card('c1', 0, 0)],
      editingTextId: 'L',
    });
    const l = label({ id: 'L', anchorCardId: 'c1', anchorPosition: 'left' });
    const s = ctx.getTextLabelStyle.call(ctx, l);
    expect(s).not.toContain('writing-mode');
  });

  it('updateTextLabel is a no-op when id is missing', () => {
    const ctx = mount({ textLabels: [label({ id: 'only' })], dirty: false });
    ctx.updateTextLabel.call(ctx, 'nope', { text: 'x' });
    expect(ctx.textLabels[0]?.text).toBe('hi');
    expect(ctx.dirty).toBe(false);
  });

  it('updateTextLabel clamps font size and accepts valid color and text', () => {
    const ctx = mount({ textLabels: [label({ id: 'a' })], dirty: false });
    ctx.updateTextLabel.call(ctx, 'a', {
      fontSize: 600,
      color: '#abc',
      text: 'ok',
    });
    expect(ctx.textLabels[0]?.fontSize).toBe(555);
    expect(ctx.textLabels[0]?.color).toBe('#abc');
    expect(ctx.textLabels[0]?.text).toBe('ok');
    expect(ctx.dirty).toBe(true);
  });

  it('updateTextLabel uses 16 for non-finite font size', () => {
    const ctx = mount({ textLabels: [label({ id: 'a', fontSize: 20 })] });
    ctx.updateTextLabel.call(ctx, 'a', { fontSize: Number.NaN });
    expect(ctx.textLabels[0]?.fontSize).toBe(16);
  });

  it('updateTextLabel ignores invalid hex color', () => {
    const ctx = mount({ textLabels: [label({ id: 'a', color: '#e5e7eb' })] });
    ctx.updateTextLabel.call(ctx, 'a', { color: 'red' });
    expect(ctx.textLabels[0]?.color).toBe('#e5e7eb');
  });

  it('updateTextLabel ignores text over max length', () => {
    const ctx = mount({ textLabels: [label({ id: 'a' })] });
    const tooLong = 'x'.repeat(10001);
    ctx.updateTextLabel.call(ctx, 'a', { text: tooLong });
    expect(ctx.textLabels[0]?.text).toBe('hi');
  });

  it('updateTextLabel merges arbitrary props', () => {
    const ctx = mount({ textLabels: [label({ id: 'a' })] });
    ctx.updateTextLabel.call(ctx, 'a', { fontWeight: 700, x: 99 });
    expect(ctx.textLabels[0]?.fontWeight).toBe(700);
    expect(ctx.textLabels[0]?.x).toBe(99);
  });

  it('deleteTextLabel removes label and marks dirty', () => {
    const ctx = mount({
      textLabels: [label({ id: 'a' }), label({ id: 'b' })],
      dirty: false,
    });
    ctx.deleteTextLabel.call(ctx, 'a');
    expect(ctx.textLabels.map((t) => t.id)).toEqual(['b']);
    expect(ctx.dirty).toBe(true);
  });

  it('setTextLabelAnchor snaps x/y from computed anchor position', () => {
    const ctx = mount({
      textLabels: [label({ id: 't1', x: 0, y: 0 })],
      draggableCards: [card('c1', 100, 100)],
      dirty: false,
    });
    ctx.setTextLabelAnchor.call(ctx, 't1', 'c1', 'above');
    expect(ctx.textLabels[0]?.anchorCardId).toBe('c1');
    expect(ctx.textLabels[0]?.anchorPosition).toBe('above');
    expect(ctx.textLabels[0]?.x).toBe(100);
    expect(ctx.textLabels[0]?.y).toBe(100 - 10 - 24);
    expect(ctx.dirty).toBe(true);
  });

  it('cancelPendingAnchor clears pendingAnchor', () => {
    const ctx = mount({
      pendingAnchor: { textId: 't', cardId: 'c', screenX: 1, screenY: 2 },
    });
    ctx.cancelPendingAnchor.call(ctx);
    expect(ctx.pendingAnchor).toBeNull();
  });

  it('handleEditFontSizeKeydown steps font size and updates the label', () => {
    const ctx = mount({ textLabels: [label({ id: 'a', fontSize: 16 })] });
    ctx.editFontSizeInput = '16';
    ctx.handleEditFontSizeKeydown.call(ctx, 'a', {
      key: 'ArrowUp',
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent);
    expect(ctx.editFontSizeInput).toBe('17');
    expect(ctx.textLabels[0]?.fontSize).toBe(17);
  });

  it('commitEditTextLabel clears editingTextId', () => {
    const ctx = mount({ editingTextId: 'edit-me' });
    ctx.commitEditTextLabel.call(ctx);
    expect(ctx.editingTextId).toBeNull();
  });

  it('getTextLabelStyle includes fixed width when fixedWidth is true', () => {
    const ctx = mount();
    const l = label({ fixedWidth: true, fixedWidthPx: 220 });
    const s = ctx.getTextLabelStyle.call(ctx, l);
    expect(s).toContain('box-sizing: border-box');
    expect(s).toContain('width: 220px');
  });

  it('updateTextLabel clamps fixedWidthPx', () => {
    const ctx = mount({ textLabels: [label({ id: 'a', fixedWidthPx: 100 })] });
    ctx.updateTextLabel.call(ctx, 'a', { fixedWidthPx: 5000 });
    expect(ctx.textLabels[0]?.fixedWidthPx).toBe(1200);
    ctx.updateTextLabel.call(ctx, 'a', { fixedWidthPx: 3 });
    expect(ctx.textLabels[0]?.fixedWidthPx).toBe(40);
    ctx.updateTextLabel.call(ctx, 'a', { fixedWidthPx: Number.NaN });
    expect(ctx.textLabels[0]?.fixedWidthPx).toBe(240);
  });

  it('setTextLabelFixedWidthToggle turns fixed width off without clearing stored px', () => {
    const ctx = mount({
      textLabels: [label({ id: 'a', fixedWidth: true, fixedWidthPx: 300 })],
    });
    ctx.setTextLabelFixedWidthToggle.call(ctx, 'a', false);
    expect(ctx.textLabels[0]?.fixedWidth).toBe(false);
    expect(ctx.textLabels[0]?.fixedWidthPx).toBe(300);
  });

  it('setTextLabelFixedWidthToggle reuses stored width when enabling', () => {
    const ctx = mount({
      textLabels: [label({ id: 'a', fixedWidth: false, fixedWidthPx: 180 })],
    });
    ctx.setTextLabelFixedWidthToggle.call(ctx, 'a', true);
    expect(ctx.textLabels[0]?.fixedWidth).toBe(true);
    expect(ctx.textLabels[0]?.fixedWidthPx).toBe(180);
  });

  it('setTextLabelFixedWidthToggle measures layout when enabling without stored width', () => {
    const ctx = mount({
      textLabels: [label({ id: 'a', fixedWidth: false, fixedWidthPx: 0 })],
    });
    vi.spyOn(document, 'querySelector').mockReturnValue({ offsetWidth: 92 } as HTMLElement);
    ctx.setTextLabelFixedWidthToggle.call(ctx, 'a', true);
    expect(ctx.textLabels[0]?.fixedWidth).toBe(true);
    expect(ctx.textLabels[0]?.fixedWidthPx).toBe(92);
  });
});
