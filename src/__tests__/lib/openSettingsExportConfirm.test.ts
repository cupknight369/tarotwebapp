/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const alpineDataMock = vi.hoisted(() => vi.fn());

vi.mock('alpinejs', () => ({
  default: {
    $data: alpineDataMock,
  },
}));

import { openSettingsExportConfirm } from '../../lib/openSettingsExportConfirm.js';

describe('openSettingsExportConfirm', () => {
  beforeEach(() => {
    alpineDataMock.mockReset();
    document.body.replaceChildren();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('no-ops when settings root element is missing', () => {
    openSettingsExportConfirm();
    expect(alpineDataMock).not.toHaveBeenCalled();
  });

  it('no-ops when matched node is not an HTMLElement', () => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('x-data', 'settingsComponent');
    vi.spyOn(document, 'querySelector').mockReturnValue(svg);
    openSettingsExportConfirm();
    expect(alpineDataMock).not.toHaveBeenCalled();
  });

  it('calls openExportConfirm on Alpine component data when present', () => {
    const root = document.createElement('div');
    root.setAttribute('x-data', 'settingsComponent');
    document.body.appendChild(root);
    const openExportConfirm = vi.fn();
    alpineDataMock.mockReturnValue({ openExportConfirm });
    openSettingsExportConfirm();
    expect(alpineDataMock).toHaveBeenCalledTimes(1);
    expect(alpineDataMock).toHaveBeenCalledWith(root);
    expect(openExportConfirm).toHaveBeenCalledTimes(1);
  });

  it('no-ops when openExportConfirm is missing or not a function', () => {
    const root = document.createElement('div');
    root.setAttribute('x-data', 'settingsComponent');
    document.body.appendChild(root);
    alpineDataMock.mockReturnValue({});
    openSettingsExportConfirm();
    expect(alpineDataMock).toHaveBeenCalledTimes(1);

    alpineDataMock.mockReset();
    alpineDataMock.mockReturnValue({ openExportConfirm: 'not-a-fn' });
    openSettingsExportConfirm();
    expect(alpineDataMock).toHaveBeenCalledTimes(1);
  });

  it('no-ops when Alpine data is nullish', () => {
    const root = document.createElement('div');
    root.setAttribute('x-data', 'settingsComponent');
    document.body.appendChild(root);
    alpineDataMock.mockReturnValue(null);
    openSettingsExportConfirm();
    expect(alpineDataMock).toHaveBeenCalledWith(root);
  });
});
