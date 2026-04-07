/**
 * Centralized client-side error logging (never silent unless explicitly documented).
 */

/**
 * Logs an error or unknown value with operation context.
 *
 * @param operation - Stable identifier for the code path.
 * @param cause - Error, domain object, or other diagnostic value.
 */
export function logError(operation: string, cause: unknown): void {
  console.error('[client]', {
    operation,
    ts: new Date().toISOString(),
    cause,
  });
}

/**
 * Debug-level log for best-effort background work (e.g. image prefetch).
 *
 * @param operation - Stable identifier.
 * @param cause - Optional diagnostic.
 */
export function logDebug(operation: string, cause?: unknown): void {
  console.debug('[client]', {
    operation,
    ts: new Date().toISOString(),
    cause,
  });
}
