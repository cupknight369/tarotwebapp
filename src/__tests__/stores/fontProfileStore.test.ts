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

import {
  getDefaultFontProfile,
  getFontProfileById,
  getFontProfilesStore,
  initFontProfileStore,
} from '../../stores/fontProfileStore.js';
import type { FontProfilesStoreState } from '../../types/fontProfile.js';

const STORAGE_KEY = 'app-font-profiles';

describe('fontProfileStore.ts', () => {
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

  function getStore(): FontProfilesStoreState {
    const s = alpineStores.get('fontProfiles');
    expect(s).toBeDefined();
    return s as FontProfilesStoreState;
  }

  it('seeds Default profile when localStorage is empty', () => {
    initFontProfileStore();
    const store = getStore();
    expect(store.profiles).toHaveLength(1);
    expect(store.profiles[0]?.title).toBe('Default');
    expect(store.defaultFontProfileId).toBe(store.profiles[0]?.id);
    expect(setItemMock).toHaveBeenCalled();
    const persisted = JSON.parse(setItemMock.mock.calls[0]![1] as string) as {
      profiles: { title: string }[];
    };
    expect(persisted.profiles[0]?.title).toBe('Default');
  });

  it('loads valid persisted profiles', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({
      profiles: [
        {
          id: 'fp-a',
          title: 'Custom',
          fontSize: 24,
          fontWeight: 700,
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#111111',
          fixedWidth: true,
          fixedWidthPx: 100,
        },
      ],
      defaultFontProfileId: 'fp-a',
    });
    initFontProfileStore();
    expect(getStore().profiles[0]?.fontSize).toBe(24);
    expect(getDefaultFontProfile()?.id).toBe('fp-a');
    expect(getFontProfileById('fp-a')?.title).toBe('Custom');
  });

  it('reseeds when JSON is invalid', () => {
    lsState.data[STORAGE_KEY] = 'not-json';
    initFontProfileStore();
    expect(getStore().profiles[0]?.title).toBe('Default');
  });

  it('reseeds when profiles array is empty', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({
      profiles: [],
      defaultFontProfileId: null,
    });
    initFontProfileStore();
    expect(getStore().profiles).toHaveLength(1);
  });

  it('falls back default id to first profile when missing', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify({
      profiles: [
        {
          id: 'fp-only',
          title: 'Only',
          fontSize: 16,
          fontWeight: 400,
          fontStyle: 'normal',
          textDecoration: 'none',
          color: '#e5e7eb',
          fixedWidth: false,
          fixedWidthPx: 0,
        },
      ],
      defaultFontProfileId: 'missing',
    });
    initFontProfileStore();
    expect(getStore().defaultFontProfileId).toBe('fp-only');
  });

  it('getFontProfilesStore returns registered store', () => {
    initFontProfileStore();
    expect(getFontProfilesStore().profiles.length).toBeGreaterThan(0);
  });

  it('reseeds when parsed JSON is not a record', () => {
    lsState.data[STORAGE_KEY] = JSON.stringify([1, 2, 3]);
    initFontProfileStore();
    expect(getStore().profiles[0]?.title).toBe('Default');
  });

  it('getDefaultFontProfile returns first profile when default id is stale', () => {
    initFontProfileStore();
    const store = getStore();
    store.defaultFontProfileId = 'does-not-exist';
    expect(getDefaultFontProfile()?.id).toBe(store.profiles[0]?.id);
  });
});
