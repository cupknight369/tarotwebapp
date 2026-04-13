/**
 * Express async wrapper and centralized error handler.
 */

import type { ErrorRequestHandler, RequestHandler } from 'express';

import { HttpError } from '../errors.js';

/**
 * Wraps an async route/middleware so rejections are passed to `next(err)`.
 *
 * @param fn - Async request handler.
 * @returns A synchronous RequestHandler that forwards async failures to Express.
 */
export function asyncHandler<
  P = Record<string, string>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>,
>(
  fn: RequestHandler<P, ResBody, ReqBody, ReqQuery>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery> {
  return (req, res, next) => {
    void Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Last middleware: logs with request context and sends a safe response.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const status = err instanceof HttpError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : String(err);
  console.error('[express]', {
    method: req.method,
    path: req.path,
    status,
    message,
    cause: err instanceof Error ? err.cause : undefined,
    stack: status >= 500 && err instanceof Error ? err.stack : undefined,
  });
  if (res.headersSent) {
    next(err);
    return;
  }
  res
    .status(status)
    .type('text/plain')
    .send(status === 500 ? 'Internal Server Error' : message);
};
