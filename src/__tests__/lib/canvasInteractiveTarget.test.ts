/**
 * @vitest-environment happy-dom
 */

import { describe, expect, it } from 'vitest';
import {
  isCanvasInteractiveTarget,
  isWithinContextMenu,
  isWithinTextEditPanel,
} from '../../lib/canvasInteractiveTarget.js';

describe('canvasInteractiveTarget', () => {
  it('isCanvasInteractiveTarget matches form controls', () => {
    const button = document.createElement('button');
    expect(isCanvasInteractiveTarget(button)).toBe(true);

    const input = document.createElement('input');
    expect(isCanvasInteractiveTarget(input)).toBe(true);

    const span = document.createElement('span');
    expect(isCanvasInteractiveTarget(span)).toBe(false);
    expect(isCanvasInteractiveTarget(null)).toBe(false);
  });

  it('isWithinTextEditPanel matches descendants of data-text-edit-panel', () => {
    const panel = document.createElement('div');
    panel.setAttribute('data-text-edit-panel', '');
    const child = document.createElement('span');
    panel.append(child);
    expect(isWithinTextEditPanel(child)).toBe(true);
    expect(isWithinTextEditPanel(document.createElement('div'))).toBe(false);
  });

  it('isWithinContextMenu matches descendants of data-context-menu', () => {
    const menu = document.createElement('div');
    menu.setAttribute('data-context-menu', '');
    const button = document.createElement('button');
    menu.append(button);
    expect(isWithinContextMenu(button)).toBe(true);
    expect(isWithinContextMenu(document.createElement('div'))).toBe(false);
  });
});
