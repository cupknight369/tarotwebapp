/** Inclusive lower bound for canvas zoom sensitivity (25% of default feel). */
export const CANVAS_ZOOM_SENSITIVITY_MIN = 25;
/** Inclusive upper bound for canvas zoom sensitivity (200% of default feel). */
export const CANVAS_ZOOM_SENSITIVITY_MAX = 200;
/** Default canvas zoom sensitivity (100% = current wheel/pinch behavior). */
export const CANVAS_ZOOM_SENSITIVITY_DEFAULT = 100;

/** Wheel zoom coefficient at 100% sensitivity (matches pre-setting behavior). */
export const WHEEL_ZOOM_SENSITIVITY_BASE = 0.0004;

/**
 * Clamps canvas zoom sensitivity to the supported percentage range.
 *
 * @param n - Raw sensitivity from settings or storage.
 * @returns Integer percentage in [25, 200]; non-finite values use the default.
 */
export function clampCanvasZoomSensitivity(n: number): number {
  if (!Number.isFinite(n)) {
    return CANVAS_ZOOM_SENSITIVITY_DEFAULT;
  }
  return Math.max(
    CANVAS_ZOOM_SENSITIVITY_MIN,
    Math.min(CANVAS_ZOOM_SENSITIVITY_MAX, Math.round(n)),
  );
}

/**
 * Maps stored sensitivity percentage to a multiplier relative to default feel.
 *
 * @param sensitivity - Clamped canvas zoom sensitivity percentage.
 * @returns Ratio where 1 is default; 0.25 is slowest; 2 is fastest.
 */
export function canvasZoomSensitivityToRatio(sensitivity: number): number {
  return clampCanvasZoomSensitivity(sensitivity) / CANVAS_ZOOM_SENSITIVITY_DEFAULT;
}

/**
 * Converts canvas zoom sensitivity to the wheel exponential coefficient.
 *
 * @param sensitivity - Canvas zoom sensitivity percentage from settings.
 * @returns Wheel delta multiplier passed to {@link wheelEventToZoomFactor}.
 */
export function canvasZoomSensitivityToWheelCoefficient(sensitivity: number): number {
  return WHEEL_ZOOM_SENSITIVITY_BASE * canvasZoomSensitivityToRatio(sensitivity);
}

/**
 * Applies canvas zoom sensitivity to a raw pinch distance ratio.
 *
 * @param rawFactor - Finger-distance ratio (`currentDistance / startDistance`).
 * @param sensitivity - Canvas zoom sensitivity percentage from settings.
 * @returns Adjusted multiplicative pinch factor centered on 1.
 */
export function applyCanvasZoomSensitivityToPinchFactor(
  rawFactor: number,
  sensitivity: number,
): number {
  const ratio = canvasZoomSensitivityToRatio(sensitivity);
  return 1 + (rawFactor - 1) * ratio;
}
