import Alpine from 'alpinejs';

import { createFontProfile } from '../lib/fontProfile.js';
import type { FontProfile, FontProfilesStoreState } from '../types/fontProfile.js';
import { fontProfilesStorageSchema } from '../validation/fontProfile.js';

const STORAGE_KEY = 'app-font-profiles';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function seedDefaultProfiles(): { profiles: FontProfile[]; defaultFontProfileId: string } {
  const profile = createFontProfile('Default');
  return { profiles: [profile], defaultFontProfileId: profile.id };
}

function loadFromStorage(): Pick<FontProfilesStoreState, 'profiles' | 'defaultFontProfileId'> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return seedDefaultProfiles();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return seedDefaultProfiles();
    }
    const result = fontProfilesStorageSchema.safeParse(parsed);
    if (!result.success || result.data.profiles.length === 0) {
      return seedDefaultProfiles();
    }
    const { profiles, defaultFontProfileId } = result.data;
    const defaultId =
      defaultFontProfileId !== null && profiles.some((p) => p.id === defaultFontProfileId)
        ? defaultFontProfileId
        : profiles[0]!.id;
    return { profiles, defaultFontProfileId: defaultId };
  } catch {
    return seedDefaultProfiles();
  }
}

/**
 * Registers the `fontProfiles` Alpine store and persists to localStorage.
 */
export function initFontProfileStore(): void {
  const { profiles, defaultFontProfileId } = loadFromStorage();
  Alpine.store('fontProfiles', {
    profiles,
    defaultFontProfileId,
  });
  Alpine.effect(() => {
    const store = Alpine.store('fontProfiles') as FontProfilesStoreState;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        profiles: store.profiles,
        defaultFontProfileId: store.defaultFontProfileId,
      }),
    );
  });
}

/**
 * @returns The current font profiles store snapshot.
 */
export function getFontProfilesStore(): FontProfilesStoreState {
  return Alpine.store('fontProfiles') as FontProfilesStoreState;
}

/**
 * @param id - Profile id.
 * @returns The profile or undefined.
 */
export function getFontProfileById(id: string): FontProfile | undefined {
  return getFontProfilesStore().profiles.find((p) => p.id === id);
}

/**
 * @returns The default profile, or the first profile, or undefined if store is empty.
 */
export function getDefaultFontProfile(): FontProfile | undefined {
  const store = getFontProfilesStore();
  if (store.defaultFontProfileId) {
    const found = store.profiles.find((p) => p.id === store.defaultFontProfileId);
    if (found) return found;
  }
  return store.profiles[0];
}
