import Alpine from 'alpinejs';
import type { SettingsStoreState } from '../types/settings.js';

const STORAGE_KEY = 'app-settings';

const DEFAULT_SETTINGS = {
  censored: false,
  showDeckTitleOnCanvas: true,
  showCorrespondenceThumbnailsOnCanvas: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function loadFromStorage(): {
  censored: boolean;
  showDeckTitleOnCanvas: boolean;
  showCorrespondenceThumbnailsOnCanvas: boolean;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_SETTINGS };
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return { ...DEFAULT_SETTINGS };
    }
    const showRaw = parsed['showDeckTitleOnCanvas'];
    const thumbRaw = parsed['showCorrespondenceThumbnailsOnCanvas'];
    return {
      censored: Boolean(parsed['censored']),
      showDeckTitleOnCanvas: showRaw === undefined ? true : Boolean(showRaw),
      showCorrespondenceThumbnailsOnCanvas: thumbRaw === undefined ? false : Boolean(thumbRaw),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Registers the `settings` Alpine store and persists settings to localStorage.
 */
export function initSettingsStore(): void {
  const { censored, showDeckTitleOnCanvas, showCorrespondenceThumbnailsOnCanvas } =
    loadFromStorage();
  Alpine.store('settings', {
    open: false,
    censored,
    showDeckTitleOnCanvas,
    showCorrespondenceThumbnailsOnCanvas,
  });
  Alpine.effect(() => {
    const settings = Alpine.store('settings') as SettingsStoreState;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        censored: settings.censored,
        showDeckTitleOnCanvas: settings.showDeckTitleOnCanvas,
        showCorrespondenceThumbnailsOnCanvas: settings.showCorrespondenceThumbnailsOnCanvas,
      }),
    );
  });
}
