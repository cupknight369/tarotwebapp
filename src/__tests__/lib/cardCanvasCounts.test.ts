import { describe, expect, it } from 'vitest';

import type { DraggableCard } from '../../types/canvas.js';
import { aggregateCardTitleCounts } from '../../lib/cardCanvasCounts.js';

function mkDraggable(title: string, id = 'dc-1'): DraggableCard {
  return {
    id,
    x: 0,
    y: 0,
    rotation: 0,
    zIndex: 1,
    opacity: 1,
    cursor: 'grab',
    display: 'block',
    card: {
      id: `c-${id}`,
      deckId: 'd',
      title,
      num: 1,
      img: 'i.webp',
    },
  };
}

describe('cardCanvasCounts.ts', () => {
  describe('aggregateCardTitleCounts', () => {
    it('returns empty array for no cards', () => {
      expect(aggregateCardTitleCounts([])).toEqual([]);
    });

    it('counts a single card instance', () => {
      expect(aggregateCardTitleCounts([mkDraggable('The Fool')])).toEqual([
        { title: 'The Fool', count: 1 },
      ]);
    });

    it('counts multiple instances of the same title', () => {
      const entries = aggregateCardTitleCounts([
        mkDraggable('The Fool', 'dc-1'),
        mkDraggable('The Fool', 'dc-2'),
        mkDraggable('The Magician', 'dc-3'),
      ]);
      expect(entries).toEqual([
        { title: 'The Fool', count: 2 },
        { title: 'The Magician', count: 1 },
      ]);
    });

    it('trims titles before grouping', () => {
      const entries = aggregateCardTitleCounts([
        mkDraggable('  The Fool  ', 'dc-1'),
        mkDraggable('The Fool', 'dc-2'),
      ]);
      expect(entries).toEqual([{ title: 'The Fool', count: 2 }]);
    });

    it('uses Card fallback for blank titles', () => {
      const entries = aggregateCardTitleCounts([
        mkDraggable('', 'dc-1'),
        mkDraggable('   ', 'dc-2'),
      ]);
      expect(entries).toEqual([{ title: 'Card', count: 2 }]);
    });

    it('sorts by count descending then title ascending', () => {
      const entries = aggregateCardTitleCounts([
        mkDraggable('Beta', 'dc-1'),
        mkDraggable('Alpha', 'dc-2'),
        mkDraggable('Beta', 'dc-3'),
        mkDraggable('Gamma', 'dc-4'),
        mkDraggable('Beta', 'dc-5'),
      ]);
      expect(entries).toEqual([
        { title: 'Beta', count: 3 },
        { title: 'Alpha', count: 1 },
        { title: 'Gamma', count: 1 },
      ]);
    });
  });
});
