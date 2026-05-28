/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from 'vitest';
import {
  getTextLabelIdFromTarget,
  isTextDoubleTap,
  TEXT_DOUBLE_TAP_MAX_DISTANCE_PX,
  TEXT_DOUBLE_TAP_MS,
} from '../../lib/canvasTextDoubleTap.js';

describe('canvasTextDoubleTap', () => {
  it('getTextLabelIdFromTarget reads data-text-id from ancestors', () => {
    const wrap = document.createElement('div');
    wrap.setAttribute('data-text-id', 'label-a');
    const span = document.createElement('span');
    wrap.append(span);
    expect(getTextLabelIdFromTarget(span)).toBe('label-a');
    expect(getTextLabelIdFromTarget(document.createElement('div'))).toBeNull();
  });

  it('isTextDoubleTap matches same label within time and distance', () => {
    const now = 1_000;
    const last = { textId: 'a', time: now - 100, x: 10, y: 20 };
    expect(isTextDoubleTap(last, 'a', 12, 22, now)).toBe(true);
    expect(isTextDoubleTap(last, 'b', 12, 22, now)).toBe(false);
    expect(isTextDoubleTap(last, 'a', 12, 22, now + TEXT_DOUBLE_TAP_MS + 1)).toBe(false);
    expect(isTextDoubleTap(last, 'a', 10 + TEXT_DOUBLE_TAP_MAX_DISTANCE_PX + 1, 20, now)).toBe(
      false,
    );
  });
});
