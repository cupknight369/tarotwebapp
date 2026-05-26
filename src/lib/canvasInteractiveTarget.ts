/** Selectors for canvas controls that should receive native pointer/touch events. */
const CANVAS_INTERACTIVE_SELECTOR =
  'button, input, label, select, textarea, [contenteditable], a';

/**
 * Returns whether the event target is an interactive canvas control (e.g. text edit toolbar).
 * @param target - DOM event target.
 * @returns True when native clicks/touches should not be intercepted by canvas gestures.
 */
export function isCanvasInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest(CANVAS_INTERACTIVE_SELECTOR) !== null;
}

/**
 * Returns whether the target is inside the text label edit panel.
 * @param target - DOM event target.
 * @returns True when the target is within `[data-text-edit-panel]`.
 */
export function isWithinTextEditPanel(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }
  return target.closest('[data-text-edit-panel]') !== null;
}
