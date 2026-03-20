import Alpine from 'alpinejs'
import type { MergedThis, DraggableCard, TarotCard, TextLabel } from '../types/canvas.js'
import { publicCardImageUrl } from '../lib/cardImageUrls.js'

const u = (f: string) => publicCardImageUrl(f)

Alpine.data('cardComponent', () => ({
  draggableCards: [] as DraggableCard[],
  maxZIndex: 0,
  dragStart: null as { startCardX: number; startCardY: number; startDropX: number; startDropY: number } | null,
  draggingCard: null as HTMLElement | null,
  selectedCardIds: [] as string[],
  groupDragOffsets: null as Record<string, { dx: number; dy: number }> | null,
  showShuffledConfirmation: false,

  CARD_WIDTH: 150,
  CARD_HEIGHT: 231,

  cards: [
    { title: 'The Fool', num: 0, img: u('m00.webp') },
    { title: 'The Magician', num: 1, img: u('m01.webp') },
    { title: 'The High Priestess', num: 2, img: u('m02.webp') },
    { title: 'The Empress', num: 3, img: u('m03.webp') },
    { title: 'The Emperor', num: 4, img: u('m04.webp') },
    { title: 'The Hierophant', num: 5, img: u('m05.webp') },
    { title: 'The Lovers', num: 6, img: u('m06.webp'), censoredImg: u('m06c.webp') },
    { title: 'The Chariot', num: 7, img: u('m07.webp'), censoredImg: u('m07c.webp') },
    { title: 'The Strength', num: 8, img: u('m08.webp') },
    { title: 'The Hermit', num: 9, img: u('m09.webp') },
    { title: 'The Wheel Of Fortune', num: 10, img: u('m10.webp'), censoredImg: u('m10c.webp') },
    { title: 'Justice', num: 11, img: u('m11.webp') },
    { title: 'The Hangman', num: 12, img: u('m12.webp') },
    { title: 'Death', num: 13, img: u('m13.webp') },
    { title: 'Temperance', num: 14, img: u('m14.webp') },
    { title: 'The Devil', num: 15, img: u('m15.webp'), censoredImg: u('m15c.webp') },
    { title: 'The Tower', num: 16, img: u('m16.webp') },
    { title: 'The Star', num: 17, img: u('m17.webp'), censoredImg: u('m17c.webp') },
    { title: 'The Moon', num: 18, img: u('m18.webp') },
    { title: 'The Sun', num: 19, img: u('m19.webp'), censoredImg: u('m19c.webp') },
    { title: 'Judgement', num: 20, img: u('m20.webp'), censoredImg: u('m20c.webp') },
    { title: 'The World', num: 21, img: u('m21.webp'), censoredImg: u('m21c.webp') },
    { title: 'Ace Of Wands', num: 22, img: u('w01.webp') },
    { title: 'Two Of Wands', num: 23, img: u('w02.webp') },
    { title: 'Three Of Wands', num: 24, img: u('w03.webp') },
    { title: 'Four Of Wands', num: 25, img: u('w04.webp') },
    { title: 'Five Of Wands', num: 26, img: u('w05.webp') },
    { title: 'Six Of Wands', num: 27, img: u('w06.webp') },
    { title: 'Seven Of Wands', num: 28, img: u('w07.webp') },
    { title: 'Eight Of Wands', num: 29, img: u('w08.webp') },
    { title: 'Nine Of Wands', num: 30, img: u('w09.webp') },
    { title: 'Ten Of Wands', num: 31, img: u('w10.webp') },
    { title: 'Page Of Wands', num: 32, img: u('w11.webp') },
    { title: 'Knight Of Wands', num: 33, img: u('w12.webp') },
    { title: 'Queen Of Wands', num: 34, img: u('w13.webp') },
    { title: 'King Of Wands', num: 35, img: u('w14.webp') },
    { title: 'Ace Of Cups', num: 36, img: u('c01.webp') },
    { title: 'Two Of Cups', num: 37, img: u('c02.webp') },
    { title: 'Three Of Cups', num: 38, img: u('c03.webp') },
    { title: 'Four Of Cups', num: 39, img: u('c04.webp') },
    { title: 'Five Of Cups', num: 40, img: u('c05.webp') },
    { title: 'Six Of Cups', num: 41, img: u('c06.webp') },
    { title: 'Seven Of Cups', num: 42, img: u('c07.webp') },
    { title: 'Eight Of Cups', num: 43, img: u('c08.webp') },
    { title: 'Nine Of Cups', num: 44, img: u('c09.webp') },
    { title: 'Ten Of Cups', num: 45, img: u('c10.webp') },
    { title: 'Page Of Cups', num: 46, img: u('c11.webp') },
    { title: 'Knight Of Cups', num: 47, img: u('c12.webp') },
    { title: 'Queen Of Cups', num: 48, img: u('c13.webp') },
    { title: 'King Of Cups', num: 49, img: u('c14.webp') },
    { title: 'Ace Of Swords', num: 50, img: u('s01.webp') },
    { title: 'Two Of Swords', num: 51, img: u('s02.webp') },
    { title: 'Three Of Swords', num: 52, img: u('s03.webp') },
    { title: 'Four Of Swords', num: 53, img: u('s04.webp') },
    { title: 'Five Of Swords', num: 54, img: u('s05.webp') },
    { title: 'Six Of Swords', num: 55, img: u('s06.webp') },
    { title: 'Seven Of Swords', num: 56, img: u('s07.webp') },
    { title: 'Eight Of Swords', num: 57, img: u('s08.webp') },
    { title: 'Nine Of Swords', num: 58, img: u('s09.webp') },
    { title: 'Ten Of Swords', num: 59, img: u('s10.webp') },
    { title: 'Page Of Swords', num: 60, img: u('s11.webp') },
    { title: 'Knight Of Swords', num: 61, img: u('s12.webp') },
    { title: 'Queen Of Swords', num: 62, img: u('s13.webp') },
    { title: 'King Of Swords', num: 63, img: u('s14.webp') },
    { title: 'Ace Of Pentacles', num: 64, img: u('p01.webp') },
    { title: 'Two Of Pentacles', num: 65, img: u('p02.webp') },
    { title: 'Three Of Pentacles', num: 66, img: u('p03.webp') },
    { title: 'Four Of Pentacles', num: 67, img: u('p04.webp') },
    { title: 'Five Of Pentacles', num: 68, img: u('p05.webp') },
    { title: 'Six Of Pentacles', num: 69, img: u('p06.webp') },
    { title: 'Seven Of Pentacles', num: 70, img: u('p07.webp') },
    { title: 'Eight Of Pentacles', num: 71, img: u('p08.webp') },
    { title: 'Nine Of Pentacles', num: 72, img: u('p09.webp') },
    { title: 'Ten Of Pentacles', num: 73, img: u('p10.webp') },
    { title: 'Page Of Pentacles', num: 74, img: u('p11.webp') },
    { title: 'Knight Of Pentacles', num: 75, img: u('p12.webp') },
    { title: 'Queen Of Pentacles', num: 76, img: u('p13.webp') },
    { title: 'King Of Pentacles', num: 77, img: u('p14.webp') },
  ] as TarotCard[],

  getCardImg(card: TarotCard, censored: boolean): string {
    if (censored && card.censoredImg) return card.censoredImg;
    return card.img;
  },

  shuffleDeck() {
    const newArray = [...(Alpine.store('shuffledCards') as TarotCard[])];

    for (let i = newArray.length - 1; i > 0; --i) {
      const j = this.cryptoRandomInt(newArray.length);
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }

    Alpine.store('shuffledCards', newArray);

    this.showShuffledConfirmation = true;
    setTimeout(() => { this.showShuffledConfirmation = false; }, 3000);
  },

  addCardToCanvas(this: MergedThis, card: TarotCard): void {
    const draggableCard: DraggableCard = {
      card,
      id: this.generateCardId(),
      x: (() => {
        const cardWidth = 150;
        const vw = this.viewport!.getBoundingClientRect().width;
        const visibleMinX = -this.offsetX / this.scale;
        const visibleMaxX = (vw - this.offsetX) / this.scale - cardWidth;
        const rangeX = Math.max(0, visibleMaxX - visibleMinX);
        return visibleMinX + Math.random() * rangeX;
      })(),
      y: (() => {
        const cardHeight = 231;
        const vh = this.viewport!.getBoundingClientRect().height;
        const visibleMinY = -this.offsetY / this.scale;
        const visibleMaxY = (vh - this.offsetY) / this.scale - cardHeight;
        const rangeY = Math.max(0, visibleMaxY - visibleMinY);
        return visibleMinY + Math.random() * rangeY;
      })(),
      rotation: 0,
      zIndex: this.maxZIndex + 1,
      opacity: 1,
      cursor: 'grab',
      display: 'block'
    };

    this.draggableCards = [...this.draggableCards, draggableCard];
    this.maxZIndex += 1;
    this.dirty = true;
  },

  generateCardId(): string {
    return `card-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  },

  cryptoRandomInt(len: number): number {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const fraction = buf[0] / (0xFFFFFFFF + 1);
    const result = Math.floor(fraction * len);
    return result;
  },

  drawMultipleCards(num: number): Set<number> | undefined {
    if (num > 10 || num < 1) { return; }

    const draws = new Set<number>();
    const shuffledCards = Alpine.store('shuffledCards') as TarotCard[];

    while (draws.size < num) {
      const randomNum = this.cryptoRandomInt(shuffledCards.length);
      if (!draws.has(randomNum)) { draws.add(randomNum); }
    }

    return draws;
  },

  drawCardAt(this: MergedThis, x: number, y: number) {
    const { x: contentX, y: contentY } = this.screenToContent(x, y);
    this.addCardToCanvas((Alpine.store('shuffledCards') as TarotCard[])[this.cryptoRandomInt((Alpine.store('shuffledCards') as TarotCard[]).length)]);
    this.updateItem(this.draggableCards[this.draggableCards.length - 1].id, { x: contentX, y: contentY });
  },

  updateItem(this: MergedThis, id: string, newProps: Partial<DraggableCard>) {
    const index = this.draggableCards.findIndex(i => i.id === id)
    if (index === -1) return

    this.draggableCards[index] = {
      ...this.draggableCards[index],
      ...newProps,
    }
    this.dirty = true;
  },

  deleteCard(this: MergedThis, cardId: string) {
    this.draggableCards = this.draggableCards.filter(c => c.id !== cardId);
    const textLabels = this.textLabels.filter((l: TextLabel) => l.anchorCardId === cardId);
    for (const textLabel of textLabels) {
      this.updateTextLabel(textLabel.id, { anchorCardId: null, anchorPosition: null });
    }
    this.dirty = true;
  },

  deleteSelectedCards(this: MergedThis) {
    this.draggableCards = this.draggableCards.filter(c => !this.selectedCardIds.includes(c.id));
    const textLabels = this.textLabels.filter((l: TextLabel) => l.anchorCardId !== null && this.selectedCardIds.includes(l.anchorCardId));
    for (const textLabel of textLabels) {
      this.updateTextLabel(textLabel.id, { anchorCardId: null, anchorPosition: null });
    }
    this.selectedCardIds = [];
    this.dirty = true;
  },

  rotateCard(this: MergedThis, cardId: string, direction: 'clockwise' | 'counter-clockwise' | '180') {
    const card = this.draggableCards.find(c => c.id === cardId);
    if (!card) return;
    const delta = direction === 'clockwise' ? 90 : direction === 'counter-clockwise' ? -90 : 180;
    this.updateItem(cardId, { rotation: card.rotation + delta });
  },
}));
