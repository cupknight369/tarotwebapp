import type { TarotCard } from '../types/canvas.js'

/** Revoke object URLs created for embedded reading images (blob: URLs). */
export function revokeTarotCardBlobUrls(card: TarotCard): void {
  if (card.img?.startsWith('blob:')) URL.revokeObjectURL(card.img)
  if (card.censoredImg?.startsWith('blob:')) URL.revokeObjectURL(card.censoredImg)
}
