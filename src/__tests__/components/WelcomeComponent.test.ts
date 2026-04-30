/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';

import { WELCOME_DISMISSED_KEY } from '../../components/WelcomeComponent.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const alpineCapture = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'welcomeComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineCapture.Alpine,
}));

import '../../components/WelcomeComponent.js';

type WelcomeCtx = {
  open: boolean;
  openIfFirstTime: () => void;
  onOpen: () => void;
  close: () => void;
};

function mount(): WelcomeCtx {
  const f = alpineCapture.getFactory();
  if (!f) {
    throw new Error('welcomeComponent factory not registered');
  }
  return f() as WelcomeCtx;
}

describe('welcomeComponent (WelcomeComponent.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    for (const k of Object.keys(alpineCapture.rawStores)) {
      delete alpineCapture.rawStores[k];
    }
  });

  it('openIfFirstTime opens modal when marker is absent', () => {
    const ctx = mount();
    ctx.openIfFirstTime.call(ctx);
    expect(ctx.open).toBe(true);
  });

  it('openIfFirstTime keeps modal closed when dismissed marker is present', () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    const ctx = mount();
    ctx.openIfFirstTime.call(ctx);
    expect(ctx.open).toBe(false);
  });

  it('close closes modal and persists dismissed marker', () => {
    const ctx = mount();
    ctx.open = true;
    ctx.close.call(ctx);
    expect(ctx.open).toBe(false);
    expect(localStorage.getItem(WELCOME_DISMISSED_KEY)).toBe('true');
  });

  it('onOpen opens modal regardless of marker', () => {
    localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
    const ctx = mount();
    ctx.onOpen.call(ctx);
    expect(ctx.open).toBe(true);
  });

  it('welcome markup includes exact purpose text and quick notes', async () => {
    const html = await readFile('src/components/WelcomeComponent.html', 'utf-8');
    expect(html).toContain('This tarot application is intended to act as a journal.');
    expect(html).toContain('You could even use this application to mirror a real-life reading');
    expect(html).toContain('All information is saved on your device locally.');
    expect(html).toContain('The only reason you would need an account');
    expect(html).toContain('Quick Notes');
    expect(html).toContain('IndexedDB storage');
    expect(html).toContain('Open `?` Help for concise feature guidance.');
  });
});
