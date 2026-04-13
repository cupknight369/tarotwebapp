import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { logDebug, logError } from '../../lib/logError.js';

describe('logError.ts', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-09T15:30:45.123Z'));
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('logError writes structured payload to console.error', () => {
    const err = new Error('boom');
    logError('op.read', err);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('[client]', {
      operation: 'op.read',
      ts: '2026-04-09T15:30:45.123Z',
      cause: err,
    });
  });

  it('logError accepts non-Error cause', () => {
    logError('op.x', { code: 42 });
    expect(errorSpy).toHaveBeenCalledWith('[client]', {
      operation: 'op.x',
      ts: '2026-04-09T15:30:45.123Z',
      cause: { code: 42 },
    });
  });

  it('logDebug writes structured payload to console.debug with cause', () => {
    logDebug('prefetch', 'detail');
    expect(debugSpy).toHaveBeenCalledTimes(1);
    expect(debugSpy).toHaveBeenCalledWith('[client]', {
      operation: 'prefetch',
      ts: '2026-04-09T15:30:45.123Z',
      cause: 'detail',
    });
  });

  it('logDebug includes undefined cause when omitted', () => {
    logDebug('heartbeat');
    expect(debugSpy).toHaveBeenCalledWith('[client]', {
      operation: 'heartbeat',
      ts: '2026-04-09T15:30:45.123Z',
      cause: undefined,
    });
  });
});
