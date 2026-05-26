/** Preset canvas zoom sensitivity values exposed in app settings. */
export const CANVAS_ZOOM_SENSITIVITY_PRESETS = [25, 50, 100, 200, 400] as const;

/** Preset option for the settings dropdown. */
export type CanvasZoomSensitivityPreset = (typeof CANVAS_ZOOM_SENSITIVITY_PRESETS)[number];

/** Default canvas zoom sensitivity (`Normal`). */
export const CANVAS_ZOOM_SENSITIVITY_DEFAULT: CanvasZoomSensitivityPreset = 100;

/** Slowest preset (`Very slow`). */
export const CANVAS_ZOOM_SENSITIVITY_MIN: CanvasZoomSensitivityPreset = 25;

/** Fastest preset (`Very fast`). */
export const CANVAS_ZOOM_SENSITIVITY_MAX: CanvasZoomSensitivityPreset = 400;

/** Wheel zoom coefficient at normal (100) sensitivity. */
export const WHEEL_ZOOM_SENSITIVITY_BASE = 0.0004;

/** Max multiplicative zoom change per wheel event at normal sensitivity (~2.5%). */
export const WHEEL_ZOOM_MAX_STEP_RATIO_BASE = 0.025;

/** Human-readable labels for each preset, indexed by preset value. */
export const CANVAS_ZOOM_SENSITIVITY_LABELS: Record<CanvasZoomSensitivityPreset, string> = {
  25: 'Very slow',
  50: 'Slow',
  100: 'Normal',
  200: 'Fast',
  400: 'Very fast',
};

/**
 * Snaps a raw value to the nearest supported preset.
 *
 * @param n - Raw sensitivity from settings or storage.
 * @returns Nearest preset; non-finite values use the default.
 */
export function clampCanvasZoomSensitivity(n: number): CanvasZoomSensitivityPreset {
  if (!Number.isFinite(n)) {
    return CANVAS_ZOOM_SENSITIVITY_DEFAULT;
  }
  let nearest: CanvasZoomSensitivityPreset = CANVAS_ZOOM_SENSITIVITY_DEFAULT;
  let minDistance = Math.abs(n - nearest);
  for (const preset of CANVAS_ZOOM_SENSITIVITY_PRESETS) {
    const distance = Math.abs(n - preset);
    if (distance < minDistance) {
      nearest = preset;
      minDistance = distance;
    }
  }
  return nearest;
}

/**
 * Maps a preset to a multiplier relative to normal feel (100 → 1, 400 → 4, 25 → 0.25).
 *
 * @param sensitivity - Canvas zoom sensitivity preset from settings.
 * @returns Ratio applied to wheel and pinch zoom response.
 */
export function canvasZoomSensitivityToRatio(sensitivity: number): number {
  return clampCanvasZoomSensitivity(sensitivity) / CANVAS_ZOOM_SENSITIVITY_DEFAULT;
}

/**
 * Converts canvas zoom sensitivity to the wheel exponential coefficient.
 *
 * @param sensitivity - Canvas zoom sensitivity preset from settings.
 * @returns Wheel delta multiplier passed to {@link wheelEventToZoomFactor}.
 */
export function canvasZoomSensitivityToWheelCoefficient(sensitivity: number): number {
  return WHEEL_ZOOM_SENSITIVITY_BASE * canvasZoomSensitivityToRatio(sensitivity);
}

/**
 * Max zoom change per wheel event, scaled with sensitivity so fast presets feel noticeably faster.
 *
 * @param sensitivity - Canvas zoom sensitivity preset from settings.
 * @returns Per-event zoom cap ratio (e.g. 0.025 at normal, 0.1 at very fast).
 */
export function canvasZoomSensitivityToWheelMaxStepRatio(sensitivity: number): number {
  return WHEEL_ZOOM_MAX_STEP_RATIO_BASE * canvasZoomSensitivityToRatio(sensitivity);
}

/**
 * Applies canvas zoom sensitivity to a raw pinch distance ratio.
 *
 * @param rawFactor - Finger-distance ratio (`currentDistance / startDistance`).
 * @param sensitivity - Canvas zoom sensitivity preset from settings.
 * @returns Adjusted multiplicative pinch factor centered on 1.
 */
export function applyCanvasZoomSensitivityToPinchFactor(
  rawFactor: number,
  sensitivity: number,
): number {
  const ratio = canvasZoomSensitivityToRatio(sensitivity);
  return 1 + (rawFactor - 1) * ratio;
}
