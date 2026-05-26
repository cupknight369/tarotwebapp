import Alpine from 'alpinejs';
import type { SettingsStoreState } from '../types/settings.js';
import {
  CANVAS_ZOOM_SENSITIVITY_DEFAULT,
  clampCanvasZoomSensitivity,
} from '../validation/canvasZoom.js';

const STORAGE_KEY = 'app-settings';

const DEFAULT_SETTINGS = {
  censored: false,
  showDeckTitleOnCanvas: true,
  showCorrespondenceThumbnailsOnCanvas: false,
  showCorrespondenceCountBarOnCanvas: true,
  showCardCountBarOnCanvas: true,
  canvasZoomSensitivity: CANVAS_ZOOM_SENSITIVITY_DEFAULT,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function loadFromStorage(): {
  censored: boolean;
  showDeckTitleOnCanvas: boolean;
  showCorrespondenceThumbnailsOnCanvas: boolean;
  showCorrespondenceCountBarOnCanvas: boolean;
  showCardCountBarOnCanvas: boolean;
  canvasZoomSensitivity: number;
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
    const countBarRaw = parsed['showCorrespondenceCountBarOnCanvas'];
    const cardCountBarRaw = parsed['showCardCountBarOnCanvas'];
    const zoomRaw = parsed['canvasZoomSensitivity'];
    return {
      censored: Boolean(parsed['censored']),
      showDeckTitleOnCanvas: showRaw === undefined ? true : Boolean(showRaw),
      showCorrespondenceThumbnailsOnCanvas: thumbRaw === undefined ? false : Boolean(thumbRaw),
      showCorrespondenceCountBarOnCanvas: countBarRaw === undefined ? true : Boolean(countBarRaw),
      showCardCountBarOnCanvas: cardCountBarRaw === undefined ? true : Boolean(cardCountBarRaw),
      canvasZoomSensitivity:
        zoomRaw === undefined
          ? CANVAS_ZOOM_SENSITIVITY_DEFAULT
          : clampCanvasZoomSensitivity(Number(zoomRaw)),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Registers the `settings` Alpine store and persists settings to localStorage.
 */
export function initSettingsStore(): void {
  const {
    censored,
    showDeckTitleOnCanvas,
    showCorrespondenceThumbnailsOnCanvas,
    showCorrespondenceCountBarOnCanvas,
    showCardCountBarOnCanvas,
    canvasZoomSensitivity,
  } = loadFromStorage();
  Alpine.store('settings', {
    open: false,
    censored,
    showDeckTitleOnCanvas,
    showCorrespondenceThumbnailsOnCanvas,
    showCorrespondenceCountBarOnCanvas,
    showCardCountBarOnCanvas,
    canvasZoomSensitivity,
  });
  Alpine.effect(() => {
    const settings = Alpine.store('settings') as SettingsStoreState;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        censored: settings.censored,
        showDeckTitleOnCanvas: settings.showDeckTitleOnCanvas,
        showCorrespondenceThumbnailsOnCanvas: settings.showCorrespondenceThumbnailsOnCanvas,
        showCorrespondenceCountBarOnCanvas: settings.showCorrespondenceCountBarOnCanvas,
        showCardCountBarOnCanvas: settings.showCardCountBarOnCanvas,
        canvasZoomSensitivity: clampCanvasZoomSensitivity(settings.canvasZoomSensitivity),
      }),
    );
  });
}
