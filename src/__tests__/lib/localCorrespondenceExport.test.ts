import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_CORRESPONDENCE_GROUP_ID } from '../../types/localDb.js';
import type { LocalCorrespondenceGroupRow, LocalCorrespondenceRow } from '../../types/localDb.js';

const m = vi.hoisted(() => ({
  logError: vi.fn(),
  openTarotDb: vi.fn(),
  idbRequest: vi.fn(),
  encodeCorrespondenceExport: vi.fn(),
  decodeCorrespondenceExport: vi.fn(),
  insertCorrespondenceFromProto: vi.fn(),
  correspondenceGroupRowFromProto: vi.fn((g: { id: string; title?: string }) => ({
    id: g.id,
    title: g.title ?? 'G',
  })),
}));

const corrMocks = vi.hoisted(() => ({
  ensureDefaultCorrespondenceGroup: vi.fn(),
  createCorrespondenceGroup: vi.fn(),
  putCorrespondence: vi.fn(),
}));

vi.mock('../../lib/logError.js', () => ({ logError: m.logError }));

vi.mock('../../lib/indexedDb.js', () => ({
  openTarotDb: m.openTarotDb,
  idbRequest: m.idbRequest,
  STORE_CORRESPONDENCE_GROUPS: 'correspondenceGroups',
  STORE_CORRESPONDENCES: 'correspondences',
}));

vi.mock('../../lib/localCorrespondences.js', () => ({
  ensureDefaultCorrespondenceGroup: corrMocks.ensureDefaultCorrespondenceGroup,
  createCorrespondenceGroup: corrMocks.createCorrespondenceGroup,
  putCorrespondence: corrMocks.putCorrespondence,
}));

vi.mock('../../lib/proto/correspondenceExportCodec.js', () => ({
  encodeCorrespondenceExport: m.encodeCorrespondenceExport,
  decodeCorrespondenceExport: m.decodeCorrespondenceExport,
  insertCorrespondenceFromProto: m.insertCorrespondenceFromProto,
}));

vi.mock('../../lib/proto/backupCodec.js', () => ({
  correspondenceGroupRowFromProto: m.correspondenceGroupRowFromProto,
}));

vi.mock('../../proto/generated/bundle.js', () => ({
  cktarot: {},
}));

import {
  correspondenceExportFilename,
  exportCorrespondences,
  importCorrespondences,
} from '../../lib/localCorrespondenceExport.js';

const defaultGroup: LocalCorrespondenceGroupRow = {
  id: DEFAULT_CORRESPONDENCE_GROUP_ID,
  title: 'Default',
};

const userGroup: LocalCorrespondenceGroupRow = {
  id: 'g-user',
  title: 'Herbs',
};

const corrInDefault: LocalCorrespondenceRow = {
  id: 'c-default',
  title: 'A',
  description: null,
  group_id: DEFAULT_CORRESPONDENCE_GROUP_ID,
  thumbnailBlobId: null,
};

const corrInUser: LocalCorrespondenceRow = {
  id: 'c-user',
  title: 'B',
  description: 'desc',
  group_id: 'g-user',
  thumbnailBlobId: null,
};

function fakeDb(): IDBDatabase {
  return {
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        getAll: vi.fn(() => ({})),
      })),
    })),
  } as unknown as IDBDatabase;
}

function stubDomDownload(): { click: ReturnType<typeof vi.fn> } {
  const click = vi.fn();
  vi.stubGlobal('document', {
    createElement: vi.fn(() => ({
      href: '',
      download: '',
      rel: '',
      click,
    })),
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
  });
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:fake'),
    revokeObjectURL: vi.fn(),
  });
  return { click };
}

describe('localCorrespondenceExport.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.openTarotDb.mockResolvedValue(fakeDb());
    corrMocks.ensureDefaultCorrespondenceGroup.mockResolvedValue(undefined);
    corrMocks.createCorrespondenceGroup.mockResolvedValue({ id: 'new-g', title: 'Herbs' });
    corrMocks.putCorrespondence.mockResolvedValue(undefined);
    m.encodeCorrespondenceExport.mockResolvedValue(new Uint8Array([1, 2, 3]));
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('correspondenceExportFilename includes prefix and extension', () => {
    expect(correspondenceExportFilename()).toMatch(/^cktarot_correspondences_.*\.pb$/);
  });

  it('exportCorrespondences rejects empty groupIds', async () => {
    const { errors } = await exportCorrespondences([]);
    expect(errors).toContain('Select at least one group to export.');
    expect(m.encodeCorrespondenceExport).not.toHaveBeenCalled();
  });

  it('exportCorrespondences filters groups and correspondences by selection', async () => {
    const dom = stubDomDownload();
    m.idbRequest
      .mockResolvedValueOnce([defaultGroup, userGroup])
      .mockResolvedValueOnce([corrInDefault, corrInUser]);

    const r = await exportCorrespondences([DEFAULT_CORRESPONDENCE_GROUP_ID]);

    expect(r.errors).toEqual([]);
    expect(m.encodeCorrespondenceExport).toHaveBeenCalledWith(
      expect.objectContaining({
        groups: [defaultGroup],
        correspondences: [corrInDefault],
      }),
    );
    expect(dom.click).toHaveBeenCalled();
  });

  it('importCorrespondences returns errors from decode without importing', async () => {
    m.decodeCorrespondenceExport.mockReturnValue({
      export: { groups: [], correspondences: [] },
      errors: ['bad version'],
    });

    const result = await importCorrespondences(new ArrayBuffer(8));

    expect(result.errors).toContain('bad version');
    expect(result.importedGroups).toBe(0);
    expect(result.importedCorrespondences).toBe(0);
    expect(corrMocks.putCorrespondence).not.toHaveBeenCalled();
  });

  it('importCorrespondences creates new user groups and inserts correspondences with new ids', async () => {
    m.decodeCorrespondenceExport.mockReturnValue({
      export: {
        groups: [{ id: 'g-user', title: 'Herbs' }],
        correspondences: [{ id: 'c-user', title: 'B', groupId: 'g-user' }],
      },
      errors: [],
    });
    m.insertCorrespondenceFromProto.mockResolvedValue({
      id: 'new-c-uuid',
      title: 'B',
      description: 'desc',
      group_id: 'new-g',
      thumbnailBlobId: null,
    });

    const result = await importCorrespondences(new ArrayBuffer(8));

    expect(corrMocks.createCorrespondenceGroup).toHaveBeenCalledWith('Herbs');
    expect(corrMocks.putCorrespondence).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'new-c-uuid' }),
    );
    expect(corrMocks.putCorrespondence).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c-user' }),
    );
    expect(result.importedGroups).toBe(1);
    expect(result.importedCorrespondences).toBe(1);
  });

  it('importCorrespondences maps default group without createCorrespondenceGroup', async () => {
    m.decodeCorrespondenceExport.mockReturnValue({
      export: {
        groups: [{ id: DEFAULT_CORRESPONDENCE_GROUP_ID, title: 'Default' }],
        correspondences: [{ id: 'c1', title: 'A', groupId: DEFAULT_CORRESPONDENCE_GROUP_ID }],
      },
      errors: [],
    });
    m.insertCorrespondenceFromProto.mockResolvedValue({
      id: 'new-id',
      title: 'A',
      description: null,
      group_id: DEFAULT_CORRESPONDENCE_GROUP_ID,
      thumbnailBlobId: null,
    });

    const result = await importCorrespondences(new ArrayBuffer(8));

    expect(corrMocks.createCorrespondenceGroup).not.toHaveBeenCalled();
    expect(result.importedGroups).toBe(0);
    expect(result.importedCorrespondences).toBe(1);
  });
});
