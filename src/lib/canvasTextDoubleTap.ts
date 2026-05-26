/** Maximum milliseconds between taps to count as a double-tap on a text label. */
export const TEXT_DOUBLE_TAP_MS = 300;

/** Maximum pointer movement in pixels between taps for a double-tap. */
export const TEXT_DOUBLE_TAP_MAX_DISTANCE_PX = 32;

export interface TextLabelTapRecord {
  textId: string;
  time: number;
  x: number;
  y: number;
}

/**
 * Returns the text label id for a DOM target inside a `[data-text-id]` element.
 * @param target - DOM event target.
 * @returns Text label id or null when not on a label.
 */
export function getTextLabelIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null;
  }
  const textEl = target.closest('[data-text-id]');
  return textEl?.getAttribute('data-text-id') ?? null;
}

/**
 * Returns whether a tap completes a double-tap on the same text label.
 * @param last - Previous tap record, if any.
 * @param textId - Text label id for the current tap.
 * @param x - Current tap client X.
 * @param y - Current tap client Y.
 * @param now - Current timestamp in milliseconds.
 * @returns True when the tap matches the prior tap within time and distance limits.
 */
export function isTextDoubleTap(
  last: TextLabelTapRecord | null,
  textId: string,
  x: number,
  y: number,
  now: number,
): boolean {
  if (!last || last.textId !== textId) {
    return false;
  }
  if (now - last.time > TEXT_DOUBLE_TAP_MS) {
    return false;
  }
  return Math.hypot(x - last.x, y - last.y) <= TEXT_DOUBLE_TAP_MAX_DISTANCE_PX;
}
