import { z } from 'zod';

const boundIntSchema = z.coerce
  .number({ invalid_type_error: 'Enter a valid integer' })
  .int('Enter a valid integer');

export type RandomNumberBounds =
  | { ok: true; lower: number; upper: number }
  | { ok: false; error: string };

/**
 * @param lower - Raw lower bound string from input.
 * @param upper - Raw upper bound string from input.
 * @returns Parsed inclusive bounds or a validation error message.
 */
export function parseRandomNumberBounds(lower: string, upper: string): RandomNumberBounds {
  const lowerParsed = boundIntSchema.safeParse(lower);
  if (!lowerParsed.success) {
    return { ok: false, error: 'Enter a valid integer for the lower bound' };
  }
  const upperParsed = boundIntSchema.safeParse(upper);
  if (!upperParsed.success) {
    return { ok: false, error: 'Enter a valid integer for the upper bound' };
  }
  const lo = lowerParsed.data;
  const hi = upperParsed.data;
  if (lo >= hi) {
    return { ok: false, error: 'Upper bound must be larger than lower bound' };
  }
  return { ok: true, lower: lo, upper: hi };
}

/**
 * @param min - Inclusive lower bound (integer).
 * @param max - Inclusive upper bound (integer).
 * @returns Uniform random integer in [min, max] via `crypto.getRandomValues`.
 */
export function randomIntInclusive(min: number, max: number): number {
  const span = max - min + 1;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const fraction = buf[0] / (0xffffffff + 1);
  return min + Math.floor(fraction * span);
}
