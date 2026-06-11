/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import Alpine from 'alpinejs';
import { handleCanvasOverlayToggleKeydown } from '../../lib/canvasOverlayKeyboard.js';
import {
  getCanvasOverlaysStore,
  initCanvasOverlaysStore,
  resetCanvasOverlaysStoreForTests,
} from '../../stores/canvasOverlaysStore.js';

describe('canvasOverlayKeyboard', () => {
  beforeEach(() => {
    window.Alpine = Alpine;
    resetCanvasOverlaysStoreForTests();
    initCanvasOverlaysStore();
  });

  it('handleCanvasOverlayToggleKeydown toggles overlays on Ctrl+Backquote', () => {
    const preventDefault = vi.fn();
    const stopImmediatePropagation = vi.fn();
    const event = {
      ctrlKey: true,
      key: '`',
      code: 'Backquote',
      target: document.body,
      preventDefault,
      stopImmediatePropagation,
    } as unknown as KeyboardEvent;

    expect(handleCanvasOverlayToggleKeydown(event)).toBe(true);
    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(stopImmediatePropagation).toHaveBeenCalledTimes(1);
    expect(getCanvasOverlaysStore().visible).toBe(false);
  });

  it('handleCanvasOverlayToggleKeydown ignores unrelated keys and editable targets', () => {
    const store = getCanvasOverlaysStore();
    const input = document.createElement('input');
    expect(
      handleCanvasOverlayToggleKeydown({
        ctrlKey: true,
        key: 'k',
        code: 'KeyK',
        target: document.body,
        preventDefault: vi.fn(),
        stopImmediatePropagation: vi.fn(),
      } as unknown as KeyboardEvent),
    ).toBe(false);
    expect(store.visible).toBe(true);

    expect(
      handleCanvasOverlayToggleKeydown({
        ctrlKey: true,
        key: '`',
        code: 'Backquote',
        target: input,
        preventDefault: vi.fn(),
        stopImmediatePropagation: vi.fn(),
      } as unknown as KeyboardEvent),
    ).toBe(false);
    expect(store.visible).toBe(true);
  });

  it('document capture listener toggles overlays on keydown', () => {
    const store = getCanvasOverlaysStore();
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        ctrlKey: true,
        key: '~',
        code: 'Backquote',
        bubbles: true,
      }),
    );
    expect(store.visible).toBe(false);
  });
});
