import Alpine from 'alpinejs';
import type { MergedThis, DraggableCard, TarotCard, TextLabel } from '../types/canvas.js';
import type { SettingsStoreState } from '../types/settings.js';
import { revokeTarotCardBlobUrls } from '../lib/cardBlobUrls.js';

Alpine.data('cardComponent', () => ({
  draggableCards: [] as DraggableCard[],
  maxZIndex: 0,
  dragStart: null as {
    startCardX: number;
    startCardY: number;
    startDropX: number;
    startDropY: number;
  } | null,
  draggingCard: null as HTMLElement | null,
  selectedCardIds: [] as string[],
  selectedTextIds: [] as string[],
  groupDragOffsets: null as Record<string, { dx: number; dy: number }> | null,
  showShuffledConfirmation: false,

  CARD_WIDTH: 150,
  CARD_HEIGHT: 231,

  getCardImg(card: TarotCard, censored: boolean): string {
    if (card.invalidReference) return '';
    if (censored && card.censoredImg) return card.censoredImg;
    return card.img;
  },

  /** True when the dashed placeholder should show (no usable image URL for the img tag). */
  cardShowsPlaceholder(card: TarotCard, censored: boolean): boolean {
    if (card.invalidReference) return true;
    return this.getCardImg(card, censored) === '';
  },

  shuffleDeck() {
    const newArray = [...(Alpine.store('shuffledCards') as TarotCard[])];

    for (let i = newArray.length - 1; i > 0; --i) {
      const j = this.cryptoRandomInt(newArray.length);
      [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }

    Alpine.store('shuffledCards', newArray);

    this.showShuffledConfirmation = true;
    setTimeout(() => {
      this.showShuffledConfirmation = false;
    }, 3000);
  },

  openDrawByIndexDialog(this: MergedThis, screenX: number, screenY: number) {
    const s = Alpine.store('shuffledCards') as TarotCard[];
    const max = Math.max(0, s.length - 1);
    Alpine.store('dialog', {
      open: true,
      type: 'input',
      title: `Card index (0-${max})?`,
      inputMin: 0,
      inputMax: max,
      inputDefault: '0',
      onSubmit: (i: number) => {
        if (i >= 0 && i <= max && s.length > 0) {
          this.addCardAtScreenPosition(s[i], screenX, screenY);
        }
      },
      onCancel: () => {},
    });
  },

  addCardAtScreenPosition(this: MergedThis, card: TarotCard, screenX: number, screenY: number) {
    const { x, y } = this.screenToContent(screenX, screenY);
    this.addCardToCanvas(card);
    this.updateItem(this.draggableCards[this.draggableCards.length - 1].id, { x, y });
  },

  addCardToCanvas(this: MergedThis, card: TarotCard): void {
    const activeDeckTitle = Alpine.store('activeDeckTitle') as string;
    const settings = Alpine.store('settings') as SettingsStoreState;
    const cardWithMeta: TarotCard = {
      ...card,
      deckTitle: card.deckTitle ?? (activeDeckTitle || undefined),
    };
    const draggableCard: DraggableCard = {
      card: cardWithMeta,
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
      rotation: settings.reversals && this.cryptoRandomInt(4) === 0 ? 180 : 0,
      zIndex: this.maxZIndex + 1,
      opacity: 1,
      cursor: 'grab',
      display: 'block',
    };

    this.draggableCards = [...this.draggableCards, draggableCard];
    this.maxZIndex += 1;
    this.dirty = true;
    if (typeof this.hydrateCanvasCardCorrespondenceDisplays === 'function') {
      void this.hydrateCanvasCardCorrespondenceDisplays();
    }
  },

  generateCardId(): string {
    return `card-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  },

  cryptoRandomInt(len: number): number {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const fraction = buf[0] / (0xffffffff + 1);
    const result = Math.floor(fraction * len);
    return result;
  },

  drawCardAt(this: MergedThis, x: number, y: number) {
    const shuffledCards = Alpine.store('shuffledCards') as TarotCard[];
    if (shuffledCards.length === 0) return;
    this.addCardAtScreenPosition(shuffledCards[this.cryptoRandomInt(shuffledCards.length)], x, y);
  },

  updateItem(this: MergedThis, id: string, newProps: Partial<DraggableCard>) {
    const index = this.draggableCards.findIndex((i) => i.id === id);
    if (index === -1) return;

    this.draggableCards[index] = {
      ...this.draggableCards[index],
      ...newProps,
    };
    this.dirty = true;
  },

  deleteCard(this: MergedThis, cardId: string) {
    const found = this.draggableCards.find((c) => c.id === cardId);
    if (found) revokeTarotCardBlobUrls(found.card);
    this.draggableCards = this.draggableCards.filter((c) => c.id !== cardId);
    const textLabels = this.textLabels.filter((l: TextLabel) => l.anchorCardId === cardId);
    for (const textLabel of textLabels) {
      this.updateTextLabel(textLabel.id, { anchorCardId: null, anchorPosition: null });
    }
    this.dirty = true;
  },

  deleteSelectedCards(this: MergedThis) {
    for (const dc of this.draggableCards) {
      if (this.selectedCardIds.includes(dc.id)) revokeTarotCardBlobUrls(dc.card);
    }
    this.draggableCards = this.draggableCards.filter((c) => !this.selectedCardIds.includes(c.id));
    const textLabels = this.textLabels.filter(
      (l: TextLabel) => l.anchorCardId !== null && this.selectedCardIds.includes(l.anchorCardId),
    );
    for (const textLabel of textLabels) {
      this.updateTextLabel(textLabel.id, { anchorCardId: null, anchorPosition: null });
    }
    this.selectedCardIds = [];
    this.selectedTextIds = [];
    this.dirty = true;
  },

  rotateCard(
    this: MergedThis,
    cardId: string,
    direction: 'clockwise' | 'counter-clockwise' | '180',
  ) {
    const card = this.draggableCards.find((c) => c.id === cardId);
    if (!card) return;
    const delta = direction === 'clockwise' ? 90 : direction === 'counter-clockwise' ? -90 : 180;
    this.updateItem(cardId, { rotation: card.rotation + delta });
  },
}));
