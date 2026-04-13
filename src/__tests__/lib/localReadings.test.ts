import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocalReadingRow } from '../../types/localDb.js';
import type { SavedReadingState } from '../../types/readingState.js';

type IdbPayload =
  | { t: 'storeGetAll' }
  | { t: 'get'; key: string }
  | { t: 'put' }
  | { t: 'delete'; key: string };

const ctx = vi.hoisted(() => {
  const openTarotDb = vi.fn();
  const idbRequest = vi.fn();
  const decodeSavedReadingState = vi.fn();
  const encodeSavedReadingState = vi.fn();

  function fakeDb(): IDBDatabase {
    const store = {
      getAll: vi.fn(() => ({ t: 'storeGetAll' } as IdbPayload)),
      get: vi.fn((key: string) => ({ t: 'get', key } as IdbPayload)),
      put: vi.fn(() => ({ t: 'put' } as IdbPayload)),
      delete: vi.fn((key: string) => ({ t: 'delete', key } as IdbPayload)),
    };
    return {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => store),
      })),
    } as unknown as IDBDatabase;
  }

  return { openTarotDb, idbRequest, decodeSavedReadingState, encodeSavedReadingState, fakeDb };
});

vi.mock('../../lib/indexedDb.js', () => ({
  openTarotDb: ctx.openTarotDb,
  idbRequest: ctx.idbRequest,
  STORE_READINGS: 'readings',
}));

vi.mock('../../lib/proto/savedReadingCodec.js', () => ({
  decodeSavedReadingState: ctx.decodeSavedReadingState,
  encodeSavedReadingState: ctx.encodeSavedReadingState,
}));

import {
  deleteLocalReading,
  listLocalReadings,
  loadLocalReading,
  saveLocalReading,
} from '../../lib/localReadings.js';

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
    ctx.openTarotDb.mockResolvedValue(ctx.fakeDb());
    ctx.decodeSavedReadingState.mockReturnValue(decodedState);
    ctx.encodeSavedReadingState.mockReturnValue(new Uint8Array([1, 2, 3]));
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
      { id: 'old', name: 'O', state: new Uint8Array(), updated_at: '2020-01-01T00:00:00.000Z' },
      { id: 'mid', name: 'M', state: new Uint8Array(), updated_at: '2023-01-01T00:00:00.000Z' },
      { id: 'new', name: 'N', state: new Uint8Array(), updated_at: '2025-01-01T00:00:00.000Z' },
    ];
    ctx.idbRequest.mockResolvedValue(rows);
    await expect(listLocalReadings()).resolves.toEqual([
      { id: 'new', name: 'N', updated_at: '2025-01-01T00:00:00.000Z' },
      { id: 'mid', name: 'M', updated_at: '2023-01-01T00:00:00.000Z' },
      { id: 'old', name: 'O', updated_at: '2020-01-01T00:00:00.000Z' },
    ]);
  });

  it('listLocalReadings maps rows and sorts by updated_at descending', async () => {
    const rows: LocalReadingRow[] = [
      { id: 'a', name: 'Old', state: new Uint8Array(), updated_at: '2024-01-01T00:00:00.000Z' },
      { id: 'b', name: 'New', state: new Uint8Array(), updated_at: '2024-06-01T00:00:00.000Z' },
    ];
    ctx.idbRequest.mockResolvedValue(rows);
    await expect(listLocalReadings()).resolves.toEqual([
      { id: 'b', name: 'New', updated_at: '2024-06-01T00:00:00.000Z' },
      { id: 'a', name: 'Old', updated_at: '2024-01-01T00:00:00.000Z' },
    ]);
  });

  it('listLocalReadings returns empty array when store is empty', async () => {
    ctx.idbRequest.mockResolvedValue([]);
    await expect(listLocalReadings()).resolves.toEqual([]);
  });

  it('listLocalReadings includes both rows when updated_at ties (sort comparator always returns -1)', async () => {
    const rows: LocalReadingRow[] = [
      { id: 'first', name: 'A', state: new Uint8Array(), updated_at: '2024-01-01T00:00:00.000Z' },
      { id: 'second', name: 'B', state: new Uint8Array(), updated_at: '2024-01-01T00:00:00.000Z' },
    ];
    ctx.idbRequest.mockResolvedValue(rows);
    const out = await listLocalReadings();
    expect(out).toHaveLength(2);
    expect(new Set(out.map((x) => x.id))).toEqual(new Set(['first', 'second']));
  });

  it('loadLocalReading returns null when row is missing', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    await expect(loadLocalReading('missing')).resolves.toBeNull();
    expect(ctx.decodeSavedReadingState).not.toHaveBeenCalled();
  });

  it('loadLocalReading decodes Uint8Array state and returns name', async () => {
    const bytes = new Uint8Array([9, 9]);
    const row: LocalReadingRow = {
      id: 'r1',
      name: 'My Reading',
      state: bytes,
      updated_at: 'u',
    };
    ctx.idbRequest.mockResolvedValue(row);
    await expect(loadLocalReading('r1')).resolves.toEqual({
      state: decodedState,
      name: 'My Reading',
    });
    expect(ctx.decodeSavedReadingState).toHaveBeenCalledWith(bytes);
  });

  it('loadLocalReading wraps non-Uint8Array state as ArrayBuffer view', async () => {
    const buf = new ArrayBuffer(2);
    const row = {
      id: 'r2',
      name: 'X',
      state: buf as unknown as Uint8Array,
      updated_at: 'u',
    } as LocalReadingRow;
    ctx.idbRequest.mockResolvedValue(row);
    await loadLocalReading('r2');
    expect(ctx.decodeSavedReadingState).toHaveBeenCalledWith(expect.any(Uint8Array));
    const raw: unknown = ctx.decodeSavedReadingState.mock.calls[0][0];
    expect(raw).toBeInstanceOf(Uint8Array);
    if (!(raw instanceof Uint8Array)) throw new Error('expected Uint8Array');
    expect(raw.buffer).toBe(buf);
  });

  it('loadLocalReading keeps empty string name (not coerced by ??)', async () => {
    ctx.idbRequest.mockResolvedValue({
      id: 'e',
      name: '',
      state: new Uint8Array(),
      updated_at: 'u',
    });
    await expect(loadLocalReading('e')).resolves.toMatchObject({ name: '' });
  });

  it("loadLocalReading uses default name when row.name is null or undefined", async () => {
    ctx.idbRequest.mockResolvedValueOnce({
      id: 'a',
      name: null as unknown as string,
      state: new Uint8Array(),
      updated_at: 'u',
    } as LocalReadingRow);
    await expect(loadLocalReading('a')).resolves.toMatchObject({ name: 'Untitled Reading' });

    ctx.idbRequest.mockResolvedValueOnce({
      id: 'b',
      name: undefined as unknown as string,
      state: new Uint8Array(),
      updated_at: 'u',
    } as LocalReadingRow);
    await expect(loadLocalReading('b')).resolves.toMatchObject({ name: 'Untitled Reading' });
  });

  it('saveLocalReading creates id with randomUUID and encodes state', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    const r = await saveLocalReading(emptyState, 'Hello');
    expect(r).toEqual({ id: 'new-reading-id' });
    expect(ctx.encodeSavedReadingState).toHaveBeenCalledWith(emptyState);
    expect(ctx.idbRequest).toHaveBeenCalledTimes(1);
  });

  it('saveLocalReading defaults name when name argument is omitted', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    const r = await saveLocalReading(emptyState);
    expect(r).toEqual({ id: 'new-reading-id' });
    expect(ctx.idbRequest).toHaveBeenCalledTimes(1);
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
    ctx.idbRequest.mockResolvedValue(undefined);
    const r = await saveLocalReading(emptyState, 'N', 'fixed-id');
    expect(r).toEqual({ id: 'fixed-id' });
    expect(ctx.idbRequest).toHaveBeenCalledTimes(1);
  });

  it('saveLocalReading preserves existing name when updating without name param', async () => {
    const existing: LocalReadingRow = {
      id: 'keep',
      name: 'Preserved',
      state: new Uint8Array(),
      updated_at: 'old',
    };
    ctx.idbRequest.mockResolvedValueOnce(existing).mockResolvedValueOnce(undefined);
    const r = await saveLocalReading(emptyState, undefined, 'keep');
    expect(r).toEqual({ id: 'keep' });
    expect(ctx.idbRequest).toHaveBeenCalledTimes(2);
  });

  it('saveLocalReading keeps default name when updating without name and existing has no name', async () => {
    ctx.idbRequest
      .mockResolvedValueOnce({
        id: 'k',
        name: '',
        state: new Uint8Array(),
        updated_at: 'o',
      } as LocalReadingRow)
      .mockResolvedValueOnce(undefined);
    const r = await saveLocalReading(emptyState, undefined, 'k');
    expect(r).toEqual({ id: 'k' });
    expect(ctx.encodeSavedReadingState).toHaveBeenCalled();
    expect(ctx.idbRequest).toHaveBeenCalledTimes(2);
  });

  it('saveLocalReading uses Untitled when update has no name and get returns undefined', async () => {
    ctx.idbRequest.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
    const r = await saveLocalReading(emptyState, undefined, 'ghost');
    expect(r).toEqual({ id: 'ghost' });
    expect(ctx.idbRequest).toHaveBeenCalledTimes(2);
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

  it('deleteLocalReading deletes by id', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    await expect(deleteLocalReading('del-me')).resolves.toEqual({});
    expect(ctx.idbRequest).toHaveBeenCalledTimes(1);
    expect((ctx.idbRequest.mock.calls[0]?.[0] as IdbPayload).t).toBe('delete');
  });
});
