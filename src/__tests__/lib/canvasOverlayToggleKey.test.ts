import { describe, expect, it } from 'vitest';
import { isCanvasOverlayToggleKey } from '../../lib/canvasOverlayToggleKey.js';

describe('canvasOverlayToggleKey', () => {
  it('matches Ctrl+backquote and Ctrl+tilde via physical key code', () => {
    expect(
      isCanvasOverlayToggleKey({ ctrlKey: true, key: '`', code: 'Backquote' }),
    ).toBe(true);
    expect(
      isCanvasOverlayToggleKey({ ctrlKey: true, key: '~', code: 'Backquote' }),
    ).toBe(true);
    expect(
      isCanvasOverlayToggleKey({ ctrlKey: true, key: 'Dead', code: 'Backquote' }),
    ).toBe(true);
  });

  it('rejects the key without Ctrl or unrelated keys', () => {
    expect(
      isCanvasOverlayToggleKey({ ctrlKey: false, key: '`', code: 'Backquote' }),
    ).toBe(false);
    expect(
      isCanvasOverlayToggleKey({ ctrlKey: true, key: 'k', code: 'KeyK' }),
    ).toBe(false);
  });
});
