import { beforeEach, describe, expect, it, vi } from 'vitest';

const idbMocks = vi.hoisted(() => ({
  openTarotDb: vi.fn(),
  idbRequest: vi.fn(),
  storeData: new Map<string, unknown>(),
}));

vi.mock('../../lib/indexedDb.js', () => ({
  STORE_PENDING_DECK_DOWNLOADS: 'pendingDeckDownloads',
  openTarotDb: idbMocks.openTarotDb,
  idbRequest: idbMocks.idbRequest,
}));

import {
  dequeuePendingDeckDownload,
  enqueuePendingDeckDownload,
  listPendingDeckDownloads,
  MAX_DOWNLOAD_ATTEMPTS,
} from '../../lib/pendingDeckDownloads.js';

function createFakeStore() {
  const data = idbMocks.storeData;
  return {
    put(value: { deckId: string }) {
      data.set(value.deckId, value);
      return { onsuccess: null, onerror: null, result: undefined };
    },
    get(key: string) {
      return {
        onsuccess: null,
        onerror: null,
        result: data.get(key),
      };
    },
    delete(key: string) {
      data.delete(key);
      return { onsuccess: null, onerror: null, result: undefined };
    },
    getAll() {
      return {
        onsuccess: null,
        onerror: null,
        result: [...data.values()],
      };
    },
  };
}

describe('pendingDeckDownloads', () => {
  beforeEach(() => {
    idbMocks.storeData.clear();
    idbMocks.idbRequest.mockImplementation((req: { result?: unknown }) =>
      Promise.resolve(req.result),
    );
    idbMocks.openTarotDb.mockResolvedValue({
      transaction: () => ({
        objectStore: () => createFakeStore(),
      }),
    });
  });

  it('enqueuePendingDeckDownload stores a row keyed by deckId', async () => {
    await enqueuePendingDeckDownload('deck-a');
    const rows = await listPendingDeckDownloads();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.deckId).toBe('deck-a');
    expect(rows[0]?.attempts).toBe(0);
  });

  it('dequeuePendingDeckDownload removes a row', async () => {
    await enqueuePendingDeckDownload('deck-a');
    await dequeuePendingDeckDownload('deck-a');
    expect(await listPendingDeckDownloads()).toHaveLength(0);
  });

  it('exports MAX_DOWNLOAD_ATTEMPTS as 5', () => {
    expect(MAX_DOWNLOAD_ATTEMPTS).toBe(5);
  });
});
