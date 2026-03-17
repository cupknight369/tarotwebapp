import { MouseLikeEvent, MergedThis } from '../types/canvas.js'
import Alpine from 'alpinejs'
import * as readingsLib from '../lib/readings.js'

Alpine.data('canvasComponent', () => ({
  loadedReadingId: null as string | null,
  dirty: false,
  loadModalOpen: false,
  loadModalConfirmingForId: null as string | null,
  savedReadings: [] as { id: string; name: string; updated_at: string }[],
  saveAndLoadTargetId: null as string | null,
  dragContainer: null as HTMLElement | null,

  selectionBox: null as { startX: number; startY: number; currentX: number; currentY: number } | null,
  selectionBoxStyle: '' as string,

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

  TEXT_ANCHOR_GAP: 10,
  TEXT_LABEL_DEFAULT_HEIGHT: 24,

  screenToContent(this: MergedThis, screenX: number, screenY: number): { x: number; y: number } {
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

  onTouchStart(this: MergedThis, e: TouchEvent) {
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

  onTouchMove(this: MergedThis, e: TouchEvent) {
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

  onTouchEnd(this: MergedThis, e: TouchEvent) {
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

  onTouchCancel(this: MergedThis, e: TouchEvent) {
    this.onTouchEnd(e);
  },

  centerViewport(this: MergedThis, ) {
    if (!this.viewport || !this.content) return;
    const viewportRect = this.viewport.getBoundingClientRect();
    const contentW = this.content.offsetWidth;
    const contentH = this.content.offsetHeight;
    this.offsetX = viewportRect.width / 2 - contentW / 2;
    this.offsetY = viewportRect.height / 2 - contentH / 2;
  },

  init(this: MergedThis) {
    Alpine.store('shuffledCards', this.cards);
    this.shuffleDeck();

    (window as any).draggableZoneComponent = this;
    this.dragContainer = document.querySelector('#draggable-container') as HTMLElement;
    this.viewport = this.$refs.viewport as HTMLDivElement;
    this.content = this.$refs.content as HTMLDivElement;
    this.emptyCanvasMessage = this.$refs.emptyCanvasMessage as HTMLDivElement;

    this.$nextTick(() => {
      requestAnimationFrame(() => {
        this.centerViewport();
      });
    });

    this.viewport!.addEventListener('touchstart', (ev: TouchEvent) => this.onTouchStart(ev));
    this.viewport!.addEventListener('touchmove', (ev: TouchEvent) => this.onTouchMove(ev), { passive: false });
    this.viewport!.addEventListener('touchend', (ev: TouchEvent) => this.onTouchEnd(ev));
    this.viewport!.addEventListener('touchcancel', (ev: TouchEvent) => this.onTouchCancel(ev));
  },

  serializeState(this: MergedThis): SavedReadingState {
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

  deserializeState(this: MergedThis, state: SavedReadingState): void {
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

  async createNewReading(this: MergedThis): Promise<void> {
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

  async saveCurrentReading(this: MergedThis, name?: string): Promise<{ ok: boolean; error?: string }> {
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

  async loadReadingById(this: MergedThis, id: string): Promise<void> {
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

  async onSelectReadingToLoad(this: MergedThis, id: string): Promise<void> {
    if (this.dirty) {
      this.loadModalConfirmingForId = id;
      return;
    }
    await this.loadReadingById(id);
    this.closeLoadModal();
  },

  async saveAndLoad(this: MergedThis, id: string): Promise<void> {
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
  
  handleSaveClick(this: MergedThis): void {
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

  triggerTitleDialog(this: MergedThis): void {
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

  async discardAndLoad(this: MergedThis, id: string): Promise<void> {
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

  generateTextId(): string {
    return `text-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  },

  addTextAt(this: MergedThis, screenX: number, screenY: number): void {
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

  getTextLabelPosition(this: MergedThis, label: TextLabel): { x: number; y: number } {
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

  getTextLabelStyle(this: MergedThis, label: TextLabel): string {
    const pos = this.getTextLabelPosition(label);
    const vertical = label.anchorPosition === 'left' || label.anchorPosition === 'right';
    const base = `left: ${pos.x}px; top: ${pos.y}px; z-index: ${label.zIndex}; cursor: ${label.cursor}; display: ${label.display}; font-size: ${label.fontSize}px; font-weight: ${label.fontWeight}; font-style: ${label.fontStyle}; text-decoration: ${label.textDecoration}; color: ${label.color};`;
    if (vertical && this.editingTextId !== label.id) {
      const transform = label.anchorPosition === 'left' ? ' transform: translateY(110%) rotate(180deg);' : '';
      return base + `writing-mode: vertical-lr; min-height: ${this.CARD_HEIGHT}px;${transform}`;
    }
    return base;
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

  onMouseDown(this: MergedThis, event: MouseLikeEvent) {
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

  onMouseMove(this: MergedThis, e: MouseLikeEvent) {
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

  onMouseUp(this: MergedThis, event: MouseLikeEvent) {
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

  clearCanvas(this: MergedThis) {
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

    this.centerViewport();
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

  setTextLabelAnchor(this: MergedThis, textId: string, cardId: string, position: TextLabelAnchorPosition) {
    this.updateTextLabel(textId, { anchorCardId: cardId, anchorPosition: position });
    const label = this.textLabels.find(l => l.id === textId)!;
    const pos = this.getTextLabelPosition(label);
    this.updateTextLabel(textId, { x: pos.x, y: pos.y });
  },

  clearDragState(this: MergedThis) {
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

  onContextMenu(this: MergedThis, event: MouseLikeEvent) {
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
}));
