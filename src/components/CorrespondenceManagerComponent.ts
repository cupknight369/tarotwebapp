import Alpine from 'alpinejs';

import {
  createCorrespondenceGroup,
  deleteCorrespondence,
  deleteCorrespondenceGroup,
  listCorrespondenceGroups,
  listCorrespondencesGrouped,
  putCorrespondenceGroup,
  upsertCorrespondence,
  type CorrespondenceGroupSection,
} from '../lib/localCorrespondences.js';
import { logError } from '../lib/logError.js';
import type { LocalCorrespondenceGroupRow, LocalCorrespondenceRow } from '../types/localDb.js';
import { DEFAULT_CORRESPONDENCE_GROUP_ID } from '../types/localDb.js';
import {
  correspondenceGroupCreateSchema,
  correspondenceUpsertSchema,
} from '../validation/correspondences.js';
import { zodFirstIssue } from '../validation/zodErrors.js';

/**
 * @param query - Raw search string from the library tab.
 * @param title - Correspondence title to test.
 * @returns True when `query` is empty/whitespace, or when title contains the trimmed query
 *   case-insensitively.
 */
function correspondenceMatchesLibrarySearch(query: string, title: string): boolean {
  const raw = query.trim();
  if (raw === '') return true;
  return title.toLowerCase().includes(raw.toLowerCase());
}

Alpine.data('correspondenceManagerComponent', () => ({
  open: false,
  loading: false,
  error: null as string | null,
  tab: 'library' as 'library' | 'groups',
  librarySearchQuery: '',
  sections: [] as CorrespondenceGroupSection[],
  groupsOnly: [] as LocalCorrespondenceGroupRow[],
  newGroupTitle: '',
  editingCorrespondenceId: null as string | null,
  formTitle: '',
  formDescription: '',
  formGroupId: DEFAULT_CORRESPONDENCE_GROUP_ID,
  clearThumbnail: false,
  renamingGroupId: null as string | null,
  renameGroupTitle: '',

  filteredLibrarySections(): CorrespondenceGroupSection[] {
    return this.sections
      .map((sec) => ({
        group: sec.group,
        items: sec.items.filter((item) =>
          correspondenceMatchesLibrarySearch(this.librarySearchQuery, item.title),
        ),
      }))
      .filter((sec) => sec.items.length > 0);
  },

  totalLibraryCorrespondenceCount(): number {
    return this.sections.reduce((n, sec) => n + sec.items.length, 0);
  },

  async refresh() {
    this.loading = true;
    this.error = null;
    try {
      this.sections = await listCorrespondencesGrouped();
      this.groupsOnly = await listCorrespondenceGroups();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Failed to load';
      logError('correspondenceManager.refresh', e);
    } finally {
      this.loading = false;
    }
  },

  async openManager() {
    this.open = true;
    await this.refresh();
  },

  closeManager() {
    this.open = false;
    this.editingCorrespondenceId = null;
    this.renamingGroupId = null;
    this.librarySearchQuery = '';
    window.dispatchEvent(new CustomEvent('correspondences-changed'));
  },

  handleManagerEscape(): boolean {
    if (!this.open) {
      return false;
    }
    if (this.editingCorrespondenceId) {
      this.cancelForm();
      return true;
    }
    if (this.renamingGroupId) {
      this.cancelRenameGroup();
      return true;
    }
    this.closeManager();
    return true;
  },

  init() {
    window.correspondenceManagerComponent = this;
  },

  startCreateCorrespondence() {
    this.editingCorrespondenceId = 'new';
    this.formTitle = '';
    this.formDescription = '';
    this.formGroupId = DEFAULT_CORRESPONDENCE_GROUP_ID;
    this.clearThumbnail = false;
    const el = document.getElementById('corr-manager-thumb') as HTMLInputElement | null;
    if (el) el.value = '';
  },

  startEditCorrespondence(row: LocalCorrespondenceRow) {
    this.editingCorrespondenceId = row.id;
    this.formTitle = row.title;
    this.formDescription = row.description ?? '';
    this.formGroupId = row.group_id;
    this.clearThumbnail = false;
    const el = document.getElementById('corr-manager-thumb') as HTMLInputElement | null;
    if (el) el.value = '';
  },

  cancelForm() {
    this.editingCorrespondenceId = null;
    const el = document.getElementById('corr-manager-thumb') as HTMLInputElement | null;
    if (el) el.value = '';
  },

  async saveCorrespondence() {
    const parsed = correspondenceUpsertSchema.safeParse({
      title: this.formTitle,
      description: this.formDescription,
      groupId: this.formGroupId,
    });
    if (!parsed.success) {
      this.error = zodFirstIssue(parsed.error);
      return;
    }
    const thumbInput = document.getElementById('corr-manager-thumb') as HTMLInputElement | null;
    const file = thumbInput?.files?.[0];
    this.error = null;
    try {
      await upsertCorrespondence({
        id:
          this.editingCorrespondenceId === 'new'
            ? undefined
            : (this.editingCorrespondenceId ?? undefined),
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        group_id: parsed.data.groupId,
        thumbnailFile: file && file.size > 0 ? file : null,
        clearThumbnail: this.clearThumbnail,
      });
      if (thumbInput) thumbInput.value = '';
      this.cancelForm();
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Save failed';
      logError('correspondenceManager.saveCorrespondence', e);
    }
  },

  async addGroup() {
    const parsed = correspondenceGroupCreateSchema.safeParse({ title: this.newGroupTitle });
    if (!parsed.success) {
      this.error = zodFirstIssue(parsed.error);
      return;
    }
    this.error = null;
    try {
      await createCorrespondenceGroup(parsed.data.title);
      this.newGroupTitle = '';
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Could not create group';
      logError('correspondenceManager.addGroup', e);
    }
  },

  startRenameGroup(g: LocalCorrespondenceGroupRow) {
    this.renamingGroupId = g.id;
    this.renameGroupTitle = g.title;
  },

  cancelRenameGroup() {
    this.renamingGroupId = null;
    this.renameGroupTitle = '';
  },

  async saveRenameGroup() {
    if (!this.renamingGroupId) return;
    const parsed = correspondenceGroupCreateSchema.safeParse({ title: this.renameGroupTitle });
    if (!parsed.success) {
      this.error = zodFirstIssue(parsed.error);
      return;
    }
    this.error = null;
    try {
      await putCorrespondenceGroup({ id: this.renamingGroupId, title: parsed.data.title });
      this.cancelRenameGroup();
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Rename failed';
      logError('correspondenceManager.saveRenameGroup', e);
    }
  },

  async confirmDeleteCorrespondence(row: LocalCorrespondenceRow) {
    const ok = await new Promise<boolean>((resolve) => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: `Delete correspondence “${row.title}”?`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        cancelLabelVisible: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!ok) return;
    this.error = null;
    try {
      await deleteCorrespondence(row.id);
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Delete failed';
      logError('correspondenceManager.confirmDeleteCorrespondence', e);
    }
  },

  async confirmDeleteGroup(g: LocalCorrespondenceGroupRow) {
    if (g.id === DEFAULT_CORRESPONDENCE_GROUP_ID) return;
    const ok = await new Promise<boolean>((resolve) => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: `Delete group “${g.title}”? Correspondences move to Default.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        cancelLabelVisible: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!ok) return;
    this.error = null;
    try {
      await deleteCorrespondenceGroup(g.id);
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Delete failed';
      logError('correspondenceManager.confirmDeleteGroup', e);
    }
  },
}));
