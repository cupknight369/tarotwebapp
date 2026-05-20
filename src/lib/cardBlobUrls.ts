import type { TarotCard } from '../types/canvas.js';
import { isBlobUrlManagedByDeckCache } from './localDecks.js';
import { isCorrespondenceThumbUrlManagedByCache } from './localCorrespondences.js';

/**
 * Revoke blob: URLs that are only for this canvas/reading instance (embedded save data).
 * Do not revoke URLs from the deck image cache — those are shared with `shuffledCards`.
 * Do not revoke correspondence thumbnail URLs from the correspondence image cache.
 */
export function revokeTarotCardBlobUrls(card: TarotCard): void {
  if (card.img?.startsWith('blob:') && !isBlobUrlManagedByDeckCache(card.img)) {
    URL.revokeObjectURL(card.img);
  }
  if (card.censoredImg?.startsWith('blob:') && !isBlobUrlManagedByDeckCache(card.censoredImg)) {
    URL.revokeObjectURL(card.censoredImg);
  }
  for (const d of card.correspondenceDisplays ?? []) {
    const u = d.thumbnailUrl;
    if (u?.startsWith('blob:') && !isCorrespondenceThumbUrlManagedByCache(u)) {
      URL.revokeObjectURL(u);
    }
  }
}
