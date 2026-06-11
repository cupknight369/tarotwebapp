import Alpine from 'alpinejs';
import { handleCanvasOverlayToggleKeydown } from '../lib/canvasOverlayKeyboard.js';
import type { CanvasOverlaysStoreState } from '../types/canvasOverlays.js';

let overlayToggleListenerRegistered = false;

/** Registers the canvas overlay visibility Alpine store. */
export function initCanvasOverlaysStore(): void {
  Alpine.store('canvasOverlays', {
    visible: true,
    toggle(this: CanvasOverlaysStoreState) {
      this.visible = !this.visible;
    },
  } satisfies CanvasOverlaysStoreState);

  if (!overlayToggleListenerRegistered) {
    document.addEventListener('keydown', handleCanvasOverlayToggleKeydown, true);
    overlayToggleListenerRegistered = true;
  }
}

/** Returns the canvas overlays store for tests and non-Alpine callers. */
export function getCanvasOverlaysStore(): CanvasOverlaysStoreState {
  return Alpine.store('canvasOverlays') as CanvasOverlaysStoreState;
}

/** @internal Resets the document listener guard for unit tests. */
export function resetCanvasOverlaysStoreForTests(): void {
  overlayToggleListenerRegistered = false;
}
