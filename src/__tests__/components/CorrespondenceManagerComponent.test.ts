/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CorrespondenceGroupSection } from '../../lib/localCorrespondences.js';
import type { LocalCorrespondenceRow } from '../../types/localDb.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const correspondenceMocks = vi.hoisted(() => ({
  listCorrespondencesGrouped: vi.fn(),
  listCorrespondenceGroups: vi.fn(),
}));

const alpineStub = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'correspondenceManagerComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineStub.Alpine,
}));

vi.mock('../../lib/localCorrespondences.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/localCorrespondences.js')>();
  return {
    ...actual,
    createCorrespondenceGroup: vi.fn(),
    deleteCorrespondence: vi.fn(),
    deleteCorrespondenceGroup: vi.fn(),
    listCorrespondenceGroups: correspondenceMocks.listCorrespondenceGroups,
    listCorrespondencesGrouped: correspondenceMocks.listCorrespondencesGrouped,
    putCorrespondenceGroup: vi.fn(),
    upsertCorrespondence: vi.fn(),
  };
});

import {
  createCorrespondenceGroup,
  deleteCorrespondence,
  deleteCorrespondenceGroup,
  putCorrespondenceGroup,
  upsertCorrespondence,
} from '../../lib/localCorrespondences.js';
import { DEFAULT_CORRESPONDENCE_GROUP_ID } from '../../types/localDb.js';
import '../../components/CorrespondenceManagerComponent.js';

function corr(id: string, title: string, groupId = 'g-default'): LocalCorrespondenceRow {
  return {
    id,
    title,
    description: null,
    group_id: groupId,
    thumbnailBlobId: null,
  };
}

function section(
  groupId: string,
  groupTitle: string,
  items: LocalCorrespondenceRow[],
): CorrespondenceGroupSection {
  return {
    group: { id: groupId, title: groupTitle },
    items,
  };
}

type CorrespondenceManagerInstance = {
  open: boolean;
  editingCorrespondenceId: string | null;
  renamingGroupId: string | null;
  librarySearchQuery: string;
  sections: CorrespondenceGroupSection[];
  selectedCorrespondenceIds: string[];
  error: string | null;
  closeManager: () => void;
  openManager: () => Promise<void>;
  cancelForm: () => void;
  cancelRenameGroup: () => void;
  handleManagerEscape: () => boolean;
  init: () => void;
  refresh: () => Promise<void>;
  filteredLibrarySections: () => CorrespondenceGroupSection[];
  filteredLibraryCorrespondenceIds: () => string[];
  totalLibraryCorrespondenceCount: () => number;
  isCorrespondenceSelected: (id: string) => boolean;
  toggleCorrespondenceSelection: (id: string) => void;
  selectAllCorrespondences: () => void;
  clearCorrespondenceSelection: () => void;
  correspondencesInFilteredLibraryGroup: (groupId: string) => LocalCorrespondenceRow[];
  isLibraryCorrespondenceGroupSelected: (groupId: string) => boolean;
  toggleLibraryCorrespondenceGroupSelection: (groupId: string) => void;
  correspondenceTitleById: (id: string) => string | undefined;
  confirmDeleteCorrespondence: (row: LocalCorrespondenceRow) => Promise<void>;
  confirmAndDeleteSelectedCorrespondences: () => Promise<void>;
  confirmDeleteGroup: (g: { id: string; title: string }) => Promise<void>;
  formTitle: string;
  formDescription: string;
  formGroupId: string;
  clearThumbnail: boolean;
  newGroupTitle: string;
  renameGroupTitle: string;
  renamingGroupId: string | null;
  loading: boolean;
  startCreateCorrespondence: () => void;
  startEditCorrespondence: (row: LocalCorrespondenceRow) => void;
  cancelForm: () => void;
  saveCorrespondence: () => Promise<void>;
  addGroup: () => Promise<void>;
  startRenameGroup: (g: { id: string; title: string }) => void;
  saveRenameGroup: () => Promise<void>;
};

function mount(): CorrespondenceManagerInstance {
  const factory = alpineStub.getFactory();
  if (!factory) {
    throw new Error('correspondenceManagerComponent factory was not registered');
  }
  return factory() as CorrespondenceManagerInstance;
}

describe('correspondenceManagerComponent (CorrespondenceManagerComponent.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    correspondenceMocks.listCorrespondencesGrouped.mockResolvedValue([]);
    correspondenceMocks.listCorrespondenceGroups.mockResolvedValue([]);
    alpineStub.rawStores.dialog = undefined;
    window.correspondenceManagerComponent = undefined;
  });

  it('handleManagerEscape returns false when manager is closed', () => {
    const ctx = mount();
    expect(ctx.handleManagerEscape.call(ctx)).toBe(false);
  });

  it('handleManagerEscape closes the manager when open', () => {
    const ctx = mount();
    ctx.open = true;
    expect(ctx.handleManagerEscape.call(ctx)).toBe(true);
    expect(ctx.open).toBe(false);
  });

  it('handleManagerEscape cancels an in-progress correspondence form first', () => {
    const ctx = mount();
    ctx.open = true;
    ctx.editingCorrespondenceId = 'new';
    expect(ctx.handleManagerEscape.call(ctx)).toBe(true);
    expect(ctx.editingCorrespondenceId).toBeNull();
    expect(ctx.open).toBe(true);
  });

  it('handleManagerEscape cancels group rename before closing the manager', () => {
    const ctx = mount();
    ctx.open = true;
    ctx.renamingGroupId = 'group-1';
    expect(ctx.handleManagerEscape.call(ctx)).toBe(true);
    expect(ctx.renamingGroupId).toBeNull();
    expect(ctx.open).toBe(true);
  });

  it('init registers correspondenceManagerComponent on window', () => {
    const ctx = mount();
    ctx.init();
    expect(window.correspondenceManagerComponent).toBe(ctx);
  });

  it('closeManager clears selectedCorrespondenceIds', () => {
    const ctx = mount();
    ctx.selectedCorrespondenceIds = ['a'];
    ctx.closeManager.call(ctx);
    expect(ctx.selectedCorrespondenceIds).toEqual([]);
  });

  it('openManager clears selectedCorrespondenceIds', async () => {
    const ctx = mount();
    ctx.selectedCorrespondenceIds = ['a'];
    ctx.refresh = vi.fn().mockResolvedValue(undefined);
    await ctx.openManager.call(ctx);
    expect(ctx.selectedCorrespondenceIds).toEqual([]);
    expect(ctx.open).toBe(true);
  });

  it('filteredLibrarySections filters by librarySearchQuery', () => {
    const ctx = mount();
    ctx.sections = [
      section('g1', 'G1', [corr('a', 'Alpha'), corr('b', 'Beta')]),
      section('g2', 'G2', [corr('c', 'Gamma')]),
    ];
    ctx.librarySearchQuery = 'al';
    const filtered = ctx.filteredLibrarySections.call(ctx);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].items.map((i) => i.id)).toEqual(['a']);
  });

  it('filteredLibrarySections returns all items when search is empty', () => {
    const ctx = mount();
    ctx.sections = [section('g1', 'G1', [corr('a', 'Alpha')])];
    ctx.librarySearchQuery = '   ';
    expect(ctx.filteredLibrarySections.call(ctx)[0].items).toHaveLength(1);
  });

  it('totalLibraryCorrespondenceCount sums all sections', () => {
    const ctx = mount();
    ctx.sections = [
      section('g1', 'G1', [corr('a', 'A'), corr('b', 'B')]),
      section('g2', 'G2', [corr('c', 'C')]),
    ];
    expect(ctx.totalLibraryCorrespondenceCount.call(ctx)).toBe(3);
  });

  it('isCorrespondenceSelected and toggleCorrespondenceSelection add and remove ids', () => {
    const ctx = mount();
    expect(ctx.isCorrespondenceSelected.call(ctx, 'a')).toBe(false);
    ctx.toggleCorrespondenceSelection.call(ctx, 'a');
    expect(ctx.isCorrespondenceSelected.call(ctx, 'a')).toBe(true);
    expect(ctx.selectedCorrespondenceIds).toEqual(['a']);
    ctx.toggleCorrespondenceSelection.call(ctx, 'a');
    expect(ctx.selectedCorrespondenceIds).toEqual([]);
  });

  it('selectAllCorrespondences selects filtered correspondence ids only', () => {
    const ctx = mount();
    ctx.sections = [
      section('g1', 'G1', [corr('a', 'Alpha'), corr('b', 'Beta'), corr('c', 'Alpine')]),
    ];
    ctx.librarySearchQuery = 'al';
    ctx.selectAllCorrespondences.call(ctx);
    expect(ctx.selectedCorrespondenceIds).toEqual(['a', 'c']);
  });

  it('clearCorrespondenceSelection empties selectedCorrespondenceIds', () => {
    const ctx = mount();
    ctx.selectedCorrespondenceIds = ['a', 'b'];
    ctx.clearCorrespondenceSelection.call(ctx);
    expect(ctx.selectedCorrespondenceIds).toEqual([]);
  });

  it('toggleLibraryCorrespondenceGroupSelection selects and deselects items in filtered group', () => {
    const ctx = mount();
    ctx.sections = [
      section('g1', 'G1', [corr('r1', 'A', 'g1'), corr('r2', 'B', 'g1')]),
      section('g2', 'G2', [corr('r3', 'C', 'g2')]),
    ];
    ctx.toggleLibraryCorrespondenceGroupSelection.call(ctx, 'g1');
    expect(ctx.selectedCorrespondenceIds).toEqual(['r1', 'r2']);
    expect(ctx.isLibraryCorrespondenceGroupSelected.call(ctx, 'g1')).toBe(true);
    expect(ctx.isLibraryCorrespondenceGroupSelected.call(ctx, 'g2')).toBe(false);
    ctx.toggleLibraryCorrespondenceGroupSelection.call(ctx, 'g1');
    expect(ctx.selectedCorrespondenceIds).toEqual([]);
  });

  it('toggleLibraryCorrespondenceGroupSelection respects search filter within group', () => {
    const ctx = mount();
    ctx.sections = [section('g1', 'G1', [corr('r1', 'Alpha', 'g1'), corr('r2', 'Beta', 'g1')])];
    ctx.librarySearchQuery = 'alpha';
    ctx.toggleLibraryCorrespondenceGroupSelection.call(ctx, 'g1');
    expect(ctx.selectedCorrespondenceIds).toEqual(['r1']);
    expect(ctx.isLibraryCorrespondenceGroupSelected.call(ctx, 'g1')).toBe(true);
  });

  it('isLibraryCorrespondenceGroupSelected is false when group has no visible items', () => {
    const ctx = mount();
    ctx.sections = [section('g1', 'Empty', [])];
    expect(ctx.isLibraryCorrespondenceGroupSelected.call(ctx, 'g1')).toBe(false);
    ctx.toggleLibraryCorrespondenceGroupSelection.call(ctx, 'g1');
    expect(ctx.selectedCorrespondenceIds).toEqual([]);
  });

  it('correspondencesInFilteredLibraryGroup returns empty for unknown group', () => {
    const ctx = mount();
    ctx.sections = [section('g1', 'G1', [corr('a', 'A')])];
    expect(ctx.correspondencesInFilteredLibraryGroup.call(ctx, 'missing')).toEqual([]);
  });

  it('correspondenceTitleById finds title in sections', () => {
    const ctx = mount();
    ctx.sections = [section('g1', 'G1', [corr('a', 'My Title')])];
    expect(ctx.correspondenceTitleById.call(ctx, 'a')).toBe('My Title');
    expect(ctx.correspondenceTitleById.call(ctx, 'missing')).toBeUndefined();
  });

  it('confirmAndDeleteSelectedCorrespondences is a no-op when nothing is selected', async () => {
    const ctx = mount();
    await ctx.confirmAndDeleteSelectedCorrespondences.call(ctx);
    expect(alpineStub.rawStores.dialog).toBeUndefined();
    expect(deleteCorrespondence).not.toHaveBeenCalled();
  });

  it('confirmAndDeleteSelectedCorrespondences returns when user cancels', async () => {
    const ctx = mount();
    ctx.selectedCorrespondenceIds = ['c1', 'c2'];
    const p = ctx.confirmAndDeleteSelectedCorrespondences.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    await p;
    expect(deleteCorrespondence).not.toHaveBeenCalled();
    expect(ctx.selectedCorrespondenceIds).toEqual(['c1', 'c2']);
  });

  it('confirmAndDeleteSelectedCorrespondences deletes multiple ids and clears selection', async () => {
    const ctx = mount();
    ctx.selectedCorrespondenceIds = ['c1', 'c2'];
    ctx.refresh = vi.fn().mockResolvedValue(undefined);
    const p = ctx.confirmAndDeleteSelectedCorrespondences.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(deleteCorrespondence).toHaveBeenCalledWith('c1');
    expect(deleteCorrespondence).toHaveBeenCalledWith('c2');
    expect(ctx.selectedCorrespondenceIds).toEqual([]);
    expect(ctx.refresh).toHaveBeenCalled();
  });

  it('confirmAndDeleteSelectedCorrespondences uses singular confirm title for one item', async () => {
    const ctx = mount();
    ctx.sections = [section('g1', 'G1', [corr('solo', 'Solo Name')])];
    ctx.selectedCorrespondenceIds = ['solo'];
    const p = ctx.confirmAndDeleteSelectedCorrespondences.call(ctx);
    await Promise.resolve();
    const dialog = alpineStub.rawStores.dialog as { title: string; onCancel: () => void };
    expect(dialog.title).toBe('Delete correspondence “Solo Name”?');
    dialog.onCancel();
    await p;
  });

  it('confirmAndDeleteSelectedCorrespondences uses plural confirm title for multiple items', async () => {
    const ctx = mount();
    ctx.selectedCorrespondenceIds = ['a', 'b'];
    const p = ctx.confirmAndDeleteSelectedCorrespondences.call(ctx);
    await Promise.resolve();
    const dialog = alpineStub.rawStores.dialog as { title: string; onCancel: () => void };
    expect(dialog.title).toBe('Delete 2 correspondences?');
    dialog.onCancel();
    await p;
  });

  it('confirmAndDeleteSelectedCorrespondences sets error when deleteCorrespondence throws', async () => {
    vi.mocked(deleteCorrespondence).mockRejectedValueOnce(new Error('boom'));
    const ctx = mount();
    ctx.selectedCorrespondenceIds = ['c1'];
    const p = ctx.confirmAndDeleteSelectedCorrespondences.call(ctx);
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.error).toBe('boom');
    expect(ctx.selectedCorrespondenceIds).toEqual(['c1']);
  });

  it('confirmDeleteCorrespondence returns when user cancels', async () => {
    const ctx = mount();
    const p = ctx.confirmDeleteCorrespondence.call(ctx, corr('x', 'X'));
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    await p;
    expect(deleteCorrespondence).not.toHaveBeenCalled();
  });

  it('confirmDeleteCorrespondence deletes and removes id from selection', async () => {
    const ctx = mount();
    ctx.selectedCorrespondenceIds = ['x', 'y'];
    ctx.refresh = vi.fn().mockResolvedValue(undefined);
    const p = ctx.confirmDeleteCorrespondence.call(ctx, corr('x', 'X'));
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(deleteCorrespondence).toHaveBeenCalledWith('x');
    expect(ctx.selectedCorrespondenceIds).toEqual(['y']);
  });

  it('confirmDeleteCorrespondence sets error when delete fails', async () => {
    vi.mocked(deleteCorrespondence).mockRejectedValueOnce(new Error('fail'));
    const ctx = mount();
    ctx.refresh = vi.fn().mockResolvedValue(undefined);
    const p = ctx.confirmDeleteCorrespondence.call(ctx, corr('x', 'X'));
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.error).toBe('fail');
  });

  it('filteredLibraryCorrespondenceIds returns ids from filtered sections', () => {
    const ctx = mount();
    ctx.sections = [section('g1', 'G1', [corr('a', 'A'), corr('b', 'B')])];
    expect(ctx.filteredLibraryCorrespondenceIds.call(ctx)).toEqual(['a', 'b']);
  });

  it('confirmAndDeleteSelectedCorrespondences uses fallback title when id not in sections', async () => {
    const ctx = mount();
    ctx.selectedCorrespondenceIds = ['ghost'];
    const p = ctx.confirmAndDeleteSelectedCorrespondences.call(ctx);
    await Promise.resolve();
    const dialog = alpineStub.rawStores.dialog as { title: string; onCancel: () => void };
    expect(dialog.title).toBe('Delete correspondence “this entry”?');
    dialog.onCancel();
    await p;
  });

  it('refresh loads sections and groups', async () => {
    const groups = [{ id: 'g1', title: 'G1' }];
    const sections = [section('g1', 'G1', [corr('a', 'A')])];
    correspondenceMocks.listCorrespondencesGrouped.mockResolvedValue(sections);
    correspondenceMocks.listCorrespondenceGroups.mockResolvedValue(groups);
    const ctx = mount();
    await ctx.refresh.call(ctx);
    expect(ctx.sections).toEqual(sections);
    expect(ctx.groupsOnly).toEqual(groups);
    expect(ctx.loading).toBe(false);
    expect(ctx.error).toBeNull();
  });

  it('refresh sets error on failure', async () => {
    correspondenceMocks.listCorrespondencesGrouped.mockRejectedValue(new Error('load err'));
    const ctx = mount();
    await ctx.refresh.call(ctx);
    expect(ctx.error).toBe('load err');
    expect(ctx.loading).toBe(false);
  });

  it('refresh sets generic error for non-Error throws', async () => {
    correspondenceMocks.listCorrespondencesGrouped.mockRejectedValue('nope');
    const ctx = mount();
    await ctx.refresh.call(ctx);
    expect(ctx.error).toBe('Failed to load');
  });

  it('startCreateCorrespondence and cancelForm reset form state', () => {
    const input = document.createElement('input');
    input.id = 'corr-manager-thumb';
    input.value = 'x';
    document.body.appendChild(input);
    const ctx = mount();
    ctx.startCreateCorrespondence.call(ctx);
    expect(ctx.editingCorrespondenceId).toBe('new');
    expect(ctx.formTitle).toBe('');
    ctx.cancelForm.call(ctx);
    expect(ctx.editingCorrespondenceId).toBeNull();
    input.remove();
  });

  it('startEditCorrespondence populates form from row', () => {
    const ctx = mount();
    ctx.startEditCorrespondence.call(ctx, {
      ...corr('e1', 'Edited', 'g2'),
      description: 'desc',
    });
    expect(ctx.editingCorrespondenceId).toBe('e1');
    expect(ctx.formTitle).toBe('Edited');
    expect(ctx.formDescription).toBe('desc');
    expect(ctx.formGroupId).toBe('g2');
  });

  it('saveCorrespondence validates title and returns on failure', async () => {
    const ctx = mount();
    ctx.formTitle = '';
    await ctx.saveCorrespondence.call(ctx);
    expect(ctx.error).toBeTruthy();
    expect(upsertCorrespondence).not.toHaveBeenCalled();
  });

  it('saveCorrespondence upserts new correspondence and refreshes', async () => {
    const input = document.createElement('input');
    input.id = 'corr-manager-thumb';
    input.type = 'file';
    document.body.appendChild(input);
    const ctx = mount();
    ctx.editingCorrespondenceId = 'new';
    ctx.formTitle = 'New title';
    ctx.formGroupId = DEFAULT_CORRESPONDENCE_GROUP_ID;
    await ctx.saveCorrespondence.call(ctx);
    expect(upsertCorrespondence).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New title',
        group_id: DEFAULT_CORRESPONDENCE_GROUP_ID,
      }),
    );
    expect(ctx.editingCorrespondenceId).toBeNull();
    input.remove();
  });

  it('saveCorrespondence sets error when upsert throws', async () => {
    vi.mocked(upsertCorrespondence).mockRejectedValueOnce(new Error('save err'));
    const ctx = mount();
    ctx.editingCorrespondenceId = 'new';
    ctx.formTitle = 'T';
    await ctx.saveCorrespondence.call(ctx);
    expect(ctx.error).toBe('save err');
  });

  it('saveCorrespondence upserts existing id with thumbnail file', async () => {
    const file = new File(['x'], 't.png', { type: 'image/png' });
    const input = document.createElement('input');
    input.id = 'corr-manager-thumb';
    input.type = 'file';
    Object.defineProperty(input, 'files', { value: [file] });
    document.body.appendChild(input);
    const ctx = mount();
    ctx.editingCorrespondenceId = 'existing';
    ctx.formTitle = 'Updated';
    ctx.clearThumbnail = true;
    await ctx.saveCorrespondence.call(ctx);
    expect(upsertCorrespondence).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'existing',
        thumbnailFile: file,
        clearThumbnail: true,
      }),
    );
    input.remove();
  });

  it('addGroup validates and creates group', async () => {
    const ctx = mount();
    ctx.newGroupTitle = 'Astrology';
    await ctx.addGroup.call(ctx);
    expect(createCorrespondenceGroup).toHaveBeenCalledWith('Astrology');
    expect(ctx.newGroupTitle).toBe('');
  });

  it('addGroup sets error on validation failure', async () => {
    const ctx = mount();
    ctx.newGroupTitle = '';
    await ctx.addGroup.call(ctx);
    expect(ctx.error).toBeTruthy();
    expect(createCorrespondenceGroup).not.toHaveBeenCalled();
  });

  it('startRenameGroup sets rename state', () => {
    const ctx = mount();
    ctx.startRenameGroup.call(ctx, { id: 'g1', title: 'Old' });
    expect(ctx.renamingGroupId).toBe('g1');
    expect(ctx.renameGroupTitle).toBe('Old');
  });

  it('saveRenameGroup is no-op without renamingGroupId', async () => {
    const ctx = mount();
    await ctx.saveRenameGroup.call(ctx);
    expect(putCorrespondenceGroup).not.toHaveBeenCalled();
  });

  it('saveRenameGroup updates group title', async () => {
    const ctx = mount();
    ctx.renamingGroupId = 'g1';
    ctx.renameGroupTitle = 'Renamed';
    await ctx.saveRenameGroup.call(ctx);
    expect(putCorrespondenceGroup).toHaveBeenCalledWith({ id: 'g1', title: 'Renamed' });
    expect(ctx.renamingGroupId).toBeNull();
  });

  it('saveRenameGroup sets error on validation failure', async () => {
    const ctx = mount();
    ctx.renamingGroupId = 'g1';
    ctx.renameGroupTitle = '';
    await ctx.saveRenameGroup.call(ctx);
    expect(ctx.error).toBeTruthy();
    expect(putCorrespondenceGroup).not.toHaveBeenCalled();
  });

  it('saveRenameGroup sets error when put throws', async () => {
    vi.mocked(putCorrespondenceGroup).mockRejectedValueOnce(new Error('rename err'));
    const ctx = mount();
    ctx.renamingGroupId = 'g1';
    ctx.renameGroupTitle = 'X';
    await ctx.saveRenameGroup.call(ctx);
    expect(ctx.error).toBe('rename err');
  });

  it('addGroup sets error when create throws', async () => {
    vi.mocked(createCorrespondenceGroup).mockRejectedValueOnce(new Error('create err'));
    const ctx = mount();
    ctx.newGroupTitle = 'X';
    await ctx.addGroup.call(ctx);
    expect(ctx.error).toBe('create err');
  });

  it('confirmDeleteGroup is no-op for default group', async () => {
    const ctx = mount();
    await ctx.confirmDeleteGroup.call(ctx, {
      id: DEFAULT_CORRESPONDENCE_GROUP_ID,
      title: 'Default',
    });
    expect(alpineStub.rawStores.dialog).toBeUndefined();
  });

  it('confirmDeleteGroup deletes when confirmed', async () => {
    const ctx = mount();
    const p = ctx.confirmDeleteGroup.call(ctx, { id: 'g-custom', title: 'Custom' });
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(deleteCorrespondenceGroup).toHaveBeenCalledWith('g-custom');
  });

  it('confirmDeleteGroup returns when cancelled', async () => {
    const ctx = mount();
    const p = ctx.confirmDeleteGroup.call(ctx, { id: 'g-custom', title: 'Custom' });
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onCancel: () => void }).onCancel();
    await p;
    expect(deleteCorrespondenceGroup).not.toHaveBeenCalled();
  });

  it('confirmDeleteGroup sets error when delete throws', async () => {
    vi.mocked(deleteCorrespondenceGroup).mockRejectedValueOnce(new Error('group del'));
    const ctx = mount();
    const p = ctx.confirmDeleteGroup.call(ctx, { id: 'g-custom', title: 'Custom' });
    await Promise.resolve();
    (alpineStub.rawStores.dialog as { onConfirm: () => void }).onConfirm();
    await p;
    expect(ctx.error).toBe('group del');
  });
});
