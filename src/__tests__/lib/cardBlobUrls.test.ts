import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { TarotCard } from '../../types/canvas.js';

const localDecksMocks = vi.hoisted(() => ({
  isBlobUrlManagedByDeckCache: vi.fn(),
}));

vi.mock('../../lib/localDecks.js', () => ({
  isBlobUrlManagedByDeckCache: localDecksMocks.isBlobUrlManagedByDeckCache,
}));

import { revokeTarotCardBlobUrls } from '../../lib/cardBlobUrls.js';

function tarot(overrides: Partial<TarotCard> = {}): TarotCard {
  return {
    id: 'c1',
    deckId: 'd1',
    title: 'Star',
    num: 1,
    img: 'https://example.com/card.webp',
    ...overrides,
  };
}

describe('revokeTarotCardBlobUrls', () => {
  let revokeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localDecksMocks.isBlobUrlManagedByDeckCache.mockReturnValue(false);
    revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does not revoke when main image is not a blob URL', () => {
    revokeTarotCardBlobUrls(tarot({ img: '/static/x.webp' }));
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('does not revoke when main image is undefined', () => {
    revokeTarotCardBlobUrls(tarot({ img: undefined as unknown as string }));
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('revokes unmanaged blob: main image', () => {
    const url = 'blob:http://localhost/uuid-main';
    revokeTarotCardBlobUrls(tarot({ img: url }));
    expect(localDecksMocks.isBlobUrlManagedByDeckCache).toHaveBeenCalledWith(url);
    expect(revokeSpy).toHaveBeenCalledWith(url);
  });

  it('does not revoke main blob URL when managed by deck cache', () => {
    const url = 'blob:http://localhost/cached';
    localDecksMocks.isBlobUrlManagedByDeckCache.mockImplementation((u) => u === url);
    revokeTarotCardBlobUrls(tarot({ img: url }));
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('revokes unmanaged blob: censored image', () => {
    const url = 'blob:http://localhost/uuid-cen';
    revokeTarotCardBlobUrls(tarot({ img: 'x.webp', censoredImg: url }));
    expect(revokeSpy).toHaveBeenCalledWith(url);
  });

  it('does not revoke censored blob URL when managed by deck cache', () => {
    const main = 'blob:http://localhost/free';
    const cached = 'blob:http://localhost/cached-cen';
    localDecksMocks.isBlobUrlManagedByDeckCache.mockImplementation((u) => u === cached);
    revokeTarotCardBlobUrls(tarot({ img: main, censoredImg: cached }));
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    expect(revokeSpy).toHaveBeenCalledWith(main);
  });

  it('does not revoke when censored image is missing or not a blob URL', () => {
    revokeTarotCardBlobUrls(tarot({ img: 'a.webp', censoredImg: null }));
    revokeTarotCardBlobUrls(tarot({ img: 'a.webp', censoredImg: undefined }));
    revokeTarotCardBlobUrls(tarot({ img: 'a.webp', censoredImg: 'https://cdn/c.png' }));
    expect(revokeSpy).not.toHaveBeenCalled();
  });

  it('revokes both main and censored blob URLs when neither is cached', () => {
    const main = 'blob:http://localhost/m';
    const cen = 'blob:http://localhost/c';
    revokeTarotCardBlobUrls(tarot({ img: main, censoredImg: cen }));
    expect(revokeSpy).toHaveBeenCalledTimes(2);
    expect(revokeSpy).toHaveBeenCalledWith(main);
    expect(revokeSpy).toHaveBeenCalledWith(cen);
  });
});
