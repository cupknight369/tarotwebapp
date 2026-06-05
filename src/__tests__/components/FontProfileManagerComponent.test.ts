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
  syncProfileInputs: () => void;
  filteredProfiles: () => FontProfile[];
  assignedProfileIdForTarget: () => string | null;
  setDefaultProfileId: (id: string) => void;
  replaceProfile: (id: string, patch: Partial<FontProfile>) => void;
  commitProfileTitle: (id: string, title: string) => void;
  applyToTarget: (profileId: string) => void;
  createProfile: () => void;
  deleteProfile: (id: string) => Promise<void>;
  toggleProfileBold: (p: FontProfile) => void;
  toggleProfileItalic: (p: FontProfile) => void;
  toggleProfileUnderline: (p: FontProfile) => void;
  setProfileColor: (id: string, color: string) => void;
  setProfileFixedWidth: (id: string, enabled: boolean) => void;
  applyProfileFontSizeInput: (id: string) => void;
  handleProfileFontSizeKeydown: (id: string, e: KeyboardEvent) => void;
  applyProfileFixedWidthPxInput: (id: string) => void;
  handleProfileFixedWidthPxKeydown: (id: string, e: KeyboardEvent) => void;
  $nextTick: (cb?: () => void) => void;
};

function keyEvent(key: string): KeyboardEvent {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}

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

  it('openModal resets search, syncs inputs, and focuses search field', () => {
    const input = document.createElement('input');
    input.id = 'font-profile-search';
    document.body.appendChild(input);
    const focusSpy = vi.spyOn(input, 'focus');

    const ctx = mount({ searchQuery: 'old', profileFontSizeInputs: {}, profileFixedWidthPxInputs: {} });
    ctx.openModal(new CustomEvent('open-font-profile-modal', { detail: { textId: 'lbl-1' } }));

    expect(ctx.searchQuery).toBe('');
    expect(ctx.profileFontSizeInputs['fp-a']).toBe('16');
    expect(ctx.profileFixedWidthPxInputs['fp-a']).toBe('0');
    expect(focusSpy).toHaveBeenCalledTimes(1);
    input.remove();
  });

  it('openModal skips focus when search input is missing or not an input', () => {
    const ctx = mount();
    expect(() => {
      ctx.openModal(new CustomEvent('open-font-profile-modal', { detail: { textId: 'lbl-1' } }));
    }).not.toThrow();

    const div = document.createElement('div');
    div.id = 'font-profile-search';
    document.body.appendChild(div);
    expect(() => {
      ctx.openModal(new CustomEvent('open-font-profile-modal', { detail: { textId: 'lbl-2' } }));
    }).not.toThrow();
    div.remove();
  });

  it('assignedProfileIdForTarget returns null without target or profile on label', () => {
    const ctx = mount();
    expect(ctx.assignedProfileIdForTarget()).toBeNull();

    ctx.targetTextId = 'lbl-1';
    window.draggableZoneComponent = {
      textLabels: [{ id: 'lbl-1', fontProfileId: null } as TextLabel],
    } as unknown as typeof window.draggableZoneComponent;
    expect(ctx.assignedProfileIdForTarget()).toBeNull();
  });

  it('commitProfileTitle trims and saves non-blank titles', () => {
    const ctx = mount();
    ctx.commitProfileTitle('fp-a', '  Renamed  ');
    expect(
      (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0]?.title,
    ).toBe('Renamed');
  });

  it('applyProfileFontSizeInput falls back to 16 for invalid input', () => {
    const ctx = mount();
    ctx.profileFontSizeInputs = { 'fp-a': 'abc' };
    ctx.applyProfileFontSizeInput('fp-a');
    expect(ctx.profileFontSizeInputs['fp-a']).toBe('16');
    expect(
      (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0]?.fontSize,
    ).toBe(16);
  });

  it('handleProfileFontSizeKeydown steps value and applies on arrow keys', () => {
    const ctx = mount({ profileFontSizeInputs: { 'fp-a': '20' } });
    const up = keyEvent('ArrowUp');
    ctx.handleProfileFontSizeKeydown('fp-a', up);
    expect(up.preventDefault).toHaveBeenCalled();
    expect(ctx.profileFontSizeInputs['fp-a']).toBe('21');
    expect(
      (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0]?.fontSize,
    ).toBe(21);

    const down = keyEvent('ArrowDown');
    ctx.handleProfileFontSizeKeydown('fp-a', down);
    expect(ctx.profileFontSizeInputs['fp-a']).toBe('20');
  });

  it('handleProfileFontSizeKeydown ignores non-step keys', () => {
    const ctx = mount({ profileFontSizeInputs: { 'fp-a': '20' } });
    const ev = keyEvent('Enter');
    ctx.handleProfileFontSizeKeydown('fp-a', ev);
    expect(ev.preventDefault).not.toHaveBeenCalled();
    expect(ctx.profileFontSizeInputs['fp-a']).toBe('20');
  });

  it('applyProfileFixedWidthPxInput clamps and syncs', () => {
    const ctx = mount();
    ctx.profileFixedWidthPxInputs = { 'fp-a': '9999' };
    ctx.applyProfileFixedWidthPxInput('fp-a');
    expect(ctx.profileFixedWidthPxInputs['fp-a']).toBe('1200');
    expect(
      (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0]?.fixedWidthPx,
    ).toBe(1200);
  });

  it('applyProfileFixedWidthPxInput falls back to 240 for invalid input', () => {
    const ctx = mount();
    ctx.profileFixedWidthPxInputs = { 'fp-a': '' };
    ctx.applyProfileFixedWidthPxInput('fp-a');
    expect(ctx.profileFixedWidthPxInputs['fp-a']).toBe('240');
  });

  it('handleProfileFixedWidthPxKeydown steps value and applies on arrow keys', () => {
    const ctx = mount({ profileFixedWidthPxInputs: { 'fp-a': '100' } });
    const up = keyEvent('ArrowUp');
    ctx.handleProfileFixedWidthPxKeydown('fp-a', up);
    expect(up.preventDefault).toHaveBeenCalled();
    expect(ctx.profileFixedWidthPxInputs['fp-a']).toBe('101');
    expect(
      (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0]?.fixedWidthPx,
    ).toBe(101);
  });

  it('handleProfileFixedWidthPxKeydown ignores non-step keys', () => {
    const ctx = mount({ profileFixedWidthPxInputs: { 'fp-a': '100' } });
    const ev = keyEvent('Tab');
    ctx.handleProfileFixedWidthPxKeydown('fp-a', ev);
    expect(ev.preventDefault).not.toHaveBeenCalled();
    expect(ctx.profileFixedWidthPxInputs['fp-a']).toBe('100');
  });

  it('applyProfileFontSizeInput uses empty string when input map omits the id', () => {
    const ctx = mount({ profileFontSizeInputs: {} });
    ctx.applyProfileFontSizeInput('fp-a');
    expect(ctx.profileFontSizeInputs['fp-a']).toBe('16');
  });

  it('applyProfileFixedWidthPxInput uses empty string when input map omits the id', () => {
    const ctx = mount({ profileFixedWidthPxInputs: {} });
    ctx.applyProfileFixedWidthPxInput('fp-a');
    expect(ctx.profileFixedWidthPxInputs['fp-a']).toBe('240');
  });

  it('keydown handlers use fallback strings when input map omits the id', () => {
    const ctx = mount({ profileFontSizeInputs: {}, profileFixedWidthPxInputs: {} });
    ctx.handleProfileFontSizeKeydown('fp-a', keyEvent('ArrowUp'));
    expect(ctx.profileFontSizeInputs['fp-a']).toBe('17');
    ctx.handleProfileFixedWidthPxKeydown('fp-a', keyEvent('ArrowUp'));
    expect(ctx.profileFixedWidthPxInputs['fp-a']).toBe('241');
  });

  it('applyToTarget no-ops when canvas is unavailable', () => {
    window.draggableZoneComponent = undefined;
    const ctx = mount({ targetTextId: 'lbl-1' });
    ctx.applyToTarget('fp-a');
    expect(applyFontProfileToLabel).not.toHaveBeenCalled();
  });

  it('createProfile falls back to first profile when default id is missing', () => {
    mountStore([profileA, profileB], 'unknown-default');
    const ctx = mount();
    ctx.createProfile();
    const store = alpineStores.get('fontProfiles') as FontProfilesStoreState;
    expect(store.profiles[2]?.fontWeight).toBe(400);
  });

  it('deleteProfile skips labels that use a different profile', async () => {
    window.draggableZoneComponent = {
      textLabels: [
        { id: 'lbl-1', fontProfileId: 'fp-a' } as TextLabel,
        { id: 'lbl-2', fontProfileId: 'fp-a' } as TextLabel,
      ],
      syncLabelsToFontProfile,
      applyFontProfileToLabel,
      clearFontProfileFromLabel,
    } as unknown as typeof window.draggableZoneComponent;
    const ctx = mount();
    const deletePromise = ctx.deleteProfile('fp-b');
    (alpineStores.get('dialog') as { onConfirm?: () => void }).onConfirm?.();
    await deletePromise;
    expect(clearFontProfileFromLabel).not.toHaveBeenCalled();
  });

  it('applyToTarget returns early without targetTextId', () => {
    const ctx = mount({ targetTextId: null });
    ctx.applyToTarget('fp-a');
    expect(applyFontProfileToLabel).not.toHaveBeenCalled();
  });

  it('replaceProfile works without canvas component', () => {
    window.draggableZoneComponent = undefined;
    const ctx = mount();
    ctx.replaceProfile('fp-a', { color: '#abcdef' });
    expect(
      (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0]?.color,
    ).toBe('#abcdef');
    expect(syncLabelsToFontProfile).not.toHaveBeenCalled();
  });

  it('createProfile seeds from default profile when store has profiles', () => {
    mountStore([profileA, profileB], profileB.id);
    const ctx = mount();
    ctx.createProfile();
    const store = alpineStores.get('fontProfiles') as FontProfilesStoreState;
    expect(store.profiles).toHaveLength(3);
    expect(store.profiles[2]?.fontWeight).toBe(700);
    expect(ctx.profileFontSizeInputs[store.profiles[2]!.id]).toBe('16');
    expect(ctx.profileFixedWidthPxInputs[store.profiles[2]!.id]).toBe('0');
  });

  it('createProfile uses built-in defaults when store is empty', () => {
    mountStore([], 'missing-default');
    const ctx = mount();
    ctx.createProfile();
    const store = alpineStores.get('fontProfiles') as FontProfilesStoreState;
    expect(store.profiles).toHaveLength(1);
    expect(store.profiles[0]?.title).toBe('New profile');
  });

  it('deleteProfile is a no-op for unknown profile id', async () => {
    const ctx = mount();
    await ctx.deleteProfile('missing');
    expect((alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles).toHaveLength(2);
  });

  it('deleteProfile reassigns default id when deleting the default profile', async () => {
    mountStore([profileA, profileB], profileB.id);
    const ctx = mount();
    const deletePromise = ctx.deleteProfile('fp-b');
    (alpineStores.get('dialog') as { onConfirm?: () => void }).onConfirm?.();
    await deletePromise;
    const store = alpineStores.get('fontProfiles') as FontProfilesStoreState;
    expect(store.defaultFontProfileId).toBe('fp-a');
    expect(store.profiles.map((p) => p.id)).toEqual(['fp-a']);
  });

  it('deleteProfile keeps default id when no alternate profile exists', async () => {
    const duplicateB: FontProfile = { ...profileB, title: 'Beta duplicate' };
    mountStore([duplicateB, profileB], profileB.id);
    const ctx = mount();
    const deletePromise = ctx.deleteProfile('fp-b');
    (alpineStores.get('dialog') as { onConfirm?: () => void }).onConfirm?.();
    await deletePromise;
    const store = alpineStores.get('fontProfiles') as FontProfilesStoreState;
    expect(store.defaultFontProfileId).toBe('fp-b');
    expect(store.profiles).toHaveLength(0);
  });

  it('deleteProfile removes profile without canvas labels to clear', async () => {
    window.draggableZoneComponent = undefined;
    const ctx = mount();
    const deletePromise = ctx.deleteProfile('fp-b');
    (alpineStores.get('dialog') as { onConfirm?: () => void }).onConfirm?.();
    await deletePromise;
    expect(clearFontProfileFromLabel).not.toHaveBeenCalled();
    expect((alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles).toHaveLength(1);
  });

  it('toggleProfileBold flips back to normal weight', () => {
    const ctx = mount();
    ctx.toggleProfileBold(profileB);
    expect(
      (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[1]?.fontWeight,
    ).toBe(400);
  });

  it('toggleProfileItalic and underline flip back to normal styles', () => {
    const italic: FontProfile = { ...profileA, fontStyle: 'italic', textDecoration: 'underline' };
    mountStore([italic, profileB], profileA.id);
    const ctx = mount();
    ctx.toggleProfileItalic(italic);
    ctx.toggleProfileUnderline(italic);
    const p = (alpineStores.get('fontProfiles') as FontProfilesStoreState).profiles[0];
    expect(p?.fontStyle).toBe('normal');
    expect(p?.textDecoration).toBe('none');
  });

  it('syncProfileInputs rebuilds input maps from store profiles', () => {
    const ctx = mount();
    ctx.profileFontSizeInputs = {};
    ctx.profileFixedWidthPxInputs = {};
    ctx.syncProfileInputs();
    expect(ctx.profileFontSizeInputs).toEqual({ 'fp-a': '16', 'fp-b': '16' });
    expect(ctx.profileFixedWidthPxInputs).toEqual({ 'fp-a': '0', 'fp-b': '0' });
  });
});
