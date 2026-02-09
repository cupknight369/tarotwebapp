import Alpine from 'alpinejs'

Alpine.data('canvasComponent', () => ({
  draggableCards: [] as DraggableCard[],
  maxZIndex: 0,
  dragStart: null as { startCardX: number; startCardY: number; startDropX: number; startDropY: number } | null,
  dragContainer: null as HTMLElement | null,
  draggingCard: null as HTMLElement | null,
  showShuffledConfirmation: false,

  selectedCardIds: [] as string[],
  selectionBox: null as { startX: number; startY: number; currentX: number; currentY: number } | null,
  selectionBoxStyle: '' as string,
  groupDragOffsets: null as Record<string, { dx: number; dy: number }> | null,

  scale: 1,
  minScale: 0.2,
  maxScale: 4,
  offsetX: 0,
  offsetY: 0,

  isPanning: false,
  panStartX: 0,
  panStartY: 0,

  viewport: null as HTMLDivElement | null,
  content: null as HTMLDivElement | null,
  emptyCanvasMessage: null as HTMLDivElement | null,

  contextMenu: { open: false, x: 0, y: 0, cardId: null as string | null },

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

  get contentStyle() {
    return `
    transform-origin: 0 0;
    transform: translate3d(${this.offsetX}px, ${this.offsetY}px, 0)
              scale(${this.scale});
    transition: transform 0.03s linear;
    `;
  },

  screenToContent(screenX: number, screenY: number): { x: number; y: number } {
    if (!this.viewport) return { x: 0, y: 0 };
    const rect = this.viewport.getBoundingClientRect();
    return {
      x: (screenX - rect.left - this.offsetX) / this.scale,
      y: (screenY - rect.top - this.offsetY) / this.scale,
    };
  },

  boxesOverlap(
    box1: { left: number; top: number; width: number; height: number },
    box2: { left: number; top: number; width: number; height: number }
  ): boolean {
    return !(
      box1.left + box1.width < box2.left ||
      box2.left + box2.width < box1.left ||
      box1.top + box1.height < box2.top ||
      box2.top + box2.height < box1.top
    );
  },

  updateSelectionBoxStyle() {
    if (!this.selectionBox) {
      this.selectionBoxStyle = '';
      return;
    }
    const { startX, startY, currentX, currentY } = this.selectionBox;
    const left = Math.min(startX, currentX);
    const top = Math.min(startY, currentY);
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    this.selectionBoxStyle = `left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px;`;
  },

  init() {
    Alpine.store('shuffledCards', this.cards);
    this.shuffleDeck();

    (window as any).draggableZoneComponent = this;
    this.dragContainer = document.querySelector('#draggable-container') as HTMLElement;
    this.viewport = this.$refs.viewport as HTMLDivElement;
    this.content = this.$refs.content as HTMLDivElement;
    this.emptyCanvasMessage = this.$refs.emptyCanvasMessage as HTMLDivElement;

    const viewportRect = this.viewport!.getBoundingClientRect();
    const contentW = this.content!.offsetWidth;
    const contentH = this.content!.offsetHeight;
    this.offsetX = viewportRect.width / 2 - contentW / 2;
    this.offsetY = viewportRect.height / 2 - contentH / 2;
  },

  onWheel(e: WheelEvent) {
    if (!this.viewport) return;
    e.preventDefault();

    const rect = this.viewport!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    this.zoomAt(mouseX, mouseY, factor);
  },

  zoomIn() {
    this.zoomAtCenter(1.1);
  },

  zoomOut() {
    this.zoomAtCenter(0.9);
  },

  zoomAt(screenX: number, screenY: number, factor: number) {
    const newScale = this.clamp(this.scale * factor, this.minScale, this.maxScale);
    const actual = newScale / this.scale;
    if (actual === 1) return;

    this.offsetX = screenX - (screenX - this.offsetX) * actual;
    this.offsetY = screenY - (screenY - this.offsetY) * actual;

    this.scale = newScale;
  },

  zoomAtCenter(factor: number) {
    if (!this.viewport) return;
    const rect = this.viewport.getBoundingClientRect();
    this.zoomAt(rect.width / 2, rect.height / 2, factor);
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

  addCardToCanvas(card: TarotCard): void {
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

  onMouseWheelClick(event: MouseEvent) {
    if (event.target !== this.viewport 
        && event.target !== this.content 
        && event.target !== this.emptyCanvasMessage) 
    { return; }

    this.contextMenu = {
      open: true,
      x: event.clientX,
      y: event.clientY,
      cardId: null,
    };
  },

  drawCardAt(x: number, y: number) {
    // Convert the given screen coordinates (x, y) to the content (canvas) coordinates
    const { x: contentX, y: contentY } = this.screenToContent(x, y);
    this.addCardToCanvas((Alpine.store('shuffledCards') as TarotCard[])[this.cryptoRandomInt((Alpine.store('shuffledCards') as TarotCard[]).length)]);
    // Place top-left corner of card at mouse pointer position in canvas coordinates
    this.updateItem(this.draggableCards[this.draggableCards.length - 1].id, { x: contentX, y: contentY });
  },

  onMouseDown(event: MouseEvent) {
    if (event.button === 1) {
      this.onMouseWheelClick(event);
      return;
    }

    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    const cardId = target.id && this.draggableCards.some(c => c.id === target.id) ? target.id : null;
    const isOnEmpty = target === this.viewport || target === this.content || target === this.emptyCanvasMessage;

    if (event.ctrlKey) {
      const { x, y } = this.screenToContent(event.clientX, event.clientY);
      this.selectionBox = { startX: x, startY: y, currentX: x, currentY: y };
      this.updateSelectionBoxStyle();
      return;
    }

    if (isOnEmpty) {
      this.selectedCardIds = [];
      this.isPanning = true;
      this.panStartX = event.clientX - this.offsetX;
      this.panStartY = event.clientY - this.offsetY;
      this.viewport!.style.cursor = "grabbing";
      return;
    }

    if (!cardId) return;
    this.draggingCard = target;

    const card = this.draggableCards.find(c => c.id === cardId)!;
    const rect = this.dragContainer!.getBoundingClientRect();
    const startDropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
    const startDropY = event.clientY - rect.top - this.dragContainer!.clientTop;

    if (this.selectedCardIds.includes(cardId)) {
      this.groupDragOffsets = {};
      const anchorX = card.x;
      const anchorY = card.y;
      for (const id of this.selectedCardIds) {
        const c = this.draggableCards.find(dc => dc.id === id);
        if (c) this.groupDragOffsets[id] = { dx: c.x - anchorX, dy: c.y - anchorY };
      }
    } else {
      this.selectedCardIds = [];
      this.groupDragOffsets = null;
    }

    this.dragStart = {
      startCardX: card.x,
      startCardY: card.y,
      startDropX,
      startDropY,
    };

    this.maxZIndex += 1;
    this.updateItem(this.draggingCard.id, { zIndex: this.maxZIndex, cursor: 'grabbing' });
  },

  onMouseMove(e: MouseEvent) {
    if (this.selectionBox) {
      const { x, y } = this.screenToContent(e.clientX, e.clientY);
      this.selectionBox = { ...this.selectionBox!, currentX: x, currentY: y };
      this.updateSelectionBoxStyle();
      return;
    }

    if (this.isPanning) {
      this.offsetX = e.clientX - this.panStartX;
      this.offsetY = e.clientY - this.panStartY;
      return;
    }

    if (!this.draggingCard || !this.dragStart) return;

    const rect = this.dragContainer!.getBoundingClientRect();
    const dropX = e.clientX - rect.left - this.dragContainer!.clientLeft;
    const dropY = e.clientY - rect.top - this.dragContainer!.clientTop;
    const newAnchorX = this.dragStart.startCardX + (dropX - this.dragStart.startDropX) / this.scale;
    const newAnchorY = this.dragStart.startCardY + (dropY - this.dragStart.startDropY) / this.scale;

    if (this.groupDragOffsets) {
      for (const id of Object.keys(this.groupDragOffsets)) {
        const { dx, dy } = this.groupDragOffsets[id];
        this.updateItem(id, { x: newAnchorX + dx, y: newAnchorY + dy });
      }
    } else {
      this.updateItem(this.draggingCard.id, { x: newAnchorX, y: newAnchorY });
    }
  },

  onMouseUp(event: MouseEvent) {
    event.preventDefault();

    this.isPanning = false;
    if (this.viewport) this.viewport.style.cursor = "grab";

    if (this.selectionBox) {
      const { startX, startY, currentX, currentY } = this.selectionBox;
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      const selectionRect = { left, top, width, height };

      const cardWidth = 150;
      const cardHeight = 231;
      const ids: string[] = [];
      for (const card of this.draggableCards) {
        const cardRect = { left: card.x, top: card.y, width: cardWidth, height: cardHeight };
        if (this.boxesOverlap(selectionRect, cardRect)) ids.push(card.id);
      }
      this.selectedCardIds = ids;
      this.selectionBox = null;
      this.selectionBoxStyle = '';
      return;
    }

    if (!this.draggingCard || !this.dragStart) return;

    const rect = this.dragContainer!.getBoundingClientRect();
    const dropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
    const dropY = event.clientY - rect.top - this.dragContainer!.clientTop;
    const newAnchorX = this.dragStart.startCardX + (dropX - this.dragStart.startDropX) / this.scale;
    const newAnchorY = this.dragStart.startCardY + (dropY - this.dragStart.startDropY) / this.scale;

    if (this.groupDragOffsets) {
      for (const id of Object.keys(this.groupDragOffsets)) {
        const { dx, dy } = this.groupDragOffsets[id];
        this.updateItem(id, { x: newAnchorX + dx, y: newAnchorY + dy, display: 'block', cursor: 'grab' });
      }
      this.groupDragOffsets = null;
    } else {
      this.updateItem(this.draggingCard.id, { x: newAnchorX, y: newAnchorY, display: 'block', cursor: 'grab' });
    }

    this.dragStart = null;
    this.draggingCard = null;
  },

  clearCanvas() {
    this.draggableCards = [];
    this.maxZIndex = 0;
    this.draggingCard = null;
    this.dragStart = null;
    this.selectedCardIds = [];
    this.selectionBox = null;
    this.selectionBoxStyle = '';
    this.groupDragOffsets = null;
    this.scale = 1;

    const viewportRect = this.viewport!.getBoundingClientRect();
    const contentW = this.content!.offsetWidth;
    const contentH = this.content!.offsetHeight;
    this.offsetX = viewportRect.width / 2 - contentW / 2;
    this.offsetY = viewportRect.height / 2 - contentH / 2;
  },

  updateItem(id: string, newProps: Partial<DraggableCard>) {
    const index = this.draggableCards.findIndex(i => i.id === id)
    if (index === -1) return

    this.draggableCards[index] = {
      ...this.draggableCards[index],
      ...newProps,
    }
  },

  deleteCard(cardId: string) {
    this.draggableCards = this.draggableCards.filter(c => c.id !== cardId);
  },

  deleteSelectedCards() {
    this.draggableCards = this.draggableCards.filter(c => !this.selectedCardIds.includes(c.id));
    this.selectedCardIds = [];
  },

  rotateCard(cardId: string, direction: 'clockwise' | 'counter-clockwise' | '180') {
    const card = this.draggableCards.find(c => c.id === cardId);
    if (!card) return;
    const delta = direction === 'clockwise' ? 90 : direction === 'counter-clockwise' ? -90 : 180;
    this.updateItem(cardId, { rotation: card.rotation + delta });
  },

  onContextMenu(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const cardId = target.id;
    if (!cardId || !this.draggableCards.some(c => c.id === cardId)) return;
    event.preventDefault();
    this.contextMenu = {
      open: true,
      x: event.clientX,
      y: event.clientY,
      cardId,
    };
  },

  closeContextMenu() {
    this.contextMenu.open = false;
    this.contextMenu.cardId = null;
  },

  clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  },
}))
