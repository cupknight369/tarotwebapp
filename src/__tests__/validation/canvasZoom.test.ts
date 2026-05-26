import { describe, expect, it } from 'vitest';

import {
  CANVAS_ZOOM_SENSITIVITY_DEFAULT,
  CANVAS_ZOOM_SENSITIVITY_MAX,
  CANVAS_ZOOM_SENSITIVITY_MIN,
  WHEEL_ZOOM_MAX_STEP_RATIO_BASE,
  WHEEL_ZOOM_SENSITIVITY_BASE,
  applyCanvasZoomSensitivityToPinchFactor,
  canvasZoomSensitivityToRatio,
  canvasZoomSensitivityToWheelCoefficient,
  canvasZoomSensitivityToWheelMaxStepRatio,
  clampCanvasZoomSensitivity,
} from '../../validation/canvasZoom.js';

describe('clampCanvasZoomSensitivity', () => {
  it('returns default for non-finite input', () => {
    expect(clampCanvasZoomSensitivity(Number.NaN)).toBe(CANVAS_ZOOM_SENSITIVITY_DEFAULT);
    expect(clampCanvasZoomSensitivity(Number.POSITIVE_INFINITY)).toBe(
      CANVAS_ZOOM_SENSITIVITY_DEFAULT,
    );
  });

  it('snaps to the nearest preset', () => {
    expect(clampCanvasZoomSensitivity(10)).toBe(CANVAS_ZOOM_SENSITIVITY_MIN);
    expect(clampCanvasZoomSensitivity(500)).toBe(CANVAS_ZOOM_SENSITIVITY_MAX);
    expect(clampCanvasZoomSensitivity(99)).toBe(100);
    expect(clampCanvasZoomSensitivity(130)).toBe(100);
    expect(clampCanvasZoomSensitivity(160)).toBe(200);
  });
});

describe('canvasZoomSensitivityToRatio', () => {
  it('maps default sensitivity to 1', () => {
    expect(canvasZoomSensitivityToRatio(CANVAS_ZOOM_SENSITIVITY_DEFAULT)).toBe(1);
  });

  it('maps min and max to expected ratios', () => {
    expect(canvasZoomSensitivityToRatio(CANVAS_ZOOM_SENSITIVITY_MIN)).toBe(0.25);
    expect(canvasZoomSensitivityToRatio(CANVAS_ZOOM_SENSITIVITY_MAX)).toBe(4);
  });
});

describe('canvasZoomSensitivityToWheelCoefficient', () => {
  it('returns base coefficient at default sensitivity', () => {
    expect(canvasZoomSensitivityToWheelCoefficient(CANVAS_ZOOM_SENSITIVITY_DEFAULT)).toBe(
      WHEEL_ZOOM_SENSITIVITY_BASE,
    );
  });

  it('scales coefficient with sensitivity', () => {
    expect(canvasZoomSensitivityToWheelCoefficient(400)).toBe(WHEEL_ZOOM_SENSITIVITY_BASE * 4);
  });
});

describe('canvasZoomSensitivityToWheelMaxStepRatio', () => {
  it('returns base cap at normal sensitivity', () => {
    expect(canvasZoomSensitivityToWheelMaxStepRatio(CANVAS_ZOOM_SENSITIVITY_DEFAULT)).toBe(
      WHEEL_ZOOM_MAX_STEP_RATIO_BASE,
    );
  });

  it('scales the per-event cap with sensitivity', () => {
    expect(canvasZoomSensitivityToWheelMaxStepRatio(400)).toBe(WHEEL_ZOOM_MAX_STEP_RATIO_BASE * 4);
  });
});

describe('applyCanvasZoomSensitivityToPinchFactor', () => {
  it('returns raw factor at default sensitivity', () => {
    expect(applyCanvasZoomSensitivityToPinchFactor(2, CANVAS_ZOOM_SENSITIVITY_DEFAULT)).toBe(2);
    expect(applyCanvasZoomSensitivityToPinchFactor(0.5, CANVAS_ZOOM_SENSITIVITY_DEFAULT)).toBe(0.5);
  });

  it('reduces pinch response below default sensitivity', () => {
    expect(applyCanvasZoomSensitivityToPinchFactor(2, CANVAS_ZOOM_SENSITIVITY_MIN)).toBe(1.25);
  });

  it('amplifies pinch response above default sensitivity', () => {
    expect(applyCanvasZoomSensitivityToPinchFactor(2, CANVAS_ZOOM_SENSITIVITY_MAX)).toBe(5);
  });
});
