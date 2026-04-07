/**
 * Structured logging for the Node server (no silent failures).
 */

/**
 * Logs a named server operation with context (no secrets).
 *
 * @param operation - Stable operation identifier for dashboards.
 * @param context - Additional JSON-serializable fields.
 */
export function logServerError(operation: string, context: Record<string, unknown>): void {
  console.error('[server]', {
    operation,
    ts: new Date().toISOString(),
    ...context,
  });
}
