/**
 * @param key - KeyboardEvent.key value.
 * @returns +1 for ArrowUp, -1 for ArrowDown, or null for other keys.
 */
export function numericInputStepDelta(key: string): number | null {
  if (key === 'ArrowUp') return 1;
  if (key === 'ArrowDown') return -1;
  return null;
}

/**
 * Steps a numeric text field value by `delta`, clamped to inclusive `[min, max]`.
 *
 * @param raw - Current input string.
 * @param delta - Amount to add (typically +1 or -1).
 * @param min - Inclusive lower bound.
 * @param max - Inclusive upper bound.
 * @param fallback - Value used when `raw` is empty or not an integer.
 * @returns Stepped value as a decimal string.
 */
export function stepBoundedIntegerString(
  raw: string,
  delta: number,
  min: number,
  max: number,
  fallback = min,
): string {
  const trimmed = raw.trim();
  const parsed = trimmed === '' ? Number.NaN : Number.parseInt(trimmed, 10);
  const current = Number.isFinite(parsed) ? parsed : fallback;
  const next = Math.min(max, Math.max(min, current + delta));
  return String(next);
}
