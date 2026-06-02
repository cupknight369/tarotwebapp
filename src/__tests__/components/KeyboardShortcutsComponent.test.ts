/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';

import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const alpineCapture = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'keyboardShortcutsComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineCapture.Alpine,
}));

import '../../components/KeyboardShortcutsComponent.js';

type KeyboardShortcutsCtx = {
  open: boolean;
  filterQuery: string;
  onOpen: () => void;
  close: () => void;
  filteredShortcuts: () => { keys: string; description: string }[];
  $nextTick: (cb?: () => void) => void;
  $refs: Record<string, HTMLElement>;
};

function mount(): KeyboardShortcutsCtx {
  const f = alpineCapture.getFactory();
  if (!f) {
    throw new Error('keyboardShortcutsComponent factory not registered');
  }
  const ctx = f() as KeyboardShortcutsCtx;
  ctx.$nextTick = (cb) => {
    cb?.();
  };
  ctx.$refs = {};
  return ctx;
}

describe('keyboardShortcutsComponent (KeyboardShortcutsComponent.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(alpineCapture.rawStores)) {
      delete alpineCapture.rawStores[k];
    }
  });

  it('starts closed by default', () => {
    const ctx = mount();
    expect(ctx.open).toBe(false);
    expect(ctx.filterQuery).toBe('');
  });

  it('onOpen sets open=true, clears filter, and focuses filter input', () => {
    const ctx = mount();
    const input = document.createElement('input');
    const focusSpy = vi.spyOn(input, 'focus');
    ctx.$refs.filterInput = input;
    ctx.filterQuery = 'old';
    ctx.onOpen.call(ctx);
    expect(ctx.open).toBe(true);
    expect(ctx.filterQuery).toBe('');
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it('close sets open=false and clears filter', () => {
    const ctx = mount();
    ctx.open = true;
    ctx.filterQuery = 'save';
    ctx.close.call(ctx);
    expect(ctx.open).toBe(false);
    expect(ctx.filterQuery).toBe('');
  });

  it('filteredShortcuts returns matching entries', () => {
    const ctx = mount();
    ctx.filterQuery = 'deck';
    const results = ctx.filteredShortcuts.call(ctx);
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (entry) =>
          entry.keys.toLowerCase().includes('deck') ||
          entry.description.toLowerCase().includes('deck'),
      ),
    ).toBe(true);
  });

  it('modal markup includes filter input and table headers', async () => {
    const html = await readFile('src/components/KeyboardShortcutsComponent.html', 'utf-8');
    expect(html).toContain('keyboardShortcutsComponent');
    expect(html).toContain('@open-keyboard-shortcuts.window="onOpen()"');
    expect(html).toContain('id="keyboard-shortcuts-filter"');
    expect(html).toContain('x-model="filterQuery"');
    expect(html).toContain('Shortcut');
    expect(html).toContain('Action');
  });
});
