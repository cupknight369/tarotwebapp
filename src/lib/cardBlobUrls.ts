import type { TarotCard } from '../types/canvas.js';
import { isBlobUrlManagedByDeckCache } from './localDecks.js';

/**
 * Revoke blob: URLs that are only for this canvas/reading instance (embedded save data).
 * Do not revoke URLs from the deck image cache — those are shared with `shuffledCards`.
 */
export function revokeTarotCardBlobUrls(card: TarotCard): void {
  if (card.img?.startsWith('blob:') && !isBlobUrlManagedByDeckCache(card.img)) {
    URL.revokeObjectURL(card.img);
  }
  if (card.censoredImg?.startsWith('blob:') && !isBlobUrlManagedByDeckCache(card.censoredImg)) {
    URL.revokeObjectURL(card.censoredImg);
  }
}
