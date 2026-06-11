import { isCanvasOverlayToggleKey } from './canvasOverlayToggleKey.js';
import { getCanvasOverlaysStore } from '../stores/canvasOverlaysStore.js';

/**
 * Returns whether a keyboard shortcut should be ignored for editable focus targets.
 * @param target - Event target from the keyboard event.
 * @returns True when the target is an input, textarea, or contenteditable element.
 */
export function isCanvasShortcutEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable)
  );
}

/**
 * Toggles canvas overlay visibility when the overlay shortcut key is pressed.
 * @param event - Keyboard event from the document or window listener.
 * @returns True when the event matched the overlay toggle shortcut and was handled.
 */
export function handleCanvasOverlayToggleKeydown(event: KeyboardEvent): boolean {
  if (!isCanvasOverlayToggleKey(event)) {
    return false;
  }
  if (isCanvasShortcutEditableTarget(event.target)) {
    return false;
  }
  event.preventDefault();
  if (typeof event.stopImmediatePropagation === 'function') {
    event.stopImmediatePropagation();
  }
  getCanvasOverlaysStore().toggle();
  return true;
}
