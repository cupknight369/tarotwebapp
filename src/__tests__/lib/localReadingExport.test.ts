import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocalReadingRow } from '../../types/localDb.js';
import { DEFAULT_READING_GROUP_ID } from '../../types/localDb.js';

const readingLibMocks = vi.hoisted(() => ({
  ensureDefaultReadingGroup: vi.fn(),
  createReadingGroup: vi.fn(),
}));

const m = vi.hoisted(() => ({
  logError: vi.fn(),
  openTarotDb: vi.fn(),
  idbRequest: vi.fn(),
  encodeReadingExport: vi.fn(),
  decodeReadingExport: vi.fn(),
  insertReadingFromProto: vi.fn(),
  readingGroupRowFromProto: vi.fn((g: { id: string; title?: string }) => ({
    id: g.id,
    title: g.title ?? 'G',
  })),
}));

vi.mock('../../lib/logError.js', () => ({ logError: m.logError }));

vi.mock('../../lib/localReadings.js', () => ({
  ensureDefaultReadingGroup: readingLibMocks.ensureDefaultReadingGroup,
  createReadingGroup: readingLibMocks.createReadingGroup,
}));

vi.mock('../../lib/indexedDb.js', () => ({
  openTarotDb: m.openTarotDb,
  idbRequest: m.idbRequest,
  STORE_READINGS: 'readings',
  STORE_READING_GROUPS: 'readingGroups',
}));

vi.mock('../../lib/proto/readingExportCodec.js', () => ({
  encodeReadingExport: m.encodeReadingExport,
  decodeReadingExport: m.decodeReadingExport,
  insertReadingFromProto: m.insertReadingFromProto,
}));

vi.mock('../../lib/proto/backupCodec.js', () => ({
  readingGroupRowFromProto: m.readingGroupRowFromProto,
}));

vi.mock('../../proto/generated/bundle.js', () => ({
  cktarot: {},
}));

import {
  exportReadings,
  importReadings,
  readingExportFilename,
} from '../../lib/localReadingExport.js';

const readingA: LocalReadingRow = {
  id: 'r-a',
  name: 'Reading A',
  state: new Uint8Array([1, 2, 3]),
  updated_at: '2026-05-20T00:00:00.000Z',
  group_id: DEFAULT_READING_GROUP_ID,
};

const readingB: LocalReadingRow = {
  id: 'r-b',
  name: 'Reading B',
  state: new Uint8Array([4, 5, 6]),
  updated_at: '2026-05-19T00:00:00.000Z',
  group_id: DEFAULT_READING_GROUP_ID,
};

function fakeDb(): IDBDatabase {
  return {
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        getAll: vi.fn(() => ({})),
        put: vi.fn(() => ({})),
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

describe('localReadingExport.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.openTarotDb.mockResolvedValue(fakeDb());
    readingLibMocks.ensureDefaultReadingGroup.mockResolvedValue(undefined);
    readingLibMocks.createReadingGroup.mockResolvedValue({
      id: 'new-group',
      title: 'Imported',
    });
    m.encodeReadingExport.mockResolvedValue(new Uint8Array([1, 2, 3]));
    m.idbRequest.mockResolvedValue(undefined);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('readingExportFilename includes prefix and extension', () => {
    expect(readingExportFilename()).toMatch(/^cktarot_readings_.*\.pb$/);
  });

  it('exportReadings rejects empty readingIds', async () => {
    const { errors } = await exportReadings([]);
    expect(errors).toContain('Select at least one reading to export.');
    expect(m.encodeReadingExport).not.toHaveBeenCalled();
  });

  it('exportReadings filters readings by selection and includes referenced groups', async () => {
    const dom = stubDomDownload();
    m.idbRequest
      .mockResolvedValueOnce([readingA, readingB])
      .mockResolvedValueOnce([{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }]);

    const r = await exportReadings(['r-a']);

    expect(r.errors).toEqual([]);
    expect(m.encodeReadingExport).toHaveBeenCalledWith(
      expect.objectContaining({
        readings: [readingA],
        groups: [{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }],
      }),
    );
    expect(dom.click).toHaveBeenCalled();
  });

  it('importReadings returns errors from decode without importing', async () => {
    m.decodeReadingExport.mockReturnValue({
      export: { readings: [] },
      errors: ['bad version'],
    });

    const result = await importReadings(new ArrayBuffer(8));

    expect(result.errors).toContain('bad version');
    expect(result.importedReadings).toBe(0);
    expect(m.insertReadingFromProto).not.toHaveBeenCalled();
  });

  it('importReadings inserts readings with new ids including duplicate title and date', async () => {
    m.decodeReadingExport.mockReturnValue({
      export: {
        groups: [],
        readings: [
          { id: 'exported-1', name: 'Same Title', updatedAt: '2026-05-20T00:00:00.000Z' },
          { id: 'exported-2', name: 'Same Title', updatedAt: '2026-05-20T00:00:00.000Z' },
        ],
      },
      errors: [],
    });
    const groupIdMap = new Map<string, string>();
    m.insertReadingFromProto
      .mockReturnValueOnce({
        id: 'new-uuid-1',
        name: 'Same Title',
        state: new Uint8Array([1]),
        updated_at: '2026-05-20T00:00:00.000Z',
        group_id: DEFAULT_READING_GROUP_ID,
      })
      .mockReturnValueOnce({
        id: 'new-uuid-2',
        name: 'Same Title',
        state: new Uint8Array([2]),
        updated_at: '2026-05-20T00:00:00.000Z',
        group_id: DEFAULT_READING_GROUP_ID,
      });

    const result = await importReadings(new ArrayBuffer(8));

    expect(m.insertReadingFromProto).toHaveBeenCalledTimes(2);
    expect(m.insertReadingFromProto.mock.calls[0][1]).toEqual(expect.any(Map));
    expect(m.idbRequest).toHaveBeenCalledTimes(2);
    expect(result.importedReadings).toBe(2);
  });
});
