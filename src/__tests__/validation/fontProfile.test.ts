import { describe, expect, it } from 'vitest';

import { fontProfileSchema, fontProfilesStorageSchema } from '../../validation/fontProfile.js';

describe('fontProfile validation', () => {
  const base = {
    id: 'fp-1',
    title: 'Heading',
    fontSize: 20,
    fontWeight: 700 as const,
    fontStyle: 'italic' as const,
    textDecoration: 'underline' as const,
    color: '#aabbcc',
    fixedWidth: true,
    fixedWidthPx: 300,
  };

  it('clamps fontSize and fixedWidthPx', () => {
    const parsed = fontProfileSchema.parse({ ...base, fontSize: 9999, fixedWidthPx: 5 });
    expect(parsed.fontSize).toBe(555);
    expect(parsed.fixedWidthPx).toBe(40);
  });

  it('rejects invalid color', () => {
    expect(fontProfileSchema.safeParse({ ...base, color: 'red' }).success).toBe(false);
  });

  it('parses storage payload with nullable default id', () => {
    const parsed = fontProfilesStorageSchema.parse({
      profiles: [base],
      defaultFontProfileId: 'fp-1',
    });
    expect(parsed.profiles).toHaveLength(1);
    expect(parsed.defaultFontProfileId).toBe('fp-1');
  });
});
