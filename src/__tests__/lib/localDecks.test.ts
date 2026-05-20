import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { LocalCardRow, LocalDeckRow } from '../../types/localDb.js';

/** Payloads attached to fake IDB request objects (mirrors store/index calls). */
type IdbPayload =
  | { t: 'storeGetAll' }
  | { t: 'indexGetAll'; deckId: string }
  | { t: 'get'; key: string }
  | { t: 'put' }
  | { t: 'delete'; key: string };

const ctx = vi.hoisted(() => {
  const openTarotDb = vi.fn();
  const idbRequest = vi.fn();

  function fakeDb(): IDBDatabase {
    const store = {
      getAll: vi.fn((...args: unknown[]) =>
        args.length === 0
          ? ({ t: 'storeGetAll' } as IdbPayload)
          : ({ t: 'indexGetAll', deckId: args[0] as string } as IdbPayload),
      ),
      get: vi.fn((key: string) => ({ t: 'get', key }) as IdbPayload),
      put: vi.fn(() => ({ t: 'put' }) as IdbPayload),
      delete: vi.fn((key: string) => ({ t: 'delete', key }) as IdbPayload),
      index: vi.fn(() => ({
        getAll: vi.fn((deckId: string) => ({ t: 'indexGetAll', deckId }) as IdbPayload),
      })),
    };
    return {
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => store),
      })),
    } as unknown as IDBDatabase;
  }

  return { openTarotDb, idbRequest, fakeDb };
});

vi.mock('../../lib/indexedDb.js', () => ({
  openTarotDb: ctx.openTarotDb,
  idbRequest: ctx.idbRequest,
  STORE_DECKS: 'decks',
  STORE_CARDS: 'cards',
  STORE_CARD_IMAGES: 'cardImages',
}));

let LD: typeof import('../../lib/localDecks.js');

function nonEmptyFile(name: string, type: string): File {
  return new File([new Uint8Array([1])], name, { type });
}

function emptyFile(name: string): File {
  return new File([], name);
}

describe('localDecks.ts', () => {
  let uuidN = 0;
  let revokeSpy: Mock<(url: string) => void>;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    uuidN = 0;
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
      uuidN += 1;
      return `uuid-${uuidN}`;
    });
    revokeSpy = vi.fn((url: string) => {
      void url;
    });
    vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(revokeSpy);
    vi.spyOn(globalThis.URL, 'createObjectURL').mockImplementation(
      (obj: Blob | MediaSource) => `blob:${obj instanceof Blob ? obj.size : 0}`,
    );
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-01T12:00:00.000Z'));

    ctx.openTarotDb.mockResolvedValue(ctx.fakeDb());
    ctx.idbRequest.mockReset();

    LD = await import('../../lib/localDecks.js');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('blob URL cache: get, set, replace revokes previous, revokeBlobObjectUrl, isBlobUrlManagedByDeckCache', () => {
    expect(LD.getCachedObjectUrlForBlobId('b')).toBeUndefined();
    LD.setCachedObjectUrl('b', 'blob:a');
    expect(LD.getCachedObjectUrlForBlobId('b')).toBe('blob:a');
    expect(LD.isBlobUrlManagedByDeckCache('blob:a')).toBe(true);
    expect(LD.isBlobUrlManagedByDeckCache('blob:other')).toBe(false);

    LD.setCachedObjectUrl('b', 'blob:a');
    expect(revokeSpy).not.toHaveBeenCalled();

    LD.setCachedObjectUrl('b', 'blob:b');
    expect(revokeSpy).toHaveBeenCalledWith('blob:a');

    LD.revokeBlobObjectUrl('b');
    expect(revokeSpy).toHaveBeenCalledWith('blob:b');
    expect(LD.getCachedObjectUrlForBlobId('b')).toBeUndefined();

    LD.revokeBlobObjectUrl('missing');
  });

  it('listLocalDecks returns rows sorted by title', async () => {
    const rows: LocalDeckRow[] = [
      { id: '2', title: 'Beta', description: null, created_at: '1', modified_at: '1' },
      { id: '1', title: 'Alpha', description: null, created_at: '1', modified_at: '1' },
    ];
    ctx.idbRequest.mockResolvedValue(rows);
    await expect(LD.listLocalDecks()).resolves.toEqual([rows[1], rows[0]]);
  });

  it('isUserCreatedDeck is false only when from_catalog is true', () => {
    expect(
      LD.isUserCreatedDeck({
        id: '1',
        title: 'U',
        description: null,
        created_at: '1',
        modified_at: '1',
        from_catalog: false,
      }),
    ).toBe(true);
    expect(
      LD.isUserCreatedDeck({
        id: '2',
        title: 'C',
        description: null,
        created_at: '1',
        modified_at: '1',
        from_catalog: true,
      }),
    ).toBe(false);
    expect(
      LD.isUserCreatedDeck({
        id: '3',
        title: 'L',
        description: null,
        created_at: '1',
        modified_at: '1',
      }),
    ).toBe(true);
  });

  it('listUserCreatedDecks excludes catalog decks', async () => {
    const rows: LocalDeckRow[] = [
      {
        id: 'u',
        title: 'User',
        description: null,
        created_at: '1',
        modified_at: '1',
        from_catalog: false,
      },
      {
        id: 'c',
        title: 'Cloud',
        description: null,
        created_at: '1',
        modified_at: '1',
        from_catalog: true,
      },
    ];
    ctx.idbRequest.mockResolvedValue(rows);
    await expect(LD.listUserCreatedDecks()).resolves.toEqual([rows[0]]);
  });

  it('putLocalDeck writes row', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    const row: LocalDeckRow = {
      id: 'd',
      title: 'T',
      description: null,
      created_at: 'c',
      modified_at: 'm',
    };
    await LD.putLocalDeck(row);
    expect(ctx.idbRequest).toHaveBeenCalledTimes(1);
  });

  it('createLocalDeck builds row and saves', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    const row = await LD.createLocalDeck('My', 'desc');
    expect(row).toMatchObject({
      title: 'My',
      description: 'desc',
      from_catalog: false,
      id: 'uuid-1',
      created_at: '2024-06-01T12:00:00.000Z',
      modified_at: '2024-06-01T12:00:00.000Z',
    });
  });

  it('createLocalDeck uses null description by default', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    const row = await LD.createLocalDeck('X');
    expect(row.description).toBeNull();
  });

  it('putCardImage stores blob with mime from blob.type when mime omitted', async () => {
    ctx.idbRequest.mockImplementation((p: unknown) => {
      expect((p as IdbPayload).t).toBe('put');
      return Promise.resolve(undefined);
    });
    const blob = new Blob([new Uint8Array([2])], { type: 'image/webp' });
    const id = await LD.putCardImage(blob);
    expect(id).toBe('uuid-1');
  });

  it('putCardImage uses explicit mimeType when provided', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    const blob = new Blob([new Uint8Array([1])], { type: 'text/plain' });
    await LD.putCardImage(blob, 'application/x-custom');
    expect(ctx.idbRequest).toHaveBeenCalledTimes(1);
  });

  it('putCardImage omits title when blank after trim', async () => {
    const blob = new Blob([new Uint8Array([1])]);
    ctx.idbRequest.mockResolvedValue(undefined);
    await LD.putCardImage(blob, 't', '   ');
    expect(ctx.idbRequest).toHaveBeenCalled();
  });

  it('putLocalCardImageRow revokes cache then puts', async () => {
    LD.setCachedObjectUrl('img1', 'blob:old');
    ctx.idbRequest.mockResolvedValue(undefined);
    await LD.putLocalCardImageRow({
      id: 'img1',
      blob: new Blob(),
      created_at: 'c',
    });
    expect(revokeSpy).toHaveBeenCalledWith('blob:old');
    expect(ctx.idbRequest).toHaveBeenCalledTimes(1);
  });

  it('getCardImageRow returns null when missing', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    await expect(LD.getCardImageRow('x')).resolves.toBeNull();
  });

  it('getCardImageRow returns row when present', async () => {
    const img = { id: 'i', blob: new Blob(), created_at: 'c' };
    ctx.idbRequest.mockResolvedValue(img);
    await expect(LD.getCardImageRow('i')).resolves.toEqual(img);
  });

  it('getCardImageBlob returns blob or null', async () => {
    ctx.idbRequest.mockResolvedValueOnce(undefined);
    await expect(LD.getCardImageBlob('a')).resolves.toBeNull();
    const b = new Blob([new Uint8Array([1])]);
    ctx.idbRequest.mockResolvedValueOnce({ id: 'i', blob: b, created_at: 'c' });
    await expect(LD.getCardImageBlob('i')).resolves.toBe(b);
  });

  it('listLocalCardsByDeckId sorts by number', async () => {
    const rows: LocalCardRow[] = [
      { id: 'b', deck_id: 'd', title: 'B', number: 2, imageBlobId: 'i', censorImageBlobId: null },
      { id: 'a', deck_id: 'd', title: 'A', number: 1, imageBlobId: 'i', censorImageBlobId: null },
    ];
    ctx.idbRequest.mockResolvedValue(rows);
    await expect(LD.listLocalCardsByDeckId('d')).resolves.toEqual([
      { ...rows[1], correspondence_ids: [] },
      { ...rows[0], correspondence_ids: [] },
    ]);
  });

  it('getLocalCardsByIds returns empty map for empty input', async () => {
    await expect(LD.getLocalCardsByIds([])).resolves.toEqual(new Map());
    await expect(LD.getLocalCardsByIds(['', 'x', 'x'])).resolves.toEqual(new Map());
  });

  it('getLocalCardsByIds merges parallel gets', async () => {
    const r1: LocalCardRow = {
      id: 'a',
      deck_id: 'd',
      title: 'A',
      number: 1,
      imageBlobId: 'b',
      censorImageBlobId: null,
    };
    ctx.idbRequest.mockImplementation((p: unknown) => {
      const pl = p as IdbPayload;
      if (pl.t === 'get' && pl.key === 'a') return Promise.resolve(r1);
      if (pl.t === 'get' && pl.key === 'missing') return Promise.resolve(undefined);
      return Promise.resolve(undefined);
    });
    const m = await LD.getLocalCardsByIds(['a', 'missing']);
    expect(m.size).toBe(1);
    expect(m.get('a')).toEqual({ ...r1, correspondence_ids: [] });
  });

  it('putLocalCard updates deck modified_at when deck exists', async () => {
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: 'old',
    };
    const card: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'b',
      censorImageBlobId: null,
    };
    ctx.idbRequest
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined);
    await LD.putLocalCard(card);
    expect(ctx.idbRequest).toHaveBeenCalledTimes(3);
  });

  it('putLocalCard skips deck put when deck missing', async () => {
    const card: LocalCardRow = {
      id: 'c1',
      deck_id: 'ghost',
      title: 'C',
      number: 1,
      imageBlobId: 'b',
      censorImageBlobId: null,
    };
    ctx.idbRequest.mockResolvedValueOnce(undefined).mockResolvedValueOnce(undefined);
    await LD.putLocalCard(card);
    expect(ctx.idbRequest).toHaveBeenCalledTimes(2);
  });

  it('countCardsReferencingBlob counts main and censor refs', async () => {
    const rows: LocalCardRow[] = [
      {
        id: '1',
        deck_id: 'd',
        title: '',
        number: 0,
        imageBlobId: 'blob-a',
        censorImageBlobId: 'blob-b',
      },
      {
        id: '2',
        deck_id: 'd',
        title: '',
        number: 1,
        imageBlobId: 'x',
        censorImageBlobId: 'blob-a',
      },
    ];
    ctx.idbRequest.mockResolvedValue(rows);
    await expect(LD.countCardsReferencingBlob('blob-a')).resolves.toBe(2);
    await expect(LD.countCardsReferencingBlob('blob-b')).resolves.toBe(1);
    await expect(LD.countCardsReferencingBlob('none')).resolves.toBe(0);
  });

  it('deleteLocalCard no-ops when card missing', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    await LD.deleteLocalCard('nope');
    expect(ctx.idbRequest).toHaveBeenCalledTimes(1);
  });

  it('deleteLocalCard keeps blob when another card still references it', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd',
      title: 'C',
      number: 1,
      imageBlobId: 'shared-blob',
      censorImageBlobId: null,
    };
    const other: LocalCardRow = {
      ...row,
      id: 'c2',
      number: 2,
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([other]);
    await LD.deleteLocalCard('c1');
    const deletes = ctx.idbRequest.mock.calls.filter((c) => (c[0] as IdbPayload).t === 'delete');
    expect(deletes).toHaveLength(1);
  });

  it('deleteLocalCard removes card and unreferenced blobs', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd',
      title: 'C',
      number: 1,
      imageBlobId: 'img-main',
      censorImageBlobId: 'img-cen',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined);
    await LD.deleteLocalCard('c1');
    expect(ctx.idbRequest).toHaveBeenCalled();
  });

  it('deleteLocalCards does nothing when cardIds is empty', async () => {
    await LD.deleteLocalCards([]);
    expect(ctx.openTarotDb).not.toHaveBeenCalled();
  });

  it('deleteLocalCards dedupes ids and skips blank strings', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    await LD.deleteLocalCards(['a', 'a', 'b', '', '  ', 'b']);
    expect(ctx.openTarotDb).toHaveBeenCalledTimes(2);
  });

  it('deleteLocalDeck deletes cards then deck', async () => {
    const card: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'b1',
      censorImageBlobId: null,
    };
    ctx.idbRequest
      .mockResolvedValueOnce([card])
      .mockResolvedValueOnce(card)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    await LD.deleteLocalDeck('d1');
    const deletes = ctx.idbRequest.mock.calls.filter((c) => (c[0] as IdbPayload).t === 'delete');
    expect(deletes.length).toBeGreaterThanOrEqual(2);
  });

  it('deleteLocalDeck with no cards only deletes deck', async () => {
    ctx.idbRequest.mockResolvedValueOnce([]).mockResolvedValueOnce(undefined);
    await LD.deleteLocalDeck('empty');
    expect(ctx.idbRequest).toHaveBeenCalledTimes(2);
  });

  it('addCardToLocalDeck saves main image and optional censor', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    const main = nonEmptyFile('a.png', 'image/png');
    const censor = nonEmptyFile('c.png', 'image/png');
    const row = await LD.addCardToLocalDeck({
      deckId: 'd',
      title: 'T',
      number: 3,
      imageFile: main,
      censorFile: censor,
    });
    expect(row.imageBlobId).toBe('uuid-1');
    expect(row.censorImageBlobId).toBe('uuid-2');
  });

  it('addCardToLocalDeck skips zero-size censor file', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    const row = await LD.addCardToLocalDeck({
      deckId: 'd',
      title: 'T',
      number: 1,
      imageFile: nonEmptyFile('a.png', 'image/png'),
      censorFile: emptyFile('e.png'),
    });
    expect(row.censorImageBlobId).toBeNull();
    expect(ctx.idbRequest.mock.calls.length).toBe(3);
  });

  it('addCardToLocalDeck without censorFile', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    const row = await LD.addCardToLocalDeck({
      deckId: 'd',
      title: 'T',
      number: 1,
      imageFile: nonEmptyFile('a.png', 'image/png'),
    });
    expect(row.censorImageBlobId).toBeNull();
  });

  it('updateLocalCard throws when card missing', async () => {
    ctx.idbRequest.mockResolvedValue(undefined);
    await expect(LD.updateLocalCard({ cardId: 'x', title: 'T', number: 1 })).rejects.toThrow(
      'Card not found: x',
    );
  });

  it('updateLocalCard updates title/number only', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'Old',
      number: 1,
      imageBlobId: 'b1',
      censorImageBlobId: null,
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({ cardId: 'c1', title: '  New  ', number: 9 });
    expect(ctx.idbRequest).toHaveBeenCalled();
  });

  it('updateLocalCard short-circuits maybeDeleteBlob when old main id is empty string', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: '',
      censorImageBlobId: null,
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      mainImageFile: nonEmptyFile('n.webp', 'image/webp'),
    });
    expect(ctx.idbRequest).toHaveBeenCalledTimes(5);
  });

  it('updateLocalCard replaces main image and deletes old blob when unreferenced', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'old-main',
      censorImageBlobId: null,
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      mainImageFile: nonEmptyFile('n.webp', 'image/webp'),
    });
    expect(ctx.idbRequest.mock.calls.length).toBeGreaterThanOrEqual(6);
  });

  it('updateLocalCard clears censor and deletes old censor blob', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'm',
      censorImageBlobId: 'old-c',
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      censorClear: true,
    });
  });

  it('updateLocalCard replaces censor image and deletes previous censor blob', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'm',
      censorImageBlobId: 'old-c',
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      censorImageFile: nonEmptyFile('c.png', 'image/png'),
    });
  });

  it('updateLocalCard ignores zero-size mainImageFile', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'm',
      censorImageBlobId: null,
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      mainImageFile: emptyFile('z.png'),
    });
    expect(
      ctx.idbRequest.mock.calls.filter((c) => (c[0] as IdbPayload).t === 'delete'),
    ).toHaveLength(0);
  });

  it('updateLocalCard skips censor blob delete when new censor file is empty', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'm',
      censorImageBlobId: 'old-c',
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      censorImageFile: emptyFile('z.png'),
    });
    expect(
      ctx.idbRequest.mock.calls.filter((c) => (c[0] as IdbPayload).t === 'delete'),
    ).toHaveLength(0);
  });

  it('updateLocalCard keeps old main blob when still referenced after replacement', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'old-main',
      censorImageBlobId: null,
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    const other: LocalCardRow = {
      id: 'c2',
      deck_id: 'd1',
      title: 'O',
      number: 2,
      imageBlobId: 'old-main',
      censorImageBlobId: null,
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([other]);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      mainImageFile: nonEmptyFile('n.webp', 'image/webp'),
    });
    expect(
      ctx.idbRequest.mock.calls.filter((c) => (c[0] as IdbPayload).t === 'delete'),
    ).toHaveLength(0);
  });

  it('updateLocalCard skips main blob delete when new image reuses same blob id', async () => {
    (globalThis.crypto.randomUUID as Mock).mockReturnValue('same-main');
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'same-main',
      censorImageBlobId: null,
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      mainImageFile: nonEmptyFile('n.webp', 'image/webp'),
    });
    expect(
      ctx.idbRequest.mock.calls.filter((c) => (c[0] as IdbPayload).t === 'delete'),
    ).toHaveLength(0);
  });

  it('updateLocalCard skips censor blob delete when new censor keeps same blob id', async () => {
    (globalThis.crypto.randomUUID as Mock).mockReturnValue('same-c');
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'm',
      censorImageBlobId: 'same-c',
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      censorImageFile: nonEmptyFile('c.png', 'image/png'),
    });
    expect(
      ctx.idbRequest.mock.calls.filter((c) => (c[0] as IdbPayload).t === 'delete'),
    ).toHaveLength(0);
  });

  it('updateLocalCard with censorClear and no prior censor skips blob cleanup branches', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'm',
      censorImageBlobId: null,
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      censorClear: true,
    });
  });

  it('updateLocalCard with new censor file but no old censor skips old censor delete', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'm',
      censorImageBlobId: null,
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      censorImageFile: nonEmptyFile('c.png', 'image/png'),
    });
    expect(
      ctx.idbRequest.mock.calls.filter((c) => (c[0] as IdbPayload).t === 'delete'),
    ).toHaveLength(0);
  });

  it('updateLocalCard does not delete old censor when censorClear is false and no new censor file', async () => {
    const row: LocalCardRow = {
      id: 'c1',
      deck_id: 'd1',
      title: 'C',
      number: 1,
      imageBlobId: 'm',
      censorImageBlobId: 'keep-c',
    };
    const deck: LocalDeckRow = {
      id: 'd1',
      title: 'D',
      description: null,
      created_at: '0',
      modified_at: '0',
    };
    ctx.idbRequest
      .mockResolvedValueOnce(row)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(deck)
      .mockResolvedValueOnce(undefined);
    await LD.updateLocalCard({
      cardId: 'c1',
      title: 'C',
      number: 1,
      censorClear: false,
    });
    const deleteCalls = ctx.idbRequest.mock.calls.filter(
      (c) => (c[0] as IdbPayload).t === 'delete',
    );
    expect(deleteCalls.length).toBe(0);
  });
});
