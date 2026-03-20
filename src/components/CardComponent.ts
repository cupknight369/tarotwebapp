import Alpine from 'alpinejs'
import type { MergedThis, DraggableCard, TarotCard, TextLabel } from '../types/canvas.js'

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
    { title: 'The Fool', num: 0, img: '/cards/m00.jpg' },
    { title: 'The Magician', num: 1, img: '/cards/m01.jpg' },
    { title: 'The High Priestess', num: 2, img: '/cards/m02.jpg' },
    { title: 'The Empress', num: 3, img: '/cards/m03.jpg' },
    { title: 'The Emperor', num: 4, img: '/cards/m04.jpg' },
    { title: 'The Hierophant', num: 5, img: '/cards/m05.jpg' },
    { title: 'The Lovers', num: 6, img: '/cards/m06.jpg', censoredImg: '/cards/m06c.jpg' },
    { title: 'The Chariot', num: 7, img: '/cards/m07.jpg', censoredImg: '/cards/m07c.jpg' },
    { title: 'The Strength', num: 8, img: '/cards/m08.jpg' },
    { title: 'The Hermit', num: 9, img: '/cards/m09.jpg' },
    { title: 'The Wheel Of Fortune', num: 10, img: '/cards/m10.jpg', censoredImg: '/cards/m10c.jpg' },
    { title: 'Justice', num: 11, img: '/cards/m11.jpg' },
    { title: 'The Hangman', num: 12, img: '/cards/m12.jpg' },
    { title: 'Death', num: 13, img: '/cards/m13.jpg' },
    { title: 'Temperance', num: 14, img: '/cards/m14.jpg' },
    { title: 'The Devil', num: 15, img: '/cards/m15.jpg', censoredImg: '/cards/m15c.jpg' },
    { title: 'The Tower', num: 16, img: '/cards/m16.jpg' },
    { title: 'The Star', num: 17, img: '/cards/m17.jpg', censoredImg: '/cards/m17c.jpg' },
    { title: 'The Moon', num: 18, img: '/cards/m18.jpg' },
    { title: 'The Sun', num: 19, img: '/cards/m19.jpg', censoredImg: '/cards/m19c.jpg' },
    { title: 'Judgement', num: 20, img: '/cards/m20.jpg', censoredImg: '/cards/m20c.jpg' },
    { title: 'The World', num: 21, img: '/cards/m21.jpg', censoredImg: '/cards/m21c.jpg' },
    { title: 'Ace Of Wands', num: 22, img: '/cards/w01.jpg' },
    { title: 'Two Of Wands', num: 23, img: '/cards/w02.jpg' },
    { title: 'Three Of Wands', num: 24, img: '/cards/w03.jpg' },
    { title: 'Four Of Wands', num: 25, img: '/cards/w04.jpg' },
    { title: 'Five Of Wands', num: 26, img: '/cards/w05.jpg' },
    { title: 'Six Of Wands', num: 27, img: '/cards/w06.jpg' },
    { title: 'Seven Of Wands', num: 28, img: '/cards/w07.jpg' },
    { title: 'Eight Of Wands', num: 29, img: '/cards/w08.jpg' },
    { title: 'Nine Of Wands', num: 30, img: '/cards/w09.jpg' },
    { title: 'Ten Of Wands', num: 31, img: '/cards/w10.jpg' },
    { title: 'Page Of Wands', num: 32, img: '/cards/w11.jpg' },
    { title: 'Knight Of Wands', num: 33, img: '/cards/w12.jpg' },
    { title: 'Queen Of Wands', num: 34, img: '/cards/w13.jpg' },
    { title: 'King Of Wands', num: 35, img: '/cards/w14.jpg' },
    { title: 'Ace Of Cups', num: 36, img: '/cards/c01.jpg' },
    { title: 'Two Of Cups', num: 37, img: '/cards/c02.jpg' },
    { title: 'Three Of Cups', num: 38, img: '/cards/c03.jpg' },
    { title: 'Four Of Cups', num: 39, img: '/cards/c04.jpg' },
    { title: 'Five Of Cups', num: 40, img: '/cards/c05.jpg' },
    { title: 'Six Of Cups', num: 41, img: '/cards/c06.jpg' },
    { title: 'Seven Of Cups', num: 42, img: '/cards/c07.jpg' },
    { title: 'Eight Of Cups', num: 43, img: '/cards/c08.jpg' },
    { title: 'Nine Of Cups', num: 44, img: '/cards/c09.jpg' },
    { title: 'Ten Of Cups', num: 45, img: '/cards/c10.jpg' },
    { title: 'Page Of Cups', num: 46, img: '/cards/c11.jpg' },
    { title: 'Knight Of Cups', num: 47, img: '/cards/c12.jpg' },
    { title: 'Queen Of Cups', num: 48, img: '/cards/c13.jpg' },
    { title: 'King Of Cups', num: 49, img: '/cards/c14.jpg' },
    { title: 'Ace Of Swords', num: 50, img: '/cards/s01.jpg' },
    { title: 'Two Of Swords', num: 51, img: '/cards/s02.jpg' },
    { title: 'Three Of Swords', num: 52, img: '/cards/s03.jpg' },
    { title: 'Four Of Swords', num: 53, img: '/cards/s04.jpg' },
    { title: 'Five Of Swords', num: 54, img: '/cards/s05.jpg' },
    { title: 'Six Of Swords', num: 55, img: '/cards/s06.jpg' },
    { title: 'Seven Of Swords', num: 56, img: '/cards/s07.jpg' },
    { title: 'Eight Of Swords', num: 57, img: '/cards/s08.jpg' },
    { title: 'Nine Of Swords', num: 58, img: '/cards/s09.jpg' },
    { title: 'Ten Of Swords', num: 59, img: '/cards/s10.jpg' },
    { title: 'Page Of Swords', num: 60, img: '/cards/s11.jpg' },
    { title: 'Knight Of Swords', num: 61, img: '/cards/s12.jpg' },
    { title: 'Queen Of Swords', num: 62, img: '/cards/s13.jpg' },
    { title: 'King Of Swords', num: 63, img: '/cards/s14.jpg' },
    { title: 'Ace Of Pentacles', num: 64, img: '/cards/p01.jpg' },
    { title: 'Two Of Pentacles', num: 65, img: '/cards/p02.jpg' },
    { title: 'Three Of Pentacles', num: 66, img: '/cards/p03.jpg' },
    { title: 'Four Of Pentacles', num: 67, img: '/cards/p04.jpg' },
    { title: 'Five Of Pentacles', num: 68, img: '/cards/p05.jpg' },
    { title: 'Six Of Pentacles', num: 69, img: '/cards/p06.jpg' },
    { title: 'Seven Of Pentacles', num: 70, img: '/cards/p07.jpg' },
    { title: 'Eight Of Pentacles', num: 71, img: '/cards/p08.jpg' },
    { title: 'Nine Of Pentacles', num: 72, img: '/cards/p09.jpg' },
    { title: 'Ten Of Pentacles', num: 73, img: '/cards/p10.jpg' },
    { title: 'Page Of Pentacles', num: 74, img: '/cards/p11.jpg' },
    { title: 'Knight Of Pentacles', num: 75, img: '/cards/p12.jpg' },
    { title: 'Queen Of Pentacles', num: 76, img: '/cards/p13.jpg' },
    { title: 'King Of Pentacles', num: 77, img: '/cards/p14.jpg' },
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
