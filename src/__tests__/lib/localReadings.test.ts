import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocalReadingRow } from '../../types/localDb.js';
import { DEFAULT_READING_GROUP_ID } from '../../types/localDb.js';
import type { SavedReadingState } from '../../types/readingState.js';

type IdbPayload =
  | { t: 'readingsGetAll' }
  | { t: 'groupsGetAll' }
  | { t: 'statesGetAll' }
  | { t: 'readingsGet'; key: string }
  | { t: 'statesGet'; key: string }
  | { t: 'get'; key: string }
  | { t: 'put' }
  | { t: 'delete'; key: string };

const ctx = vi.hoisted(() => {
  const openTarotDb = vi.fn();
  const idbRequest = vi.fn();
  const decodeSavedReadingState = vi.fn();
  const encodeSavedReadingState = vi.fn();

  function fakeDb(): IDBDatabase {
    const readingsStore = {
      getAll: vi.fn(() => ({ t: 'readingsGetAll' }) as IdbPayload),
      get: vi.fn((key: string) => ({ t: 'readingsGet', key }) as IdbPayload),
      put: vi.fn(() => ({ t: 'put' }) as IdbPayload),
      delete: vi.fn((key: string) => ({ t: 'delete', key }) as IdbPayload),
    };
    const statesStore = {
      getAll: vi.fn(() => ({ t: 'statesGetAll' }) as IdbPayload),
      get: vi.fn((key: string) => ({ t: 'statesGet', key }) as IdbPayload),
      put: vi.fn(() => ({ t: 'put' }) as IdbPayload),
      delete: vi.fn((key: string) => ({ t: 'delete', key }) as IdbPayload),
    };
    const groupsStore = {
      getAll: vi.fn(() => ({ t: 'groupsGetAll' }) as IdbPayload),
      get: vi.fn((key: string) => ({ t: 'get', key }) as IdbPayload),
      put: vi.fn(() => ({ t: 'put' }) as IdbPayload),
      delete: vi.fn((key: string) => ({ t: 'delete', key }) as IdbPayload),
    };
    return {
      transaction: vi.fn(() => ({
        objectStore: vi.fn((name: string) => {
          if (name === 'readingGroups') return groupsStore;
          if (name === 'readingStates') return statesStore;
          return readingsStore;
        }),
      })),
    } as unknown as IDBDatabase;
  }

  return { openTarotDb, idbRequest, decodeSavedReadingState, encodeSavedReadingState, fakeDb };
});

vi.mock('../../lib/indexedDb.js', () => ({
  openTarotDb: ctx.openTarotDb,
  idbRequest: ctx.idbRequest,
  STORE_READINGS: 'readings',
  STORE_READING_GROUPS: 'readingGroups',
  STORE_READING_STATES: 'readingStates',
}));

vi.mock('../../lib/proto/savedReadingCodec.js', () => ({
  decodeSavedReadingState: ctx.decodeSavedReadingState,
  encodeSavedReadingState: ctx.encodeSavedReadingState,
}));

import {
  assignReadingToGroup,
  createReadingGroup,
  deleteLocalReading,
  deleteReadingGroup,
  invalidateReadingListCache,
  listLocalReadings,
  listReadingGroups,
  listReadingsGrouped,
  loadLocalReading,
  putReadingGroup,
  renameLocalReading,
  saveLocalReading,
} from '../../lib/localReadings.js';

const gid = DEFAULT_READING_GROUP_ID;

const emptyState: SavedReadingState = {
  viewport: { scale: 1, offsetX: 0, offsetY: 0 },
  cards: [],
  textLabels: [],
};

const decodedState: SavedReadingState = {
  viewport: { scale: 2, offsetX: 1, offsetY: 2 },
  cards: [],
  textLabels: [],
};

describe('localReadings.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateReadingListCache();
    ctx.openTarotDb.mockResolvedValue(ctx.fakeDb());
    ctx.decodeSavedReadingState.mockReturnValue(decodedState);
    ctx.encodeSavedReadingState.mockReturnValue(new Uint8Array([1, 2, 3]));
    ctx.idbRequest.mockImplementation((req: IdbPayload | { t: string }) => {
      if (typeof req === 'object' && req !== null && 't' in req && req.t === 'get') {
        if (req.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
      }
      if (req.t === 'groupsGetAll') {
        return Promise.resolve([{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }]);
      }
      if (req.t === 'readingsGetAll') {
        return Promise.resolve([]);
      }
      return Promise.resolve(undefined);
    });
    vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('new-reading-id');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-15T10:00:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('listLocalReadings sorts three rows by updated_at descending', async () => {
    const rows: LocalReadingRow[] = [
      {
        id: 'old',
        name: 'O',
        state: new Uint8Array(),
        updated_at: '2020-01-01T00:00:00.000Z',
        group_id: gid,
      },
      {
        id: 'mid',
        name: 'M',
        state: new Uint8Array(),
        updated_at: '2023-01-01T00:00:00.000Z',
        group_id: gid,
      },
      {
        id: 'new',
        name: 'N',
        state: new Uint8Array(),
        updated_at: '2025-01-01T00:00:00.000Z',
        group_id: gid,
      },
    ];
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'groupsGetAll') {
          return Promise.resolve([{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }]);
        }
        if (payload.t === 'readingsGetAll') {
          return Promise.resolve(rows);
        }
      }
      return Promise.resolve(undefined);
    });
    await expect(listLocalReadings()).resolves.toEqual([
      { id: 'new', name: 'N', updated_at: '2025-01-01T00:00:00.000Z', group_id: gid },
      { id: 'mid', name: 'M', updated_at: '2023-01-01T00:00:00.000Z', group_id: gid },
      { id: 'old', name: 'O', updated_at: '2020-01-01T00:00:00.000Z', group_id: gid },
    ]);
  });

  it('listLocalReadings maps rows and sorts by updated_at descending', async () => {
    const rows: LocalReadingRow[] = [
      {
        id: 'a',
        name: 'Old',
        state: new Uint8Array(),
        updated_at: '2024-01-01T00:00:00.000Z',
        group_id: gid,
      },
      {
        id: 'b',
        name: 'New',
        state: new Uint8Array(),
        updated_at: '2024-06-01T00:00:00.000Z',
        group_id: gid,
      },
    ];
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'groupsGetAll') {
          return Promise.resolve([{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }]);
        }
        if (payload.t === 'readingsGetAll') {
          return Promise.resolve(rows);
        }
      }
      return Promise.resolve(undefined);
    });
    await expect(listLocalReadings()).resolves.toEqual([
      { id: 'b', name: 'New', updated_at: '2024-06-01T00:00:00.000Z', group_id: gid },
      { id: 'a', name: 'Old', updated_at: '2024-01-01T00:00:00.000Z', group_id: gid },
    ]);
  });

  it('listLocalReadings returns empty array when store is empty', async () => {
    ctx.idbRequest.mockResolvedValue([]);
    await expect(listLocalReadings()).resolves.toEqual([]);
  });

  it('listLocalReadings includes both rows when updated_at ties (sort comparator always returns -1)', async () => {
    const rows: LocalReadingRow[] = [
      {
        id: 'first',
        name: 'A',
        state: new Uint8Array(),
        updated_at: '2024-01-01T00:00:00.000Z',
        group_id: gid,
      },
      {
        id: 'second',
        name: 'B',
        state: new Uint8Array(),
        updated_at: '2024-01-01T00:00:00.000Z',
        group_id: gid,
      },
    ];
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'groupsGetAll') {
          return Promise.resolve([{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }]);
        }
        if (payload.t === 'readingsGetAll') {
          return Promise.resolve(rows);
        }
      }
      return Promise.resolve(undefined);
    });
    const out = await listLocalReadings();
    expect(out).toHaveLength(2);
    expect(new Set(out.map((x) => x.id))).toEqual(new Set(['first', 'second']));
  });

  it('loadLocalReading returns null when row is missing', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'readingsGet' || payload.t === 'statesGet') {
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    await expect(loadLocalReading('missing')).resolves.toBeNull();
    expect(ctx.decodeSavedReadingState).not.toHaveBeenCalled();
  });

  it('loadLocalReading decodes Uint8Array state from readingStates store', async () => {
    const bytes = new Uint8Array([9, 9]);
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'readingsGet' && payload.key === 'r1') {
          return Promise.resolve({
            id: 'r1',
            name: 'My Reading',
            updated_at: 'u',
            group_id: gid,
          });
        }
        if (payload.t === 'statesGet' && payload.key === 'r1') {
          return Promise.resolve({ id: 'r1', state: bytes });
        }
      }
      return Promise.resolve(undefined);
    });
    await expect(loadLocalReading('r1')).resolves.toEqual({
      state: decodedState,
      name: 'My Reading',
    });
    expect(ctx.decodeSavedReadingState).toHaveBeenCalledWith(bytes);
  });

  it('loadLocalReading wraps non-Uint8Array state as ArrayBuffer view', async () => {
    const buf = new ArrayBuffer(2);
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'readingsGet' && payload.key === 'r2') {
          return Promise.resolve({
            id: 'r2',
            name: 'X',
            updated_at: 'u',
            group_id: gid,
          });
        }
        if (payload.t === 'statesGet' && payload.key === 'r2') {
          return Promise.resolve({ id: 'r2', state: buf });
        }
      }
      return Promise.resolve(undefined);
    });
    await loadLocalReading('r2');
    expect(ctx.decodeSavedReadingState).toHaveBeenCalledWith(expect.any(Uint8Array));
    const raw: unknown = ctx.decodeSavedReadingState.mock.calls[0][0];
    expect(raw).toBeInstanceOf(Uint8Array);
    if (!(raw instanceof Uint8Array)) throw new Error('expected Uint8Array');
    expect(raw.buffer).toBe(buf);
  });

  it('loadLocalReading keeps empty string name (not coerced by ??)', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'readingsGet' && payload.key === 'e') {
          return Promise.resolve({
            id: 'e',
            name: '',
            updated_at: 'u',
            group_id: gid,
          });
        }
        if (payload.t === 'statesGet' && payload.key === 'e') {
          return Promise.resolve({ id: 'e', state: new Uint8Array() });
        }
      }
      return Promise.resolve(undefined);
    });
    await expect(loadLocalReading('e')).resolves.toMatchObject({ name: '' });
  });

  it('loadLocalReading uses default name when row.name is null or undefined', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'readingsGet' && payload.key === 'a') {
          return Promise.resolve({
            id: 'a',
            name: null,
            updated_at: 'u',
            group_id: gid,
          });
        }
        if (payload.t === 'statesGet' && payload.key === 'a') {
          return Promise.resolve({ id: 'a', state: new Uint8Array() });
        }
        if (payload.t === 'readingsGet' && payload.key === 'b') {
          return Promise.resolve({
            id: 'b',
            name: undefined,
            updated_at: 'u',
            group_id: gid,
          });
        }
        if (payload.t === 'statesGet' && payload.key === 'b') {
          return Promise.resolve({ id: 'b', state: new Uint8Array() });
        }
      }
      return Promise.resolve(undefined);
    });
    await expect(loadLocalReading('a')).resolves.toMatchObject({ name: 'Untitled Reading' });
    await expect(loadLocalReading('b')).resolves.toMatchObject({ name: 'Untitled Reading' });
  });

  it('saveLocalReading creates id with randomUUID and encodes state', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'put') {
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    const r = await saveLocalReading(emptyState, 'Hello');
    expect(r).toEqual({ id: 'new-reading-id' });
    expect(ctx.encodeSavedReadingState).toHaveBeenCalledWith(emptyState);
  });

  it('saveLocalReading defaults name when name argument is omitted', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'put') {
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    const r = await saveLocalReading(emptyState);
    expect(r).toEqual({ id: 'new-reading-id' });
  });

  it('saveLocalReading catches encodeSavedReadingState throw', async () => {
    ctx.encodeSavedReadingState.mockImplementation(() => {
      throw new Error('encode fail');
    });
    const r = await saveLocalReading(emptyState, 'x');
    expect(r).toEqual({ error: 'encode fail' });
  });

  it('saveLocalReading catches openTarotDb failure', async () => {
    ctx.openTarotDb.mockRejectedValueOnce(new Error('db down'));
    const r = await saveLocalReading(emptyState, 'x');
    expect(r).toEqual({ error: 'db down' });
  });

  it('saveLocalReading uses explicit readingId and name', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'readingsGet' && payload.key === 'fixed-id') {
          return Promise.resolve(undefined);
        }
        if (payload.t === 'put') {
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    const r = await saveLocalReading(emptyState, 'N', 'fixed-id');
    expect(r).toEqual({ id: 'fixed-id' });
  });

  it('saveLocalReading preserves existing name when updating without name param', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'readingsGet' && payload.key === 'keep') {
          return Promise.resolve({
            id: 'keep',
            name: 'Preserved',
            updated_at: 'old',
            group_id: gid,
          });
        }
        if (payload.t === 'put') {
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    const r = await saveLocalReading(emptyState, undefined, 'keep');
    expect(r).toEqual({ id: 'keep' });
  });

  it('saveLocalReading keeps default name when updating without name and existing has no name', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'readingsGet' && payload.key === 'k') {
          return Promise.resolve({
            id: 'k',
            name: '',
            updated_at: 'o',
            group_id: gid,
          });
        }
        if (payload.t === 'put') {
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    const r = await saveLocalReading(emptyState, undefined, 'k');
    expect(r).toEqual({ id: 'k' });
    expect(ctx.encodeSavedReadingState).toHaveBeenCalled();
  });

  it('saveLocalReading uses Untitled when update has no name and get returns undefined', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'readingsGet' && payload.key === 'ghost') {
          return Promise.resolve(undefined);
        }
        if (payload.t === 'put') {
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    const r = await saveLocalReading(emptyState, undefined, 'ghost');
    expect(r).toEqual({ id: 'ghost' });
  });

  it('saveLocalReading returns error message on thrown Error', async () => {
    ctx.idbRequest.mockRejectedValue(new Error('idb boom'));
    const r = await saveLocalReading(emptyState, 'x');
    expect(r).toEqual({ error: 'idb boom' });
  });

  it('saveLocalReading returns generic error when throw is not Error', async () => {
    ctx.idbRequest.mockRejectedValue('x');
    const r = await saveLocalReading(emptyState, 'x');
    expect(r).toEqual({ error: 'Failed to save locally' });
  });

  it('renameLocalReading rejects empty and whitespace-only names', async () => {
    await expect(renameLocalReading('a', '')).resolves.toEqual({ error: 'Title cannot be empty' });
    await expect(renameLocalReading('a', '   ')).resolves.toEqual({
      error: 'Title cannot be empty',
    });
    expect(ctx.idbRequest).not.toHaveBeenCalled();
  });

  it('renameLocalReading returns error when reading is missing', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'readingsGet' && payload.key === 'missing') {
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    await expect(renameLocalReading('missing', 'Hi')).resolves.toEqual({
      error: 'Reading not found',
    });
  });

  it('renameLocalReading trims name and updates metadata only', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'readingsGet' && payload.key === 'rid') {
          return Promise.resolve({
            id: 'rid',
            name: 'Old',
            updated_at: '2020-01-01T00:00:00.000Z',
            group_id: gid,
          });
        }
        if (payload.t === 'put') {
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    await expect(renameLocalReading('rid', '  New  ')).resolves.toEqual({
      updated_at: '2024-03-15T10:00:00.000Z',
    });
    expect(ctx.encodeSavedReadingState).not.toHaveBeenCalled();
    expect(ctx.decodeSavedReadingState).not.toHaveBeenCalled();
  });

  it('renameLocalReading returns error when idb throws', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'readingsGet' && payload.key === 'r') {
          return Promise.resolve({
            id: 'r',
            name: 'O',
            updated_at: 'u',
            group_id: gid,
          });
        }
        if (payload.t === 'put') {
          return Promise.reject(new Error('put fail'));
        }
      }
      return Promise.resolve(undefined);
    });
    await expect(renameLocalReading('r', 'X')).resolves.toEqual({ error: 'put fail' });
  });

  it('deleteLocalReading deletes metadata and state rows', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    await expect(deleteLocalReading('del-me')).resolves.toEqual({});
    expect(ctx.idbRequest).toHaveBeenCalledTimes(2);
    expect((ctx.idbRequest.mock.calls[0]?.[0] as IdbPayload).t).toBe('delete');
    expect((ctx.idbRequest.mock.calls[1]?.[0] as IdbPayload).t).toBe('delete');
  });

  it('createReadingGroup stores a new group row', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    const g = await createReadingGroup('  Client  ');
    expect(g.title).toBe('Client');
    expect(g.id).toBeTruthy();
  });

  it('listReadingGroups puts default group first', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'groupsGetAll') {
          return Promise.resolve([
            { id: 'g2', title: 'Beta' },
            { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
          ]);
        }
        if (payload.t === 'readingsGetAll') {
          return Promise.resolve([]);
        }
      }
      return Promise.resolve(undefined);
    });
    const groups = await listReadingGroups();
    expect(groups[0].id).toBe(DEFAULT_READING_GROUP_ID);
  });

  it('listReadingsGrouped assigns orphan readings to default group', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'groupsGetAll') {
          return Promise.resolve([{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }]);
        }
        if (payload.t === 'readingsGetAll') {
          return Promise.resolve([
            {
              id: 'r1',
              name: 'One',
              state: new Uint8Array(),
              updated_at: '2024-01-01T00:00:00.000Z',
              group_id: 'missing-group',
            },
          ]);
        }
      }
      return Promise.resolve(undefined);
    });
    const sections = await listReadingsGrouped();
    const defaultSection = sections.find((s) => s.group.id === DEFAULT_READING_GROUP_ID);
    expect(defaultSection?.items).toHaveLength(1);
    expect(defaultSection?.items[0]?.group_id).toBe('missing-group');
  });

  it('listReadingsGrouped shows readings when groups store returns empty', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve(undefined);
        }
        if (payload.t === 'groupsGetAll') {
          return Promise.resolve([]);
        }
        if (payload.t === 'readingsGetAll') {
          return Promise.resolve([
            {
              id: 'r1',
              name: 'One',
              state: new Uint8Array(),
              updated_at: '2024-01-01T00:00:00.000Z',
            },
          ]);
        }
        if (payload.t === 'put') {
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    const sections = await listReadingsGrouped();
    expect(sections).toHaveLength(1);
    expect(sections[0]?.group.id).toBe(DEFAULT_READING_GROUP_ID);
    expect(sections[0]?.items).toHaveLength(1);
    expect(sections[0]?.items[0]?.name).toBe('One');
  });

  it('assignReadingToGroup returns error when reading is missing', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'groupsGetAll') {
          return Promise.resolve([{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }]);
        }
        if (payload.t === 'readingsGetAll') {
          return Promise.resolve([]);
        }
        if (payload.t === 'readingsGet' && payload.key === 'missing') {
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    await expect(assignReadingToGroup('missing', DEFAULT_READING_GROUP_ID)).resolves.toEqual({
      error: 'Reading not found',
    });
  });

  it('deleteReadingGroup throws for default group', async () => {
    ctx.idbRequest.mockResolvedValue({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
    await expect(deleteReadingGroup(DEFAULT_READING_GROUP_ID)).rejects.toThrow(
      'Cannot delete the built-in default group.',
    );
  });

  it('putReadingGroup writes group row', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    await putReadingGroup({ id: 'g1', title: 'Mine' });
    expect(ctx.idbRequest).toHaveBeenCalled();
  });

  it('listReadingsGrouped splits inline state into readingStates on list load', async () => {
    const rows: LocalReadingRow[] = [
      {
        id: 'r1',
        name: 'One',
        state: new Uint8Array([1, 2, 3]),
        updated_at: '2024-01-01T00:00:00.000Z',
        group_id: gid,
      },
    ];
    let putCount = 0;
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'groupsGetAll') {
          return Promise.resolve([{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }]);
        }
        if (payload.t === 'readingsGetAll') {
          return Promise.resolve(rows);
        }
        if (payload.t === 'put') {
          putCount += 1;
          return Promise.resolve(undefined);
        }
      }
      return Promise.resolve(undefined);
    });
    await listReadingsGrouped();
    expect(putCount).toBe(2);
  });

  it('listReadingsGrouped reuses cached snapshot until invalidated', async () => {
    ctx.idbRequest.mockImplementation((req: unknown) => {
      if (typeof req === 'object' && req !== null && 't' in req) {
        const payload = req as IdbPayload;
        if (payload.t === 'get' && payload.key === DEFAULT_READING_GROUP_ID) {
          return Promise.resolve({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
        }
        if (payload.t === 'groupsGetAll') {
          return Promise.resolve([{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }]);
        }
        if (payload.t === 'readingsGetAll') {
          return Promise.resolve([]);
        }
      }
      return Promise.resolve(undefined);
    });
    await listReadingsGrouped();
    const openCallsAfterFirst = ctx.openTarotDb.mock.calls.length;
    await listReadingsGrouped();
    expect(ctx.openTarotDb.mock.calls.length).toBe(openCallsAfterFirst);
    invalidateReadingListCache();
    await listReadingsGrouped();
    expect(ctx.openTarotDb.mock.calls.length).toBeGreaterThan(openCallsAfterFirst);
  });
});
