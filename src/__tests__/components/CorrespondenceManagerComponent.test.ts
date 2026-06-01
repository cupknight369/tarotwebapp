/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('../../lib/localCorrespondences.js', () => ({
  createCorrespondenceGroup: vi.fn(),
  deleteCorrespondence: vi.fn(),
  deleteCorrespondenceGroup: vi.fn(),
  listCorrespondenceGroups: correspondenceMocks.listCorrespondenceGroups,
  listCorrespondencesGrouped: correspondenceMocks.listCorrespondencesGrouped,
  putCorrespondenceGroup: vi.fn(),
  upsertCorrespondence: vi.fn(),
}));

import '../../components/CorrespondenceManagerComponent.js';

type CorrespondenceManagerInstance = {
  open: boolean;
  editingCorrespondenceId: string | null;
  renamingGroupId: string | null;
  closeManager: () => void;
  cancelForm: () => void;
  cancelRenameGroup: () => void;
  handleManagerEscape: () => boolean;
  init: () => void;
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
});
