/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from 'vitest';
import {
  CANVAS_DOUBLE_TAP_MAX_DISTANCE_PX,
  CANVAS_DOUBLE_TAP_MS,
  CANVAS_TOUCH_SLOP_PX,
  exceedsCanvasTouchSlop,
  getContextMenuTapKey,
  isCanvasDoubleTap,
} from '../../lib/canvasDoubleTap.js';

function mkRefs(overrides: Partial<Parameters<typeof getContextMenuTapKey>[1]> = {}) {
  const viewport = document.createElement('div');
  const content = document.createElement('div');
  const emptyCanvasMessage = document.createElement('div');
  return {
    viewport,
    content,
    emptyCanvasMessage,
    textLabels: [{ id: 't1' }],
    draggableCards: [{ id: 'c1' }],
    ...overrides,
  };
}

describe('canvasDoubleTap', () => {
  it('getContextMenuTapKey returns text key for valid label targets', () => {
    const refs = mkRefs();
    const wrap = document.createElement('div');
    wrap.setAttribute('data-text-id', 't1');
    const span = document.createElement('span');
    wrap.append(span);
    expect(getContextMenuTapKey(span, refs)).toBe('text:t1');
    expect(getContextMenuTapKey(document.createElement('div'), refs)).toBeNull();
  });

  it('getContextMenuTapKey ignores unknown text ids', () => {
    const refs = mkRefs();
    const wrap = document.createElement('div');
    wrap.setAttribute('data-text-id', 'missing');
    expect(getContextMenuTapKey(wrap, refs)).toBeNull();
  });

  it('getContextMenuTapKey returns card key for card descendants', () => {
    const refs = mkRefs();
    const card = document.createElement('div');
    card.id = 'c1';
    const img = document.createElement('img');
    card.append(img);
    refs.viewport!.append(card);
    expect(getContextMenuTapKey(img, refs)).toBe('card:c1');
  });

  it('getContextMenuTapKey returns canvas for viewport, content, and empty message', () => {
    const refs = mkRefs();
    expect(getContextMenuTapKey(refs.viewport, refs)).toBe('canvas');
    expect(getContextMenuTapKey(refs.content, refs)).toBe('canvas');
    expect(getContextMenuTapKey(refs.emptyCanvasMessage, refs)).toBe('canvas');
    const child = document.createElement('p');
    refs.emptyCanvasMessage!.append(child);
    expect(getContextMenuTapKey(child, refs)).toBe('canvas');
  });

  it('getContextMenuTapKey returns null for non-element and outside targets', () => {
    const refs = mkRefs();
    expect(getContextMenuTapKey(null, refs)).toBeNull();
    expect(getContextMenuTapKey(document.createElement('div'), refs)).toBeNull();
  });

  it('isCanvasDoubleTap matches same tap key within time and distance', () => {
    const now = 1_000;
    const last = { tapKey: 'canvas', time: now - 100, x: 10, y: 20 };
    expect(isCanvasDoubleTap(last, 'canvas', 12, 22, now)).toBe(true);
    expect(isCanvasDoubleTap(last, 'card:c1', 12, 22, now)).toBe(false);
    expect(isCanvasDoubleTap(last, 'canvas', 12, 22, now + CANVAS_DOUBLE_TAP_MS + 1)).toBe(false);
    expect(
      isCanvasDoubleTap(last, 'canvas', 10 + CANVAS_DOUBLE_TAP_MAX_DISTANCE_PX + 1, 20, now),
    ).toBe(false);
  });

  it('exceedsCanvasTouchSlop ignores movement within slop and detects pan-sized movement', () => {
    expect(exceedsCanvasTouchSlop(0, 0, CANVAS_TOUCH_SLOP_PX, 0)).toBe(false);
    expect(exceedsCanvasTouchSlop(0, 0, CANVAS_TOUCH_SLOP_PX + 1, 0)).toBe(true);
  });
});
