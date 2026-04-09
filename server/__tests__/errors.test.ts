import { describe, expect, it } from 'vitest';

import { HttpError } from '../errors.js';

describe('HttpError', () => {
  it('exposes statusCode and message', () => {
    const err = new HttpError('not found', 404);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('HttpError');
    expect(err.message).toBe('not found');
    expect(err.statusCode).toBe(404);
  });

  it('accepts an optional cause', () => {
    const cause = new Error('underlying');
    const err = new HttpError('wrap', 502, { cause });
    expect(err.cause).toBe(cause);
  });
});
