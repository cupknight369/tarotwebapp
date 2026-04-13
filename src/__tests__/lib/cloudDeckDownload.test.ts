import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QueryFailure } from '../../lib/supabaseErrors.js';

const supabaseState = vi.hoisted(() => ({
  deck: { data: null as unknown, error: null as unknown },
  card: { data: null as unknown, error: null as unknown },
}));

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'deck') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: supabaseState.deck.data,
                  error: supabaseState.deck.error,
                }),
              ),
            })),
          })),
        };
      }
      if (table === 'card') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() =>
                Promise.resolve({
                  data: supabaseState.card.data,
                  error: supabaseState.card.error,
                }),
              ),
            })),
          })),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    }),
  },
}));

vi.mock('../../lib/cardImageUrls.js', () => ({
  publicCardImageUrl: vi.fn((key: string) => `https://cdn.example/${key}`),
}));

const localMocks = vi.hoisted(() => ({
  listLocalDecks: vi.fn(),
  putLocalDeck: vi.fn(),
  putCardImage: vi.fn(),
  putLocalCard: vi.fn(),
  deleteLocalDeck: vi.fn(),
}));

vi.mock('../../lib/localDecks.js', () => ({
  deleteLocalDeck: localMocks.deleteLocalDeck,
  listLocalDecks: localMocks.listLocalDecks,
  putCardImage: localMocks.putCardImage,
  putLocalCard: localMocks.putLocalCard,
  putLocalDeck: localMocks.putLocalDeck,
}));

import { publicCardImageUrl } from '../../lib/cardImageUrls.js';
import { downloadCloudDeckToDevice, downloadFailureMessage } from '../../lib/cloudDeckDownload.js';

const deckId = 'catalog-deck-1';

const deckRow = {
  id: deckId,
  title: 'Celestial',
  description: null as string | null,
  created_at: '2024-01-01',
  modified_at: '2024-01-02',
};

const cardMainOnly = {
  id: 'card-1',
  title: 'The Star',
  number: 17,
  image: 'm17.webp',
  censor_image: null as string | null,
  deck_id: deckId,
};

const cardWithCensor = {
  ...cardMainOnly,
  id: 'card-2',
  censor_image: 'm17c.webp',
};

function okResponse(blob: Blob): Response {
  return {
    ok: true,
    status: 200,
    blob: () => Promise.resolve(blob),
  } as unknown as Response;
}

describe('downloadFailureMessage', () => {
  it('formats query failures via queryFailureMessage', () => {
    const failure: QueryFailure = {
      kind: 'not_found',
      operation: 't',
      message: 'Nothing',
    };
    expect(downloadFailureMessage({ kind: 'query', failure })).toBe(
      'Nothing was found for that request.',
    );
  });

  it('returns message for network, empty, and io kinds', () => {
    expect(downloadFailureMessage({ kind: 'network', message: 'offline' })).toBe('offline');
    expect(downloadFailureMessage({ kind: 'empty', message: 'gone' })).toBe('gone');
    expect(downloadFailureMessage({ kind: 'io', message: 'disk' })).toBe('disk');
  });
});

describe('downloadCloudDeckToDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseState.deck = { data: deckRow, error: null };
    supabaseState.card = { data: [cardMainOnly], error: null };
    localMocks.listLocalDecks.mockReset();
    localMocks.putLocalDeck.mockReset();
    localMocks.putCardImage.mockReset();
    localMocks.putLocalCard.mockReset();
    localMocks.deleteLocalDeck.mockReset();
    localMocks.listLocalDecks.mockResolvedValue([]);
    localMocks.putLocalDeck.mockResolvedValue(undefined);
    localMocks.putCardImage.mockResolvedValue('blob-main-id');
    localMocks.putLocalCard.mockResolvedValue(undefined);
    localMocks.deleteLocalDeck.mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockImplementation(() =>
          Promise.resolve(okResponse(new Blob([new Uint8Array([1, 2])], { type: 'image/webp' }))),
        ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns ok immediately when the deck already exists locally', async () => {
    localMocks.listLocalDecks.mockResolvedValue([
      {
        id: deckId,
        title: 'L',
        description: null,
        created_at: '',
        modified_at: '',
        from_catalog: true,
      },
    ] as never);
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(true);
    expect(localMocks.putLocalDeck).not.toHaveBeenCalled();
  });

  it('returns query error when deck fetch fails', async () => {
    supabaseState.deck = {
      data: null,
      error: { message: 'db', code: 'XX' },
    };
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('query');
      if (r.error.kind === 'query') {
        expect(r.error.failure.operation).toBe('downloadCloudDeckToDevice.deck');
      }
    }
  });

  it('returns empty when deck row is missing', async () => {
    supabaseState.deck = { data: null, error: null };
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(false);
    if (!r.ok)
      expect(r.error).toEqual({
        kind: 'empty',
        message: 'Deck not found in catalog.',
      });
  });

  it('returns query error when card fetch fails', async () => {
    supabaseState.card = {
      data: null,
      error: { message: 'cards', code: 'YY' },
    };
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === 'query') {
      expect(r.error.failure.operation).toBe('downloadCloudDeckToDevice.cards');
    }
  });

  it.each([
    ['null rows', null],
    ['empty array', []],
  ])('returns empty when cards are %s', async (_label, rows) => {
    supabaseState.card = { data: rows, error: null };
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toEqual({
        kind: 'empty',
        message: 'No cards in catalog for this deck.',
      });
    }
  });

  it('downloads deck with main images only', async () => {
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(true);
    expect(localMocks.putLocalDeck).toHaveBeenCalledWith(
      expect.objectContaining({
        id: deckId,
        title: 'Celestial',
        from_catalog: true,
      }),
    );
    expect(publicCardImageUrl).toHaveBeenCalledWith('m17.webp');
    expect(localMocks.putCardImage).toHaveBeenCalledTimes(1);
    expect(localMocks.putLocalCard).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'card-1',
        imageBlobId: 'blob-main-id',
        censorImageBlobId: null,
      }),
    );
  });

  it('downloads censored card images', async () => {
    supabaseState.card = { data: [cardWithCensor], error: null };
    localMocks.putCardImage.mockResolvedValueOnce('main-blob').mockResolvedValueOnce('censor-blob');
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(true);
    expect(publicCardImageUrl).toHaveBeenCalledWith('m17c.webp');
    expect(localMocks.putCardImage).toHaveBeenCalledTimes(2);
    expect(localMocks.putLocalCard).toHaveBeenCalledWith(
      expect.objectContaining({
        censorImageBlobId: 'censor-blob',
      }),
    );
  });

  it('uses image/webp when fetched blob has empty type', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(okResponse(new Blob([new Uint8Array([1])], { type: '' }))),
    );
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(true);
    expect(localMocks.putCardImage).toHaveBeenCalledWith(
      expect.any(Blob),
      'image/webp',
      'm17.webp',
    );
  });

  it('returns network error and deletes partial deck when main image fetch fails with bad status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        blob: vi.fn(),
      } as unknown as Response),
    );
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('network');
      if (r.error.kind === 'network') {
        expect(r.error.message).toContain('503');
      }
    }
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith(deckId);
  });

  it('returns network error when main fetch rejects with non-Error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('timeout'));
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === 'network') {
      expect(r.error.message).toBe('Failed to fetch image');
    }
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith(deckId);
  });

  it('returns network error when censor image fetch fails after main succeeds', async () => {
    supabaseState.card = { data: [cardWithCensor], error: null };
    localMocks.putCardImage
      .mockReset()
      .mockResolvedValueOnce('main-blob')
      .mockResolvedValueOnce('c-blob');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(okResponse(new Blob([new Uint8Array([1])], { type: 'image/webp' })))
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          blob: vi.fn(),
        } as unknown as Response),
    );
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(false);
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith(deckId);
  });

  it('returns generic network message when censor fetch rejects with non-Error', async () => {
    supabaseState.card = { data: [cardWithCensor], error: null };
    localMocks.putCardImage.mockReset().mockResolvedValueOnce('main-blob');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(okResponse(new Blob([new Uint8Array([1])], { type: 'image/webp' })))
        .mockRejectedValueOnce('censor-timeout'),
    );
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === 'network') {
      expect(r.error.message).toBe('Failed to fetch image');
    }
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith(deckId);
  });

  it('uses image/webp for censored blob when type is empty', async () => {
    supabaseState.card = { data: [cardWithCensor], error: null };
    localMocks.putCardImage.mockReset().mockResolvedValueOnce('m').mockResolvedValueOnce('c');
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(okResponse(new Blob([new Uint8Array([1])], { type: 'image/webp' })))
        .mockResolvedValueOnce(okResponse(new Blob([new Uint8Array([2])], { type: '' }))),
    );
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(true);
    expect(localMocks.putCardImage).toHaveBeenNthCalledWith(
      2,
      expect.any(Blob),
      'image/webp',
      'm17c.webp',
    );
  });

  it('returns io error when putLocalDeck throws', async () => {
    localMocks.putLocalDeck.mockRejectedValue(new Error('quota'));
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === 'io') {
      expect(r.error.message).toBe('quota');
    }
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith(deckId);
  });

  it('returns io error when putCardImage throws', async () => {
    localMocks.putCardImage.mockRejectedValue(new Error('blob store full'));
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === 'io') {
      expect(r.error.message).toBe('blob store full');
    }
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith(deckId);
  });

  it('returns io error when putLocalCard throws', async () => {
    localMocks.putLocalCard.mockRejectedValue('weird');
    const r = await downloadCloudDeckToDevice(deckId);
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === 'io') {
      expect(r.error.message).toBe('Could not save deck to this device.');
    }
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith(deckId);
  });
});
