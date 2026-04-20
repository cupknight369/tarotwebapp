import type { TarotCard } from '../types/canvas.js';

/**
 * Returns up to `limit` cards from the deck whose titles include the query (case-insensitive).
 * Empty or whitespace-only query yields no results.
 *
 * Sort order: earlier substring match index, then shorter title, then original deck order.
 *
 * @param cards - Active deck cards (e.g. `shuffledCards` store).
 * @param query - User search string.
 * @param limit - Max results (default 3).
 * @returns Matching cards in ranked order.
 */
export function searchDeckCardsByTitle(
  cards: readonly TarotCard[],
  query: string,
  limit = 3,
): TarotCard[] {
  const trimmed = query.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const queryLower = trimmed.toLowerCase();

  const ranked: { card: TarotCard; origIndex: number; matchPos: number }[] = [];
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const titleLower = card.title.toLowerCase();
    const matchPos = titleLower.indexOf(queryLower);
    if (matchPos === -1) {
      continue;
    }
    ranked.push({ card, origIndex: i, matchPos });
  }

  ranked.sort((a, b) => {
    if (a.matchPos !== b.matchPos) {
      return a.matchPos - b.matchPos;
    }
    const lenA = a.card.title.length;
    const lenB = b.card.title.length;
    if (lenA !== lenB) {
      return lenA - lenB;
    }
    return a.origIndex - b.origIndex;
  });

  const out: TarotCard[] = [];
  const n = Math.min(limit, ranked.length);
  for (let i = 0; i < n; i++) {
    out.push(ranked[i].card);
  }
  return out;
}
