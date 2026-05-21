import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const coreMocks = vi.hoisted(() => ({
  executeCloudDeckDownload: vi.fn(),
  isRetryableCoreFailure: vi.fn(),
}));

const pendingMocks = vi.hoisted(() => ({
  enqueuePendingDeckDownload: vi.fn(),
  registerDeckDownloadSync: vi.fn(),
}));

vi.mock('../../lib/cloudDeckDownloadCore.js', () => ({
  executeCloudDeckDownload: coreMocks.executeCloudDeckDownload,
  isRetryableCoreFailure: coreMocks.isRetryableCoreFailure,
}));

vi.mock('../../lib/pendingDeckDownloads.js', () => ({
  enqueuePendingDeckDownload: pendingMocks.enqueuePendingDeckDownload,
  registerDeckDownloadSync: pendingMocks.registerDeckDownloadSync,
}));

vi.mock('../../lib/supabaseRest.js', () => ({
  getBrowserSupabaseRestConfig: vi.fn(() => ({
    url: 'https://example.supabase.co',
    anonKey: 'anon-key',
  })),
}));

import { downloadCloudDeckToDevice, downloadFailureMessage } from '../../lib/cloudDeckDownload.js';
import type { QueryFailure } from '../../lib/supabaseErrors.js';

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

  it('returns message for network, empty, io, and queued kinds', () => {
    expect(downloadFailureMessage({ kind: 'network', message: 'offline' })).toBe('offline');
    expect(downloadFailureMessage({ kind: 'empty', message: 'gone' })).toBe('gone');
    expect(downloadFailureMessage({ kind: 'io', message: 'disk' })).toBe('disk');
    expect(downloadFailureMessage({ kind: 'queued', message: 'queued msg' })).toBe('queued msg');
  });
});

describe('downloadCloudDeckToDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    coreMocks.executeCloudDeckDownload.mockResolvedValue({ ok: true, value: undefined });
    coreMocks.isRetryableCoreFailure.mockReturnValue(false);
    pendingMocks.enqueuePendingDeckDownload.mockResolvedValue(undefined);
    pendingMocks.registerDeckDownloadSync.mockResolvedValue(undefined);
  });

  it('returns ok when core download succeeds', async () => {
    const r = await downloadCloudDeckToDevice('deck-1');
    expect(r.ok).toBe(true);
    expect(pendingMocks.enqueuePendingDeckDownload).not.toHaveBeenCalled();
  });

  it('returns ok when deck is already installed', async () => {
    coreMocks.executeCloudDeckDownload.mockResolvedValue({
      ok: false,
      error: { kind: 'already_installed' },
    });
    const r = await downloadCloudDeckToDevice('deck-1');
    expect(r.ok).toBe(true);
  });

  it('queues retryable failures and returns queued kind', async () => {
    coreMocks.executeCloudDeckDownload.mockResolvedValue({
      ok: false,
      error: { kind: 'network', message: 'offline' },
    });
    coreMocks.isRetryableCoreFailure.mockReturnValue(true);
    const r = await downloadCloudDeckToDevice('deck-1');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('queued');
    }
    expect(pendingMocks.enqueuePendingDeckDownload).toHaveBeenCalledWith('deck-1');
    expect(pendingMocks.registerDeckDownloadSync).toHaveBeenCalled();
  });

  it('returns mapped failure for permanent errors without queueing', async () => {
    coreMocks.executeCloudDeckDownload.mockResolvedValue({
      ok: false,
      error: { kind: 'empty', message: 'No cards in catalog for this deck.' },
    });
    const r = await downloadCloudDeckToDevice('deck-1');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toEqual({
        kind: 'empty',
        message: 'No cards in catalog for this deck.',
      });
    }
    expect(pendingMocks.enqueuePendingDeckDownload).not.toHaveBeenCalled();
  });

  it('returns io failure without queueing', async () => {
    coreMocks.executeCloudDeckDownload.mockResolvedValue({
      ok: false,
      error: { kind: 'io', message: 'quota' },
    });
    const r = await downloadCloudDeckToDevice('deck-1');
    expect(r.ok).toBe(false);
    if (!r.ok && r.error.kind === 'io') {
      expect(r.error.message).toBe('quota');
    }
    expect(pendingMocks.enqueuePendingDeckDownload).not.toHaveBeenCalled();
  });
});
