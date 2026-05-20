import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DraggableCard } from '../../types/canvas.js';

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

import {
  aggregateCorrespondenceCounts,
  correspondenceMetaEqual,
  resolveCorrespondenceCountEntries,
  resolveCorrespondenceDisplays,
  shouldShowCorrespondenceOnCanvas,
} from '../../lib/correspondenceCanvasCounts.js';

function mkDraggable(correspondence_ids?: readonly string[]): DraggableCard {
  return {
    id: 'dc-1',
    x: 0,
    y: 0,
    rotation: 0,
    zIndex: 1,
    opacity: 1,
    cursor: 'grab',
    display: 'block',
    card: {
      id: 'c-1',
      deckId: 'd',
      title: 'Card',
      num: 1,
      img: 'i.webp',
      correspondence_ids,
    },
  };
}

describe('correspondenceCanvasCounts.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    corrMocks.getCachedCorrespondenceThumbUrl.mockReturnValue(undefined);
  });

  describe('aggregateCorrespondenceCounts', () => {
    it('returns empty map for no cards', () => {
      expect(aggregateCorrespondenceCounts([])).toEqual(new Map());
    });

    it('counts a single correspondence on one card', () => {
      const counts = aggregateCorrespondenceCounts([mkDraggable(['a'])]);
      expect(counts.get('a')).toBe(1);
      expect(counts.size).toBe(1);
    });

    it('counts the same id across multiple cards', () => {
      const counts = aggregateCorrespondenceCounts([mkDraggable(['a']), mkDraggable(['a', 'b'])]);
      expect(counts.get('a')).toBe(2);
      expect(counts.get('b')).toBe(1);
    });

    it('dedupes duplicate ids on one card', () => {
      const counts = aggregateCorrespondenceCounts([mkDraggable(['a', 'a', 'a'])]);
      expect(counts.get('a')).toBe(1);
    });

    it('ignores blank ids', () => {
      const counts = aggregateCorrespondenceCounts([mkDraggable(['', '  ', 'x'])]);
      expect(counts.get('x')).toBe(1);
      expect(counts.has('')).toBe(false);
      expect(counts.has('  ')).toBe(false);
    });
  });

  describe('shouldShowCorrespondenceOnCanvas', () => {
    it('is true when either thumbnails or count bar setting is enabled', () => {
      expect(
        shouldShowCorrespondenceOnCanvas({
          showCorrespondenceThumbnailsOnCanvas: false,
          showCorrespondenceCountBarOnCanvas: true,
        }),
      ).toBe(true);
      expect(
        shouldShowCorrespondenceOnCanvas({
          showCorrespondenceThumbnailsOnCanvas: true,
          showCorrespondenceCountBarOnCanvas: false,
        }),
      ).toBe(true);
      expect(
        shouldShowCorrespondenceOnCanvas({
          showCorrespondenceThumbnailsOnCanvas: false,
          showCorrespondenceCountBarOnCanvas: false,
        }),
      ).toBe(false);
    });
  });

  describe('correspondenceMetaEqual', () => {
    it('returns true when ids and displays match', () => {
      const card = {
        id: 'c',
        deckId: 'd',
        title: 'T',
        num: 1,
        img: 'i',
        correspondence_ids: ['a'],
        correspondenceDisplays: [{ id: 'a', title: 'A', thumbnailUrl: null }],
      };
      expect(correspondenceMetaEqual(card, { ...card })).toBe(true);
    });

    it('returns false when display thumbnail differs', () => {
      const base = {
        id: 'c',
        deckId: 'd',
        title: 'T',
        num: 1,
        img: 'i',
        correspondence_ids: ['a'],
        correspondenceDisplays: [{ id: 'a', title: 'A', thumbnailUrl: null }],
      };
      const other = {
        ...base,
        correspondenceDisplays: [{ id: 'a', title: 'A', thumbnailUrl: 'blob:1' }],
      };
      expect(correspondenceMetaEqual(base, other)).toBe(false);
    });
  });

  describe('resolveCorrespondenceDisplays', () => {
    it('includes entries without thumbnails for letter placeholders', async () => {
      corrMocks.getCorrespondenceById.mockResolvedValue({
        id: 'no-thumb',
        title: 'Moon',
        description: null,
        group_id: 'g',
        thumbnailBlobId: null,
      });
      const displays = await resolveCorrespondenceDisplays(['no-thumb']);
      expect(displays).toEqual([{ id: 'no-thumb', title: 'Moon', thumbnailUrl: null }]);
    });

    it('dedupes ids and preserves order', async () => {
      corrMocks.getCorrespondenceById.mockImplementation((id: string) =>
        Promise.resolve({
          id,
          title: id === 'a' ? 'Alpha' : 'Beta',
          description: null,
          group_id: 'g',
          thumbnailBlobId: null,
        }),
      );
      const displays = await resolveCorrespondenceDisplays(['a', 'a', 'b']);
      expect(displays.map((d) => d.id)).toEqual(['a', 'b']);
    });
  });

  describe('resolveCorrespondenceCountEntries', () => {
    it('skips unknown correspondence ids', async () => {
      corrMocks.getCorrespondenceById.mockResolvedValue(null);
      const entries = await resolveCorrespondenceCountEntries(new Map([['missing', 2]]));
      expect(entries).toEqual([]);
    });

    it('resolves thumbnail from cache and sorts by count then title', async () => {
      corrMocks.getCorrespondenceById.mockImplementation((id: string) => {
        if (id === 'a') {
          return Promise.resolve({
            id: 'a',
            title: 'Zebra',
            description: null,
            group_id: 'g',
            thumbnailBlobId: 'blob-a',
          });
        }
        if (id === 'b') {
          return Promise.resolve({
            id: 'b',
            title: 'Apple',
            description: null,
            group_id: 'g',
            thumbnailBlobId: null,
          });
        }
        return Promise.resolve(null);
      });
      corrMocks.getCachedCorrespondenceThumbUrl.mockReturnValue('blob:cached-a');

      const entries = await resolveCorrespondenceCountEntries(
        new Map([
          ['a', 1],
          ['b', 3],
        ]),
      );

      expect(entries).toEqual([
        { id: 'b', title: 'Apple', count: 3, thumbnailUrl: null },
        { id: 'a', title: 'Zebra', count: 1, thumbnailUrl: 'blob:cached-a' },
      ]);
      expect(corrMocks.getCorrespondenceImageRow).not.toHaveBeenCalled();
    });

    it('creates object URL on cache miss', async () => {
      const blob = new Blob([new Uint8Array([1])]);
      corrMocks.getCorrespondenceById.mockResolvedValue({
        id: 'c',
        title: 'Moon',
        description: null,
        group_id: 'g',
        thumbnailBlobId: 'thumb-1',
      });
      corrMocks.getCorrespondenceImageRow.mockResolvedValue({
        id: 'thumb-1',
        blob,
        created_at: 't',
      });
      const createSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:new');

      const entries = await resolveCorrespondenceCountEntries(new Map([['c', 2]]));

      expect(entries).toEqual([{ id: 'c', title: 'Moon', count: 2, thumbnailUrl: 'blob:new' }]);
      expect(corrMocks.setCachedCorrespondenceThumbUrl).toHaveBeenCalledWith('thumb-1', 'blob:new');
      createSpy.mockRestore();
    });
  });
});
