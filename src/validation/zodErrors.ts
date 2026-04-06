import type { ZodError } from 'zod';

/**
 * @param error - Zod flattened error container.
 * @returns First issue message, or a generic fallback.
 */
export function zodFirstIssue(error: ZodError): string {
  const issues = error.issues;
  if (issues.length === 0) return 'Invalid input';
  const msg = issues[0]?.message;
  return typeof msg === 'string' && msg.length > 0 ? msg : 'Invalid input';
}
