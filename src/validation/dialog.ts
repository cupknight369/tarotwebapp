import { z } from 'zod';

const READING_TITLE_MAX = 500;

/**
 * @param min - Inclusive lower bound (integer).
 * @param max - Inclusive upper bound (integer).
 * @returns Schema that parses a string or number to an int in [min, max].
 */
export function dialogBoundedIntSchema(min: number, max: number) {
  return z.coerce
    .number({ invalid_type_error: 'Enter a valid number' })
    .int('Enter a whole number')
    .min(min, `Must be at least ${min}`)
    .max(max, `Must be at most ${max}`);
}

export const readingTitleSchema = z
  .string()
  .trim()
  .max(READING_TITLE_MAX, `Title must be at most ${READING_TITLE_MAX} characters`)
  .transform((t) => (t.length > 0 ? t : 'Untitled Reading'));

export type ReadingTitleOutput = z.infer<typeof readingTitleSchema>;
