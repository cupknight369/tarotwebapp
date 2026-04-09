import { describe, expect, it, vi } from 'vitest';

import { HttpError } from '../errors.js';
import { asyncHandler, errorHandler } from '../middleware/errorHandler.js';

function mockRes(headersSent = false) {
  return {
    headersSent,
    status: vi.fn().mockReturnThis(),
    type: vi.fn().mockReturnThis(),
    send: vi.fn(),
  };
}

describe('asyncHandler', () => {
  it('invokes next with the error when the async handler rejects', async () => {
    const next = vi.fn();
    const handler = asyncHandler(() => Promise.reject(new Error('async boom')));
    handler({} as never, {} as never, next);
    await new Promise<void>((r) => {
      setImmediate(r);
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect((next.mock.calls[0][0] as Error).message).toBe('async boom');
  });

  it('forwards when the async handler calls next with no error', async () => {
    const next = vi.fn();
    const handler = asyncHandler((_req, _res, n) => {
      n();
      return Promise.resolve();
    });
    handler({} as never, {} as never, next);
    await new Promise<void>((r) => {
      setImmediate(r);
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toBeUndefined();
  });
});

describe('errorHandler', () => {
  it('sends HttpError status and message', () => {
    // vi.spyOn(console, 'error').mockImplementation(() => {}) 
    // replaces console.error with a no-op for this test so nothing is printed.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new HttpError('bad request', 400);
    const req = { method: 'GET', path: '/x' };
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith('bad request');
    expect(next).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('sends Internal Server Error for non-HttpError', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('boom');
    const req = { method: 'POST', path: '/api' };
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Internal Server Error');
    expect(next).not.toHaveBeenCalled();
    expect(consoleSpy.mock.calls[0][1]).toMatchObject({
      stack: err.stack,
    });
    consoleSpy.mockRestore();
  });

  it('omits stack in logs for HttpError below 500', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new HttpError('nope', 404);
    const req = { method: 'GET', path: '/missing' };
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    expect(consoleSpy.mock.calls[0][1]).toMatchObject({ stack: undefined });
    consoleSpy.mockRestore();
  });

  it('handles non-Error values', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = 'plain-string';
    const req = { method: 'GET', path: '/' };
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err as never, req as never, res as never, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith('Internal Server Error');
    consoleSpy.mockRestore();
  });

  it('logs Error cause when present', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cause = new Error('root');
    const err = new Error('wrapper', { cause });
    const req = { method: 'GET', path: '/' };
    const res = mockRes();
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    expect(consoleSpy.mock.calls[0][1]).toMatchObject({ cause });
    consoleSpy.mockRestore();
  });

  it('calls next when headers were already sent', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = new Error('late');
    const req = { method: 'GET', path: '/' };
    const res = mockRes(true);
    const next = vi.fn();

    errorHandler(err, req as never, res as never, next);

    expect(next).toHaveBeenCalledWith(err);
    expect(res.status).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
