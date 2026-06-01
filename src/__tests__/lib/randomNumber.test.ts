import { afterEach, describe, expect, it, vi } from 'vitest';

import { parseRandomNumberBounds, randomIntInclusive } from '../../lib/randomNumber.js';

describe('parseRandomNumberBounds', () => {
  it('accepts valid bounds with lower strictly less than upper', () => {
    expect(parseRandomNumberBounds('1', '12')).toEqual({ ok: true, lower: 1, upper: 12 });
    expect(parseRandomNumberBounds('-5', '0')).toEqual({ ok: true, lower: -5, upper: 0 });
  });

  it('rejects equal bounds', () => {
    const result = parseRandomNumberBounds('5', '5');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Upper bound must be larger than lower bound');
    }
  });

  it('rejects inverted bounds', () => {
    const result = parseRandomNumberBounds('10', '3');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Upper bound must be larger than lower bound');
    }
  });

  it('rejects non-integer lower bound', () => {
    const result = parseRandomNumberBounds('1.5', '10');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Enter a valid integer for the lower bound');
    }
  });

  it('rejects non-integer upper bound', () => {
    const result = parseRandomNumberBounds('1', 'abc');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Enter a valid integer for the upper bound');
    }
  });
});

describe('randomIntInclusive', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns min when crypto yields zero fraction', () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr) => {
      (arr as Uint32Array)[0] = 0;
      return arr;
    });
    expect(randomIntInclusive(1, 12)).toBe(1);
    expect(randomIntInclusive(-3, 0)).toBe(-3);
  });

  it('returns max when crypto yields maximum fraction below 1', () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr) => {
      (arr as Uint32Array)[0] = 0xffffffff;
      return arr;
    });
    expect(randomIntInclusive(1, 12)).toBe(12);
    expect(randomIntInclusive(7, 7)).toBe(7);
  });

  it('maps mid-range fraction to inclusive interior value', () => {
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation((arr) => {
      (arr as Uint32Array)[0] = Math.floor(0xffffffff * 0.5);
      return arr;
    });
    const value = randomIntInclusive(0, 9);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThanOrEqual(9);
  });
});
