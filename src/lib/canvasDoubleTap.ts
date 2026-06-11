/** Maximum milliseconds between taps to count as a double-tap on the canvas. */
export const CANVAS_DOUBLE_TAP_MS = 300;

/** Maximum pointer movement in pixels between taps for a double-tap. */
export const CANVAS_DOUBLE_TAP_MAX_DISTANCE_PX = 32;

/** Minimum finger movement before a touch is treated as pan instead of tap. */
export const CANVAS_TOUCH_SLOP_PX = 10;

export interface CanvasTapRecord {
  tapKey: string;
  time: number;
  x: number;
  y: number;
}

export interface ContextMenuTapRefs {
  textLabels: readonly { id: string }[];
  draggableCards: readonly { id: string }[];
  viewport: HTMLElement | null;
  content: HTMLElement | null;
  emptyCanvasMessage: HTMLElement | null;
}

/**
 * Returns a stable tap key for context-menu hit targets, or null when outside the canvas.
 * @param target - DOM event target.
 * @param refs - Canvas DOM refs and label/card collections for hit testing.
 * @returns Tap key (`canvas`, `text:id`, `card:id`) or null.
 */
export function getContextMenuTapKey(
  target: EventTarget | null,
  refs: ContextMenuTapRefs,
): string | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const textEl = target.closest('[data-text-id]');
  const textId = textEl?.getAttribute('data-text-id') ?? null;
  if (textId && refs.textLabels.some((l) => l.id === textId)) {
    return `text:${textId}`;
  }

  let el: HTMLElement | null = target;
  while (el && el !== refs.viewport) {
    const id = el.id;
    if (id && refs.draggableCards.some((c) => c.id === id)) {
      return `card:${id}`;
    }
    el = el.parentElement;
  }

  const isOnCanvas =
    target === refs.viewport ||
    target === refs.content ||
    target === refs.emptyCanvasMessage ||
    (refs.emptyCanvasMessage !== null && refs.emptyCanvasMessage.contains(target));
  if (isOnCanvas) {
    return 'canvas';
  }

  return null;
}

/**
 * Returns whether a tap completes a double-tap on the same context-menu target.
 * @param last - Previous tap record, if any.
 * @param tapKey - Tap key for the current tap.
 * @param x - Current tap client X.
 * @param y - Current tap client Y.
 * @param now - Current timestamp in milliseconds.
 * @returns True when the tap matches the prior tap within time and distance limits.
 */
export function isCanvasDoubleTap(
  last: CanvasTapRecord | null,
  tapKey: string,
  x: number,
  y: number,
  now: number,
): boolean {
  if (!last || last.tapKey !== tapKey) {
    return false;
  }
  if (now - last.time > CANVAS_DOUBLE_TAP_MS) {
    return false;
  }
  return Math.hypot(x - last.x, y - last.y) <= CANVAS_DOUBLE_TAP_MAX_DISTANCE_PX;
}

/**
 * Returns whether finger movement exceeds the tap slop (pan vs tap discrimination).
 * @param startX - Touch start client X.
 * @param startY - Touch start client Y.
 * @param x - Current touch client X.
 * @param y - Current touch client Y.
 * @returns True when movement exceeds {@link CANVAS_TOUCH_SLOP_PX}.
 */
export function exceedsCanvasTouchSlop(
  startX: number,
  startY: number,
  x: number,
  y: number,
): boolean {
  return Math.hypot(x - startX, y - startY) > CANVAS_TOUCH_SLOP_PX;
}
