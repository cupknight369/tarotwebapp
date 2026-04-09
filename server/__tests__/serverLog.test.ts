import { afterEach, describe, expect, it, vi } from 'vitest';

import { logServerError } from '../serverLog.js';

describe('logServerError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes a structured line to stderr', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logServerError('test.op', { detail: 'x' });
    expect(spy).toHaveBeenCalledTimes(1);
    const payload = spy.mock.calls[0][0] as string;
    const obj = spy.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toBe('[server]');
    expect(obj.operation).toBe('test.op');
    expect(obj.detail).toBe('x');
    expect(typeof obj.ts).toBe('string');
  });
});
