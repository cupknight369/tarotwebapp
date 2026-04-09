import { describe, expect, it } from 'vitest';

import {
  clampLabelFontSize,
  labelColorSchema,
  labelTextSchema,
} from '../../validation/canvasLabel.js';

describe('clampLabelFontSize', () => {
  it('returns 16 for non-finite input', () => {
    expect(clampLabelFontSize(Number.NaN)).toBe(16);
    expect(clampLabelFontSize(Number.POSITIVE_INFINITY)).toBe(16);
  });

  it('rounds and caps the upper bound at 555', () => {
    expect(clampLabelFontSize(4)).toBe(4);
    expect(clampLabelFontSize(600)).toBe(555);
    expect(clampLabelFontSize(20.4)).toBe(20);
  });
});

describe('labelColorSchema', () => {
  it('accepts valid hex colors', () => {
    expect(() => labelColorSchema.parse('#fff')).not.toThrow();
    expect(() => labelColorSchema.parse('#aabbcc')).not.toThrow();
  });

  it('rejects invalid colors', () => {
    expect(() => labelColorSchema.parse('red')).toThrow();
  });
});

describe('labelTextSchema', () => {
  it('rejects overly long text', () => {
    expect(() => labelTextSchema.parse('x'.repeat(10001))).toThrow();
  });
});
