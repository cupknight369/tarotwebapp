/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const coreMocks = vi.hoisted(() => ({
  executeCloudDeckDownload: vi.fn(),
}));

const pendingMocks = vi.hoisted(() => ({
  listPendingDeckDownloads: vi.fn(),
  dequeuePendingDeckDownload: vi.fn(),
  incrementPendingDeckDownloadAttempt: vi.fn(),
}));

vi.mock('../../lib/cloudDeckDownloadCore.js', () => ({
  executeCloudDeckDownload: coreMocks.executeCloudDeckDownload,
  isRetryableCoreFailure: (failure: { kind: string; retryable?: boolean }) => {
    if (failure.kind === 'network') return true;
    if (failure.kind === 'query' && failure.retryable) return true;
    return false;
  },
}));

vi.mock('../../lib/pendingDeckDownloads.js', () => ({
  DECK_DOWNLOAD_SYNC_TAG: 'deck-download',
  MAX_DOWNLOAD_ATTEMPTS: 5,
  listPendingDeckDownloads: pendingMocks.listPendingDeckDownloads,
  dequeuePendingDeckDownload: pendingMocks.dequeuePendingDeckDownload,
  incrementPendingDeckDownloadAttempt: pendingMocks.incrementPendingDeckDownloadAttempt,
}));

import { processPendingDeckDownloads } from '../../lib/processPendingDeckDownloads.js';

const config = { url: 'https://example.supabase.co', anonKey: 'anon-key' };

describe('processPendingDeckDownloads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pendingMocks.listPendingDeckDownloads.mockResolvedValue([
      { deckId: 'deck-1', enqueuedAt: '2024-01-01', attempts: 0 },
    ]);
    pendingMocks.dequeuePendingDeckDownload.mockResolvedValue(undefined);
    pendingMocks.incrementPendingDeckDownloadAttempt.mockResolvedValue(undefined);
    coreMocks.executeCloudDeckDownload.mockResolvedValue({ ok: true, value: undefined });
  });

  it('dequeues and dispatches browser event on success', async () => {
    const handler = vi.fn();
    window.addEventListener('deck-download-complete', handler);
    await processPendingDeckDownloads(config);
    expect(pendingMocks.dequeuePendingDeckDownload).toHaveBeenCalledWith('deck-1');
    expect(handler).toHaveBeenCalled();
    window.removeEventListener('deck-download-complete', handler);
  });

  it('increments attempts on retryable failure below max', async () => {
    coreMocks.executeCloudDeckDownload.mockResolvedValue({
      ok: false,
      error: { kind: 'network', message: 'offline' },
    });
    await processPendingDeckDownloads(config);
    expect(pendingMocks.incrementPendingDeckDownloadAttempt).toHaveBeenCalledWith(
      'deck-1',
      'offline',
    );
    expect(pendingMocks.dequeuePendingDeckDownload).not.toHaveBeenCalled();
  });

  it('dequeues after max retryable attempts', async () => {
    pendingMocks.listPendingDeckDownloads.mockResolvedValue([
      { deckId: 'deck-1', enqueuedAt: '2024-01-01', attempts: 4 },
    ]);
    coreMocks.executeCloudDeckDownload.mockResolvedValue({
      ok: false,
      error: { kind: 'network', message: 'offline' },
    });
    await processPendingDeckDownloads(config);
    expect(pendingMocks.dequeuePendingDeckDownload).toHaveBeenCalledWith('deck-1');
  });

  it('dequeues permanent failures immediately', async () => {
    coreMocks.executeCloudDeckDownload.mockResolvedValue({
      ok: false,
      error: { kind: 'empty', message: 'No cards' },
    });
    await processPendingDeckDownloads(config);
    expect(pendingMocks.dequeuePendingDeckDownload).toHaveBeenCalledWith('deck-1');
  });
});
