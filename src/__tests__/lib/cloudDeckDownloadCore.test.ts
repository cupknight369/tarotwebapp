import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import {
  executeCloudDeckDownload,
  isRetryableCoreFailure,
} from '../../lib/cloudDeckDownloadCore.js';
import type { SupabaseRestConfig } from '../../lib/supabaseRest.js';

const config: SupabaseRestConfig = {
  url: 'https://example.supabase.co',
  anonKey: 'anon-key',
};

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

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
    blob: () => Promise.resolve(new Blob()),
  } as unknown as Response;
}

function okBlobResponse(blob: Blob): Response {
  return {
    ok: true,
    status: 200,
    blob: () => Promise.resolve(blob),
  } as unknown as Response;
}

describe('isRetryableCoreFailure', () => {
  it('returns true for network and retryable query failures', () => {
    expect(isRetryableCoreFailure({ kind: 'network', message: 'offline' })).toBe(true);
    expect(isRetryableCoreFailure({ kind: 'query', message: 'timeout', retryable: true })).toBe(
      true,
    );
  });

  it('returns false for empty, io, and non-retryable query failures', () => {
    expect(isRetryableCoreFailure({ kind: 'empty', message: 'gone' })).toBe(false);
    expect(isRetryableCoreFailure({ kind: 'io', message: 'disk' })).toBe(false);
    expect(isRetryableCoreFailure({ kind: 'query', message: 'bad', retryable: false })).toBe(false);
  });
});

describe('executeCloudDeckDownload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localMocks.listLocalDecks.mockResolvedValue([]);
    localMocks.putLocalDeck.mockResolvedValue(undefined);
    localMocks.putCardImage.mockResolvedValue('blob-main-id');
    localMocks.putLocalCard.mockResolvedValue(undefined);
    localMocks.deleteLocalDeck.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns already_installed when deck exists locally', async () => {
    localMocks.listLocalDecks.mockResolvedValue([
      {
        id: deckId,
        title: 'L',
        description: null,
        created_at: '',
        modified_at: '',
        from_catalog: true,
      },
    ]);
    const r = await executeCloudDeckDownload(deckId, config);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('already_installed');
  });

  it('downloads deck with main images only', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/rest/v1/deck')) {
          return Promise.resolve(jsonResponse(deckRow));
        }
        if (url.includes('/rest/v1/card')) {
          return Promise.resolve(jsonResponse([cardMainOnly]));
        }
        return Promise.resolve(
          okBlobResponse(new Blob([new Uint8Array([1, 2])], { type: 'image/webp' })),
        );
      }),
    );

    const r = await executeCloudDeckDownload(deckId, config);
    expect(r.ok).toBe(true);
    expect(localMocks.putLocalDeck).toHaveBeenCalledWith(
      expect.objectContaining({ id: deckId, from_catalog: true }),
    );
    expect(localMocks.putCardImage).toHaveBeenCalledTimes(1);
  });

  it('returns network failure and rolls back when image fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/rest/v1/deck')) {
          return Promise.resolve(jsonResponse(deckRow));
        }
        if (url.includes('/rest/v1/card')) {
          return Promise.resolve(jsonResponse([cardMainOnly]));
        }
        return Promise.resolve({ ok: false, status: 503, blob: vi.fn() } as unknown as Response);
      }),
    );

    const r = await executeCloudDeckDownload(deckId, config);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('network');
    expect(localMocks.deleteLocalDeck).toHaveBeenCalledWith(deckId);
  });

  it('returns empty when card list is empty', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => {
        const url = String(input);
        if (url.includes('/rest/v1/deck')) {
          return Promise.resolve(jsonResponse(deckRow));
        }
        if (url.includes('/rest/v1/card')) {
          return Promise.resolve(jsonResponse([]));
        }
        return Promise.reject(new Error('unexpected fetch'));
      }),
    );

    const r = await executeCloudDeckDownload(deckId, config);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toEqual({
        kind: 'empty',
        message: 'No cards in catalog for this deck.',
      });
    }
  });
});
