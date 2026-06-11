/**
 * Returns whether a keyboard event is the canvas overlay visibility toggle (Ctrl + ` / ~).
 * @param event - Keyboard event to inspect.
 * @returns True when Ctrl is held and the backquote/tilde key was pressed.
 */
export function isCanvasOverlayToggleKey(
  event: Pick<KeyboardEvent, 'ctrlKey' | 'key' | 'code'>,
): boolean {
  if (!event.ctrlKey) {
    return false;
  }
  if (event.code === 'Backquote') {
    return true;
  }
  return event.key === '`' || event.key === '~';
}
