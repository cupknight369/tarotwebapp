import Alpine from 'alpinejs';

import {
  createCorrespondenceGroup,
  deleteCorrespondence,
  deleteCorrespondenceGroup,
  getCachedCorrespondenceThumbUrl,
  getCorrespondenceImageRow,
  isCorrespondenceThumbUrlManagedByCache,
  listCorrespondenceGroups,
  listCorrespondencesGrouped,
  putCorrespondenceGroup,
  setCachedCorrespondenceThumbUrl,
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
  editingThumbnailBlobId: null as string | null,
  pendingUploadPreviewUrl: null as string | null,
  loadedExistingPreviewUrl: null as string | null,
  renamingGroupId: null as string | null,
  renameGroupTitle: '',
  selectedCorrespondenceIds: [] as string[],

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

  filteredLibraryCorrespondenceIds(): string[] {
    return this.filteredLibrarySections().flatMap((sec) => sec.items.map((item) => item.id));
  },

  isCorrespondenceSelected(id: string): boolean {
    return this.selectedCorrespondenceIds.includes(id);
  },

  toggleCorrespondenceSelection(id: string): void {
    if (this.isCorrespondenceSelected(id)) {
      this.selectedCorrespondenceIds = this.selectedCorrespondenceIds.filter((x) => x !== id);
    } else {
      this.selectedCorrespondenceIds = [...this.selectedCorrespondenceIds, id];
    }
  },

  selectAllCorrespondences(): void {
    this.selectedCorrespondenceIds = this.filteredLibraryCorrespondenceIds();
  },

  clearCorrespondenceSelection(): void {
    this.selectedCorrespondenceIds = [];
  },

  correspondencesInFilteredLibraryGroup(groupId: string): LocalCorrespondenceRow[] {
    const section = this.filteredLibrarySections().find((s) => s.group.id === groupId);
    return section?.items ?? [];
  },

  isLibraryCorrespondenceGroupSelected(groupId: string): boolean {
    const items = this.correspondencesInFilteredLibraryGroup(groupId);
    if (items.length === 0) return false;
    return items.every((item) => this.selectedCorrespondenceIds.includes(item.id));
  },

  toggleLibraryCorrespondenceGroupSelection(groupId: string): void {
    const items = this.correspondencesInFilteredLibraryGroup(groupId);
    const ids = items.map((item) => item.id);
    if (ids.length === 0) return;
    if (this.isLibraryCorrespondenceGroupSelected(groupId)) {
      const remove = new Set(ids);
      this.selectedCorrespondenceIds = this.selectedCorrespondenceIds.filter(
        (id) => !remove.has(id),
      );
    } else {
      const merged = new Set([...this.selectedCorrespondenceIds, ...ids]);
      this.selectedCorrespondenceIds = [...merged];
    }
  },

  correspondenceTitleById(id: string): string | undefined {
    for (const sec of this.sections) {
      const row = sec.items.find((item) => item.id === id);
      if (row) return row.title;
    }
    return undefined;
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
    this.selectedCorrespondenceIds = [];
    await this.refresh();
    this.focusLibrarySearchInput();
  },

  focusLibrarySearchInput(this: {
    tab: 'library' | 'groups';
    $nextTick: (cb?: () => void) => void;
  }) {
    if (this.tab !== 'library') {
      return;
    }
    this.$nextTick(() => {
      const el = document.getElementById('corr-manager-search');
      if (el instanceof HTMLInputElement) {
        el.focus();
      }
    });
  },

  closeManager() {
    this.open = false;
    this.clearThumbnailPreviewState();
    this.editingCorrespondenceId = null;
    this.renamingGroupId = null;
    this.librarySearchQuery = '';
    this.selectedCorrespondenceIds = [];
    window.dispatchEvent(new CustomEvent('correspondences-changed'));
  },

  revokePendingUploadPreview(): void {
    if (this.pendingUploadPreviewUrl) {
      URL.revokeObjectURL(this.pendingUploadPreviewUrl);
      this.pendingUploadPreviewUrl = null;
    }
  },

  clearThumbnailPreviewState(): void {
    this.revokePendingUploadPreview();
    if (
      this.loadedExistingPreviewUrl &&
      !isCorrespondenceThumbUrlManagedByCache(this.loadedExistingPreviewUrl)
    ) {
      URL.revokeObjectURL(this.loadedExistingPreviewUrl);
    }
    this.loadedExistingPreviewUrl = null;
    this.editingThumbnailBlobId = null;
  },

  thumbnailPreviewUrl(): string | null {
    if (this.clearThumbnail) return null;
    if (this.pendingUploadPreviewUrl) return this.pendingUploadPreviewUrl;
    return this.loadedExistingPreviewUrl;
  },

  async loadExistingThumbnailPreview(blobId: string | null): Promise<void> {
    if (
      this.loadedExistingPreviewUrl &&
      !isCorrespondenceThumbUrlManagedByCache(this.loadedExistingPreviewUrl)
    ) {
      URL.revokeObjectURL(this.loadedExistingPreviewUrl);
    }
    this.loadedExistingPreviewUrl = null;
    this.editingThumbnailBlobId = blobId;
    if (!blobId) return;

    let url = getCachedCorrespondenceThumbUrl(blobId);
    if (!url) {
      const row = await getCorrespondenceImageRow(blobId);
      if (!row?.blob) return;
      url = URL.createObjectURL(row.blob);
      setCachedCorrespondenceThumbUrl(blobId, url);
    }
    this.loadedExistingPreviewUrl = url;
  },

  onThumbnailFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    this.revokePendingUploadPreview();
    if (file && file.size > 0) {
      this.pendingUploadPreviewUrl = URL.createObjectURL(file);
    }
  },

  onClearThumbnailChange(): void {
    if (!this.clearThumbnail && this.editingThumbnailBlobId && !this.pendingUploadPreviewUrl) {
      void this.loadExistingThumbnailPreview(this.editingThumbnailBlobId);
    }
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
    this.clearThumbnailPreviewState();
    this.editingCorrespondenceId = 'new';
    this.formTitle = '';
    this.formDescription = '';
    this.formGroupId = DEFAULT_CORRESPONDENCE_GROUP_ID;
    this.clearThumbnail = false;
    const el = document.getElementById('corr-manager-thumb') as HTMLInputElement | null;
    if (el) el.value = '';
  },

  startEditCorrespondence(row: LocalCorrespondenceRow) {
    this.clearThumbnailPreviewState();
    this.editingCorrespondenceId = row.id;
    this.formTitle = row.title;
    this.formDescription = row.description ?? '';
    this.formGroupId = row.group_id;
    this.clearThumbnail = false;
    const el = document.getElementById('corr-manager-thumb') as HTMLInputElement | null;
    if (el) el.value = '';
    void this.loadExistingThumbnailPreview(row.thumbnailBlobId);
  },

  cancelForm() {
    this.clearThumbnailPreviewState();
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
      this.selectedCorrespondenceIds = this.selectedCorrespondenceIds.filter((id) => id !== row.id);
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Delete failed';
      logError('correspondenceManager.confirmDeleteCorrespondence', e);
    }
  },

  async confirmAndDeleteSelectedCorrespondences() {
    if (this.selectedCorrespondenceIds.length === 0) return;
    const n = this.selectedCorrespondenceIds.length;
    const title =
      n === 1
        ? `Delete correspondence “${this.correspondenceTitleById(this.selectedCorrespondenceIds[0]) ?? 'this entry'}”?`
        : `Delete ${n} correspondences?`;
    const ok = await new Promise<boolean>((resolve) => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        cancelLabelVisible: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!ok) return;
    this.error = null;
    const ids = [...this.selectedCorrespondenceIds];
    try {
      for (const id of ids) {
        await deleteCorrespondence(id);
      }
      this.selectedCorrespondenceIds = [];
      await this.refresh();
    } catch (e) {
      this.error = e instanceof Error ? e.message : 'Delete failed';
      logError('correspondenceManager.confirmAndDeleteSelectedCorrespondences', e);
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
