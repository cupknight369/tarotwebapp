import { describe, expect, it } from 'vitest';
import { numericInputStepDelta, stepBoundedIntegerString } from '../../lib/numericInput.js';

describe('numericInputStepDelta', () => {
  it('returns +1 for ArrowUp and -1 for ArrowDown', () => {
    expect(numericInputStepDelta('ArrowUp')).toBe(1);
    expect(numericInputStepDelta('ArrowDown')).toBe(-1);
  });

  it('returns null for other keys', () => {
    expect(numericInputStepDelta('Enter')).toBeNull();
    expect(numericInputStepDelta('a')).toBeNull();
  });
});

describe('stepBoundedIntegerString', () => {
  it('steps a parsed integer by delta', () => {
    expect(stepBoundedIntegerString('5', 1, 0, 10, 0)).toBe('6');
    expect(stepBoundedIntegerString('5', -1, 0, 10, 0)).toBe('4');
  });

  it('uses fallback when raw is empty or invalid', () => {
    expect(stepBoundedIntegerString('', 1, 1, 10, 3)).toBe('4');
    expect(stepBoundedIntegerString('abc', -1, 1, 10, 3)).toBe('2');
  });

  it('clamps to min and max', () => {
    expect(stepBoundedIntegerString('0', -1, 0, 10, 0)).toBe('0');
    expect(stepBoundedIntegerString('10', 1, 0, 10, 0)).toBe('10');
  });
});
