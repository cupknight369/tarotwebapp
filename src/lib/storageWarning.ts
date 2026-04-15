/**
 * Session flag: user dismissed the low-storage warning for this tab session.
 */
export const STORAGE_WARNING_DISMISSED_SESSION_KEY = 'cktarot_storage_warning_dismissed';

/**
 * Returns whether the dismissed flag is set for this browser tab session.
 *
 * @returns True when {@link STORAGE_WARNING_DISMISSED_SESSION_KEY} is set in sessionStorage.
 */
export function isStorageWarningDismissedThisSession(): boolean {
  if (typeof sessionStorage === 'undefined') return false;
  try {
    return sessionStorage.getItem(STORAGE_WARNING_DISMISSED_SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Persists dismissal so the warning does not reappear until the session ends.
 */
export function dismissStorageWarningForSession(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_WARNING_DISMISSED_SESSION_KEY, '1');
  } catch {
    // Ignore quota / private mode issues.
  }
}

/**
 * Uses the Storage API estimate (includes IndexedDB usage for this origin) and compares
 * remaining quota fraction to a threshold.
 *
 * @param remainingFractionThreshold - Warn when `(quota - usage) / quota` is strictly less than this (default `0.2`).
 * @returns True when remaining storage is below the threshold; false when unsupported, invalid, or on error.
 */
export async function isRemainingStorageBelowFraction(
  remainingFractionThreshold = 0.2,
): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return false;
  }
  try {
    const { usage = 0, quota = 0 } = await navigator.storage.estimate();
    if (!Number.isFinite(usage) || !Number.isFinite(quota) || quota <= 0) {
      return false;
    }
    const remainingRatio = (quota - usage) / quota;
    return remainingRatio < remainingFractionThreshold;
  } catch {
    return false;
  }
}
