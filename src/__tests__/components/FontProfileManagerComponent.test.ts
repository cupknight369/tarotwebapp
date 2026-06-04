/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { FontProfile, FontProfilesStoreState } from '../../types/fontProfile.js';
import type { TextLabel } from '../../types/canvas.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const alpineStores = vi.hoisted(() => new Map<string, unknown>());

const alpineStub = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'fontProfileManagerComponent',
  ),
);

const syncLabelsToFontProfile = vi.hoisted(() => vi.fn());
const applyFontProfileToLabel = vi.hoisted(() => vi.fn());
const clearFontProfileFromLabel = vi.hoisted(() => vi.fn());

vi.mock('alpinejs', () => ({
  default: {
    ...alpineStub.Alpine,
    store(name: string, value?: unknown) {
      if (arguments.length >= 2) {
        alpineStores.set(name, value);
        return;
      }
      return alpineStores.get(name);
    },
  },
}));

vi.mock('../../stores/fontProfileStore.js', () => ({
  getFontProfilesStore: () => alpineStores.get('fontProfiles') as FontProfilesStoreState,
}));

import '../../components/FontProfileManagerComponent.js';

const profileA: FontProfile = {
  id: 'fp-a',
  title: 'Alpha',
  fontSize: 16,
  fontWeight: 400,
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#e5e7eb',
  fixedWidth: false,
  fixedWidthPx: 0,
};

const profileB: FontProfile = {
  ...profileA,
  id: 'fp-b',
  title: 'Beta Bold',
  fontWeight: 700,
};

type ManagerCtx = {
  open: boolean;
  targetTextId: string | null;
  searchQuery: string;
  profileFontSizeInputs: Record<string, string>;
  profileFixedWidthPxInputs: Record<string, string>;
  openModal: (e: CustomEvent<{ textId: string }>) => void;
  closeModal: () => void;
  filteredProfiles: () => FontProfile[];
  assignedProfileIdForTarget: () => string | null;
  setDefaultProfileId: (id: string) => void;
  replaceProfile: (id: string, patch: Partial<FontProfile>) => void;
  applyToTarget: (profileId: string) => void;
  createProfile: () => void;
  deleteProfile: (id: string) => Promise<void>;
  toggleProfileBold: (p: FontProfile) => void;
  $nextTick: (cb?: () => void) => void;
};

function mountStore(profiles: FontProfile[], defaultId: string): void {
  alpineStores.set('fontProfiles', {
    profiles,
    defaultFontProfileId: defaultId,
  });
  alpineStores.set('dialog', { open: false });
}

function mount(overrides: Partial<ManagerCtx> = {}): ManagerCtx {
  const f = alpineStub.getFactory();
  if (!f) throw new Error('fontProfileManagerComponent not registered');
  const base = f() as ManagerCtx;
  return {
    ...base,
    $nextTick: (cb?: () => void) => {
      cb?.();
    },
    ...overrides,
  };
}

describe('FontProfileManagerComponent', () => {
  beforeEach(() => {
    alpineStores.clear();
    syncLabelsToFontProfile.mockClear();
    applyFontProfileToLabel.mockClear();
    clearFontProfileFromLabel.mockClear();
    mountStore([profileA, profileB], profileA.id);
    window.draggableZoneComponent = {
      textLabels: [{ id: 'lbl-1', fontProfileId: 'fp-a' } as TextLabel],
      syncLabelsToFontProfile,
      applyFontProfileToLabel,
      clearFontProfileFromLabel,
    } as unknown as typeof window.draggableZoneComponent;
  });

  it('openModal sets target and filters profiles', () => {
    const ctx = mount();
    ctx.openModal(new CustomEvent('open-font-profile-modal', { detail: { textId: 'lbl-1' } }));
    expect(ctx.open).toBe(true);
    expect(ctx.targetTextId).toBe('lbl-1');
    expect(ctx.filteredProfiles()).toHaveLength(2);
    ctx.searchQuery = 'beta';
    expect(ctx.filteredProfiles()).toHaveLength(1);
    expect(ctx.filteredProfiles()[0]?.title).toBe('Beta Bold');
  });

  it('assignedProfileIdForTarget reads canvas label', () => {
    const ctx = mount();
    ctx.openModal(new CustomEvent('open-font-profile-modal', { detail: { textId: 'lbl-1' } }));
    expect(ctx.assignedProfileIdForTarget()).toBe('fp-a');
  });

  it('replaceProfile syncs linked labels', () => {
    const ctx = mount();
    ctx.replaceProfile('fp-a', { fontSize: 20 });
    const store = alpineStores.get('fontProfiles') as FontProfilesStoreState;
    expect(store.profiles.find((p) => p.id === 'fp-a')?.fontSize).toBe(20);
    expect(syncLabelsToFontProfile).toHaveBeenCalledWith('fp-a');
  });

  it('applyToTarget calls canvas apply', () => {
    const ctx = mount();
    ctx.targetTextId = 'lbl-1';
    ctx.applyToTarget('fp-b');
    expect(applyFontProfileToLabel).toHaveBeenCalledWith('lbl-1', 'fp-b');
  });

  it('createProfile appends a new profile', () => {
    const ctx = mount();
    ctx.createProfile();
    const store = alpineStores.get('fontProfiles') as FontProfilesStoreState;
    expect(store.profiles).toHaveLength(3);
    expect(store.profiles[2]?.title).toBe('New profile');
  });

  it('deleteProfile removes profile when confirmed', async () => {
    const ctx = mount();
    const deletePromise = ctx.deleteProfile('fp-b');
    const dialog = alpineStores.get('dialog') as { onConfirm?: () => void; open?: boolean };
    expect(dialog.open).toBe(true);
    dialog.onConfirm?.();
    await deletePromise;
    const store = alpineStores.get('fontProfiles') as FontProfilesStoreState;
    expect(store.profiles).toHaveLength(1);
    expect(store.profiles[0]?.id).toBe('fp-a');
  });

  it('deleteProfile clears assignment on labels using deleted profile', async () => {
    window.draggableZoneComponent = {
      textLabels: [{ id: 'lbl-1', fontProfileId: 'fp-b' } as TextLabel],
      syncLabelsToFontProfile,
      applyFontProfileToLabel,
      clearFontProfileFromLabel,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = mount();
    const deletePromise = ctx.deleteProfile('fp-b');
    const dialog = alpineStores.get('dialog') as { onConfirm?: () => void };
    dialog.onConfirm?.();
    await deletePromise;
    expect(clearFontProfileFromLabel).toHaveBeenCalledWith('lbl-1');
  });

  it('deleteProfile does nothing when only one profile', async () => {
    mountStore([profileA], profileA.id);
    const ctx = mount();
    await ctx.deleteProfile('fp-a');
    expect((alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles).toHaveLength(1);
  });

  it('toggleProfileBold flips weight', () => {
    const ctx = mount();
    ctx.toggleProfileBold(profileA);
    const store = alpineStores.get('fontProfiles') as FontProfilesStoreState;
    expect(store.profiles[0]?.fontWeight).toBe(700);
  });

  it('closeModal clears state', () => {
    const ctx = mount();
    ctx.openModal(new CustomEvent('open-font-profile-modal', { detail: { textId: 'lbl-1' } }));
    ctx.closeModal();
    expect(ctx.open).toBe(false);
    expect(ctx.targetTextId).toBeNull();
  });

  it('commitProfileTitle ignores blank titles', () => {
    const ctx = mount();
    const before = (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0]?.title;
    ctx.commitProfileTitle('fp-a', '   ');
    expect((alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0]?.title).toBe(
      before,
    );
  });

  it('deleteProfile does nothing when cancelled', async () => {
    const ctx = mount();
    const deletePromise = ctx.deleteProfile('fp-b');
    const dialog = alpineStores.get('dialog') as { onCancel?: () => void };
    dialog.onCancel?.();
    await deletePromise;
    expect((alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles).toHaveLength(2);
  });

  it('setDefaultProfileId updates store', () => {
    const ctx = mount();
    ctx.setDefaultProfileId('fp-b');
    expect((alpineStores.get('fontProfiles') as FontProfilesStoreState).defaultFontProfileId).toBe(
      'fp-b',
    );
  });

  it('setProfileColor and fixed width update profile', () => {
    const ctx = mount();
    ctx.setProfileColor('fp-a', '#112233');
    ctx.setProfileFixedWidth('fp-a', true);
    const p = (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0];
    expect(p?.color).toBe('#112233');
    expect(p?.fixedWidth).toBe(true);
    expect(syncLabelsToFontProfile).toHaveBeenCalled();
  });

  it('applyProfileFontSizeInput clamps and syncs', () => {
    const ctx = mount();
    ctx.profileFontSizeInputs = { 'fp-a': '999' };
    ctx.applyProfileFontSizeInput('fp-a');
    expect(ctx.profileFontSizeInputs['fp-a']).toBe('555');
    expect(
      (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0]?.fontSize,
    ).toBe(555);
  });

  it('toggleProfileItalic and underline flip styles', () => {
    const ctx = mount();
    ctx.toggleProfileItalic(profileA);
    ctx.toggleProfileUnderline(profileA);
    const p = (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0];
    expect(p?.fontStyle).toBe('italic');
    expect(p?.textDecoration).toBe('underline');
  });

  it('assignedProfileIdForTarget returns null without canvas', () => {
    window.draggableZoneComponent = undefined;
    const ctx = mount();
    ctx.targetTextId = 'lbl-1';
    expect(ctx.assignedProfileIdForTarget()).toBeNull();
  });
});
