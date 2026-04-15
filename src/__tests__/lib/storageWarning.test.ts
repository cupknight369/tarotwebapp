/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  STORAGE_WARNING_DISMISSED_SESSION_KEY,
  dismissStorageWarningForSession,
  isRemainingStorageBelowFraction,
  isStorageWarningDismissedThisSession,
} from '../../lib/storageWarning.js';

describe('storageWarning', () => {
  beforeEach(() => {
    try {
      sessionStorage.clear();
    } catch {
      // ignore
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('isRemainingStorageBelowFraction returns true when remaining ratio is below threshold', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 81, quota: 100 }),
      },
    });
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(true);
  });

  it('isRemainingStorageBelowFraction returns false when remaining ratio equals threshold', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 80, quota: 100 }),
      },
    });
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(false);
  });

  it('isRemainingStorageBelowFraction returns false when estimate API is missing', async () => {
    vi.stubGlobal('navigator', { storage: {} });
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(false);
  });

  it('isRemainingStorageBelowFraction returns false when quota is not positive', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 0, quota: 0 }),
      },
    });
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(false);
  });

  it('isRemainingStorageBelowFraction returns false on estimate rejection', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockRejectedValue(new Error('fail')),
      },
    });
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(false);
  });

  it('dismissStorageWarningForSession and isStorageWarningDismissedThisSession round-trip', () => {
    expect(isStorageWarningDismissedThisSession()).toBe(false);
    dismissStorageWarningForSession();
    expect(sessionStorage.getItem(STORAGE_WARNING_DISMISSED_SESSION_KEY)).toBe('1');
    expect(isStorageWarningDismissedThisSession()).toBe(true);
  });

  it('isStorageWarningDismissedThisSession returns false when getItem throws', () => {
    const spy = vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(isStorageWarningDismissedThisSession()).toBe(false);
    spy.mockRestore();
  });

  it('session helpers no-op when sessionStorage is undefined', () => {
    const prev = globalThis.sessionStorage;
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: undefined,
    });
    try {
      expect(isStorageWarningDismissedThisSession()).toBe(false);
      dismissStorageWarningForSession();
    } finally {
      Object.defineProperty(globalThis, 'sessionStorage', {
        configurable: true,
        value: prev,
      });
    }
  });

  it('dismissStorageWarningForSession ignores setItem failures', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    expect(() => dismissStorageWarningForSession()).not.toThrow();
    spy.mockRestore();
  });

  it('isRemainingStorageBelowFraction uses default threshold when omitted', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 85, quota: 100 }),
      },
    });
    await expect(isRemainingStorageBelowFraction()).resolves.toBe(true);
  });

  it('isRemainingStorageBelowFraction returns false when navigator is undefined', async () => {
    vi.stubGlobal('navigator', undefined);
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(false);
  });

  it('isRemainingStorageBelowFraction returns false when navigator has no storage API', async () => {
    vi.stubGlobal('navigator', {});
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(false);
  });

  it('isRemainingStorageBelowFraction returns false when storage is null', async () => {
    vi.stubGlobal('navigator', { storage: null });
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(false);
  });

  it('isRemainingStorageBelowFraction returns false for non-finite usage or quota', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: Number.NaN, quota: 100 }),
      },
    });
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(false);

    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 50, quota: Number.NaN }),
      },
    });
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(false);

    vi.stubGlobal('navigator', {
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 0, quota: Number.POSITIVE_INFINITY }),
      },
    });
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(false);
  });

  it('isRemainingStorageBelowFraction returns false when estimate throws synchronously', async () => {
    vi.stubGlobal('navigator', {
      storage: {
        estimate: () => {
          throw new Error('sync');
        },
      },
    });
    await expect(isRemainingStorageBelowFraction(0.2)).resolves.toBe(false);
  });
});
