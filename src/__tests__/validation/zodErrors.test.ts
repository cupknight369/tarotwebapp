import { describe, expect, it } from 'vitest';
import { z, ZodError } from 'zod';

import { zodFirstIssue } from '../../validation/zodErrors.js';

describe('zodErrors.ts', () => {
  describe('zodFirstIssue', () => {
    it('returns generic fallback when issues array is empty', () => {
      const error = new ZodError([]);
      expect(zodFirstIssue(error)).toBe('Invalid input');
    });

    it('returns the first issue message when it is a non-empty string', () => {
      const parsed = z.string().min(5).safeParse('hi');
      expect(parsed.success).toBe(false);
      if (parsed.success) throw new Error('expected parse failure');
      expect(zodFirstIssue(parsed.error)).toBe('String must contain at least 5 character(s)');
    });

    it('returns fallback when first issue message is empty', () => {
      const error = {
        issues: [{ code: z.ZodIssueCode.custom, path: [], message: '' }],
      } as unknown as ZodError;
      expect(zodFirstIssue(error)).toBe('Invalid input');
    });

    it('returns fallback when first issue has no message', () => {
      const error = {
        issues: [{ code: z.ZodIssueCode.custom, path: [] }],
      } as unknown as ZodError;
      expect(zodFirstIssue(error)).toBe('Invalid input');
    });

    it('returns fallback when first issue slot is empty (sparse issues)', () => {
      const issues: z.ZodIssue[] = [];
      issues.length = 1;
      const error = { issues } as unknown as ZodError;
      expect(zodFirstIssue(error)).toBe('Invalid input');
    });

    it('returns fallback when message is not a string', () => {
      const error = {
        issues: [
          {
            code: z.ZodIssueCode.custom,
            path: [],
            message: 42 as unknown as string,
          },
        ],
      } as unknown as ZodError;
      expect(zodFirstIssue(error)).toBe('Invalid input');
    });
  });
});
