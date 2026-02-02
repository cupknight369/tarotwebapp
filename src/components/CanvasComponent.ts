/// <reference path="../../types/alpine.d.ts" />

 function canvasComponent(refs: AlpineRefs) {
  const component = {
    draggableCards: [] as DraggableCard[],
    maxZIndex: 0,
    dragStart: null as { startCardX: number; startCardY: number; startDropX: number; startDropY: number } | null,
    dragContainer: null as HTMLElement | null,
    draggingCard: null as HTMLElement | null,
    showClearConfirm: false,

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

    cards: [] as TarotCard[],
    $refs: refs,

    get contentStyle() {
        return `
        transform-origin: 0 0;
        transform: translate3d(${this.offsetX}px, ${this.offsetY}px, 0)
                    scale(${this.scale});
        transition: transform 0.03s linear;
        `;
    },

    init() {
      // Store reference globally so buttons can access it
      (window as any).draggableZoneComponent = this;
      this.dragContainer = document.querySelector('#draggable-container') as HTMLElement;
      this.viewport = this.$refs!.viewport as HTMLDivElement;
      this.content = this.$refs!.content as HTMLDivElement;
      this.emptyCanvasMessage = this.$refs!.emptyCanvasMessage as HTMLDivElement;

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

        // Same math as canvas: keep mouse‑anchored point stable in screen space
        this.offsetX = screenX - (screenX - this.offsetX) * actual;
        this.offsetY = screenY - (screenY - this.offsetY) * actual;

        this.scale = newScale;
    },

    zoomAtCenter(factor: number) {
        if (!this.viewport) return;
        const rect = this.viewport.getBoundingClientRect();
        this.zoomAt(rect.width / 2, rect.height / 2, factor);
    },

    onMouseDown(event: MouseEvent) {
      if (event.target === this.viewport || event.target === this.content || event.target === this.emptyCanvasMessage) {
        this.isPanning = true;
        this.panStartX = event.clientX - this.offsetX;
        this.panStartY = event.clientY - this.offsetY;
        this.viewport!.style.cursor = "grabbing";
        return;
      }

      const target = event.target as HTMLElement;
      const cardId = target.id;
      if (!cardId || !this.draggableCards.some(c => c.id === cardId)) return;
      this.draggingCard = target;

      const card = this.draggableCards.find(c => c.id === cardId)!;
      const rect = this.dragContainer!.getBoundingClientRect();
      const startDropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
      const startDropY = event.clientY - rect.top - this.dragContainer!.clientTop;
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
      if (this.isPanning) {
        this.offsetX = e.clientX - this.panStartX;
        this.offsetY = e.clientY - this.panStartY;
        return;
      }

      if (!this.draggingCard || !this.dragStart) return;

      const rect = this.dragContainer!.getBoundingClientRect();
      const dropX = e.clientX - rect.left - this.dragContainer!.clientLeft;
      const dropY = e.clientY - rect.top - this.dragContainer!.clientTop;
      // Move card by mouse delta in inner space so the same point stays under the cursor
      const x = this.dragStart.startCardX + (dropX - this.dragStart.startDropX) / this.scale;
      const y = this.dragStart.startCardY + (dropY - this.dragStart.startDropY) / this.scale;

      this.updateItem(this.draggingCard.id, { x, y });
    },

    onMouseUp(event: MouseEvent) {
      event.preventDefault();

      this.isPanning = false;
      if (this.viewport) this.viewport.style.cursor = "grab";

      if (!this.draggingCard || !this.dragStart) return;

      const rect = this.dragContainer!.getBoundingClientRect();
      const dropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
      const dropY = event.clientY - rect.top - this.dragContainer!.clientTop;
      const x = this.dragStart.startCardX + (dropX - this.dragStart.startDropX) / this.scale;
      const y = this.dragStart.startCardY + (dropY - this.dragStart.startDropY) / this.scale;

      this.updateItem(this.draggingCard.id, { x, y, display: 'block', cursor: 'grab' });

      this.dragStart = null;
      this.draggingCard = null;
    },    

    clearCanvas() {
      this.draggableCards = [];
      this.maxZIndex = 0;
      this.draggingCard = null;
      this.dragStart = null;
      this.scale = 1;

      const viewportRect = this.viewport!.getBoundingClientRect();
      const contentW = this.content!.offsetWidth;
      const contentH = this.content!.offsetHeight;
      this.offsetX = viewportRect.width / 2 - contentW / 2;
      this.offsetY = viewportRect.height / 2 - contentH / 2;
    },

    // Triggers Alpine reactivity for the draggable card
    updateItem(id: string, newProps: Partial<DraggableCard>) {
      const index = this.draggableCards.findIndex(i => i.id === id)
      if (index === -1) return

      // Create a new object, keep the same index
      this.draggableCards[index] = {
        ...this.draggableCards[index],
        ...newProps,
      }
    },

    clamp(v: number, min: number, max: number) {
      return Math.max(min, Math.min(max, v));
    },
  };
  
  return component;
};

(window as any).canvasComponent = canvasComponent;
