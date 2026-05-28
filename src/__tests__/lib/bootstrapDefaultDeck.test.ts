/**
 * @vitest-environment happy-dom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const DEFAULT_DECK_ID = 'a0000000-0000-4000-8000-000000000001';

const mocks = vi.hoisted(() => ({
  executeCloudDeckDownload: vi.fn(),
  listLocalDecks: vi.fn(),
  enqueuePendingDeckDownload: vi.fn(),
  registerDeckDownloadSync: vi.fn(),
  getBrowserSupabaseRestConfig: vi.fn(),
  logDebug: vi.fn(),
}));

vi.mock('../../lib/cloudDeckDownloadCore.js', () => ({
  executeCloudDeckDownload: mocks.executeCloudDeckDownload,
  isRetryableCoreFailure: (failure: { kind: string; retryable?: boolean }) =>
    failure.kind === 'network' || (failure.kind === 'query' && failure.retryable === true),
}));

vi.mock('../../lib/decks.js', () => ({
  DEFAULT_DECK_ID: 'a0000000-0000-4000-8000-000000000001',
}));

vi.mock('../../lib/localDecks.js', () => ({
  listLocalDecks: mocks.listLocalDecks,
}));

vi.mock('../../lib/pendingDeckDownloads.js', () => ({
  enqueuePendingDeckDownload: mocks.enqueuePendingDeckDownload,
  registerDeckDownloadSync: mocks.registerDeckDownloadSync,
}));

vi.mock('../../lib/supabaseRest.js', () => ({
  getBrowserSupabaseRestConfig: mocks.getBrowserSupabaseRestConfig,
}));

vi.mock('../../lib/logError.js', () => ({
  logDebug: mocks.logDebug,
}));

import { ok, err } from '../../lib/result.js';
import { ensureDefaultDeckOnDevice, isDefaultDeckOnDevice } from '../../lib/bootstrapDefaultDeck.js';

describe('ensureDefaultDeckOnDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBrowserSupabaseRestConfig.mockReturnValue({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    });
    mocks.listLocalDecks.mockResolvedValue([]);
    mocks.executeCloudDeckDownload.mockResolvedValue(ok(undefined));
    mocks.enqueuePendingDeckDownload.mockResolvedValue(undefined);
    mocks.registerDeckDownloadSync.mockResolvedValue(undefined);
  });

  it('isDefaultDeckOnDevice returns true when the default deck row exists', async () => {
    mocks.listLocalDecks.mockResolvedValue([{ id: DEFAULT_DECK_ID, title: 'Rider-Waite-Smith' }]);

    await expect(isDefaultDeckOnDevice()).resolves.toBe(true);
  });

  it('isDefaultDeckOnDevice returns false when the default deck row is absent', async () => {
    mocks.listLocalDecks.mockResolvedValue([{ id: 'other-deck', title: 'Other' }]);

    await expect(isDefaultDeckOnDevice()).resolves.toBe(false);
  });
});

describe('ensureDefaultDeckOnDevice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getBrowserSupabaseRestConfig.mockReturnValue({
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    });
    mocks.listLocalDecks.mockResolvedValue([]);
    mocks.executeCloudDeckDownload.mockResolvedValue(ok(undefined));
    mocks.enqueuePendingDeckDownload.mockResolvedValue(undefined);
    mocks.registerDeckDownloadSync.mockResolvedValue(undefined);
  });

  it('no-ops when Supabase env is missing', async () => {
    mocks.getBrowserSupabaseRestConfig.mockReturnValue({ url: '', anonKey: '' });

    await ensureDefaultDeckOnDevice();

    expect(mocks.listLocalDecks).not.toHaveBeenCalled();
    expect(mocks.executeCloudDeckDownload).not.toHaveBeenCalled();
  });

  it('no-ops when the default deck is already installed', async () => {
    mocks.listLocalDecks.mockResolvedValue([{ id: DEFAULT_DECK_ID, title: 'Rider-Waite-Smith' }]);

    await ensureDefaultDeckOnDevice();

    expect(mocks.executeCloudDeckDownload).not.toHaveBeenCalled();
  });

  it('downloads the default deck and notifies the UI on success', async () => {
    const decksChanged = vi.fn();
    const downloadComplete = vi.fn();
    window.addEventListener('decks-changed', decksChanged);
    window.addEventListener('deck-download-complete', downloadComplete);

    await ensureDefaultDeckOnDevice();

    expect(mocks.executeCloudDeckDownload).toHaveBeenCalledWith(DEFAULT_DECK_ID, {
      url: 'https://example.supabase.co',
      anonKey: 'anon-key',
    });
    expect(decksChanged).toHaveBeenCalledTimes(1);
    expect(downloadComplete).toHaveBeenCalledTimes(1);
    expect((downloadComplete.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      deckId: DEFAULT_DECK_ID,
    });

    window.removeEventListener('decks-changed', decksChanged);
    window.removeEventListener('deck-download-complete', downloadComplete);
  });

  it('treats already_installed as success', async () => {
    mocks.executeCloudDeckDownload.mockResolvedValue(err({ kind: 'already_installed' }));
    const decksChanged = vi.fn();
    window.addEventListener('decks-changed', decksChanged);

    await ensureDefaultDeckOnDevice();

    expect(decksChanged).toHaveBeenCalledTimes(1);
    window.removeEventListener('decks-changed', decksChanged);
  });

  it('queues retryable failures for background sync', async () => {
    mocks.executeCloudDeckDownload.mockResolvedValue(
      err({ kind: 'network', message: 'offline' }),
    );

    await ensureDefaultDeckOnDevice();

    expect(mocks.enqueuePendingDeckDownload).toHaveBeenCalledWith(DEFAULT_DECK_ID);
    expect(mocks.registerDeckDownloadSync).toHaveBeenCalledTimes(1);
  });

  it('logs permanent failures', async () => {
    mocks.executeCloudDeckDownload.mockResolvedValue(
      err({ kind: 'empty', message: 'No cards in catalog for this deck.' }),
    );

    await ensureDefaultDeckOnDevice();

    expect(mocks.logDebug).toHaveBeenCalledWith('ensureDefaultDeckOnDevice', {
      kind: 'empty',
      message: 'No cards in catalog for this deck.',
    });
  });
});
