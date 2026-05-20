import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocalCardRow, LocalDeckRow } from '../../types/localDb.js';

const { sbState, supabaseFrom, defaultSupabaseFrom } = vi.hoisted(() => {
  const sbState = {
    deckList: Promise.resolve({ data: [] as unknown, error: null as unknown }),
    cardForDeck: Promise.resolve({ data: [] as unknown, error: null as unknown }),
    cardByIds: Promise.resolve({ data: [] as unknown, error: null as unknown }),
  };

  function defaultSupabaseFrom(table: string): unknown {
    if (table === 'deck') {
      return {
        select: vi.fn(() => ({
          order: vi.fn(() => sbState.deckList),
        })),
      };
    }
    if (table === 'card') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => sbState.cardForDeck),
          })),
          in: vi.fn(() => sbState.cardByIds),
        })),
      };
    }
    throw new Error(`unexpected table ${table}`);
  }

  const supabaseFrom = vi.fn(defaultSupabaseFrom);
  return { sbState, supabaseFrom, defaultSupabaseFrom };
});

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: supabaseFrom,
  },
}));

vi.mock('../../lib/cardImageUrls.js', () => ({
  publicCardImageUrl: vi.fn((key: string) => `https://cdn.example/${key}`),
}));

const localMocks = vi.hoisted(() => ({
  listLocalDecks: vi.fn(),
  listLocalCardsByDeckId: vi.fn(),
  putLocalDeck: vi.fn(),
  getCardImageRow: vi.fn(),
  getCachedObjectUrlForBlobId: vi.fn(),
  setCachedObjectUrl: vi.fn(),
  getLocalCardsByIds: vi.fn(),
}));

vi.mock('../../lib/localDecks.js', () => ({
  listLocalDecks: localMocks.listLocalDecks,
  listLocalCardsByDeckId: localMocks.listLocalCardsByDeckId,
  putLocalDeck: localMocks.putLocalDeck,
  getCardImageRow: localMocks.getCardImageRow,
  getCachedObjectUrlForBlobId: localMocks.getCachedObjectUrlForBlobId,
  setCachedObjectUrl: localMocks.setCachedObjectUrl,
  getLocalCardsByIds: localMocks.getLocalCardsByIds,
}));

const corrMocks = vi.hoisted(() => ({
  getCorrespondenceById: vi.fn(),
  getCorrespondenceImageRow: vi.fn(),
  getCachedCorrespondenceThumbUrl: vi.fn(),
  setCachedCorrespondenceThumbUrl: vi.fn(),
}));

vi.mock('../../lib/localCorrespondences.js', () => ({
  getCorrespondenceById: corrMocks.getCorrespondenceById,
  getCorrespondenceImageRow: corrMocks.getCorrespondenceImageRow,
  getCachedCorrespondenceThumbUrl: corrMocks.getCachedCorrespondenceThumbUrl,
  setCachedCorrespondenceThumbUrl: corrMocks.setCachedCorrespondenceThumbUrl,
}));

import { publicCardImageUrl } from '../../lib/cardImageUrls.js';
import {
  DEFAULT_DECK_ID,
  getCardsByDeckId,
  getCardsByIds,
  getKnownDeckIds,
  LAST_DECK_STORAGE_KEY,
  listCatalogDeckOffers,
  listOnDeviceDeckEntries,
} from '../../lib/decks.js';

const deckA: LocalDeckRow = {
  id: 'd-a',
  title: 'Alpha',
  description: null,
  created_at: 'a',
  modified_at: 'a',
  from_catalog: true,
};

const deckB: LocalDeckRow = {
  id: 'd-b',
  title: 'Beta',
  description: 'desc',
  created_at: 'b',
  modified_at: 'b',
  from_catalog: false,
};

const catalogDeckRows = [
  { id: 'd-a', title: 'Alpha', description: null, created_at: '1', modified_at: '1' },
  { id: 'd-c', title: 'Gamma', description: null, created_at: '2', modified_at: '2' },
];

const cloudCardRow = {
  id: 'cc1',
  title: 'Cloud Card',
  number: 0,
  image: 'm00.webp',
  censor_image: null as string | null,
  deck_id: 'd-a',
};

const cloudCardCensored = {
  ...cloudCardRow,
  id: 'cc2',
  censor_image: 'm01.webp',
};

const localCard: LocalCardRow = {
  id: 'lc1',
  deck_id: 'd-a',
  title: 'Local',
  number: 3,
  imageBlobId: 'blob-main',
  censorImageBlobId: null,
};

function resetSbPromises(): void {
  sbState.deckList = Promise.resolve({ data: catalogDeckRows, error: null });
  sbState.cardForDeck = Promise.resolve({ data: [], error: null });
  sbState.cardByIds = Promise.resolve({ data: [], error: null });
}

describe('decks.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseFrom.mockImplementation(defaultSupabaseFrom);
    resetSbPromises();
    corrMocks.getCorrespondenceById.mockResolvedValue(null);
    corrMocks.getCorrespondenceImageRow.mockResolvedValue(null);
    corrMocks.getCachedCorrespondenceThumbUrl.mockReturnValue(undefined);
    corrMocks.setCachedCorrespondenceThumbUrl.mockImplementation(() => {});
    localMocks.listLocalDecks.mockResolvedValue([]);
    localMocks.listLocalCardsByDeckId.mockResolvedValue([]);
    localMocks.putLocalDeck.mockResolvedValue(undefined);
    localMocks.getLocalCardsByIds.mockResolvedValue(new Map());
    localMocks.getCardImageRow.mockResolvedValue(null);
    localMocks.getCachedObjectUrlForBlobId.mockReturnValue(null);
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:created'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('exports storage key and default deck id', () => {
    expect(LAST_DECK_STORAGE_KEY).toBe('last_deck_id');
    expect(DEFAULT_DECK_ID).toBe('a0000000-0000-4000-8000-000000000001');
  });

  it('listCatalogDeckOffers returns error when catalog fetch fails', async () => {
    sbState.deckList = Promise.resolve({
      data: null,
      error: { message: 'e', code: 'XX' },
    });
    const r = await listCatalogDeckOffers();
    expect(r.ok).toBe(false);
  });

  it('listCatalogDeckOffers times out when deck list never resolves', async () => {
    vi.useFakeTimers();
    sbState.deckList = new Promise(() => {});
    const p = listCatalogDeckOffers();
    await vi.advanceTimersByTimeAsync(15_001);
    const r = await p;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('timed out');
  });

  it('listCatalogDeckOffers ignores catalog response that arrives after timeout', async () => {
    vi.useFakeTimers();
    sbState.deckList = new Promise((resolve) => {
      setTimeout(() => resolve({ data: catalogDeckRows, error: null }), 20_000);
    });
    const p = listCatalogDeckOffers();
    await vi.advanceTimersByTimeAsync(15_001);
    const r = await p;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('timed out');
    await vi.advanceTimersByTimeAsync(20_000);
    await Promise.resolve();
  });

  it('listCatalogDeckOffers migrates legacy decks and marks installed', async () => {
    const legacy: LocalDeckRow = {
      id: 'd-a',
      title: 'Alpha',
      description: null,
      created_at: '1',
      modified_at: '1',
    };
    localMocks.listLocalDecks.mockResolvedValue([legacy]);
    const r = await listCatalogDeckOffers();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toHaveLength(2);
      const alpha = r.value.find((x) => x.id === 'd-a');
      expect(alpha?.installed).toBe(true);
    }
    expect(localMocks.putLocalDeck).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'd-a', from_catalog: true }),
    );
  });

  it('listOnDeviceDeckEntries maps, sorts by title, and derives fromCatalog', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckB, deckA]);
    const r = await listOnDeviceDeckEntries();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.map((e) => e.title)).toEqual(['Alpha', 'Beta']);
      expect(r.value[0]?.fromCatalog).toBe(true);
      expect(r.value[1]?.fromCatalog).toBe(false);
    }
  });

  it('getKnownDeckIds collects local ids', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    const r = await getKnownDeckIds();
    expect(r.ok).toBe(true);
    if (r.ok) expect([...r.value]).toEqual(['d-a']);
  });

  it('getCardsByDeckId resolves deck title from catalog when deck is not in local list', async () => {
    localMocks.listLocalDecks.mockResolvedValue([]);
    localMocks.listLocalCardsByDeckId.mockResolvedValue([]);
    sbState.cardForDeck = Promise.resolve({
      data: [{ ...cloudCardRow, id: 'c1', deck_id: 'd-c' }],
      error: null,
    });
    const r = await getCardsByDeckId('d-c');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value[0]?.deckTitle).toBe('Gamma');
  });

  it('getCardsByDeckId uses cloud rows when no local cards', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    sbState.cardForDeck = Promise.resolve({ data: [cloudCardRow, cloudCardCensored], error: null });
    const r = await getCardsByDeckId('d-a');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toHaveLength(2);
      expect(publicCardImageUrl).toHaveBeenCalledWith('m00.webp');
      expect(r.value[1]?.censoredImg).toBe('https://cdn.example/m01.webp');
    }
  });

  it('getCardsByDeckId returns empty ok when cloud has no rows', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    sbState.cardForDeck = Promise.resolve({ data: [], error: null });
    const r = await getCardsByDeckId('d-a');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual([]);
  });

  it('getCardsByDeckId propagates catalog failure when resolving deck title', async () => {
    localMocks.listLocalDecks.mockResolvedValue([]);
    sbState.deckList = Promise.resolve({ data: null, error: { message: 'x', code: 'c' } });
    const r = await getCardsByDeckId('d-x');
    expect(r.ok).toBe(false);
  });

  it('getCardsByDeckId times out waiting for cloud cards', async () => {
    vi.useFakeTimers();
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    sbState.cardForDeck = new Promise(() => {});
    const p = getCardsByDeckId('d-a');
    await vi.advanceTimersByTimeAsync(15_001);
    const r = await p;
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toContain('timed out');
  });

  it('getCardsByDeckId returns cloud card query error', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    sbState.cardForDeck = Promise.resolve({ data: null, error: { message: 'q', code: 'Q' } });
    const r = await getCardsByDeckId('d-a');
    expect(r.ok).toBe(false);
  });

  it('getCardsByDeckId maps local cards with cached and fresh object URLs', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    localMocks.listLocalCardsByDeckId.mockResolvedValue([localCard]);
    const mainBlob = new Blob([new Uint8Array([1])], { type: 'image/webp' });
    localMocks.getCardImageRow.mockResolvedValue({
      id: 'blob-main',
      blob: mainBlob,
      created_at: 't',
      title: '  file.webp  ',
    });
    localMocks.getCachedObjectUrlForBlobId.mockReturnValueOnce(null).mockReturnValue('blob:cached');
    const r = await getCardsByDeckId('d-a');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value[0]?.img).toBe('blob:created');
      expect(r.value[0]?.imageSourceLabel).toBe('file.webp');
      expect(localMocks.setCachedObjectUrl).toHaveBeenCalledWith('blob-main', 'blob:created');
    }
    localMocks.getCachedObjectUrlForBlobId.mockReset();
    localMocks.getCachedObjectUrlForBlobId.mockReturnValue('blob:cached');
    localMocks.getCardImageRow.mockResolvedValue({
      id: 'blob-main',
      blob: mainBlob,
      created_at: 't',
      title: undefined,
    });
    const r2 = await getCardsByDeckId('d-a');
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.value[0]?.img).toBe('blob:cached');
  });

  it('getCardsByDeckId resolves correspondence thumbnail urls with cache miss and hit', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    const row: LocalCardRow = {
      ...localCard,
      correspondence_ids: ['corr-1'],
    };
    localMocks.listLocalCardsByDeckId.mockResolvedValue([row]);
    const mainBlob = new Blob([new Uint8Array([1])]);
    localMocks.getCardImageRow.mockResolvedValue({
      id: 'blob-main',
      blob: mainBlob,
      created_at: 't',
      title: 'm',
    });
    localMocks.getCachedObjectUrlForBlobId.mockReturnValue('blob:main');
    corrMocks.getCorrespondenceById.mockResolvedValue({
      id: 'corr-1',
      title: 'Herb',
      description: null,
      group_id: 'g1',
      thumbnailBlobId: 'thumb-b',
    });
    corrMocks.getCachedCorrespondenceThumbUrl.mockReturnValue(undefined);
    corrMocks.getCorrespondenceImageRow.mockResolvedValue({
      id: 'thumb-b',
      blob: new Blob([new Uint8Array([2])]),
      created_at: 't',
    });
    const r = await getCardsByDeckId('d-a');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value[0]?.correspondence_ids).toEqual(['corr-1']);
      expect(r.value[0]?.correspondenceDisplays).toEqual([
        { id: 'corr-1', title: 'Herb', thumbnailUrl: 'blob:created' },
      ]);
      expect(corrMocks.setCachedCorrespondenceThumbUrl).toHaveBeenCalledWith(
        'thumb-b',
        'blob:created',
      );
    }
    corrMocks.getCachedCorrespondenceThumbUrl.mockReturnValue('blob:thumb-hit');
    const r2 = await getCardsByDeckId('d-a');
    expect(r2.ok).toBe(true);
    if (r2.ok) {
      expect(r2.value[0]?.correspondenceDisplays).toEqual([
        { id: 'corr-1', title: 'Herb', thumbnailUrl: 'blob:thumb-hit' },
      ]);
    }
  });

  it('getCardsByDeckId uses local image fallbacks for title metadata', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    localMocks.listLocalCardsByDeckId.mockResolvedValue([localCard]);
    const mainBlob = new Blob([new Uint8Array([1])]);
    localMocks.getCardImageRow.mockResolvedValueOnce({
      id: 'blob-main',
      blob: mainBlob,
      created_at: 't',
      title: '   ',
    });
    let r = await getCardsByDeckId('d-a');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value[0]?.imageSourceLabel).toBe('Local image (no title stored)');

    localMocks.getCardImageRow.mockResolvedValueOnce({
      id: 'blob-main',
      blob: mainBlob,
      created_at: 't',
    });
    r = await getCardsByDeckId('d-a');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value[0]?.imageSourceLabel).toBe('Local image (no title stored)');

    localMocks.getCardImageRow.mockResolvedValueOnce(null);
    await expect(getCardsByDeckId('d-a')).rejects.toThrow('Missing image blob');
  });

  it('getCardsByDeckId loads censored blob with cache miss and hit', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    const rowCen: LocalCardRow = {
      ...localCard,
      censorImageBlobId: 'cen-blob',
    };
    localMocks.listLocalCardsByDeckId.mockResolvedValue([rowCen]);
    const mainBlob = new Blob([new Uint8Array([1])]);
    const cenBlob = new Blob([new Uint8Array([2])]);
    localMocks.getCardImageRow
      .mockResolvedValueOnce({ id: 'blob-main', blob: mainBlob, created_at: 't', title: 'm' })
      .mockResolvedValueOnce({
        id: 'cen-blob',
        blob: cenBlob,
        created_at: 't',
        title: 'censor.png',
      });
    localMocks.getCachedObjectUrlForBlobId
      .mockReturnValueOnce(null)
      .mockReturnValueOnce(null)
      .mockReturnValue('blob:cen-hit');
    let r = await getCardsByDeckId('d-a');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value[0]?.censoredImg).toBe('blob:created');
      expect(r.value[0]?.censorImageSourceLabel).toBe('censor.png');
    }
    localMocks.getCardImageRow
      .mockResolvedValueOnce({ id: 'blob-main', blob: mainBlob, created_at: 't', title: 'm' })
      .mockResolvedValueOnce({ id: 'cen-blob', blob: cenBlob, created_at: 't' });
    localMocks.getCachedObjectUrlForBlobId.mockReset();
    localMocks.getCachedObjectUrlForBlobId
      .mockReturnValueOnce('blob:main-hit')
      .mockReturnValue('blob:cen-hit');
    r = await getCardsByDeckId('d-a');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value[0]?.censoredImg).toBe('blob:cen-hit');
  });

  it('getCardsByDeckId handles censor metadata without blob', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    const rowCen: LocalCardRow = { ...localCard, censorImageBlobId: 'cen' };
    localMocks.listLocalCardsByDeckId.mockResolvedValue([rowCen]);
    const mainBlob = new Blob([new Uint8Array([1])]);
    localMocks.getCardImageRow
      .mockResolvedValueOnce({ id: 'm', blob: mainBlob, created_at: 't', title: 'x' })
      .mockResolvedValueOnce(null);
    const r = await getCardsByDeckId('d-a');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value[0]?.censoredImg).toBeNull();
      expect(r.value[0]?.censorImageSourceLabel).toBe('Local image (missing)');
    }
  });

  it('getCardsByIds returns empty map for empty ids', async () => {
    const r = await getCardsByIds([]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.size).toBe(0);
  });

  it('getCardsByIds filters blank ids and dedupes before fetching', async () => {
    localMocks.getLocalCardsByIds.mockResolvedValue(new Map());
    sbState.cardByIds = Promise.resolve({
      data: [{ ...cloudCardRow, id: 'a' }],
      error: null,
    });
    const r = await getCardsByIds(['', 'a', 'a']);
    expect(r.ok).toBe(true);
    if (r.ok) expect([...r.value.keys()]).toEqual(['a']);
  });

  it('getCardsByIds resolves all cards locally without cloud card query', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    const map = new Map<string, LocalCardRow>([['lc1', localCard]]);
    localMocks.getLocalCardsByIds.mockResolvedValue(map);
    localMocks.getCardImageRow.mockResolvedValue({
      id: 'blob-main',
      blob: new Blob([new Uint8Array([1])]),
      created_at: 't',
      title: 't',
    });
    const r = await getCardsByIds(['lc1']);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.get('lc1')?.title).toBe('Local');
    expect(supabaseFrom).not.toHaveBeenCalledWith('card');
  });

  it('getCardsByIds fetches missing ids from cloud and merges', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    localMocks.getLocalCardsByIds.mockResolvedValue(new Map([['lc1', localCard]]));
    localMocks.getCardImageRow.mockResolvedValue({
      id: 'blob-main',
      blob: new Blob([new Uint8Array([1])]),
      created_at: 't',
      title: 'x',
    });
    sbState.cardByIds = Promise.resolve({ data: [cloudCardRow], error: null });
    const r = await getCardsByIds(['lc1', 'cc1']);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.has('lc1')).toBe(true);
      expect(r.value.get('cc1')?.title).toBe('Cloud Card');
    }
  });

  it('getCardsByIds maps cloud cards when deck title is unknown', async () => {
    localMocks.listLocalDecks.mockResolvedValue([]);
    localMocks.getLocalCardsByIds.mockResolvedValue(new Map());
    sbState.cardByIds = Promise.resolve({
      data: [{ ...cloudCardRow, id: 'orphan', deck_id: 'not-in-catalog' }],
      error: null,
    });
    const r = await getCardsByIds(['orphan']);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.get('orphan')?.deckTitle).toBeUndefined();
  });

  it('getCardsByIds returns catalog error before fetching cards by id', async () => {
    localMocks.getLocalCardsByIds.mockResolvedValue(new Map());
    sbState.deckList = Promise.resolve({ data: null, error: { message: 'e', code: 'E' } });
    const r = await getCardsByIds(['only-cloud']);
    expect(r.ok).toBe(false);
  });

  it('getCardsByIds propagates timeout and query errors for cloud id fetch', async () => {
    vi.useFakeTimers();
    localMocks.getLocalCardsByIds.mockResolvedValue(new Map());
    sbState.cardByIds = new Promise(() => {});
    const p = getCardsByIds(['x']);
    await vi.advanceTimersByTimeAsync(15_001);
    let r = await p;
    expect(r.ok).toBe(false);
    vi.useRealTimers();
    vi.useFakeTimers();
    resetSbPromises();
    sbState.cardByIds = Promise.resolve({ data: null, error: { message: 'in', code: 'I' } });
    r = await getCardsByIds(['y']);
    expect(r.ok).toBe(false);
  });

  it('listCloudDecks handles null data and sync throw from supabase', async () => {
    sbState.deckList = Promise.resolve({ data: null, error: null });
    let r = await listCatalogDeckOffers();
    expect(r.ok).toBe(true);
    supabaseFrom.mockImplementationOnce(() => {
      throw new Error('sync-deck');
    });
    r = await listCatalogDeckOffers();
    expect(r.ok).toBe(false);
  });

  it('fetchCloudCardsForDeck handles sync throw', async () => {
    localMocks.listLocalDecks.mockResolvedValue([deckA]);
    supabaseFrom.mockImplementation((table: string) => {
      if (table === 'card') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => {
                throw new Error('sync-card');
              }),
            })),
            in: vi.fn(() => sbState.cardByIds),
          })),
        };
      }
      return defaultSupabaseFrom(table);
    });
    const r = await getCardsByDeckId('d-a');
    expect(r.ok).toBe(false);
  });

  it('fetchCloudCardsByIds handles rejection via try/catch', async () => {
    localMocks.getLocalCardsByIds.mockResolvedValue(new Map());
    sbState.cardByIds = Promise.reject(new Error('in-fail'));
    const r = await getCardsByIds(['z1']);
    expect(r.ok).toBe(false);
  });
});
