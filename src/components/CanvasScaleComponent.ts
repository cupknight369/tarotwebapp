import Alpine from 'alpinejs'
import { MergedThis } from '../types/canvas.js';

Alpine.data('scaleComponent', () => ({
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  minScale: 0.2,
  maxScale: 4,

  clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  },

  getContentStyle() {
    return `
    transform-origin: 0 0;
    transform: translate3d(${this.offsetX}px, ${this.offsetY}px, 0)
              scale(${this.scale});
    transition: transform 0.03s linear;
    `;
  },

  onWheel(this: MergedThis, e: WheelEvent) {
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    this.zoomAt(mouseX, mouseY, factor);
  },

  zoomAt(this: MergedThis, screenX: number, screenY: number, factor: number) {
    const newScale = this.clamp(this.scale * factor, this.minScale, this.maxScale);
    const actual = newScale / this.scale;
    if (actual === 1) return;

    this.offsetX = screenX - (screenX - this.offsetX) * actual;
    this.offsetY = screenY - (screenY - this.offsetY) * actual;

    this.scale = newScale;
    this.dirty = true;
  },

  zoomAtCenter(this: MergedThis, factor: number) {
    const viewport = 'viewport' in this ? (this as { viewport: HTMLDivElement }).viewport : null;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    this.zoomAt(rect.width / 2, rect.height / 2, factor);
  },
}))
