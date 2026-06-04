import type { TextLabel } from '../types/canvas.js';
import type { FontProfile } from '../types/fontProfile.js';

/** Style fields on a text label that come from a font profile. */
export type FontProfileLabelStyles = Pick<
  TextLabel,
  | 'fontSize'
  | 'fontWeight'
  | 'fontStyle'
  | 'textDecoration'
  | 'color'
  | 'fixedWidth'
  | 'fixedWidthPx'
>;

/** Built-in defaults matching legacy new-label styling before profiles existed. */
export const LEGACY_DEFAULT_FONT_PROFILE_VALUES = {
  fontSize: 16,
  fontWeight: 400 as const,
  fontStyle: 'normal' as const,
  textDecoration: 'none' as const,
  color: '#e5e7eb',
  fixedWidth: false,
  fixedWidthPx: 0,
};

/**
 * @returns A new font profile id.
 */
export function generateFontProfileId(): string {
  return `fp-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * @param profile - Font profile to apply.
 * @returns Partial label fields copied from the profile.
 */
export function fontProfileToLabelPartial(profile: FontProfile): FontProfileLabelStyles {
  return {
    fontSize: profile.fontSize,
    fontWeight: profile.fontWeight,
    fontStyle: profile.fontStyle,
    textDecoration: profile.textDecoration,
    color: profile.color,
    fixedWidth: profile.fixedWidth,
    fixedWidthPx: profile.fixedWidthPx,
  };
}

/**
 * @param query - Raw search string from the modal filter.
 * @param title - Profile title to test.
 * @returns True when query is empty or title contains the trimmed query case-insensitively.
 */
export function fontProfileMatchesSearch(query: string, title: string): boolean {
  const raw = query.trim();
  if (raw === '') return true;
  return title.toLowerCase().includes(raw.toLowerCase());
}

/**
 * @param profiles - All profiles.
 * @param query - Filter query.
 * @returns Profiles whose titles match the query.
 */
export function filterFontProfiles(profiles: FontProfile[], query: string): FontProfile[] {
  return profiles.filter((p) => fontProfileMatchesSearch(query, p.title));
}

/**
 * @param title - Profile title seed.
 * @param values - Style values (defaults to legacy new-label styling).
 * @returns A new font profile with a generated id.
 */
export function createFontProfile(
  title: string,
  values: Omit<FontProfile, 'id' | 'title'> = LEGACY_DEFAULT_FONT_PROFILE_VALUES,
): FontProfile {
  return {
    id: generateFontProfileId(),
    title,
    ...values,
  };
}
