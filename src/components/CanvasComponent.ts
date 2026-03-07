import Alpine from 'alpinejs'
import * as readingsLib from '../lib/readings.js'

interface MouseLikeEvent {
  clientX: number;
  clientY: number;
  target: EventTarget | null;
  button?: number;
  ctrlKey?: boolean;
  preventDefault?: () => void;
}

Alpine.data('canvasComponent', () => ({
  draggableCards: [] as DraggableCard[],
  maxZIndex: 0,
  loadedReadingId: null as string | null,
  dirty: false,
  loadModalOpen: false,
  loadModalConfirmingForId: null as string | null,
  savedReadings: [] as { id: string; name: string; updated_at: string }[],
  saveAndLoadTargetId: null as string | null,
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

  contextMenu: { open: false, x: 0, y: 0, cardId: null as string | null, textId: null as string | null },

  textLabels: [] as TextLabel[],
  maxTextZIndex: 0,
  draggingTextId: null as string | null,
  textDragStart: null as { startX: number; startY: number; startDropX: number; startDropY: number } | null,
  editingTextId: null as string | null,
  pendingAnchor: null as { textId: string; cardId: string; screenX: number; screenY: number } | null,

  activeTouchId: null as number | null,
  touchStartPos: null as { clientX: number; clientY: number; target: EventTarget | null } | null,
  longPressTimerId: null as ReturnType<typeof setTimeout> | null,
  longPressActivated: false,
  touchMovedAfterLongPress: false,
  touchGestureStarted: false,
  pinchStartDistance: 0,
  pinchStartScale: 1,

  CARD_WIDTH: 150,
  CARD_HEIGHT: 231,
  TEXT_ANCHOR_GAP: 10,
  TEXT_LABEL_DEFAULT_HEIGHT: 24,

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

  touchToMouseLike(touch: Touch, target?: EventTarget | null, ctrlKey = false): MouseLikeEvent {
    return {
      clientX: touch.clientX,
      clientY: touch.clientY,
      target: target ?? document.elementFromPoint(touch.clientX, touch.clientY),
      button: 0,
      ctrlKey,
      preventDefault: () => {},
    };
  },

  getTouchById(ev: TouchEvent, id: number): Touch | null {
    const fromList = (list: TouchList) => {
      for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i];
      return null;
    };
    return fromList(ev.touches) ?? fromList(ev.changedTouches) ?? null;
  },

  onTouchStart(e: TouchEvent) {
    if (!this.viewport) return;

    if (e.touches.length === 2) {
      if (this.longPressTimerId) {
        clearTimeout(this.longPressTimerId);
        this.longPressTimerId = null;
      }

      this.longPressActivated = false;
      this.activeTouchId = null;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      this.pinchStartDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      this.pinchStartScale = this.scale;

      return;
    }

    if (e.touches.length === 1) {
      e.preventDefault();

      const touch = e.touches[0];
      this.activeTouchId = touch.identifier;
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      this.touchStartPos = { clientX: touch.clientX, clientY: touch.clientY, target };
      this.touchGestureStarted = false;
      this.touchMovedAfterLongPress = false;
      this.longPressActivated = false;

      if (this.longPressTimerId) clearTimeout(this.longPressTimerId);
      this.longPressTimerId = setTimeout(() => {
        this.longPressTimerId = null;
        this.longPressActivated = true;
      }, 500);
    }
  },

  onTouchMove(e: TouchEvent) {
    if (!this.viewport) return;

    if (e.touches.length === 2) {
      if (this.longPressTimerId) {
        clearTimeout(this.longPressTimerId);
        this.longPressTimerId = null;
      }

      if (this.pinchStartDistance <= 0) return;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      const factor = dist / this.pinchStartDistance;
      const newScale = this.clamp(this.pinchStartScale * factor, this.minScale, this.maxScale);
      const actual = newScale / this.scale;

      if (actual !== 1) {
        this.zoomAt(centerX, centerY, actual);
      }

      e.preventDefault();
      return;
    }

    if (e.touches.length === 1) {
      const touch = this.activeTouchId !== null ? this.getTouchById(e, this.activeTouchId) : null;
      if (!touch || !this.touchStartPos) return;

      if (this.longPressTimerId) {
        clearTimeout(this.longPressTimerId);
        this.longPressTimerId = null;
      }

      const pos = this.touchStartPos;
      const moveSyn = this.touchToMouseLike(touch);

      if (this.longPressActivated) {
        if (!this.touchMovedAfterLongPress) {
          const downSyn: MouseLikeEvent = { ...this.touchToMouseLike(touch, pos.target, true), clientX: pos.clientX, clientY: pos.clientY };
          this.onMouseDown(downSyn);
          this.onMouseMove(moveSyn);
          this.touchMovedAfterLongPress = true;
          this.touchGestureStarted = true;
        } else {
          this.onMouseMove(moveSyn);
        }
        e.preventDefault();
        return;
      }

      if (!this.touchGestureStarted) {
        const downSyn: MouseLikeEvent = { ...this.touchToMouseLike(touch, pos.target), clientX: pos.clientX, clientY: pos.clientY };
        this.onMouseDown(downSyn);
        this.onMouseMove(moveSyn);
        this.touchGestureStarted = true;
      } else {
        this.onMouseMove(moveSyn);
      }

      e.preventDefault();
    }
  },

  onTouchEnd(e: TouchEvent) {
    if (!this.viewport) return;
    if (e.touches.length < 2 && this.pinchStartDistance > 0) {
      this.pinchStartDistance = 0;
      this.pinchStartScale = 1;
    }
    const ended = Array.from(e.changedTouches).find(t => t.identifier === this.activeTouchId);
    if (ended !== undefined) {
      if (this.longPressActivated && !this.touchMovedAfterLongPress) {
        this.clearDragState();
        const pos = this.touchStartPos!;
        const syn: MouseLikeEvent = { clientX: pos.clientX, clientY: pos.clientY, target: pos.target, preventDefault: () => {} };
        this.onContextMenu(syn);
      } else if (this.touchGestureStarted) {
        this.onMouseUp(this.touchToMouseLike(ended));
      }
    }
    this.activeTouchId = null;
    this.touchStartPos = null;
    this.longPressActivated = false;
    this.touchMovedAfterLongPress = false;
    this.touchGestureStarted = false;
  },

  onTouchCancel(e: TouchEvent) {
    this.onTouchEnd(e);
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

    this.viewport!.addEventListener('touchstart', (ev: TouchEvent) => this.onTouchStart(ev));
    this.viewport!.addEventListener('touchmove', (ev: TouchEvent) => this.onTouchMove(ev), { passive: false });
    this.viewport!.addEventListener('touchend', (ev: TouchEvent) => this.onTouchEnd(ev));
    this.viewport!.addEventListener('touchcancel', (ev: TouchEvent) => this.onTouchCancel(ev));
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
    this.dirty = true;
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

  serializeState(): SavedReadingState {
    return {
      viewport: { scale: this.scale, offsetX: this.offsetX, offsetY: this.offsetY },
      cards: this.draggableCards.map(c => ({
        id: c.id,
        cardNum: c.card.num,
        x: c.x,
        y: c.y,
        rotation: c.rotation,
        zIndex: c.zIndex,
        opacity: c.opacity,
      })),
      textLabels: this.textLabels.map(l => ({
        id: l.id,
        text: l.text,
        x: l.x,
        y: l.y,
        fontSize: l.fontSize,
        fontWeight: l.fontWeight,
        fontStyle: l.fontStyle,
        textDecoration: l.textDecoration,
        color: l.color,
        zIndex: l.zIndex,
        anchorCardId: l.anchorCardId,
        anchorPosition: l.anchorPosition,
      })),
    };
  },

  deserializeState(state: SavedReadingState): void {
    const cardByNum = new Map(this.cards.map(c => [c.num, c]));
    this.draggableCards = state.cards.map(c => ({
      card: cardByNum.get(c.cardNum) ?? this.cards[0],
      id: c.id,
      x: c.x,
      y: c.y,
      rotation: c.rotation,
      zIndex: c.zIndex,
      opacity: c.opacity,
      cursor: 'grab',
      display: 'block',
    }));
    this.textLabels = state.textLabels.map(l => ({
      id: l.id,
      text: l.text,
      x: l.x,
      y: l.y,
      fontSize: l.fontSize,
      fontWeight: l.fontWeight,
      fontStyle: l.fontStyle,
      textDecoration: l.textDecoration,
      color: l.color,
      zIndex: l.zIndex,
      cursor: 'grab',
      display: 'block',
      anchorCardId: l.anchorCardId,
      anchorPosition: l.anchorPosition,
    }));
    if (state.viewport) {
      this.scale = state.viewport.scale;
      this.offsetX = state.viewport.offsetX;
      this.offsetY = state.viewport.offsetY;
    }
    this.maxZIndex = Math.max(0, ...this.draggableCards.map(c => c.zIndex));
    this.maxTextZIndex = Math.max(0, ...this.textLabels.map(l => l.zIndex));
    this.selectedCardIds = [];
    this.editingTextId = null;
    this.dirty = false;
  },

  async createNewReading(): Promise<void> {
    const confirmed = await new Promise<boolean>(resolve => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: 'Create a new reading?',
        confirmLabel: 'Yes',
        cancelLabel: 'Cancel',
        cancelLabelVisible: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    if (this.loadedReadingId) {
      const confirmSave = await new Promise<boolean>(resolve => {
        Alpine.store('dialog', {
          open: true,
          type: 'confirm',
          title: 'Save current reading?',
          confirmLabel: 'Yes',
          cancelLabel: 'No',
          cancelLabelVisible: true,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (confirmSave) {
        const result = await this.saveCurrentReading();
        if (!result.ok) {
          Alpine.store('dialog', { open: true, type: 'confirm', title: result.error ?? 'Failed to save', onConfirm: () => {}, onCancel: () => {} });
          return;
        }
      }
    } else if (this.dirty) {
      Alpine.store('dialog', {
        open: true,
        type: 'inputText',
        title: 'Save current reading before creating a new one?',
        inputPlaceholder: 'Enter a title...',
        cancelLabelVisible: true,
        confirmLabel: 'Save',
        cancelLabel: 'Don\'t Save',
        inputDefault: '',
        onSubmitText: (title: string) => {
          this.saveCurrentReading(title).then(async result => {
            if (!result.ok) {
              Alpine.store('dialog', 
                { open: true, type: 'confirm', title: result.error ?? 'Failed to save', cancelLabelVisible: false, onConfirm: () => {}, onCancel: () => {} });
              return;
            }
          });
        },
        onCancel: () => {},
      });
    }

    this.shuffleDeck();
    this.clearCanvas();
    this.loadedReadingId = null;
    this.dirty = false;
  },

  async saveCurrentReading(name?: string): Promise<{ ok: boolean; error?: string }> {
    if (this.loadedReadingId) {
      const result = await readingsLib.saveReading(this.serializeState(), undefined, this.loadedReadingId);
      if ('error' in result) return { ok: false, error: result.error };
      this.dirty = false;
      return { ok: true };
    }
    const limit = await readingsLib.getSavedStateLimit();
    const count = await readingsLib.getReadingsCount();
    if (count >= limit) {
      return { ok: false, error: `You've reached the limit of ${limit} saved readings` };
    }
    const result = await readingsLib.saveReading(this.serializeState(), name ?? 'Untitled Reading');
    if ('error' in result) return { ok: false, error: result.error };
    this.loadedReadingId = result.id;
    this.dirty = false;
    return { ok: true };
  },

  async loadReadingById(id: string): Promise<void> {
    const data = await readingsLib.loadReading(id);
    if (!data) return;
    this.deserializeState(data.state);
    this.loadedReadingId = id;
  },

  async openLoadModal(): Promise<void> {
    this.loadModalOpen = true;
    this.loadModalConfirmingForId = null;
    this.savedReadings = await readingsLib.listReadings();
  },

  closeLoadModal(): void {
    this.loadModalOpen = false;
    this.loadModalConfirmingForId = null;
  },

  async onSelectReadingToLoad(id: string): Promise<void> {
    if (this.dirty) {
      this.loadModalConfirmingForId = id;
      return;
    }
    await this.loadReadingById(id);
    this.closeLoadModal();
  },

  async saveAndLoad(id: string): Promise<void> {
    if (this.loadedReadingId) {
      const result = await this.saveCurrentReading();
      if (!result.ok) {
        Alpine.store('dialog', { open: true, type: 'confirm', title: result.error ?? 'Failed to save', onConfirm: () => {}, onCancel: () => {} });
        return;
      }
      await this.loadReadingById(id);
      this.closeLoadModal();
      return;
    }
    this.saveAndLoadTargetId = id;
    this.triggerTitleDialog();
  },
  
  handleSaveClick(): void {
    if (this.loadedReadingId) {
      this.saveCurrentReading().then(result => {
        result.ok 
        ? Alpine.store('dialog', { open: true, type: 'confirm', title: 'Reading Saved Successfully', confirmLabel: 'Ok', cancelLabelVisible: false, onConfirm: () => {} })
        : Alpine.store('dialog', { open: true, type: 'confirm', title: result.error ?? 'Failed to save', confirmLabel: 'Ok', cancelLabelVisible: false, onConfirm: () => {} });
      });

      return;
    }

    this.triggerTitleDialog();
  },

  triggerTitleDialog(): void {
    Alpine.store('dialog', {
      open: true,
      type: 'inputText',
      title: 'Name your reading',
      inputPlaceholder: 'Enter a title...',
      confirmLabel: 'Save',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      inputDefault: '',
      onSubmitText: (title: string) => {
        this.saveCurrentReading(title).then(async result => {
          const targetId = this.saveAndLoadTargetId;
          this.saveAndLoadTargetId = null;
          if (!result.ok) {
            Alpine.store('dialog', 
              { open: true, type: 'confirm', title: result.error ?? 'Failed to save', cancelLabelVisible: false, onConfirm: () => {}, onCancel: () => {} });
            return;
          }
          if (targetId) {
            await this.loadReadingById(targetId);
            this.closeLoadModal();
          }
        });
      },
      onCancel: () => {
        this.saveAndLoadTargetId = null;
      },
    });
  },

  async discardAndLoad(id: string): Promise<void> {
    await this.loadReadingById(id);
    this.closeLoadModal();
  },

  cancelLoadConfirm(): void {
    this.loadModalConfirmingForId = null;
  },

  async deleteReading(id: string): Promise<void> {
    const confirmed = await new Promise<boolean>(resolve => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: 'Delete this saved reading?',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;
    await readingsLib.deleteReading(id);
    this.savedReadings = this.savedReadings.filter(r => r.id !== id);
    if (this.loadedReadingId === id) {
      this.loadedReadingId = null;
    }
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
    this.dirty = true;
  },

  generateCardId(): string {
    return `card-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  },

  generateTextId(): string {
    return `text-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  },

  addTextAt(screenX: number, screenY: number): void {
    const { x, y } = this.screenToContent(screenX, screenY);
    const label: TextLabel = {
      id: this.generateTextId(),
      text: 'Double Click To Edit',
      x,
      y,
      fontSize: 16,
      fontWeight: 400,
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#e5e7eb',
      zIndex: this.maxTextZIndex + 1,
      cursor: 'grab',
      display: 'block',
      anchorCardId: null,
      anchorPosition: null,
    };
    this.textLabels = [...this.textLabels, label];
    this.maxTextZIndex += 1;
    this.dirty = true;
  },

  getTextLabelPosition(label: TextLabel): { x: number; y: number } {
    if (!label.anchorCardId || !label.anchorPosition) return { x: label.x, y: label.y };
    const card = this.draggableCards.find(c => c.id === label.anchorCardId);
    if (!card) return { x: label.x, y: label.y };
    const gap = this.TEXT_ANCHOR_GAP;
    const w = this.CARD_WIDTH;
    const h = this.CARD_HEIGHT;
    const labelH = this.TEXT_LABEL_DEFAULT_HEIGHT;
    switch (label.anchorPosition) {
      case 'above':
        return { x: card.x, y: card.y - gap - labelH };
      case 'below':
        return { x: card.x, y: card.y + h + gap + labelH};
      case 'left':
        return { x: card.x - gap, y: card.y };
      case 'right':
        return { x: card.x + w + gap, y: card.y };
      default:
        return { x: label.x, y: label.y };
    }
  },

  getTextLabelStyle(label: TextLabel): string {
    const pos = this.getTextLabelPosition(label);
    const vertical = label.anchorPosition === 'left' || label.anchorPosition === 'right';
    const base = `left: ${pos.x}px; top: ${pos.y}px; z-index: ${label.zIndex}; cursor: ${label.cursor}; display: ${label.display}; font-size: ${label.fontSize}px; font-weight: ${label.fontWeight}; font-style: ${label.fontStyle}; text-decoration: ${label.textDecoration}; color: ${label.color};`;
    if (vertical && this.editingTextId !== label.id) {
      const transform = label.anchorPosition === 'left' ? ' transform: translateY(110%) rotate(180deg);' : '';
      return base + `writing-mode: vertical-lr; min-height: ${this.CARD_HEIGHT}px;${transform}`;
    }
    return base;
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

  onMouseWheelClick(event: MouseLikeEvent) {
    if (event.target !== this.viewport 
        && event.target !== this.content 
        && event.target !== this.emptyCanvasMessage) 
    { return; }

    this.contextMenu = {
      open: true,
      x: event.clientX,
      y: event.clientY,
      cardId: null,
      textId: null,
    };
  },

  drawCardAt(x: number, y: number) {
    // Convert the given screen coordinates (x, y) to the content (canvas) coordinates
    const { x: contentX, y: contentY } = this.screenToContent(x, y);
    this.addCardToCanvas((Alpine.store('shuffledCards') as TarotCard[])[this.cryptoRandomInt((Alpine.store('shuffledCards') as TarotCard[]).length)]);
    // Place top-left corner of card at mouse pointer position in canvas coordinates
    this.updateItem(this.draggableCards[this.draggableCards.length - 1].id, { x: contentX, y: contentY });
  },

  onMouseDown(event: MouseLikeEvent) {
    if (event.button === 1) {
      this.onMouseWheelClick(event);
      return;
    }

    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    const textEl = target.closest('[data-text-id]') as HTMLElement | null;
    const textId = textEl ? textEl.getAttribute('data-text-id') : null;
    if (textId && this.textLabels.some(l => l.id === textId)) {
      this.draggingTextId = textId;
      const label = this.textLabels.find(l => l.id === textId)!;
      const pos = this.getTextLabelPosition(label);
      const rect = this.dragContainer!.getBoundingClientRect();
      this.textDragStart = {
        startX: pos.x,
        startY: pos.y,
        startDropX: event.clientX - rect.left - this.dragContainer!.clientLeft,
        startDropY: event.clientY - rect.top - this.dragContainer!.clientTop,
      };
      this.maxTextZIndex += 1;
      this.updateTextLabel(textId, { zIndex: this.maxTextZIndex, cursor: 'grabbing' });
      return;
    }

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

  onMouseMove(e: MouseLikeEvent) {
    if (this.selectionBox) {
      const { x, y } = this.screenToContent(e.clientX, e.clientY);
      this.selectionBox = { ...this.selectionBox!, currentX: x, currentY: y };
      this.updateSelectionBoxStyle();
      return;
    }

    if (this.draggingTextId && this.textDragStart) {
      const rect = this.dragContainer!.getBoundingClientRect();
      const dropX = e.clientX - rect.left - this.dragContainer!.clientLeft;
      const dropY = e.clientY - rect.top - this.dragContainer!.clientTop;
      const newX = this.textDragStart.startX + (dropX - this.textDragStart.startDropX) / this.scale;
      const newY = this.textDragStart.startY + (dropY - this.textDragStart.startDropY) / this.scale;
      this.updateTextLabel(this.draggingTextId, { x: newX, y: newY });
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

  onMouseUp(event: MouseLikeEvent) {
    if (event.preventDefault) event.preventDefault();

    if (this.isPanning) this.dirty = true;
    this.isPanning = false;
    if (this.viewport) this.viewport.style.cursor = "grab";

    if (this.selectionBox) {
      const { startX, startY, currentX, currentY } = this.selectionBox;
      const left = Math.min(startX, currentX);
      const top = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);
      const selectionRect = { left, top, width, height };

      const cardWidth = this.CARD_WIDTH;
      const cardHeight = this.CARD_HEIGHT;
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

    if (this.draggingTextId && this.textDragStart) {
      const textId = this.draggingTextId;
      this.updateTextLabel(textId, { display: 'block', cursor: 'grab' });
      this.draggingTextId = null;
      this.textDragStart = null;

      const label = this.textLabels.find(l => l.id === textId);
      if (label && !label.anchorCardId) {
        const pos = this.getTextLabelPosition(label);
        const textBox = { left: pos.x, top: pos.y, width: 100, height: 30 };
        for (const card of this.draggableCards) {
          const cardRect = { left: card.x, top: card.y, width: this.CARD_WIDTH, height: this.CARD_HEIGHT };
          if (this.boxesOverlap(textBox, cardRect)) {
            this.pendingAnchor = { textId, cardId: card.id, screenX: event.clientX, screenY: event.clientY };
            break;
          }
        }
      }
      return;
    }

    if (!this.draggingCard || !this.dragStart) return;

    const rect = this.dragContainer!.getBoundingClientRect();
    const dropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
    const dropY = event.clientY - rect.top - this.dragContainer!.clientTop;
    const newAnchorX = this.dragStart.startCardX + (dropX - this.dragStart.startDropX) / this.scale;
    const newAnchorY = this.dragStart.startCardY + (dropY - this.dragStart.startDropY) / this.scale;

    const movedCardIds = this.groupDragOffsets ? this.selectedCardIds : (this.draggingCard ? [this.draggingCard.id] : []);

    if (this.groupDragOffsets) {
      for (const id of Object.keys(this.groupDragOffsets)) {
        const { dx, dy } = this.groupDragOffsets[id];
        this.updateItem(id, { x: newAnchorX + dx, y: newAnchorY + dy, display: 'block', cursor: 'grab' });
      }
      this.groupDragOffsets = null;
    } else {
      this.updateItem(this.draggingCard.id, { x: newAnchorX, y: newAnchorY, display: 'block', cursor: 'grab' });
    }

    for (const tl of this.textLabels) {
      if (tl.anchorCardId && movedCardIds.includes(tl.anchorCardId)) {
        const pos = this.getTextLabelPosition(tl);
        this.updateTextLabel(tl.id, { x: pos.x, y: pos.y });
      }
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
    this.textLabels = [];
    this.maxTextZIndex = 0;
    this.draggingTextId = null;
    this.textDragStart = null;
    this.editingTextId = null;
    this.pendingAnchor = null;
    this.dirty = true;
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
    this.dirty = true;
  },

  updateTextLabel(id: string, newProps: Partial<TextLabel>) {
    const index = this.textLabels.findIndex(l => l.id === id);
    if (index === -1) return;
    this.textLabels[index] = { ...this.textLabels[index], ...newProps };
    this.dirty = true;
  },

  deleteTextLabel(id: string) {
    this.textLabels = this.textLabels.filter(l => l.id !== id);
    this.dirty = true;
  },

  setTextLabelAnchor(textId: string, cardId: string, position: TextLabelAnchorPosition) {
    this.updateTextLabel(textId, { anchorCardId: cardId, anchorPosition: position });
    const label = this.textLabels.find(l => l.id === textId)!;
    const pos = this.getTextLabelPosition(label);
    this.updateTextLabel(textId, { x: pos.x, y: pos.y });
  },

  clearDragState() {
    this.isPanning = false;
    this.draggingCard = null;
    this.dragStart = null;
    this.draggingTextId = null;
    this.textDragStart = null;
    this.selectionBox = null;
    this.selectionBoxStyle = '';
    this.groupDragOffsets = null;
    if (this.viewport) this.viewport.style.cursor = 'grab';
  },

  cancelPendingAnchor() {
    this.pendingAnchor = null;
  },

  commitEditTextLabel() {
    this.editingTextId = null;
  },

  deleteCard(cardId: string) {
    this.draggableCards = this.draggableCards.filter(c => c.id !== cardId);
    const textLabels = this.textLabels.filter(l => l.anchorCardId === cardId);
    for (const textLabel of textLabels) {
      this.updateTextLabel(textLabel.id, { anchorCardId: null, anchorPosition: null });
    }
    this.dirty = true;
  },

  deleteSelectedCards() {
    this.draggableCards = this.draggableCards.filter(c => !this.selectedCardIds.includes(c.id));
    const textLabels = this.textLabels.filter(l => l.anchorCardId !== null && this.selectedCardIds.includes(l.anchorCardId));
    for (const textLabel of textLabels) {
      this.updateTextLabel(textLabel.id, { anchorCardId: null, anchorPosition: null });
    }
    this.selectedCardIds = [];
    this.dirty = true;
  },

  rotateCard(cardId: string, direction: 'clockwise' | 'counter-clockwise' | '180') {
    const card = this.draggableCards.find(c => c.id === cardId);
    if (!card) return;
    const delta = direction === 'clockwise' ? 90 : direction === 'counter-clockwise' ? -90 : 180;
    this.updateItem(cardId, { rotation: card.rotation + delta });
  },

  onContextMenu(event: MouseLikeEvent) {
    const target = event.target as HTMLElement;
    const textEl = target.closest('[data-text-id]') as HTMLElement | null;
    const textId = textEl ? textEl.getAttribute('data-text-id') : null;
    if (textId && this.textLabels.some(l => l.id === textId)) {
      if (event.preventDefault) event.preventDefault();
      this.contextMenu = {
        open: true,
        x: event.clientX,
        y: event.clientY,
        cardId: null,
        textId,
      };
      return;
    }
    const cardId = target.id;
    if (cardId && this.draggableCards.some(c => c.id === cardId)) {
      if (event.preventDefault) event.preventDefault();
      this.contextMenu = {
        open: true,
        x: event.clientX,
        y: event.clientY,
        cardId,
        textId: null,
      };
      return;
    }
    const isOnCanvas = target === this.viewport || target === this.content || target === this.emptyCanvasMessage;
    if (isOnCanvas) {
      if (event.preventDefault) event.preventDefault();
      this.contextMenu = {
        open: true,
        x: event.clientX,
        y: event.clientY,
        cardId: null,
        textId: null,
      };
    }
  },

  closeContextMenu() {
    this.contextMenu.open = false;
    this.contextMenu.cardId = null;
    this.contextMenu.textId = null;
  },

  clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  },
}))
