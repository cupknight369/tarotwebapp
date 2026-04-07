/**
 * HTTP-facing errors for the Express server.
 */

/**
 * Error carrying an HTTP status code for the centralized error handler.
 */
export class HttpError extends Error {
  /** HTTP status to send to the client. */
  readonly statusCode: number;

  /**
   * @param message - Human-readable message (safe for logs; avoid secrets).
   * @param statusCode - HTTP status code.
   * @param options - Optional `cause` for wrapping lower-level errors.
   */
  constructor(message: string, statusCode: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}
