import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => {
  const getPublicUrl = vi.fn((filename: string) => ({
    data: { publicUrl: `https://cdn.example/card-images/${filename}` },
  }));
  return {
    getPublicUrl,
    from: vi.fn(() => ({ getPublicUrl })),
  };
});

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    storage: {
      from: supabaseMocks.from,
    },
  },
}));

const logMocks = vi.hoisted(() => ({
  logDebug: vi.fn(),
}));

vi.mock('../../lib/logError.js', () => ({
  logDebug: logMocks.logDebug,
}));

import {
  ALL_CARD_FILENAMES,
  CARD_IMAGE_BUCKET,
  publicCardImageUrl,
  startCardImagePrefetch,
} from '../../lib/cardImageUrls.js';

async function drainPrefetchWork(): Promise<void> {
  await vi.waitFor(
    () => {
      expect(supabaseMocks.getPublicUrl.mock.calls.length).toBe(ALL_CARD_FILENAMES.length);
    },
    { timeout: 5000 },
  );
}

describe('cardImageUrls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.getPublicUrl.mockImplementation((filename: string) => ({
      data: { publicUrl: `https://cdn.example/card-images/${filename}` },
    }));
    vi.stubGlobal(
      'Image',
      class PrefetchImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_: string) {
          queueMicrotask(() => {
            this.onload?.();
          });
        }
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('exports bucket name and 86 unique filenames including majors, minors, and specials', () => {
    expect(CARD_IMAGE_BUCKET).toBe('card-images');
    expect(ALL_CARD_FILENAMES).toHaveLength(86);
    expect(new Set(ALL_CARD_FILENAMES).size).toBe(86);
    expect(ALL_CARD_FILENAMES).toContain('m00.webp');
    expect(ALL_CARD_FILENAMES).toContain('m21.webp');
    expect(ALL_CARD_FILENAMES).toContain('m06c.webp');
    expect(ALL_CARD_FILENAMES).toContain('w01.webp');
    expect(ALL_CARD_FILENAMES).toContain('w14.webp');
    expect(ALL_CARD_FILENAMES).toContain('p14.webp');
  });

  it('publicCardImageUrl requests public URL without transform options', () => {
    const url = publicCardImageUrl('m00.webp');
    expect(supabaseMocks.from).toHaveBeenCalledWith(CARD_IMAGE_BUCKET);
    expect(supabaseMocks.getPublicUrl).toHaveBeenCalledWith('m00.webp', undefined);
    expect(url).toBe('https://cdn.example/card-images/m00.webp');
  });

  it('publicCardImageUrl passes transform options to getPublicUrl', () => {
    const transform = { width: 64, height: 64 };
    publicCardImageUrl('c05.webp', transform);
    expect(supabaseMocks.getPublicUrl).toHaveBeenCalledWith('c05.webp', { transform });
  });

  it('startCardImagePrefetch loads every filename and uses deck bucket', async () => {
    startCardImagePrefetch();
    await drainPrefetchWork();
    expect(supabaseMocks.from).toHaveBeenCalledTimes(ALL_CARD_FILENAMES.length);
    expect(supabaseMocks.from).toHaveBeenCalledWith(CARD_IMAGE_BUCKET);
    for (const name of ALL_CARD_FILENAMES) {
      expect(supabaseMocks.getPublicUrl).toHaveBeenCalledWith(name, undefined);
    }
  });

  it('startCardImagePrefetch resolves images when onerror fires instead of onload', async () => {
    vi.stubGlobal(
      'Image',
      class ErrImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        set src(_: string) {
          queueMicrotask(() => {
            this.onerror?.();
          });
        }
      },
    );
    startCardImagePrefetch();
    await drainPrefetchWork();
  });

  it('startCardImagePrefetch logs when prefetch setup throws', async () => {
    supabaseMocks.getPublicUrl.mockImplementation(() => {
      throw new Error('storage down');
    });
    startCardImagePrefetch();
    await vi.waitFor(() => {
      expect(logMocks.logDebug).toHaveBeenCalledWith(
        'startCardImagePrefetch',
        expect.any(Error),
      );
    });
    const err = logMocks.logDebug.mock.calls[0]?.[1] as Error;
    expect(err.message).toBe('storage down');
  });
});
