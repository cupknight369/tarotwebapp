import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** Minimal `DOMStringList`-like object for fake `IDBDatabase.objectStoreNames`. */
class FakeObjectStoreNames {
  private readonly names: string[] = [];

  get length(): number {
    return this.names.length;
  }

  contains(name: string): boolean {
    return this.names.includes(name);
  }

  item(index: number): string | null {
    return this.names[index] ?? null;
  }

  add(name: string): void {
    if (!this.names.includes(name)) this.names.push(name);
  }

  remove(name: string): void {
    const i = this.names.indexOf(name);
    if (i >= 0) this.names.splice(i, 1);
  }
}

type DbRecord = { version: number; stores: Set<string> };

type FakeIdbOptions = {
  /** If true, `open` invokes `onerror` and never succeeds. */
  openFails?: boolean;
  /** When `openFails` is true, value assigned to `request.error` before `onerror`. */
  openError?: DOMException | null;
  /** Simulated on-disk DB before `open` (version 0 = never opened). */
  persisted?: { version: number; stores: readonly string[] };
  /**
   * When set, used as `createIndex` on every object store created during upgrade
   * (so callers can assert index names/paths).
   */
  createIndexSpy?: ReturnType<typeof vi.fn>;
};

/** Mutable stand-in for `IDBOpenDBRequest` (DOM typings use read-only `result` / `error`). */
interface MutableOpenRequest {
  error: DOMException | null;
  result: IDBDatabase | null;
  transaction: IDBTransaction | null;
  onerror: ((this: IDBOpenDBRequest, ev: Event) => unknown) | null;
  onsuccess: ((this: IDBOpenDBRequest, ev: Event) => unknown) | null;
  onupgradeneeded: ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown) | null;
}

/**
 * Builds a minimal `indexedDB` fake that supports `open`, upgrade, and store
 * creation/deletion matching `openTarotDb` usage.
 */
function createFakeIndexedDB(opts: FakeIdbOptions = {}): IDBFactory {
  const dbs = new Map<string, DbRecord>();

  function getRecord(dbName: string): DbRecord {
    let rec = dbs.get(dbName);
    if (!rec) {
      const p = opts.persisted;
      rec = {
        version: p?.version ?? 0,
        stores: new Set(p?.stores ?? []),
      };
      dbs.set(dbName, rec);
    }
    return rec;
  }

  const factory = {
    cmp: (a: string, b: string): number => a.localeCompare(b),
    open(dbName: string, newVersion: number): IDBOpenDBRequest {
      const req: MutableOpenRequest = {
        error: null,
        result: null,
        transaction: null,
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
      };

      queueMicrotask(() => {
        if (opts.openFails) {
          req.error =
            opts.openError === undefined
              ? new DOMException('open failed', 'UnknownError')
              : opts.openError;
          const asReq = req as unknown as IDBOpenDBRequest;
          req.onerror?.call(asReq, new Event('error'));
          return;
        }

        const rec = getRecord(dbName);
        const oldVersion = rec.version;
        const names = new FakeObjectStoreNames();
        for (const s of rec.stores) names.add(s);

        const objectStoreNames = names as unknown as DOMStringList;
        const db = {
          name: dbName,
          version: newVersion,
          objectStoreNames,
          createObjectStore: (storeName: string, options?: IDBObjectStoreParameters) => {
            void options;
            names.add(storeName);
            rec.stores.add(storeName);
            const idx: ReturnType<typeof vi.fn> = opts.createIndexSpy ?? vi.fn();
            return {
              createIndex: idx,
              name: storeName,
            } as unknown as IDBObjectStore;
          },
          deleteObjectStore: (storeName: string) => {
            names.remove(storeName);
            rec.stores.delete(storeName);
          },
          close: vi.fn(),
          transaction: vi.fn(),
        } as unknown as IDBDatabase;

        req.result = db;

        const asReq = req as unknown as IDBOpenDBRequest;

        if (newVersion > oldVersion) {
          req.transaction = {
            objectStore: () => ({
              put: vi.fn(),
            }),
          } as unknown as IDBTransaction;
          const ev = {
            oldVersion,
            newVersion,
          } as unknown as IDBVersionChangeEvent;
          rec.version = newVersion;
          req.onupgradeneeded?.call(asReq, ev);
          req.transaction = null;
        }

        req.onsuccess?.call(asReq, new Event('success'));
      });

      return req as unknown as IDBOpenDBRequest;
    },
    deleteDatabase: vi.fn(),
    databases: vi.fn(),
  };

  return factory as IDBFactory;
}

async function loadIndexedDbModule(): Promise<typeof import('../../lib/indexedDb.js')> {
  return import('../../lib/indexedDb.js');
}

describe('indexedDb.ts', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exports store name constants', async () => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB());
    const m = await loadIndexedDbModule();
    expect(m.STORE_READINGS).toBe('readings');
    expect(m.STORE_DECKS).toBe('decks');
    expect(m.STORE_CARDS).toBe('cards');
    expect(m.STORE_CARD_IMAGES).toBe('cardImages');
    expect(m.STORE_CORRESPONDENCE_GROUPS).toBe('correspondenceGroups');
    expect(m.STORE_CORRESPONDENCES).toBe('correspondences');
    expect(m.STORE_CORRESPONDENCE_IMAGES).toBe('correspondenceImages');
  });

  it('openTarotDb rejects when indexedDB.open fails', async () => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB({ openFails: true }));
    const { openTarotDb } = await loadIndexedDbModule();
    await expect(openTarotDb()).rejects.toThrow();
  });

  it('openTarotDb rejects with fallback Error when open error is null', async () => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB({ openFails: true, openError: null }));
    const { openTarotDb } = await loadIndexedDbModule();
    await expect(openTarotDb()).rejects.toThrow('indexedDB.open failed');
  });

  it('openTarotDb returns the same promise on repeated calls', async () => {
    const idb = createFakeIndexedDB();
    vi.stubGlobal('indexedDB', idb);
    const { openTarotDb } = await loadIndexedDbModule();
    const a = openTarotDb();
    const b = openTarotDb();
    expect(a).toBe(b);
    await expect(a).resolves.toBeDefined();
  });

  it('openTarotDb runs v0 upgrade: creates all object stores and indexes', async () => {
    const createIndexSpy = vi.fn();
    vi.stubGlobal('indexedDB', createFakeIndexedDB({ createIndexSpy }));
    const {
      openTarotDb,
      STORE_READINGS,
      STORE_CARDS,
      STORE_CARD_IMAGES,
      STORE_DECKS,
      STORE_CORRESPONDENCE_GROUPS,
      STORE_CORRESPONDENCES,
      STORE_CORRESPONDENCE_IMAGES,
    } = await loadIndexedDbModule();
    const db = await openTarotDb();
    expect(db.objectStoreNames.contains(STORE_READINGS)).toBe(true);
    expect(db.objectStoreNames.contains(STORE_DECKS)).toBe(true);
    expect(db.objectStoreNames.contains(STORE_CARD_IMAGES)).toBe(true);
    expect(db.objectStoreNames.contains(STORE_CARDS)).toBe(true);
    expect(db.objectStoreNames.contains(STORE_CORRESPONDENCE_GROUPS)).toBe(true);
    expect(db.objectStoreNames.contains(STORE_CORRESPONDENCES)).toBe(true);
    expect(db.objectStoreNames.contains(STORE_CORRESPONDENCE_IMAGES)).toBe(true);
    expect(createIndexSpy).toHaveBeenCalledWith('by_updated_at', 'updated_at');
    expect(createIndexSpy).toHaveBeenCalledWith('by_deck_id', 'deck_id');
    expect(createIndexSpy).toHaveBeenCalledWith('by_group_id', 'group_id');
  });

  it('openTarotDb migrates v3 to v4: adds correspondence object stores', async () => {
    const createIndexSpy = vi.fn();
    vi.stubGlobal(
      'indexedDB',
      createFakeIndexedDB({
        createIndexSpy,
        persisted: {
          version: 3,
          stores: ['readings', 'decks', 'cardImages', 'cards'],
        },
      }),
    );
    const {
      openTarotDb,
      STORE_CORRESPONDENCE_GROUPS,
      STORE_CORRESPONDENCES,
      STORE_CORRESPONDENCE_IMAGES,
    } = await loadIndexedDbModule();
    const db = await openTarotDb();
    expect(db.objectStoreNames.contains(STORE_CORRESPONDENCE_GROUPS)).toBe(true);
    expect(db.objectStoreNames.contains(STORE_CORRESPONDENCES)).toBe(true);
    expect(db.objectStoreNames.contains(STORE_CORRESPONDENCE_IMAGES)).toBe(true);
    expect(createIndexSpy).toHaveBeenCalledWith('by_group_id', 'group_id');
  });

  it('openTarotDb v0 upgrade skips createObjectStore when store names already exist', async () => {
    vi.stubGlobal(
      'indexedDB',
      createFakeIndexedDB({
        persisted: {
          version: 0,
          stores: [
            'readings',
            'decks',
            'cardImages',
            'cards',
            'correspondenceGroups',
            'correspondences',
            'correspondenceImages',
          ],
        },
      }),
    );
    const { openTarotDb } = await loadIndexedDbModule();
    const db = await openTarotDb();
    const spy = vi.spyOn(db, 'createObjectStore');
    expect(spy).not.toHaveBeenCalled();
  });

  it('openTarotDb migrates v1 to v3: deletes readings store and recreates with index', async () => {
    const createIndexSpy = vi.fn();
    vi.stubGlobal(
      'indexedDB',
      createFakeIndexedDB({
        createIndexSpy,
        persisted: {
          version: 1,
          stores: ['readings', 'decks', 'cardImages', 'cards'],
        },
      }),
    );
    const { openTarotDb, STORE_READINGS } = await loadIndexedDbModule();
    const db = await openTarotDb();
    expect(db.objectStoreNames.contains(STORE_READINGS)).toBe(true);
    expect(createIndexSpy).toHaveBeenCalledWith('by_updated_at', 'updated_at');
  });

  it('openTarotDb migrates v2 to v3 like v1 (readings recreated)', async () => {
    vi.stubGlobal(
      'indexedDB',
      createFakeIndexedDB({
        persisted: {
          version: 2,
          stores: ['readings', 'decks', 'cardImages', 'cards'],
        },
      }),
    );
    const { openTarotDb, STORE_READINGS } = await loadIndexedDbModule();
    const db = await openTarotDb();
    expect(db.objectStoreNames.contains(STORE_READINGS)).toBe(true);
  });

  it('openTarotDb v1→v3 skips deleteObjectStore when readings is missing', async () => {
    vi.stubGlobal(
      'indexedDB',
      createFakeIndexedDB({
        persisted: { version: 1, stores: ['decks', 'cardImages', 'cards'] },
      }),
    );
    const { openTarotDb, STORE_READINGS } = await loadIndexedDbModule();
    const db = await openTarotDb();
    expect(db.objectStoreNames.contains(STORE_READINGS)).toBe(true);
  });

  it('idbRequest resolves with request result on success', async () => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB());
    const { idbRequest } = await loadIndexedDbModule();
    const req = {
      result: 99,
      error: null as DOMException | null,
      onsuccess: null as ((this: IDBRequest<number>, ev: Event) => unknown) | null,
      onerror: null as ((this: IDBRequest<number>, ev: Event) => unknown) | null,
    } as unknown as IDBRequest<number>;
    const p = idbRequest(req);
    queueMicrotask(() => {
      void req.onsuccess?.call(req, new Event('success'));
    });
    await expect(p).resolves.toBe(99);
  });

  it('idbRequest rejects with request error when present', async () => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB());
    const { idbRequest } = await loadIndexedDbModule();
    const domErr = new DOMException('fail', 'ConstraintError');
    const req = {
      result: null as unknown as number,
      error: domErr,
      onsuccess: null as ((this: IDBRequest<number>, ev: Event) => unknown) | null,
      onerror: null as ((this: IDBRequest<number>, ev: Event) => unknown) | null,
    } as unknown as IDBRequest<number>;
    const p = idbRequest(req);
    queueMicrotask(() => {
      void req.onerror?.call(req, new Event('error'));
    });
    await expect(p).rejects.toBe(domErr);
  });

  it('idbRequest rejects with fallback Error when request.error is null', async () => {
    vi.stubGlobal('indexedDB', createFakeIndexedDB());
    const { idbRequest } = await loadIndexedDbModule();
    const req = {
      result: null as unknown as number,
      error: null as DOMException | null,
      onsuccess: null as ((this: IDBRequest<number>, ev: Event) => unknown) | null,
      onerror: null as ((this: IDBRequest<number>, ev: Event) => unknown) | null,
    } as unknown as IDBRequest<number>;
    const p = idbRequest(req);
    queueMicrotask(() => {
      void req.onerror?.call(req, new Event('error'));
    });
    await expect(p).rejects.toThrow('IDBRequest failed');
  });
});
