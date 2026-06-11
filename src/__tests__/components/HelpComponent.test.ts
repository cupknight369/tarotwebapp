/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';

import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const alpineCapture = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'helpComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineCapture.Alpine,
}));

import '../../components/HelpComponent.js';

type HelpCtx = {
  open: boolean;
  onOpen: () => void;
  close: () => void;
  openWelcomeInfo: () => void;
  openKeyboardShortcuts: () => void;
};

function mount(): HelpCtx {
  const f = alpineCapture.getFactory();
  if (!f) {
    throw new Error('helpComponent factory not registered');
  }
  return f() as HelpCtx;
}

describe('helpComponent (HelpComponent.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(alpineCapture.rawStores)) {
      delete alpineCapture.rawStores[k];
    }
  });

  it('starts closed by default', () => {
    const ctx = mount();
    expect(ctx.open).toBe(false);
  });

  it('onOpen sets open=true', () => {
    const ctx = mount();
    ctx.open = false;
    ctx.onOpen.call(ctx);
    expect(ctx.open).toBe(true);
  });

  it('close sets open=false', () => {
    const ctx = mount();
    ctx.open = true;
    ctx.close.call(ctx);
    expect(ctx.open).toBe(false);
  });

  it('openWelcomeInfo closes help and dispatches open-welcome', () => {
    const ctx = mount();
    ctx.open = true;
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    ctx.openWelcomeInfo.call(ctx);
    expect(ctx.open).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-welcome' }));
  });

  it('openKeyboardShortcuts closes help and dispatches open-keyboard-shortcuts', () => {
    const ctx = mount() as HelpCtx & { openKeyboardShortcuts: () => void };
    ctx.open = true;
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    ctx.openKeyboardShortcuts.call(ctx);
    expect(ctx.open).toBe(false);
    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'open-keyboard-shortcuts' }),
    );
  });

  it('help modal markup includes core section headings', async () => {
    const html = await readFile('src/components/HelpComponent.html', 'utf-8');
    expect(html).toContain('Questions or Bug Reports?');
    expect(html).toContain('cupknight369@gmail.com');
    expect(html).toContain('Open Welcome');
    expect(html).toContain('Draw Cards');
    expect(html).toContain('Deck Management');
    expect(html).toContain('Save, Load, and New Reading');
    expect(html).toContain('Settings and Backup');
    expect(html).toContain('Keyboard Shortcuts');
    expect(html).toContain('openKeyboardShortcuts()');
    expect(html).toContain('Alt+K');
  });

  it('toolbar markup includes Help button dispatching open-help', async () => {
    const html = await readFile('src/components/AuthComponent.html', 'utf-8');
    expect(html).toContain('aria-label="Help"');
    expect(html).toContain('@click="$dispatch(\'open-help\')"');
    expect(html).toContain('Shortcuts: ALT + k');
    expect(html).toContain('max-w-[calc(50%-0.5rem)]');
    expect(html).toContain('flex-wrap');
    expect(html).toContain('max-[36rem]:justify-end');
    expect(html).toMatch(/order-4 max-\[36rem\]:order-1[\s\S]*?Shortcuts: ALT \+ k/);
    expect(html).toContain('$store.canvasOverlays.visible');
  });

  it('toolbar markup includes Settings button opening settings store', async () => {
    const html = await readFile('src/components/AuthComponent.html', 'utf-8');
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('@click="$store.settings.open = true"');
  });
});
