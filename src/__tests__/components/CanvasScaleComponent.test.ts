/**
 * @vitest-environment happy-dom
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const alpineStub = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'scaleComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineStub.Alpine,
}));

import '../../components/CanvasScaleComponent.js';
import { wheelEventToZoomFactor } from '../../components/CanvasScaleComponent.js';
import { WHEEL_ZOOM_SENSITIVITY_BASE } from '../../validation/canvasZoom.js';

type ScaleCtx = {
  scale: number;
  offsetX: number;
  offsetY: number;
  minScale: number;
  maxScale: number;
  dirty: boolean;
  viewport?: HTMLDivElement | null;
  clamp: (v: number, min: number, max: number) => number;
  getContentStyle: () => string;
  onWheel: (e: WheelEvent) => void;
  zoomAt: (screenX: number, screenY: number, factor: number) => void;
  zoomAtCenter: (factor: number) => void;
};

function mountScale(): ScaleCtx {
  const factory = alpineStub.getFactory();
  if (!factory) {
    throw new Error('scaleComponent factory not registered');
  }
  const base = factory() as Omit<ScaleCtx, 'dirty'>;
  return { ...base, dirty: false };
}

function wheelEvent(opts: {
  clientX: number;
  clientY: number;
  deltaY: number;
  deltaMode?: number;
  currentTarget: HTMLElement;
}): WheelEvent {
  const ev = new WheelEvent('wheel', {
    clientX: opts.clientX,
    clientY: opts.clientY,
    deltaY: opts.deltaY,
    deltaMode: opts.deltaMode ?? WheelEvent.DOM_DELTA_PIXEL,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(ev, 'currentTarget', { value: opts.currentTarget, configurable: true });
  return ev;
}

describe('scaleComponent (CanvasScaleComponent.ts)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('clamp constrains to [min, max]', () => {
    const c = mountScale();
    expect(c.clamp.call(c, 5, 0, 10)).toBe(5);
    expect(c.clamp.call(c, -1, 0, 10)).toBe(0);
    expect(c.clamp.call(c, 99, 0, 10)).toBe(10);
  });

  it('getContentStyle embeds offset and scale', () => {
    const c = mountScale();
    c.offsetX = 12;
    c.offsetY = 34;
    c.scale = 1.5;
    const s = c.getContentStyle.call(c);
    expect(s).toContain('translate3d(12px, 34px, 0)');
    expect(s).toContain('scale(1.5)');
    expect(s).toContain('transform-origin: 0 0');
  });

  it('wheelEventToZoomFactor returns 1 for zero delta', () => {
    const ev = new WheelEvent('wheel', { deltaY: 0 });
    expect(wheelEventToZoomFactor(ev)).toBe(1);
  });

  it('wheelEventToZoomFactor scales gently for small trackpad deltas', () => {
    const ev = new WheelEvent('wheel', { deltaY: -2, deltaMode: WheelEvent.DOM_DELTA_PIXEL });
    const factor = wheelEventToZoomFactor(ev);
    expect(factor).toBeGreaterThan(1);
    expect(factor).toBeLessThan(1.01);
  });

  it('wheelEventToZoomFactor caps large wheel deltas', () => {
    const ev = new WheelEvent('wheel', { deltaY: -500, deltaMode: WheelEvent.DOM_DELTA_PIXEL });
    expect(wheelEventToZoomFactor(ev)).toBe(1.025);
  });

  it('wheelEventToZoomFactor increases response with higher sensitivity', () => {
    const ev = new WheelEvent('wheel', { deltaY: -2, deltaMode: WheelEvent.DOM_DELTA_PIXEL });
    const defaultFactor = wheelEventToZoomFactor(ev);
    const fastFactor = wheelEventToZoomFactor(ev, WHEEL_ZOOM_SENSITIVITY_BASE * 2);
    expect(fastFactor).toBeGreaterThan(defaultFactor);
  });

  it('wheelEventToZoomFactor decreases response with lower sensitivity', () => {
    const ev = new WheelEvent('wheel', { deltaY: -2, deltaMode: WheelEvent.DOM_DELTA_PIXEL });
    const defaultFactor = wheelEventToZoomFactor(ev);
    const slowFactor = wheelEventToZoomFactor(ev, WHEEL_ZOOM_SENSITIVITY_BASE * 0.25);
    expect(slowFactor).toBeLessThan(defaultFactor);
    expect(slowFactor).toBeGreaterThan(1);
  });

  it('onWheel prevents default and zooms in when deltaY is negative', () => {
    const c = mountScale();
    const el = document.createElement('div');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      width: 100,
      height: 80,
      right: 110,
      bottom: 100,
      x: 10,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect);
    const ev = wheelEvent({ clientX: 50, clientY: 60, deltaY: -100, currentTarget: el });
    const pd = vi.spyOn(ev, 'preventDefault');
    c.onWheel.call(c, ev);
    expect(pd).toHaveBeenCalled();
    expect(c.scale).toBeGreaterThan(1);
    expect(c.scale).toBeLessThan(1.05);
    expect(c.dirty).toBe(true);
  });

  it('onWheel ignores zero delta without marking dirty', () => {
    const c = mountScale();
    const el = document.createElement('div');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 100,
      height: 80,
      right: 100,
      bottom: 80,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    const ev = wheelEvent({ clientX: 50, clientY: 60, deltaY: 0, currentTarget: el });
    c.onWheel.call(c, ev);
    expect(c.scale).toBe(1);
    expect(c.dirty).toBe(false);
  });

  it('onWheel zooms out when deltaY is positive', () => {
    const c = mountScale();
    c.scale = 2;
    c.offsetX = 0;
    c.offsetY = 0;
    const el = document.createElement('div');
    vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 200,
      height: 200,
      right: 200,
      bottom: 200,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    const ev = wheelEvent({ clientX: 100, clientY: 100, deltaY: 100, currentTarget: el });
    c.onWheel.call(c, ev);
    expect(c.scale).toBeLessThan(2);
    expect(c.scale).toBeCloseTo(1.95, 5);
    expect(c.dirty).toBe(true);
  });

  it('zoomAt returns early when already at maxScale and zooming in', () => {
    const c = mountScale();
    c.scale = c.maxScale;
    c.offsetX = 5;
    c.offsetY = 7;
    c.dirty = false;
    c.zoomAt.call(c, 50, 50, 1.1);
    expect(c.scale).toBe(c.maxScale);
    expect(c.offsetX).toBe(5);
    expect(c.offsetY).toBe(7);
    expect(c.dirty).toBe(false);
  });

  it('zoomAt returns early when already at minScale and zooming out', () => {
    const c = mountScale();
    c.scale = c.minScale;
    c.offsetX = 1;
    c.offsetY = 2;
    c.dirty = false;
    c.zoomAt.call(c, 10, 20, 0.9);
    expect(c.scale).toBe(c.minScale);
    expect(c.offsetX).toBe(1);
    expect(c.offsetY).toBe(2);
    expect(c.dirty).toBe(false);
  });

  it('zoomAt updates offsets, scale, and dirty when scale changes', () => {
    const c = mountScale();
    c.scale = 1;
    c.offsetX = 10;
    c.offsetY = 20;
    c.zoomAt.call(c, 100, 200, 2);
    expect(c.scale).toBe(2);
    expect(c.dirty).toBe(true);
    expect(c.offsetX).toBe(100 - (100 - 10) * 2);
    expect(c.offsetY).toBe(200 - (200 - 20) * 2);
  });

  it('zoomAtCenter returns when viewport property is absent', () => {
    const c = mountScale();
    c.scale = 1.5;
    c.zoomAtCenter.call(c, 1.2);
    expect(c.scale).toBe(1.5);
  });

  it('zoomAtCenter returns when viewport is null', () => {
    const c = mountScale();
    c.viewport = null;
    c.scale = 1.5;
    c.zoomAtCenter.call(c, 1.2);
    expect(c.scale).toBe(1.5);
  });

  it('zoomAtCenter zooms at viewport center', () => {
    const c = mountScale();
    const viewport = document.createElement('div');
    vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue({
      left: 0,
      top: 0,
      width: 400,
      height: 300,
      right: 400,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
    c.viewport = viewport;
    c.scale = 1;
    c.offsetX = 0;
    c.offsetY = 0;
    c.zoomAtCenter.call(c, 2);
    expect(c.scale).toBe(2);
    expect(c.dirty).toBe(true);
    expect(c.offsetX).toBe(200 - (200 - 0) * 2);
    expect(c.offsetY).toBe(150 - (150 - 0) * 2);
  });
});
