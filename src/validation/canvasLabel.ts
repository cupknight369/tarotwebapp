import { z } from 'zod';

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const TEXT_MAX = 10000;

export const labelColorSchema = z
  .string()
  .regex(HEX_COLOR, 'Invalid color')
  .describe('CSS hex color from color input');

export const labelTextSchema = z
  .string()
  .max(TEXT_MAX, `Text must be at most ${TEXT_MAX} characters`);

/**
 * Clamps to 8–555; non-finite values fall back to 16 (previous UI behavior).
 * @param n - Raw font size from input or state.
 * @returns Clamped integer font size.
 */
export function clampLabelFontSize(n: number): number {
  if (!Number.isFinite(n)) return 16;
  return Math.min(555, Math.round(n));
}
