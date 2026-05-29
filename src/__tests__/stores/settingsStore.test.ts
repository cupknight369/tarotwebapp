import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const alpineStores = vi.hoisted(() => new Map<string, unknown>());
const alpineEffect = vi.hoisted(() =>
  vi.fn((fn: () => void) => {
    fn();
  }),
);

const lsState = vi.hoisted(() => ({ data: {} as Record<string, string> }));
const getItemMock = vi.hoisted(() =>
  vi.fn((key: string) =>
    Object.prototype.hasOwnProperty.call(lsState.data, key) ? lsState.data[key] : null,
  ),
);
const setItemMock = vi.hoisted(() =>
  vi.fn((key: string, value: string) => {
    lsState.data[key] = value;
  }),
);

vi.mock('alpinejs', () => ({
  default: {
    store(name: string, value?: unknown) {
      if (arguments.length >= 2) {
        alpineStores.set(name, value);
        return;
      }
      return alpineStores.get(name);
    },
    effect: alpineEffect,
  },
}));

import { initSettingsStore } from '../../stores/settingsStore.js';
import type { SettingsStoreState } from '../../types/settings.js';

const STORAGE_KEY = 'app-settings';

describe('settingsStore.ts', () => {
  beforeAll(() => {
    vi.stubGlobal('localStorage', {
      getItem: getItemMock,
      setItem: setItemMock,
      removeItem: vi.fn((key: string) => {
        delete lsState.data[key];
      }),
      clear: vi.fn(() => {
        lsState.data = {};
      }),
    });
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    lsState.data = {};
    alpineStores.clear();
    getItemMock.mockClear();
    setItemMock.mockClear();
    alpineEffect.mockClear();
  });

  function getSettings(): SettingsStoreState {
    const s = alpineStores.get('settings');
    expect(s).toBeDefined();
    return s as SettingsStoreState;
  }

  it('registers defaults when localStorage is empty', () => {
    initSettingsStore();

    expect(alpineEffect).toHaveBeenCalledTimes(1);
    const settings = getSettings();
    expect(settings).toEqual({
      open: false,
      censored: false,
      reversals: false,
      showDeckTitleOnCanvas: true,
      showCorrespondenceThumbnailsOnCanvas: false,
      showCorrespondenceCountBarOnCanvas: true,
      showCardCountBarOnCanvas: true,
      canvasZoomSensitivity: 100,
    });
    expect(setItemMock).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({
        censored: false,
        reversals: false,
        showDeckTitleOnCanvas: true,
        showCorrespondenceThumbnailsOnCanvas: false,
        showCorrespondenceCountBarOnCanvas: true,
        showCardCountBarOnCanvas: true,
        canvasZoomSensitivity: 100,
      }),
    );
  });

  it('treats missing key as empty and uses defaults', () => {
    lsState.data[STORAGE_KEY] = '';
    initSettingsStore();
    expect(getSettings()).toEqual({
      open: false,
      censored: false,
      reversals: false,
      showDeckTitleOnCanvas: true,
      showCorrespondenceThumbnailsOnCanvas: false,
      showCorrespondenceCountBarOnCanvas: true,
      showCardCountBarOnCanvas: true,
      canvasZoomSensitivity: 100,
    });
  });

  it('loads valid persisted settings', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({
      censored: true,
      reversals: false,
      showDeckTitleOnCanvas: false,
      showCorrespondenceThumbnailsOnCanvas: true,
      showCorrespondenceCountBarOnCanvas: false,
    });
    initSettingsStore();
    expect(getSettings()).toEqual({
      open: false,
      censored: true,
      reversals: false,
      showDeckTitleOnCanvas: false,
      showCorrespondenceThumbnailsOnCanvas: true,
      showCorrespondenceCountBarOnCanvas: false,
      showCardCountBarOnCanvas: true,
      canvasZoomSensitivity: 100,
    });
  });

  it('loads and clamps canvasZoomSensitivity from storage', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({
      censored: false,
      canvasZoomSensitivity: 500,
    });
    initSettingsStore();
    expect(getSettings().canvasZoomSensitivity).toBe(400);
  });

  it('defaults canvasZoomSensitivity when stored value is invalid', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({
      censored: false,
      canvasZoomSensitivity: 'fast',
    });
    initSettingsStore();
    expect(getSettings().canvasZoomSensitivity).toBe(100);
  });

  it('coerces censored with Boolean and defaults showDeckTitleOnCanvas when key absent', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({ censored: 'yes' });
    initSettingsStore();
    const settings = getSettings();
    expect(settings.censored).toBe(true);
    expect(settings.showDeckTitleOnCanvas).toBe(true);
    expect(settings.showCorrespondenceThumbnailsOnCanvas).toBe(false);
    expect(settings.showCorrespondenceCountBarOnCanvas).toBe(true);
    expect(settings.showCardCountBarOnCanvas).toBe(true);
  });

  it('uses Boolean when showCorrespondenceCountBarOnCanvas is present', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({
      censored: false,
      showCorrespondenceCountBarOnCanvas: 0,
    });
    initSettingsStore();
    expect(getSettings().showCorrespondenceCountBarOnCanvas).toBe(false);
  });

  it('uses Boolean when showCardCountBarOnCanvas is present', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({
      censored: false,
      showCardCountBarOnCanvas: 0,
    });
    initSettingsStore();
    expect(getSettings().showCardCountBarOnCanvas).toBe(false);
  });

  it('uses Boolean(showRaw) when showDeckTitleOnCanvas is present (falsy)', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({
      censored: false,
      showDeckTitleOnCanvas: 0,
    });
    initSettingsStore();
    expect(getSettings().showDeckTitleOnCanvas).toBe(false);
    expect(getSettings().showCorrespondenceThumbnailsOnCanvas).toBe(false);
  });

  it('uses Boolean(showRaw) when showDeckTitleOnCanvas is truthy', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({
      censored: false,
      showDeckTitleOnCanvas: 1,
    });
    initSettingsStore();
    expect(getSettings().showDeckTitleOnCanvas).toBe(true);
    expect(getSettings().showCorrespondenceThumbnailsOnCanvas).toBe(false);
  });

  it('uses Boolean when showCorrespondenceThumbnailsOnCanvas is present', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({
      censored: false,
      reversals: false,
      showDeckTitleOnCanvas: true,
      showCorrespondenceThumbnailsOnCanvas: 1,
    });
    initSettingsStore();
    expect(getSettings().showCorrespondenceThumbnailsOnCanvas).toBe(true);
  });

  it('returns defaults when JSON is not a plain object (null)', () => {
    lsState.data[STORAGE_KEY] = 'null';
    initSettingsStore();
    expect(getSettings()).toEqual({
      open: false,
      censored: false,
      reversals: false,
      showDeckTitleOnCanvas: true,
      showCorrespondenceThumbnailsOnCanvas: false,
      showCorrespondenceCountBarOnCanvas: true,
      showCardCountBarOnCanvas: true,
      canvasZoomSensitivity: 100,
    });
  });

  it('returns defaults when JSON is not an object (number)', () => {
    lsState.data[STORAGE_KEY] = '42';
    initSettingsStore();
    expect(getSettings()).toEqual({
      open: false,
      censored: false,
      reversals: false,
      showDeckTitleOnCanvas: true,
      showCorrespondenceThumbnailsOnCanvas: false,
      showCorrespondenceCountBarOnCanvas: true,
      showCardCountBarOnCanvas: true,
      canvasZoomSensitivity: 100,
    });
  });

  it('returns defaults when JSON is not an object (string)', () => {
    lsState.data[STORAGE_KEY] = '"x"';
    initSettingsStore();
    expect(getSettings()).toEqual({
      open: false,
      censored: false,
      reversals: false,
      showDeckTitleOnCanvas: true,
      showCorrespondenceThumbnailsOnCanvas: false,
      showCorrespondenceCountBarOnCanvas: true,
      showCardCountBarOnCanvas: true,
      canvasZoomSensitivity: 100,
    });
  });

  it('returns defaults when JSON.parse throws', () => {
    lsState.data[STORAGE_KEY] = '{';
    initSettingsStore();
    expect(getSettings()).toEqual({
      open: false,
      censored: false,
      reversals: false,
      showDeckTitleOnCanvas: true,
      showCorrespondenceThumbnailsOnCanvas: false,
      showCorrespondenceCountBarOnCanvas: true,
      showCardCountBarOnCanvas: true,
      canvasZoomSensitivity: 100,
    });
  });

  it('reads settings from an array-shaped JSON object branch (still a record)', () => {
    lsState.data[STORAGE_KEY] = '[]';
    initSettingsStore();
    expect(getSettings()).toEqual({
      open: false,
      censored: false,
      reversals: false,
      showDeckTitleOnCanvas: true,
      showCorrespondenceThumbnailsOnCanvas: false,
      showCorrespondenceCountBarOnCanvas: true,
      showCardCountBarOnCanvas: true,
      canvasZoomSensitivity: 100,
    });
  });

  it('loads reversals from storage', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({ reversals: true });
    initSettingsStore();
    expect(getSettings().reversals).toBe(true);
  });

  it('effect persists current store snapshot to localStorage', () => {
    initSettingsStore();
    const settings = getSettings();
    settings.censored = true;
    settings.showDeckTitleOnCanvas = false;
    settings.showCorrespondenceThumbnailsOnCanvas = true;
    settings.showCorrespondenceCountBarOnCanvas = false;
    settings.showCardCountBarOnCanvas = false;
    settings.canvasZoomSensitivity = 200;

    const effectFn = alpineEffect.mock.calls[0][0] as () => void;
    effectFn();

    expect(setItemMock).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({
        censored: true,
        reversals: false,
        showDeckTitleOnCanvas: false,
        showCorrespondenceThumbnailsOnCanvas: true,
        showCorrespondenceCountBarOnCanvas: false,
        showCardCountBarOnCanvas: false,
        canvasZoomSensitivity: 200,
      }),
    );
  });
});
