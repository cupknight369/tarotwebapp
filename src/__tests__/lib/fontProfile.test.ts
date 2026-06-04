import { describe, expect, it } from 'vitest';

import {
  createFontProfile,
  filterFontProfiles,
  fontProfileMatchesSearch,
  fontProfileToLabelPartial,
  generateFontProfileId,
} from '../../lib/fontProfile.js';
import type { FontProfile } from '../../types/fontProfile.js';

describe('fontProfile lib', () => {
  it('generateFontProfileId returns fp- prefix', () => {
    expect(generateFontProfileId()).toMatch(/^fp-/);
  });

  it('fontProfileToLabelPartial maps all style fields', () => {
    const profile: FontProfile = {
      id: 'fp-1',
      title: 'T',
      fontSize: 18,
      fontWeight: 700,
      fontStyle: 'italic',
      textDecoration: 'underline',
      color: '#ffffff',
      fixedWidth: true,
      fixedWidthPx: 200,
    };
    expect(fontProfileToLabelPartial(profile)).toEqual({
      fontSize: 18,
      fontWeight: 700,
      fontStyle: 'italic',
      textDecoration: 'underline',
      color: '#ffffff',
      fixedWidth: true,
      fixedWidthPx: 200,
    });
  });

  it('filterFontProfiles matches title case-insensitively', () => {
    const profiles = [createFontProfile('Default'), createFontProfile('Notes Bold')];
    expect(filterFontProfiles(profiles, 'bold')).toHaveLength(1);
    expect(filterFontProfiles(profiles, '')).toHaveLength(2);
    expect(fontProfileMatchesSearch('  ', 'x')).toBe(true);
  });
});
