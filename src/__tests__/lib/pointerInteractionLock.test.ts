/**
 * @vitest-environment happy-dom
 */

import { afterEach, describe, expect, it } from 'vitest';
import {
  isPointerInteractionLocked,
  lockPointerInteraction,
  resetPointerInteractionLock,
  unlockPointerInteraction,
} from '../../lib/pointerInteractionLock.js';

describe('pointerInteractionLock', () => {
  afterEach(() => {
    resetPointerInteractionLock();
  });

  it('locks and unlocks selectstart and dragstart listeners', () => {
    expect(isPointerInteractionLocked()).toBe(false);
    lockPointerInteraction();
    expect(isPointerInteractionLocked()).toBe(true);

    const selectEvent = new Event('selectstart', { cancelable: true, bubbles: true });
    document.dispatchEvent(selectEvent);
    expect(selectEvent.defaultPrevented).toBe(true);

    unlockPointerInteraction();
    expect(isPointerInteractionLocked()).toBe(false);

    const dragEvent = new Event('dragstart', { cancelable: true, bubbles: true });
    document.dispatchEvent(dragEvent);
    expect(dragEvent.defaultPrevented).toBe(false);
  });

  it('supports nested locks', () => {
    lockPointerInteraction();
    lockPointerInteraction();
    unlockPointerInteraction();
    expect(isPointerInteractionLocked()).toBe(true);
    unlockPointerInteraction();
    expect(isPointerInteractionLocked()).toBe(false);
  });

  it('resetPointerInteractionLock clears an active lock', () => {
    lockPointerInteraction();
    resetPointerInteractionLock();
    expect(isPointerInteractionLocked()).toBe(false);
  });
});
