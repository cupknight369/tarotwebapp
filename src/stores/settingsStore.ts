import Alpine from 'alpinejs';
import type { SettingsStoreState } from '../types/settings.js';

const STORAGE_KEY = 'app-settings';

const DEFAULT_SETTINGS = { censored: false, showDeckTitleOnCanvas: true };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function loadFromStorage(): { censored: boolean; showDeckTitleOnCanvas: boolean } {
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
    return {
      censored: Boolean(parsed['censored']),
      showDeckTitleOnCanvas: showRaw === undefined ? true : Boolean(showRaw),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Registers the `settings` Alpine store and persists `censored` / `showDeckTitleOnCanvas` to localStorage.
 */
export function initSettingsStore(): void {
  const { censored, showDeckTitleOnCanvas } = loadFromStorage();
  Alpine.store('settings', { open: false, censored, showDeckTitleOnCanvas });
  Alpine.effect(() => {
    const settings = Alpine.store('settings') as SettingsStoreState;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        censored: settings.censored,
        showDeckTitleOnCanvas: settings.showDeckTitleOnCanvas,
      }),
    );
  });
}
