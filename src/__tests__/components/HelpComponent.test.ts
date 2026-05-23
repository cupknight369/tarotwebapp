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

  it('help modal markup includes core section headings', async () => {
    const html = await readFile('src/components/HelpComponent.html', 'utf-8');
    expect(html).toContain('Open Welcome');
    expect(html).toContain('Draw Cards');
    expect(html).toContain('Deck Management');
    expect(html).toContain('Save, Load, and New Reading');
    expect(html).toContain('Settings and Backup');
    expect(html).toContain('Keyboard Shortcuts');
  });

  it('toolbar markup includes Help button dispatching open-help', async () => {
    const html = await readFile('src/components/AuthComponent.html', 'utf-8');
    expect(html).toContain('aria-label="Help"');
    expect(html).toContain('@click="$dispatch(\'open-help\')"');
  });

  it('toolbar markup includes Settings button opening settings store', async () => {
    const html = await readFile('src/components/AuthComponent.html', 'utf-8');
    expect(html).toContain('aria-label="Settings"');
    expect(html).toContain('@click="$store.settings.open = true"');
  });
});
