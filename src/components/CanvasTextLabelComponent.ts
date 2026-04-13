import Alpine from 'alpinejs';
import type { MergedThis, TextLabel, TextLabelAnchorPosition } from '../types/canvas.js';
import {
  clampFixedWidthPx,
  clampLabelFontSize,
  labelColorSchema,
  labelTextSchema,
} from '../validation/canvasLabel.js';

Alpine.data('textLabelComponent', () => ({
  textLabels: [] as TextLabel[],
  maxTextZIndex: 0,
  draggingTextId: null as string | null,
  textDragStart: null as {
    startX: number;
    startY: number;
    startDropX: number;
    startDropY: number;
  } | null,
  resizingTextId: null as string | null,
  textResizeStart: null as { startWidthPx: number; startDropX: number } | null,
  editingTextId: null as string | null,
  pendingAnchor: null as {
    textId: string;
    cardId: string;
    screenX: number;
    screenY: number;
  } | null,

  TEXT_ANCHOR_GAP: 10,
  TEXT_LABEL_DEFAULT_HEIGHT: 24,

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
      fixedWidth: false,
      fixedWidthPx: 0,
    };
    this.textLabels = [...this.textLabels, label];
    this.maxTextZIndex += 1;
    this.dirty = true;
  },

  getTextLabelPosition(this: MergedThis, label: TextLabel): { x: number; y: number } {
    if (!label.anchorCardId || !label.anchorPosition) return { x: label.x, y: label.y };
    const card = this.draggableCards.find((c) => c.id === label.anchorCardId);
    if (!card) return { x: label.x, y: label.y };
    const gap = this.TEXT_ANCHOR_GAP;
    const w = this.CARD_WIDTH;
    const h = this.CARD_HEIGHT;
    const labelH = this.TEXT_LABEL_DEFAULT_HEIGHT;
    switch (label.anchorPosition) {
      case 'above':
        return { x: card.x, y: card.y - gap - labelH };
      case 'below':
        return { x: card.x, y: card.y + h + gap + labelH };
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
    const fixed = label.fixedWidth
      ? ` box-sizing: border-box; width: ${clampFixedWidthPx(
          label.fixedWidthPx > 0 ? label.fixedWidthPx : 240,
        )}px;`
      : '';
    const base = `left: ${pos.x}px; top: ${pos.y}px; z-index: ${label.zIndex}; cursor: ${label.cursor}; display: ${label.display}; font-size: ${label.fontSize}px; font-weight: ${label.fontWeight}; font-style: ${label.fontStyle}; text-decoration: ${label.textDecoration}; color: ${label.color};${fixed}`;
    if (vertical && this.editingTextId !== label.id) {
      const transform =
        label.anchorPosition === 'left' ? ' transform: translateY(110%) rotate(180deg);' : '';
      return base + `writing-mode: vertical-lr; min-height: ${this.CARD_HEIGHT}px;${transform}`;
    }
    return base;
  },

  updateTextLabel(this: MergedThis, id: string, newProps: Partial<TextLabel>) {
    const index = this.textLabels.findIndex((l) => l.id === id);
    if (index === -1) return;
    const current = this.textLabels[index];
    const { fontSize, color, text, fixedWidthPx, ...rest } = newProps;
    const next: TextLabel = { ...current, ...rest };
    if (fontSize !== undefined) {
      next.fontSize = clampLabelFontSize(fontSize);
    }
    if (fixedWidthPx !== undefined) {
      next.fixedWidthPx = clampFixedWidthPx(fixedWidthPx);
    }
    if (color !== undefined) {
      const parsed = labelColorSchema.safeParse(color);
      if (parsed.success) next.color = parsed.data;
    }
    if (text !== undefined) {
      const parsed = labelTextSchema.safeParse(text);
      if (parsed.success) next.text = parsed.data;
    }
    this.textLabels[index] = next;
    this.dirty = true;
  },

  deleteTextLabel(this: MergedThis, id: string) {
    this.textLabels = this.textLabels.filter((l) => l.id !== id);
    this.dirty = true;
  },

  setTextLabelAnchor(
    this: MergedThis,
    textId: string,
    cardId: string,
    position: TextLabelAnchorPosition,
  ) {
    this.updateTextLabel(textId, { anchorCardId: cardId, anchorPosition: position });
    const label = this.textLabels.find((l) => l.id === textId)!;
    const pos = this.getTextLabelPosition(label);
    this.updateTextLabel(textId, { x: pos.x, y: pos.y });
  },

  cancelPendingAnchor() {
    this.pendingAnchor = null;
  },

  commitEditTextLabel() {
    this.editingTextId = null;
  },

  /**
   * Turns fixed width on or off. When enabling, reuses stored width if valid; otherwise measures the label or uses a fallback.
   * @param id - Text label id.
   * @param enabled - Whether fixed width is active.
   */
  setTextLabelFixedWidthToggle(this: MergedThis, id: string, enabled: boolean): void {
    if (!enabled) {
      this.updateTextLabel(id, { fixedWidth: false });
      return;
    }
    const label = this.textLabels.find((l) => l.id === id);
    if (!label) return;
    const minW = 40;
    let px = label.fixedWidthPx;
    if (!Number.isFinite(px) || px < minW) {
      this.$nextTick(() => {
        const el = document.querySelector(
          `[data-text-id="${CSS.escape(id)}"]`,
        ) as HTMLElement | null;
        const measured =
          el && el.offsetWidth > 0 ? clampFixedWidthPx(Math.ceil(el.offsetWidth)) : null;
        const resolved = measured !== null ? measured : clampFixedWidthPx(240);
        this.updateTextLabel(id, { fixedWidth: true, fixedWidthPx: resolved });
      });
      return;
    }
    this.updateTextLabel(id, { fixedWidth: true, fixedWidthPx: clampFixedWidthPx(px) });
  },
}));
