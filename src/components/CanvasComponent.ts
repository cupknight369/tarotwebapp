import {
  DraggableCard,
  MouseLikeEvent,
  MergedThis,
  TarotCard,
  TextLabel,
} from '../types/canvas.js';
import Alpine from 'alpinejs';
import type { SettingsStoreState } from '../types/settings.js';
import {
  CANVAS_ZOOM_SENSITIVITY_DEFAULT,
  applyCanvasZoomSensitivityToPinchFactor,
  clampCanvasZoomSensitivity,
} from '../validation/canvasZoom.js';
import { revokeTarotCardBlobUrls } from '../lib/cardBlobUrls.js';
import { aggregateCardTitleCounts, type CardCanvasCountEntry } from '../lib/cardCanvasCounts.js';
import {
  aggregateCorrespondenceCounts,
  correspondenceMetaEqual,
  resolveCorrespondenceCountEntries,
  resolveCorrespondenceDisplays,
  shouldShowCorrespondenceOnCanvas,
  type CorrespondenceCanvasCountEntry,
} from '../lib/correspondenceCanvasCounts.js';
import { getCardsByIds } from '../lib/decks.js';
import { searchDeckCardsByTitle } from '../lib/searchDeckCardsByTitle.js';
import { openSettingsExportConfirm } from '../lib/openSettingsExportConfirm.js';
import {
  dismissStorageWarningForSession,
  isRemainingStorageBelowFraction,
  isStorageWarningDismissedThisSession,
} from '../lib/storageWarning.js';
import { clampFixedWidthPx } from '../validation/canvasLabel.js';
import {
  isCanvasInteractiveTarget,
  isWithinContextMenu,
  isWithinTextEditPanel,
} from '../lib/canvasInteractiveTarget.js';
import {
  getContextMenuTapKey,
  isCanvasDoubleTap,
  type CanvasTapRecord,
} from '../lib/canvasDoubleTap.js';
import {
  lockPointerInteraction,
  resetPointerInteractionLock,
  unlockPointerInteraction,
} from '../lib/pointerInteractionLock.js';

Alpine.data('canvasComponent', () => ({
  dragContainer: null as HTMLElement | null,

  selectionBox: null as {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null,
  selectionBoxStyle: '' as string,

  isPanning: false,
  panStartX: 0,
  panStartY: 0,

  viewport: null as HTMLDivElement | null,
  content: null as HTMLDivElement | null,
  emptyCanvasMessage: null as HTMLDivElement | null,
  lastPointerScreenX: null as number | null,
  lastPointerScreenY: null as number | null,

  contextMenu: {
    open: false,
    x: 0,
    y: 0,
    contentX: 0,
    contentY: 0,
    cardId: null as string | null,
    textId: null as string | null,
  },

  drawByName: null as null | {
    screenX: number;
    screenY: number;
    query: string;
    highlightIndex: number;
  },

  drawByNameMatches(this: MergedThis): TarotCard[] {
    if (!this.drawByName) {
      return [];
    }
    return searchDeckCardsByTitle(
      Alpine.store('shuffledCards') as TarotCard[],
      this.drawByName.query,
    );
  },

  /** Low browser storage (IndexedDB / quota) warning banner on the canvas. */
  storageWarningVisible: false,
  storageAdditionalInfoOpen: false,
  _storageWarningStartupListener: null as (() => void) | null,
  _contextMenuTouchDismissListener: null as ((ev: TouchEvent) => void) | null,

  correspondenceCountBarCollapsed: false,
  correspondenceBarEntries: [] as CorrespondenceCanvasCountEntry[],
  _correspondenceBarRefreshGen: 0,
  _correspondenceDisplaysHydrateGen: 0,

  cardCountBarCollapsed: false,
  cardCountBarEntries: [] as CardCanvasCountEntry[],

  /**
   * Syncs correspondence ids/displays on canvas cards from the active deck (IndexedDB).
   * Canvas snapshots may omit displays until hydrated.
   */
  showCorrespondenceOnCanvas(this: MergedThis): boolean {
    return shouldShowCorrespondenceOnCanvas(Alpine.store('settings') as SettingsStoreState);
  },

  showCorrespondenceThumbnailsOnCanvas(this: MergedThis): boolean {
    return (Alpine.store('settings') as SettingsStoreState).showCorrespondenceThumbnailsOnCanvas;
  },

  async hydrateCanvasCardCorrespondenceDisplays(this: MergedThis): Promise<void> {
    const settings = Alpine.store('settings') as SettingsStoreState;
    if (!shouldShowCorrespondenceOnCanvas(settings)) return;

    const cardIds = [...new Set(this.draggableCards.map((dc) => dc.card.id).filter(Boolean))];
    if (cardIds.length === 0) return;

    const gen = ++this._correspondenceDisplaysHydrateGen;
    const mapRes = await getCardsByIds(cardIds);
    if (!mapRes.ok || gen !== this._correspondenceDisplaysHydrateGen) return;

    let changed = false;
    const nextCards: DraggableCard[] = [];
    for (const dc of this.draggableCards) {
      const fresh = mapRes.value.get(dc.card.id);
      if (!fresh) {
        nextCards.push(dc);
        continue;
      }
      const ids = fresh.correspondence_ids ?? [];
      let displays = fresh.correspondenceDisplays ?? [];
      if (ids.length > 0 && displays.length === 0) {
        displays = await resolveCorrespondenceDisplays(ids);
      }
      const merged: TarotCard = {
        ...dc.card,
        correspondence_ids: ids,
        correspondenceDisplays: displays,
      };
      if (correspondenceMetaEqual(dc.card, merged)) {
        nextCards.push(dc);
      } else {
        changed = true;
        nextCards.push({ ...dc, card: merged });
      }
    }
    if (changed) {
      this.draggableCards = nextCards;
    }
  },

  async onCorrespondencesChanged(this: MergedThis): Promise<void> {
    await this.hydrateCanvasCardCorrespondenceDisplays();
    await this.refreshCorrespondenceCountBar();
  },

  async refreshCorrespondenceCountBar(this: MergedThis): Promise<void> {
    const settings = Alpine.store('settings') as SettingsStoreState;
    if (!settings.showCorrespondenceCountBarOnCanvas) {
      this.correspondenceBarEntries = [];
      return;
    }
    const gen = ++this._correspondenceBarRefreshGen;
    const counts = aggregateCorrespondenceCounts(this.draggableCards);
    if (counts.size === 0) {
      if (gen === this._correspondenceBarRefreshGen) {
        this.correspondenceBarEntries = [];
      }
      return;
    }
    const entries = await resolveCorrespondenceCountEntries(counts);
    if (gen === this._correspondenceBarRefreshGen) {
      this.correspondenceBarEntries = entries;
    }
  },

  refreshCardCountBar(this: MergedThis): void {
    const settings = Alpine.store('settings') as SettingsStoreState;
    if (!settings.showCardCountBarOnCanvas) {
      this.cardCountBarEntries = [];
      return;
    }
    this.cardCountBarEntries = aggregateCardTitleCounts(this.draggableCards);
  },

  activeTouchId: null as number | null,
  touchStartPos: null as { clientX: number; clientY: number; target: EventTarget | null } | null,
  touchGestureStarted: false,
  lastCanvasTap: null as CanvasTapRecord | null,
  pinchStartDistance: 0,
  pinchStartScale: 1,

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
    box2: { left: number; top: number; width: number; height: number },
  ): boolean {
    return !(
      box1.left + box1.width < box2.left ||
      box2.left + box2.width < box1.left ||
      box1.top + box1.height < box2.top ||
      box2.top + box2.height < box1.top
    );
  },

  buildGroupDragOffsets(
    this: MergedThis,
    anchorX: number,
    anchorY: number,
  ): Record<string, { dx: number; dy: number }> {
    const offsets: Record<string, { dx: number; dy: number }> = {};
    for (const id of this.selectedCardIds) {
      const card = this.draggableCards.find((c) => c.id === id);
      if (card) offsets[id] = { dx: card.x - anchorX, dy: card.y - anchorY };
    }
    for (const id of this.selectedTextIds) {
      const label = this.textLabels.find((l) => l.id === id);
      if (!label) continue;
      if (label.anchorCardId && this.selectedCardIds.includes(label.anchorCardId)) continue;
      const pos = this.getTextLabelPosition(label);
      offsets[id] = { dx: pos.x - anchorX, dy: pos.y - anchorY };
    }
    return offsets;
  },

  applyGroupDragAt(this: MergedThis, newAnchorX: number, newAnchorY: number): void {
    if (!this.groupDragOffsets) return;
    for (const id of Object.keys(this.groupDragOffsets)) {
      const { dx, dy } = this.groupDragOffsets[id];
      const x = newAnchorX + dx;
      const y = newAnchorY + dy;
      if (this.draggableCards.some((c) => c.id === id)) {
        this.updateItem(id, { x, y });
        continue;
      }
      const label = this.textLabels.find((l) => l.id === id);
      if (!label) continue;
      const props: Partial<TextLabel> = { x, y };
      if (label.anchorCardId) {
        props.anchorCardId = null;
        props.anchorPosition = null;
      }
      this.updateTextLabel(id, props);
    }
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
      this.activeTouchId = null;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      this.pinchStartDistance = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      this.pinchStartScale = this.scale;

      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const target = document.elementFromPoint(touch.clientX, touch.clientY);
      if (isCanvasInteractiveTarget(target)) {
        return;
      }

      e.preventDefault();

      this.lastPointerScreenX = touch.clientX;
      this.lastPointerScreenY = touch.clientY;
      this.activeTouchId = touch.identifier;
      this.touchStartPos = { clientX: touch.clientX, clientY: touch.clientY, target };
      this.touchGestureStarted = false;
    }
  },

  onTouchMove(this: MergedThis, e: TouchEvent) {
    if (!this.viewport) return;

    if (e.touches.length === 2) {
      if (this.pinchStartDistance <= 0) return;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      this.lastPointerScreenX = (t1.clientX + t2.clientX) / 2;
      this.lastPointerScreenY = (t1.clientY + t2.clientY) / 2;
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const centerX = (t1.clientX + t2.clientX) / 2;
      const centerY = (t1.clientY + t2.clientY) / 2;
      const rawFactor = dist / this.pinchStartDistance;
      const settings = Alpine.store('settings') as Partial<SettingsStoreState> | undefined;
      const zoomSensitivity = clampCanvasZoomSensitivity(
        settings?.canvasZoomSensitivity ?? CANVAS_ZOOM_SENSITIVITY_DEFAULT,
      );
      const factor = applyCanvasZoomSensitivityToPinchFactor(rawFactor, zoomSensitivity);
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
      if (isCanvasInteractiveTarget(this.touchStartPos.target)) return;
      this.lastPointerScreenX = touch.clientX;
      this.lastPointerScreenY = touch.clientY;

      const pos = this.touchStartPos;
      const moveSyn = this.touchToMouseLike(touch);

      if (!this.touchGestureStarted) {
        const downSyn: MouseLikeEvent = {
          ...this.touchToMouseLike(touch, pos.target),
          clientX: pos.clientX,
          clientY: pos.clientY,
        };
        this.onMouseDown(downSyn);
        this.onMouseMove(moveSyn);
        this.touchGestureStarted = true;
      } else {
        this.onMouseMove(moveSyn);
      }

      this.lastCanvasTap = null;
      e.preventDefault();
    }
  },

  onTouchEnd(this: MergedThis, e: TouchEvent) {
    if (!this.viewport) return;
    if (e.touches.length < 2 && this.pinchStartDistance > 0) {
      this.pinchStartDistance = 0;
      this.pinchStartScale = 1;
    }
    const ended = Array.from(e.changedTouches).find((t) => t.identifier === this.activeTouchId);
    if (ended !== undefined) {
      if (this.touchGestureStarted) {
        this.onMouseUp(this.touchToMouseLike(ended));
      } else if (this.touchStartPos) {
        const pos = this.touchStartPos;
        const skipQuickTap = isWithinContextMenu(pos.target) || this.contextMenu.open;
        if (
          !skipQuickTap &&
          this.editingTextId &&
          !isWithinTextEditPanel(pos.target) &&
          !isCanvasInteractiveTarget(pos.target)
        ) {
          this.commitEditTextLabel();
        }

        if (!skipQuickTap) {
          const tapKey = getContextMenuTapKey(pos.target, {
            textLabels: this.textLabels,
            draggableCards: this.draggableCards,
            viewport: this.viewport,
            content: this.content,
            emptyCanvasMessage: this.emptyCanvasMessage,
          });
          const now = Date.now();
          const openedContextMenu =
            tapKey &&
            !isCanvasInteractiveTarget(pos.target) &&
            isCanvasDoubleTap(this.lastCanvasTap, tapKey, pos.clientX, pos.clientY, now);

          if (openedContextMenu) {
            const syn: MouseLikeEvent = {
              clientX: pos.clientX,
              clientY: pos.clientY,
              target: pos.target,
              preventDefault: () => {},
            };
            this.onContextMenu(syn);
            this.lastCanvasTap = null;
          } else {
            if (tapKey && !this.editingTextId && !isCanvasInteractiveTarget(pos.target)) {
              this.lastCanvasTap = {
                tapKey,
                time: now,
                x: pos.clientX,
                y: pos.clientY,
              };
            } else {
              this.lastCanvasTap = null;
            }

            if (!isCanvasInteractiveTarget(pos.target)) {
              const syn: MouseLikeEvent = {
                clientX: pos.clientX,
                clientY: pos.clientY,
                target: pos.target,
                preventDefault: () => {},
              };
              this.onMouseDown(syn);
              this.onMouseUp(syn);
            }
          }
        }
      }
    }
    this.activeTouchId = null;
    this.touchStartPos = null;
    this.touchGestureStarted = false;
  },

  onTouchCancel(this: MergedThis, e: TouchEvent) {
    this.onTouchEnd(e);
  },

  centerViewport(this: MergedThis) {
    if (!this.viewport || !this.content) return;
    const viewportRect = this.viewport.getBoundingClientRect();
    const contentW = this.content.offsetWidth;
    const contentH = this.content.offsetHeight;
    this.offsetX = viewportRect.width / 2 - contentW / 2;
    this.offsetY = viewportRect.height / 2 - contentH / 2;
  },

  init(this: MergedThis) {
    this.shuffleDeck();

    window.draggableZoneComponent = this;
    this.dragContainer = document.querySelector('#draggable-container') as HTMLElement;
    this.viewport = this.$refs.viewport as HTMLDivElement;
    this.content = this.$refs.content as HTMLDivElement;
    this.emptyCanvasMessage = this.$refs.emptyCanvasMessage as HTMLDivElement;

    this.$nextTick(() => {
      requestAnimationFrame(() => {
        this.centerViewport();
      });
    });

    this.viewport.addEventListener('touchstart', (ev: TouchEvent) => this.onTouchStart(ev));
    this.viewport.addEventListener('touchmove', (ev: TouchEvent) => this.onTouchMove(ev), {
      passive: false,
    });
    this.viewport.addEventListener('touchend', (ev: TouchEvent) => this.onTouchEnd(ev));
    this.viewport.addEventListener('touchcancel', (ev: TouchEvent) => this.onTouchCancel(ev));

    this._contextMenuTouchDismissListener = (ev: TouchEvent) => {
      this.handleContextMenuTouchDismiss(ev);
    };
    document.addEventListener('touchstart', this._contextMenuTouchDismissListener, {
      capture: true,
    });

    this._storageWarningStartupListener = () => {
      void this.runStartupStorageWarningCheck();
    };
    window.addEventListener('cktarot-check-storage-warning', this._storageWarningStartupListener);
  },

  onMouseDown(this: MergedThis, event: MouseLikeEvent) {
    this.lastPointerScreenX = event.clientX;
    this.lastPointerScreenY = event.clientY;
    const target = event.target as HTMLElement;
    if (isCanvasInteractiveTarget(target)) {
      return;
    }

    const resizeHit = target.closest('[data-text-resize]');
    if (resizeHit) {
      const textEl = resizeHit.closest('[data-text-id]');
      const textId = textEl ? textEl.getAttribute('data-text-id') : null;
      const label = textId ? this.textLabels.find((l) => l.id === textId) : undefined;
      if (label?.fixedWidth) {
        const rect = this.dragContainer!.getBoundingClientRect();
        this.resizingTextId = textId;
        this.textResizeStart = {
          startWidthPx: clampFixedWidthPx(label.fixedWidthPx > 0 ? label.fixedWidthPx : 240),
          startDropX: event.clientX - rect.left - this.dragContainer!.clientLeft,
        };
        return;
      }
    }

    const textEl = target.closest('[data-text-id]');
    const textId = textEl ? textEl.getAttribute('data-text-id') : null;
    if (textId && this.textLabels.some((l) => l.id === textId)) {
      this.draggingTextId = textId;
      const label = this.textLabels.find((l) => l.id === textId)!;
      const pos = this.getTextLabelPosition(label);
      const rect = this.dragContainer!.getBoundingClientRect();
      const startDropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
      const startDropY = event.clientY - rect.top - this.dragContainer!.clientTop;
      this.textDragStart = {
        startX: pos.x,
        startY: pos.y,
        startDropX,
        startDropY,
      };

      if (this.selectedTextIds.includes(textId)) {
        this.groupDragOffsets = this.buildGroupDragOffsets(pos.x, pos.y);
      } else {
        this.selectedCardIds = [];
        this.selectedTextIds = [];
        this.groupDragOffsets = null;
      }

      this.maxTextZIndex += 1;
      this.updateTextLabel(textId, { zIndex: this.maxTextZIndex, cursor: 'grabbing' });
      return;
    }

    const cardId =
      target.id && this.draggableCards.some((c) => c.id === target.id) ? target.id : null;
    const isOnEmpty =
      target === this.viewport || target === this.content || target === this.emptyCanvasMessage;

    if (event.ctrlKey) {
      const { x, y } = this.screenToContent(event.clientX, event.clientY);
      this.selectionBox = { startX: x, startY: y, currentX: x, currentY: y };
      this.updateSelectionBoxStyle();
      return;
    }

    if (isOnEmpty) {
      this.selectedCardIds = [];
      this.selectedTextIds = [];
      event.preventDefault?.();
      lockPointerInteraction();
      this.isPanning = true;
      this.panStartX = event.clientX - this.offsetX;
      this.panStartY = event.clientY - this.offsetY;
      this.viewport!.style.cursor = 'grabbing';
      return;
    }

    if (!cardId) return;
    this.draggingCard = target;

    const card = this.draggableCards.find((c) => c.id === cardId)!;
    const rect = this.dragContainer!.getBoundingClientRect();
    const startDropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
    const startDropY = event.clientY - rect.top - this.dragContainer!.clientTop;

    if (this.selectedCardIds.includes(cardId)) {
      this.groupDragOffsets = this.buildGroupDragOffsets(card.x, card.y);
    } else {
      this.selectedCardIds = [];
      this.selectedTextIds = [];
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
    this.lastPointerScreenX = e.clientX;
    this.lastPointerScreenY = e.clientY;
    if (this.selectionBox) {
      const { x, y } = this.screenToContent(e.clientX, e.clientY);
      this.selectionBox = { ...this.selectionBox, currentX: x, currentY: y };
      this.updateSelectionBoxStyle();
      return;
    }

    if (this.resizingTextId && this.textResizeStart) {
      const rect = this.dragContainer!.getBoundingClientRect();
      const dropX = e.clientX - rect.left - this.dragContainer!.clientLeft;
      const delta = (dropX - this.textResizeStart.startDropX) / this.scale;
      const next = clampFixedWidthPx(this.textResizeStart.startWidthPx + delta);
      this.updateTextLabel(this.resizingTextId, { fixedWidthPx: next });
      return;
    }

    if (this.groupDragOffsets && (this.dragStart || this.textDragStart)) {
      const rect = this.dragContainer!.getBoundingClientRect();
      const dropX = e.clientX - rect.left - this.dragContainer!.clientLeft;
      const dropY = e.clientY - rect.top - this.dragContainer!.clientTop;
      let newAnchorX: number;
      let newAnchorY: number;
      if (this.dragStart) {
        newAnchorX = this.dragStart.startCardX + (dropX - this.dragStart.startDropX) / this.scale;
        newAnchorY = this.dragStart.startCardY + (dropY - this.dragStart.startDropY) / this.scale;
      } else {
        newAnchorX =
          this.textDragStart!.startX + (dropX - this.textDragStart!.startDropX) / this.scale;
        newAnchorY =
          this.textDragStart!.startY + (dropY - this.textDragStart!.startDropY) / this.scale;
      }
      this.applyGroupDragAt(newAnchorX, newAnchorY);
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

    this.updateItem(this.draggingCard.id, { x: newAnchorX, y: newAnchorY });
  },

  onMouseUp(this: MergedThis, event: MouseLikeEvent) {
    if (event.preventDefault) event.preventDefault();

    const wasPanning = this.isPanning;
    if (wasPanning) this.dirty = true;
    this.isPanning = false;
    if (wasPanning) unlockPointerInteraction();
    if (this.viewport) this.viewport.style.cursor = 'grab';

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
      const textIds: string[] = [];
      for (const label of this.textLabels) {
        if (this.boxesOverlap(selectionRect, this.getTextLabelBounds(label))) {
          textIds.push(label.id);
        }
      }
      this.selectedCardIds = ids;
      this.selectedTextIds = textIds;
      this.selectionBox = null;
      this.selectionBoxStyle = '';
      return;
    }

    if (this.resizingTextId) {
      this.resizingTextId = null;
      this.textResizeStart = null;
      return;
    }

    if (this.draggingTextId && this.textDragStart) {
      const textId = this.draggingTextId;
      const wasGroup = this.groupDragOffsets !== null;

      if (wasGroup) {
        const rect = this.dragContainer!.getBoundingClientRect();
        const dropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
        const dropY = event.clientY - rect.top - this.dragContainer!.clientTop;
        const newAnchorX =
          this.textDragStart.startX + (dropX - this.textDragStart.startDropX) / this.scale;
        const newAnchorY =
          this.textDragStart.startY + (dropY - this.textDragStart.startDropY) / this.scale;
        const movedCardIds: string[] = [];
        for (const id of Object.keys(this.groupDragOffsets!)) {
          const { dx, dy } = this.groupDragOffsets![id];
          const x = newAnchorX + dx;
          const y = newAnchorY + dy;
          if (this.draggableCards.some((c) => c.id === id)) {
            this.updateItem(id, { x, y, display: 'block', cursor: 'grab' });
            movedCardIds.push(id);
          } else {
            this.updateTextLabel(id, { x, y, display: 'block', cursor: 'grab' });
          }
        }
        for (const tl of this.textLabels) {
          if (tl.anchorCardId && movedCardIds.includes(tl.anchorCardId)) {
            const pos = this.getTextLabelPosition(tl);
            this.updateTextLabel(tl.id, { x: pos.x, y: pos.y });
          }
        }
        this.groupDragOffsets = null;
      } else {
        this.updateTextLabel(textId, { display: 'block', cursor: 'grab' });

        const label = this.textLabels.find((l) => l.id === textId);
        if (label && !label.anchorCardId) {
          const pos = this.getTextLabelPosition(label);
          const textBox = this.getTextLabelBounds(label);
          for (const card of this.draggableCards) {
            const cardRect = {
              left: card.x,
              top: card.y,
              width: this.CARD_WIDTH,
              height: this.CARD_HEIGHT,
            };
            if (this.boxesOverlap(textBox, cardRect)) {
              this.pendingAnchor = {
                textId,
                cardId: card.id,
                screenX: event.clientX,
                screenY: event.clientY,
              };
              break;
            }
          }
        }
      }

      this.draggingTextId = null;
      this.textDragStart = null;
      return;
    }

    if (!this.draggingCard || !this.dragStart) return;

    const rect = this.dragContainer!.getBoundingClientRect();
    const dropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
    const dropY = event.clientY - rect.top - this.dragContainer!.clientTop;
    const newAnchorX = this.dragStart.startCardX + (dropX - this.dragStart.startDropX) / this.scale;
    const newAnchorY = this.dragStart.startCardY + (dropY - this.dragStart.startDropY) / this.scale;

    const movedCardIds = this.groupDragOffsets
      ? this.selectedCardIds
      : this.draggingCard
        ? [this.draggingCard.id]
        : [];

    if (this.groupDragOffsets) {
      for (const id of Object.keys(this.groupDragOffsets)) {
        const { dx, dy } = this.groupDragOffsets[id];
        const x = newAnchorX + dx;
        const y = newAnchorY + dy;
        if (this.draggableCards.some((c) => c.id === id)) {
          this.updateItem(id, { x, y, display: 'block', cursor: 'grab' });
        } else {
          this.updateTextLabel(id, { x, y, display: 'block', cursor: 'grab' });
        }
      }
      this.groupDragOffsets = null;
    } else {
      this.updateItem(this.draggingCard.id, {
        x: newAnchorX,
        y: newAnchorY,
        display: 'block',
        cursor: 'grab',
      });
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
    for (const dc of this.draggableCards) {
      revokeTarotCardBlobUrls(dc.card);
    }
    this.draggableCards = [];
    this.maxZIndex = 0;
    this.draggingCard = null;
    this.dragStart = null;
    this.selectedCardIds = [];
    this.selectedTextIds = [];
    this.selectionBox = null;
    this.selectionBoxStyle = '';
    this.groupDragOffsets = null;
    this.textLabels = [];
    this.maxTextZIndex = 0;
    this.draggingTextId = null;
    this.textDragStart = null;
    this.resizingTextId = null;
    this.textResizeStart = null;
    this.editingTextId = null;
    this.pendingAnchor = null;
    this.drawByName = null;
    this.dirty = true;
    this.scale = 1;

    this.centerViewport();
  },

  clearDragState(this: MergedThis) {
    resetPointerInteractionLock();
    this.isPanning = false;
    this.draggingCard = null;
    this.dragStart = null;
    this.draggingTextId = null;
    this.textDragStart = null;
    this.resizingTextId = null;
    this.textResizeStart = null;
    this.selectionBox = null;
    this.selectionBoxStyle = '';
    this.groupDragOffsets = null;
    if (this.viewport) this.viewport.style.cursor = 'grab';
  },

  getContextMenuScreenPosition(this: MergedThis): { x: number; y: number } {
    return { x: this.contextMenu.x, y: this.contextMenu.y };
  },

  onContextMenu(this: MergedThis, event: MouseLikeEvent) {
    this.lastPointerScreenX = event.clientX;
    this.lastPointerScreenY = event.clientY;
    const screenX = event.clientX;
    const screenY = event.clientY;
    const { x: contentX, y: contentY } = this.screenToContent(screenX, screenY);
    const target = event.target as HTMLElement;
    const textEl = target.closest('[data-text-id]');
    const textId = textEl ? textEl.getAttribute('data-text-id') : null;
    if (textId && this.textLabels.some((l) => l.id === textId)) {
      if (event.preventDefault) event.preventDefault();
      this.contextMenu = {
        open: true,
        x: screenX,
        y: screenY,
        contentX,
        contentY,
        cardId: null,
        textId,
      };
      return;
    }

    let cardId: string | null = null;
    let el: HTMLElement | null = target;
    while (el && el !== this.viewport) {
      const id = el.id;
      if (id && this.draggableCards.some((c) => c.id === id)) {
        cardId = id;
        break;
      }
      el = el.parentElement;
    }
    if (cardId) {
      if (event.preventDefault) event.preventDefault();
      this.contextMenu = {
        open: true,
        x: screenX,
        y: screenY,
        contentX,
        contentY,
        cardId,
        textId: null,
      };
      return;
    }

    const isOnCanvas =
      target === this.viewport ||
      target === this.content ||
      target === this.emptyCanvasMessage ||
      (this.emptyCanvasMessage !== null && this.emptyCanvasMessage.contains(target));
    if (isOnCanvas) {
      if (event.preventDefault) event.preventDefault();
      this.contextMenu = {
        open: true,
        x: screenX,
        y: screenY,
        contentX,
        contentY,
        cardId: null,
        textId: null,
      };
    }
  },

  closeContextMenu() {
    this.contextMenu.open = false;
  },

  editTextLabelFromContextMenu(this: MergedThis) {
    const textId = this.contextMenu.textId;
    this.closeContextMenu();
    if (!textId) {
      return;
    }
    const label = this.textLabels.find((l) => l.id === textId);
    if (!label) {
      return;
    }
    this.$nextTick(() => {
      this.startEditingTextLabel(label);
    });
  },

  handleContextMenuTouchDismiss(this: MergedThis, ev: TouchEvent) {
    if (!this.contextMenu.open) {
      return;
    }
    if (!isWithinContextMenu(ev.target)) {
      this.closeContextMenu();
    }
  },

  drawCardAtContextMenu(this: MergedThis) {
    const { contentX, contentY } = this.contextMenu;
    this.drawCardAtContent(contentX, contentY);
    this.closeContextMenu();
  },

  addTextAtContextMenu(this: MergedThis) {
    const { contentX, contentY } = this.contextMenu;
    this.addTextAtContent(contentX, contentY);
    this.closeContextMenu();
  },

  openDrawByIndexFromContextMenu(this: MergedThis) {
    const { x, y } = this.getContextMenuScreenPosition();
    this.openDrawByIndexDialog(x, y);
    this.closeContextMenu();
  },

  openRandomNumberModalFromContextMenu(this: MergedThis) {
    const { x, y } = this.getContextMenuScreenPosition();
    this.openRandomNumberModal(x, y);
    this.closeContextMenu();
  },

  openDrawByNameAt(this: MergedThis, screenX: number, screenY: number) {
    this.drawByName = {
      screenX,
      screenY,
      query: '',
      highlightIndex: 0,
    };
    this.$nextTick(() => {
      const el = this.$refs.drawByNameInput as HTMLInputElement | undefined;
      el?.focus();
    });
  },

  openDrawByNameFromContextMenu(this: MergedThis) {
    const { x, y } = this.getContextMenuScreenPosition();
    this.openDrawByNameAt(x, y);
    this.closeContextMenu();
  },

  onDrawByNameQueryInput(this: MergedThis, value: string) {
    if (!this.drawByName) {
      return;
    }
    const matches = searchDeckCardsByTitle(Alpine.store('shuffledCards') as TarotCard[], value);
    let highlightIndex = this.drawByName.highlightIndex;
    if (matches.length === 0) {
      highlightIndex = 0;
    } else {
      const maxIdx = Math.min(matches.length - 1, 2);
      highlightIndex = Math.min(highlightIndex, maxIdx);
    }
    this.drawByName = {
      ...this.drawByName,
      query: value,
      highlightIndex,
    };
  },

  moveDrawByNameHighlight(this: MergedThis, delta: 1 | -1) {
    if (!this.drawByName) {
      return;
    }
    const matches = this.drawByNameMatches();
    const n = matches.length;
    if (n === 0) {
      return;
    }
    const idx = (this.drawByName.highlightIndex + delta + n) % n;
    this.drawByName = { ...this.drawByName, highlightIndex: idx };
  },

  onDrawByNameKeydown(this: MergedThis, event: KeyboardEvent) {
    if (!this.drawByName) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.moveDrawByNameHighlight(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.moveDrawByNameHighlight(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmDrawByNameSelection();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelDrawByName();
    }
  },

  confirmDrawByNameSelection(this: MergedThis, card?: TarotCard) {
    const picker = this.drawByName;
    if (!picker) {
      return;
    }
    const matches = this.drawByNameMatches();
    let chosen: TarotCard | undefined = card;
    if (!chosen) {
      if (matches.length === 0) {
        return;
      }
      const idx = Math.min(Math.max(0, picker.highlightIndex), matches.length - 1);
      chosen = matches[idx];
    }
    const sx = picker.screenX;
    const sy = picker.screenY;
    this.drawByName = null;
    this.$nextTick(() => {
      const { x, y } = this.screenToContent(sx, sy);
      this.addCardToCanvas(chosen!);
      const last = this.draggableCards[this.draggableCards.length - 1];
      this.updateItem(last.id, { x, y });
    });
  },

  cancelDrawByName(this: MergedThis) {
    this.drawByName = null;
  },

  async runStartupStorageWarningCheck(this: MergedThis) {
    if (isStorageWarningDismissedThisSession()) return;
    const low = await isRemainingStorageBelowFraction(0.2);
    if (low) {
      this.storageWarningVisible = true;
    }
  },

  dismissStorageWarning(this: MergedThis) {
    dismissStorageWarningForSession();
    this.storageWarningVisible = false;
    this.storageAdditionalInfoOpen = false;
  },

  openStorageAdditionalInfo(this: MergedThis) {
    this.storageAdditionalInfoOpen = true;
  },

  closeStorageAdditionalInfo(this: MergedThis) {
    this.storageAdditionalInfoOpen = false;
  },

  exportFromStorageWarning(this: MergedThis) {
    openSettingsExportConfirm();
  },
}));
