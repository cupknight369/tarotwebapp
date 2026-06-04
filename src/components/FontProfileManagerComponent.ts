import Alpine from 'alpinejs';

import { createFontProfile, filterFontProfiles } from '../lib/fontProfile.js';
import { numericInputStepDelta, stepBoundedIntegerString } from '../lib/numericInput.js';
import { getFontProfilesStore } from '../stores/fontProfileStore.js';
import type { DialogStoreState } from '../types/dialog.js';
import type { FontProfile, FontProfilesStoreState } from '../types/fontProfile.js';
import {
  clampFixedWidthPx,
  clampLabelFontSize,
  LABEL_FONT_SIZE_MAX,
  LABEL_FONT_SIZE_MIN,
} from '../validation/canvasLabel.js';

function fontProfilesStore(): FontProfilesStoreState {
  return getFontProfilesStore();
}

function confirmDelete(title: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alpine.store('dialog', {
      open: true,
      type: 'confirm',
      title,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    } as DialogStoreState);
  });
}

Alpine.data('fontProfileManagerComponent', () => ({
  open: false,
  targetTextId: null as string | null,
  searchQuery: '',
  profileFontSizeInputs: {} as Record<string, string>,
  profileFixedWidthPxInputs: {} as Record<string, string>,

  filteredProfiles(): FontProfile[] {
    return filterFontProfiles(fontProfilesStore().profiles, this.searchQuery);
  },

  assignedProfileIdForTarget(): string | null {
    const canvas = window.draggableZoneComponent;
    if (!this.targetTextId || !canvas) return null;
    const label = canvas.textLabels.find((l) => l.id === this.targetTextId);
    return label?.fontProfileId ?? null;
  },

  openModal(event: CustomEvent<{ textId: string }>) {
    this.open = true;
    this.targetTextId = event.detail.textId;
    this.searchQuery = '';
    this.syncProfileInputs();
    this.$nextTick(() => {
      const el = document.getElementById('font-profile-search');
      if (el instanceof HTMLInputElement) {
        el.focus();
      }
    });
  },

  syncProfileInputs(): void {
    const fontInputs: Record<string, string> = {};
    const widthInputs: Record<string, string> = {};
    for (const p of fontProfilesStore().profiles) {
      fontInputs[p.id] = String(p.fontSize);
      widthInputs[p.id] = String(p.fixedWidthPx);
    }
    this.profileFontSizeInputs = fontInputs;
    this.profileFixedWidthPxInputs = widthInputs;
  },

  closeModal(): void {
    this.open = false;
    this.targetTextId = null;
    this.searchQuery = '';
  },

  setDefaultProfileId(id: string): void {
    fontProfilesStore().defaultFontProfileId = id;
  },

  replaceProfile(id: string, patch: Partial<FontProfile>): void {
    const store = fontProfilesStore();
    store.profiles = store.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p));
    window.draggableZoneComponent?.syncLabelsToFontProfile(id);
  },

  commitProfileTitle(id: string, title: string): void {
    const trimmed = title.trim();
    if (!trimmed) return;
    this.replaceProfile(id, { title: trimmed });
  },

  toggleProfileBold(profile: FontProfile): void {
    this.replaceProfile(profile.id, {
      fontWeight: profile.fontWeight === 700 ? 400 : 700,
    });
  },

  toggleProfileItalic(profile: FontProfile): void {
    this.replaceProfile(profile.id, {
      fontStyle: profile.fontStyle === 'italic' ? 'normal' : 'italic',
    });
  },

  toggleProfileUnderline(profile: FontProfile): void {
    this.replaceProfile(profile.id, {
      textDecoration: profile.textDecoration === 'underline' ? 'none' : 'underline',
    });
  },

  setProfileColor(id: string, color: string): void {
    this.replaceProfile(id, { color });
  },

  setProfileFixedWidth(id: string, enabled: boolean): void {
    this.replaceProfile(id, { fixedWidth: enabled });
  },

  applyProfileFontSizeInput(id: string): void {
    const parsed = Number.parseInt(this.profileFontSizeInputs[id] ?? '', 10);
    const fontSize = clampLabelFontSize(Number.isFinite(parsed) ? parsed : 16);
    this.profileFontSizeInputs[id] = String(fontSize);
    this.replaceProfile(id, { fontSize });
  },

  handleProfileFontSizeKeydown(id: string, e: KeyboardEvent): void {
    const delta = numericInputStepDelta(e.key);
    if (delta === null) return;
    e.preventDefault();
    this.profileFontSizeInputs[id] = stepBoundedIntegerString(
      this.profileFontSizeInputs[id] ?? '16',
      delta,
      LABEL_FONT_SIZE_MIN,
      LABEL_FONT_SIZE_MAX,
      16,
    );
    this.applyProfileFontSizeInput(id);
  },

  applyProfileFixedWidthPxInput(id: string): void {
    const parsed = Number.parseInt(this.profileFixedWidthPxInputs[id] ?? '', 10);
    const fixedWidthPx = clampFixedWidthPx(Number.isFinite(parsed) ? parsed : 240);
    this.profileFixedWidthPxInputs[id] = String(fixedWidthPx);
    this.replaceProfile(id, { fixedWidthPx });
  },

  handleProfileFixedWidthPxKeydown(id: string, e: KeyboardEvent): void {
    const delta = numericInputStepDelta(e.key);
    if (delta === null) return;
    e.preventDefault();
    this.profileFixedWidthPxInputs[id] = stepBoundedIntegerString(
      this.profileFixedWidthPxInputs[id] ?? '240',
      delta,
      40,
      1200,
      240,
    );
    this.applyProfileFixedWidthPxInput(id);
  },

  applyToTarget(profileId: string): void {
    if (!this.targetTextId) return;
    window.draggableZoneComponent?.applyFontProfileToLabel(this.targetTextId, profileId);
  },

  createProfile(): void {
    const store = fontProfilesStore();
    const source =
      store.profiles.find((p) => p.id === store.defaultFontProfileId) ?? store.profiles[0];
    const { id: _id, title: _title, ...values } = source ?? createFontProfile('Default');
    const profile = createFontProfile('New profile', values);
    store.profiles = [...store.profiles, profile];
    this.profileFontSizeInputs = {
      ...this.profileFontSizeInputs,
      [profile.id]: String(profile.fontSize),
    };
    this.profileFixedWidthPxInputs = {
      ...this.profileFixedWidthPxInputs,
      [profile.id]: String(profile.fixedWidthPx),
    };
  },

  async deleteProfile(id: string): Promise<void> {
    const store = fontProfilesStore();
    if (store.profiles.length <= 1) return;
    const profile = store.profiles.find((p) => p.id === id);
    if (!profile) return;
    const ok = await confirmDelete(`Delete font profile “${profile.title}”?`);
    if (!ok) return;

    if (store.defaultFontProfileId === id) {
      const fallback = store.profiles.find((p) => p.id !== id);
      if (fallback) {
        store.defaultFontProfileId = fallback.id;
      }
    }

    const canvas = window.draggableZoneComponent;
    if (canvas) {
      for (const label of canvas.textLabels) {
        if (label.fontProfileId === id) {
          canvas.clearFontProfileFromLabel(label.id);
        }
      }
    }

    store.profiles = store.profiles.filter((p) => p.id !== id);
    const { [id]: _fs, ...restFont } = this.profileFontSizeInputs;
    const { [id]: _fw, ...restWidth } = this.profileFixedWidthPxInputs;
    this.profileFontSizeInputs = restFont;
    this.profileFixedWidthPxInputs = restWidth;
  },
}));
