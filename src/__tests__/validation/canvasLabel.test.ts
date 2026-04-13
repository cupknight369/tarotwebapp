import { describe, expect, it } from 'vitest';

import {
  clampFixedWidthPx,
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

describe('clampFixedWidthPx', () => {
  it('returns 240 for non-finite input', () => {
    expect(clampFixedWidthPx(Number.NaN)).toBe(240);
    expect(clampFixedWidthPx(Number.POSITIVE_INFINITY)).toBe(240);
  });

  it('clamps to 40–1200 and rounds', () => {
    expect(clampFixedWidthPx(3)).toBe(40);
    expect(clampFixedWidthPx(2000)).toBe(1200);
    expect(clampFixedWidthPx(88.7)).toBe(89);
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
