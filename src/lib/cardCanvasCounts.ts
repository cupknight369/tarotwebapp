import type { DraggableCard } from '../types/canvas.js';

/** One row in the canvas card count status bar. */
export interface CardCanvasCountEntry {
  title: string;
  count: number;
}

const FALLBACK_TITLE = 'Card';

function normalizeCardTitle(title: string | undefined): string {
  const trimmed = (title ?? '').trim();
  return trimmed.length > 0 ? trimmed : FALLBACK_TITLE;
}

/**
 * Counts how many canvas card instances exist per card title.
 *
 * @param draggableCards - Cards currently on the canvas.
 * @returns Sorted entries (count descending, then title ascending).
 */
export function aggregateCardTitleCounts(
  draggableCards: readonly DraggableCard[],
): CardCanvasCountEntry[] {
  const counts = new Map<string, number>();
  for (const dc of draggableCards) {
    const title = normalizeCardTitle(dc.card.title);
    counts.set(title, (counts.get(title) ?? 0) + 1);
  }
  const entries: CardCanvasCountEntry[] = [];
  for (const [title, count] of counts) {
    entries.push({ title, count });
  }
  entries.sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.title.localeCompare(b.title);
  });
  return entries;
}
