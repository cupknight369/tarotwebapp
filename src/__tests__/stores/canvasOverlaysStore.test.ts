/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it } from 'vitest';
import Alpine from 'alpinejs';
import {
  getCanvasOverlaysStore,
  initCanvasOverlaysStore,
  resetCanvasOverlaysStoreForTests,
} from '../../stores/canvasOverlaysStore.js';

describe('canvasOverlaysStore', () => {
  beforeEach(() => {
    window.Alpine = Alpine;
    resetCanvasOverlaysStoreForTests();
    initCanvasOverlaysStore();
  });

  it('starts visible and toggles visibility', () => {
    const store = getCanvasOverlaysStore();
    expect(store.visible).toBe(true);
    store.toggle();
    expect(store.visible).toBe(false);
    store.toggle();
    expect(store.visible).toBe(true);
  });
});
