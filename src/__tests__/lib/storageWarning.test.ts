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
});
