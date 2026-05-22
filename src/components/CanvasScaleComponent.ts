import Alpine from 'alpinejs';
import { MergedThis } from '../types/canvas.js';

const WHEEL_LINE_HEIGHT_PX = 16;
/** Scale change per pixel of wheel delta before the per-event cap is applied. */
const WHEEL_ZOOM_SENSITIVITY = 0.0004;
/** Max zoom change per wheel event (~2.5%) so fast trackpad pinches stay controlled. */
const WHEEL_ZOOM_MAX_STEP_RATIO = 0.025;

/**
 * Normalizes a wheel event delta to pixels for consistent zoom across delta modes.
 *
 * @param e - Wheel event from the canvas viewport.
 * @returns Signed scroll delta in pixels (positive = scroll down / zoom out).
 */
function normalizeWheelDeltaToPx(e: WheelEvent): number {
  switch (e.deltaMode) {
    case WheelEvent.DOM_DELTA_LINE:
      return e.deltaY * WHEEL_LINE_HEIGHT_PX;
    case WheelEvent.DOM_DELTA_PAGE:
      return e.deltaY * (e.view?.innerHeight ?? 800);
    default:
      return e.deltaY;
  }
}

/**
 * Maps wheel delta to a multiplicative zoom factor centered on 1.
 *
 * @param e - Wheel event from the canvas viewport.
 * @returns Zoom multiplier for {@link MergedThis.zoomAt}; 1 when delta is zero.
 */
export function wheelEventToZoomFactor(e: WheelEvent): number {
  const deltaPx = normalizeWheelDeltaToPx(e);
  if (deltaPx === 0) return 1;

  const uncapped = Math.exp(-deltaPx * WHEEL_ZOOM_SENSITIVITY);
  const min = 1 - WHEEL_ZOOM_MAX_STEP_RATIO;
  const max = 1 + WHEEL_ZOOM_MAX_STEP_RATIO;
  return Math.min(max, Math.max(min, uncapped));
}

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
    const factor = wheelEventToZoomFactor(e);
    if (factor === 1) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
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
}));
