/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { BackupProgress, SettingsStoreState } from '../../types/settings.js';
import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const backupMocks = vi.hoisted(() => ({
  exportLocalBackup: vi.fn(),
  importLocalBackup: vi.fn(),
}));

const alpineBundle = vi.hoisted(() => {
  const cap = (
    globalThis as unknown as VitestGlobalWithAlpineDataCapture
  ).__vitestCreateAlpineDataCapture('settingsComponent');
  return {
    cap,
    Alpine: {
      data: cap.Alpine.data.bind(cap.Alpine),
      store: cap.Alpine.store.bind(cap.Alpine),
      effect: (fn: () => void) => {
        fn();
      },
    },
  };
});

vi.mock('alpinejs', () => ({
  default: alpineBundle.Alpine,
}));

vi.mock('../../lib/localBackup.js', () => ({
  exportLocalBackup: backupMocks.exportLocalBackup,
  importLocalBackup: backupMocks.importLocalBackup,
}));

import '../../components/SettingsComponent.js';

const rawStores = alpineBundle.cap.rawStores;

function settingsState(overrides: Partial<SettingsStoreState> = {}): SettingsStoreState {
  return {
    open: false,
    censored: false,
    showDeckTitleOnCanvas: true,
    showCorrespondenceThumbnailsOnCanvas: false,
    ...overrides,
  };
}

type SettingsCtx = {
  storageEstimate: { usage: number; quota: number } | null;
  storageEstimateError: string | null;
  storageEstimatePending: boolean;
  init: () => void;
  formatStorageLine: () => string;
  refreshStorageEstimate: () => Promise<void>;
  backupBusy: boolean;
  backupProgress: { phase: string; current: number; total: number };
  backupStartedAt: number;
  backupElapsedMs: number;
  backupResultErrors: string[];
  backupResultSummary: string;
  _backupTimer: ReturnType<typeof setInterval> | null;
  getBackupPercent: () => number;
  formatSeconds: (sec: number) => string;
  getElapsedLabel: () => string;
  getEtaLabel: () => string;
  clearBackupResult: () => void;
  openExportConfirm: () => void;
  startExport: () => Promise<void>;
  openImportConfirm: () => void;
  onImportFileChange: (event: Event) => Promise<void>;
};

function mount(): SettingsCtx {
  const f = alpineBundle.cap.getFactory();
  if (!f) {
    throw new Error('settingsComponent factory not registered');
  }
  return f() as SettingsCtx;
}

function storageEstimateMock(): ReturnType<typeof vi.fn> {
  return (navigator as unknown as { storage: { estimate: ReturnType<typeof vi.fn> } }).storage
    .estimate;
}

describe('settingsComponent (SettingsComponent.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(rawStores)) {
      delete rawStores[k];
    }
    rawStores.settings = settingsState();
    backupMocks.exportLocalBackup.mockResolvedValue({ errors: [] });
    backupMocks.importLocalBackup.mockResolvedValue({ errors: [] });
    vi.stubGlobal('navigator', {
      ...navigator,
      storage: {
        estimate: vi.fn().mockResolvedValue({ usage: 100, quota: 10 * 1024 * 1024 }),
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('init runs Alpine.effect; refreshStorageEstimate when settings.open is true', async () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    const spy = vi.spyOn(ctx, 'refreshStorageEstimate');
    ctx.init.call(ctx);
    expect(spy).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(ctx.storageEstimatePending).toBe(false));
    expect(ctx.storageEstimate).toEqual({ usage: 100, quota: 10 * 1024 * 1024 });
  });

  it('init effect does not refresh when settings panel is closed', () => {
    rawStores.settings = settingsState({ open: false });
    const ctx = mount();
    const spy = vi.spyOn(ctx, 'refreshStorageEstimate');
    ctx.init.call(ctx);
    expect(spy).not.toHaveBeenCalled();
  });

  it('formatStorageLine shows pending and error states', () => {
    const ctx = mount();
    ctx.storageEstimatePending = true;
    expect(ctx.formatStorageLine.call(ctx)).toBe('Getting storage estimate…');
    ctx.storageEstimatePending = false;
    ctx.storageEstimateError = 'boom';
    expect(ctx.formatStorageLine.call(ctx)).toBe('boom');
  });

  it('formatStorageLine reports unavailable when estimate missing or quota not positive', () => {
    const ctx = mount();
    ctx.storageEstimate = null;
    expect(ctx.formatStorageLine.call(ctx)).toBe('Storage estimate unavailable.');
    ctx.storageEstimate = { usage: 0, quota: 0 };
    expect(ctx.formatStorageLine.call(ctx)).toBe('Storage estimate unavailable.');
  });

  it('formatStorageLine formats available line using B, KB, MB, and GB scales', () => {
    const ctx = mount();
    ctx.storageEstimate = { usage: 100, quota: 500 };
    expect(ctx.formatStorageLine.call(ctx)).toContain('B available');
    ctx.storageEstimate = { usage: 0, quota: 5 * 1024 };
    expect(ctx.formatStorageLine.call(ctx)).toContain('KB');
    ctx.storageEstimate = { usage: 0, quota: 3 * 1024 * 1024 };
    expect(ctx.formatStorageLine.call(ctx)).toContain('MB');
    ctx.storageEstimate = { usage: 0, quota: 2 * 1024 * 1024 * 1024 };
    expect(ctx.formatStorageLine.call(ctx)).toContain('GB');
  });

  it('formatStorageLine uses em dash when usage is non-finite in breakdown', () => {
    const ctx = mount();
    ctx.storageEstimate = { usage: Number.NaN, quota: 1024 };
    const line = ctx.formatStorageLine.call(ctx);
    expect(line).toContain('—');
  });

  it('formatStorageLine uses em dash for negative usage in breakdown', () => {
    const ctx = mount();
    ctx.storageEstimate = { usage: -5, quota: 1024 };
    expect(ctx.formatStorageLine.call(ctx)).toContain('—');
  });

  it('refreshStorageEstimate sets error when navigator.storage.estimate is missing', async () => {
    vi.stubGlobal('navigator', { storage: {} });
    const ctx = mount();
    await ctx.refreshStorageEstimate.call(ctx);
    expect(ctx.storageEstimate).toBeNull();
    expect(ctx.storageEstimateError).toContain('not supported');
    expect(ctx.storageEstimatePending).toBe(false);
  });

  it('refreshStorageEstimate sets error when navigator is undefined', async () => {
    vi.stubGlobal('navigator', undefined as unknown as Navigator);
    const ctx = mount();
    await ctx.refreshStorageEstimate.call(ctx);
    expect(ctx.storageEstimateError).toBeTruthy();
    expect(ctx.storageEstimatePending).toBe(false);
  });

  it('refreshStorageEstimate captures usage and quota on success', async () => {
    const estimate = vi.fn().mockResolvedValue({ usage: 3, quota: 9 });
    vi.stubGlobal('navigator', {
      storage: { estimate },
    });
    const ctx = mount();
    await ctx.refreshStorageEstimate.call(ctx);
    expect(ctx.storageEstimate).toEqual({ usage: 3, quota: 9 });
    expect(ctx.storageEstimateError).toBeNull();
    expect(ctx.storageEstimatePending).toBe(false);
  });

  it('refreshStorageEstimate maps thrown Error and non-Error to storageEstimateError', async () => {
    const ctx = mount();
    const estimate = storageEstimateMock();
    estimate.mockRejectedValueOnce(new Error('quota err'));
    await ctx.refreshStorageEstimate.call(ctx);
    expect(ctx.storageEstimateError).toBe('quota err');
    estimate.mockRejectedValueOnce('x');
    await ctx.refreshStorageEstimate.call(ctx);
    expect(ctx.storageEstimateError).toBe('Could not read storage estimate.');
  });

  it('getBackupPercent handles zero total and caps at 100', () => {
    const ctx = mount();
    ctx.backupProgress = { phase: '', current: 0, total: 0 };
    expect(ctx.getBackupPercent.call(ctx)).toBe(0);
    ctx.backupProgress = { phase: '', current: 3, total: 2 };
    expect(ctx.getBackupPercent.call(ctx)).toBe(100);
    ctx.backupProgress = { phase: '', current: 1, total: 2 };
    expect(ctx.getBackupPercent.call(ctx)).toBe(50);
  });

  it('formatSeconds formats under and over one minute', () => {
    const ctx = mount();
    expect(ctx.formatSeconds.call(ctx, 45)).toBe('45s');
    expect(ctx.formatSeconds.call(ctx, 125)).toBe('2m 5s');
  });

  it('getElapsedLabel and getEtaLabel derive from backup timing state', () => {
    const ctx = mount();
    ctx.backupElapsedMs = 5000;
    expect(ctx.getElapsedLabel.call(ctx)).toBe('Elapsed: 5s');
    ctx.backupBusy = false;
    expect(ctx.getEtaLabel.call(ctx)).toBe('');
    ctx.backupBusy = true;
    ctx.backupElapsedMs = 1000;
    ctx.backupProgress = { phase: 'x', current: 1, total: 4 };
    expect(ctx.getEtaLabel.call(ctx)).toMatch(/Est\. remaining:/);
    ctx.backupProgress = { phase: 'x', current: 4, total: 4 };
    expect(ctx.getEtaLabel.call(ctx)).toBe('');
  });

  it('clearBackupResult resets summary and errors', () => {
    const ctx = mount();
    ctx.backupResultSummary = 'x';
    ctx.backupResultErrors = ['a'];
    ctx.clearBackupResult.call(ctx);
    expect(ctx.backupResultSummary).toBe('');
    expect(ctx.backupResultErrors).toEqual([]);
  });

  it('openExportConfirm toggles settings and dialog; onCancel reopens settings', () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.openExportConfirm.call(ctx);
    expect((rawStores.settings as SettingsStoreState).open).toBe(false);
    const dlg = rawStores.dialog as {
      onConfirm: () => void;
      onCancel: () => void;
    };
    expect(dlg.onConfirm).toBeDefined();
    dlg.onCancel();
    expect((rawStores.settings as SettingsStoreState).open).toBe(true);
  });

  it('openImportConfirm wires dialog onConfirm to click hidden file input', () => {
    rawStores.settings = settingsState({ open: true });
    const input = document.createElement('input');
    input.id = 'settings-backup-file-input';
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    document.body.appendChild(input);
    const ctx = mount();
    ctx.openImportConfirm.call(ctx);
    (rawStores.dialog as { onConfirm: () => void }).onConfirm();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('openImportConfirm onCancel reopens settings', () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.openImportConfirm.call(ctx);
    expect((rawStores.settings as SettingsStoreState).open).toBe(false);
    (rawStores.dialog as { onCancel: () => void }).onCancel();
    expect((rawStores.settings as SettingsStoreState).open).toBe(true);
  });

  it('startExport returns immediately when already busy', async () => {
    const ctx = mount();
    ctx.backupBusy = true;
    await ctx.startExport.call(ctx);
    expect(backupMocks.exportLocalBackup).not.toHaveBeenCalled();
  });

  it('startExport runs export, updates progress, and clears timer in finally', async () => {
    vi.useFakeTimers();
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000);
    backupMocks.exportLocalBackup.mockImplementation((onProgress?: (p: BackupProgress) => void) => {
      onProgress?.({ phase: 'p', current: 1, total: 2 });
      return Promise.resolve({ errors: [] });
    });
    rawStores.settings = settingsState({ open: false });
    const ctx = mount();
    const p = ctx.startExport.call(ctx);
    vi.advanceTimersByTime(300);
    await p;
    expect((rawStores.settings as SettingsStoreState).open).toBe(true);
    expect(ctx.backupResultSummary).toBe('Export finished.');
    expect(ctx.backupResultErrors).toEqual([]);
    expect(ctx._backupTimer).toBeNull();
    expect(ctx.backupBusy).toBe(false);
    now.mockRestore();
  });

  it('startExport finally skips clearInterval when timer id is falsy', async () => {
    vi.useFakeTimers();
    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    backupMocks.exportLocalBackup.mockResolvedValue({ errors: [] });
    const ctx = mount();
    await ctx.startExport.call(ctx);
    expect(clearSpy).not.toHaveBeenCalled();
    expect(ctx._backupTimer).toBe(0);
    si.mockRestore();
    clearSpy.mockRestore();
  });

  it('startExport summarizes non-empty error list and maps thrown values', async () => {
    vi.useFakeTimers();
    backupMocks.exportLocalBackup.mockResolvedValue({ errors: ['a'] });
    const ctx = mount();
    await ctx.startExport.call(ctx);
    expect(ctx.backupResultSummary).toContain('issues');
    backupMocks.exportLocalBackup.mockRejectedValue(new Error('net'));
    await ctx.startExport.call(ctx);
    expect(ctx.backupResultErrors).toEqual(['net']);
    expect(ctx.backupResultSummary).toBe('Export failed.');
    backupMocks.exportLocalBackup.mockRejectedValue(123);
    await ctx.startExport.call(ctx);
    expect(ctx.backupResultErrors).toEqual(['123']);
  });

  it('openExportConfirm onConfirm starts export', () => {
    vi.useFakeTimers();
    const ctx = mount();
    ctx.openExportConfirm.call(ctx);
    const startSpy = vi.spyOn(ctx, 'startExport');
    (rawStores.dialog as { onConfirm: () => void }).onConfirm();
    expect(startSpy.mock.calls.length).toBeGreaterThan(0);
  });

  it('onImportFileChange no-ops without file or when busy', async () => {
    const ctx = mount();
    const input = document.createElement('input');
    input.type = 'file';
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    ctx.backupBusy = true;
    await ctx.onImportFileChange.call(ctx, ev);
    expect(backupMocks.importLocalBackup).not.toHaveBeenCalled();
    ctx.backupBusy = false;
    await ctx.onImportFileChange.call(ctx, ev);
    expect(backupMocks.importLocalBackup).not.toHaveBeenCalled();
  });

  it('onImportFileChange clears input value and handles arrayBuffer failure', async () => {
    const ctx = mount();
    const file = new File([new Uint8Array([1])], 'x.pb', { type: 'application/octet-stream' });
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('read fail'));
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    vi.useFakeTimers();
    await ctx.onImportFileChange.call(ctx, ev);
    expect(input.value).toBe('');
    expect(ctx.backupResultSummary).toBe('Could not read the file.');
    expect(ctx.backupResultErrors).toEqual(['read fail']);
    expect(ctx.backupBusy).toBe(false);
  });

  it('onImportFileChange catch skips clearInterval when timer id is falsy', async () => {
    vi.useFakeTimers();
    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const file = new File([new Uint8Array([1])], 'bad.pb');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('read error'));
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    const ctx = mount();
    await ctx.onImportFileChange.call(ctx, ev);
    expect(clearSpy).not.toHaveBeenCalled();
    si.mockRestore();
    clearSpy.mockRestore();
  });

  it('onImportFileChange finally skips clearInterval when timer id is falsy', async () => {
    vi.useFakeTimers();
    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const file = new File([new Uint8Array([2])], 'ok.pb');
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    const ctx = mount();
    await ctx.onImportFileChange.call(ctx, ev);
    expect(clearSpy).not.toHaveBeenCalled();
    si.mockRestore();
    clearSpy.mockRestore();
  });

  it('onImportFileChange forwards progress from importLocalBackup', async () => {
    vi.useFakeTimers();
    backupMocks.importLocalBackup.mockImplementation(
      (_buf: ArrayBuffer, onProgress?: (p: BackupProgress) => void) => {
        onProgress?.({ phase: 'Importing', current: 2, total: 5 });
        return Promise.resolve({ errors: [] });
      },
    );
    const file = new File([new Uint8Array([1])], 'prog.pb');
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    const ctx = mount();
    await ctx.onImportFileChange.call(ctx, ev);
    expect(ctx.backupProgress).toEqual({ phase: 'Importing', current: 2, total: 5 });
  });

  it('onImportFileChange updates backupElapsedMs while import is in flight', async () => {
    vi.useFakeTimers();
    let t = 100_000;
    const nowSpy = vi.spyOn(Date, 'now').mockImplementation(() => t);
    let finishImport!: (v: { errors: string[] }) => void;
    const held = new Promise<{ errors: string[] }>((resolve) => {
      finishImport = resolve;
    });
    backupMocks.importLocalBackup.mockReturnValue(held);

    const file = new File([new Uint8Array([9])], 'slow.pb');
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    const ctx = mount();
    const done = ctx.onImportFileChange.call(ctx, ev);
    t = 100_250;
    await vi.advanceTimersByTimeAsync(250);
    try {
      expect(ctx.backupElapsedMs).toBe(250);
    } finally {
      finishImport({ errors: [] });
      await done;
      nowSpy.mockRestore();
    }
  });

  it('onImportFileChange completes import and summarizes success and issues', async () => {
    vi.useFakeTimers();
    const file = new File([new Uint8Array([1, 2, 3])], 'b.pb');
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    backupMocks.importLocalBackup.mockResolvedValueOnce({ errors: [] });
    const ctx = mount();
    await ctx.onImportFileChange.call(ctx, ev);
    expect(ctx.backupResultSummary).toContain('Import finished.');
    backupMocks.importLocalBackup.mockResolvedValueOnce({ errors: ['warn'] });
    dt.items.clear();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    await ctx.onImportFileChange.call(ctx, ev);
    expect(ctx.backupResultSummary).toContain('issues');
  });

  it('onImportFileChange records import failure from thrown Error and non-Error', async () => {
    vi.useFakeTimers();
    const file = new File([new Uint8Array([1])], 'c.pb');
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    backupMocks.importLocalBackup.mockRejectedValueOnce(new Error('bad backup'));
    const ctx = mount();
    await ctx.onImportFileChange.call(ctx, ev);
    expect(ctx.backupResultSummary).toBe('Import failed.');
    expect(ctx.backupResultErrors).toEqual(['bad backup']);
    backupMocks.importLocalBackup.mockRejectedValueOnce(99);
    await ctx.onImportFileChange.call(ctx, ev);
    expect(ctx.backupResultErrors).toEqual(['99']);
  });

  it('onImportFileChange maps arrayBuffer rejection non-Error to string', async () => {
    vi.useFakeTimers();
    const file = new File([new Uint8Array([1])], 'd.pb');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue('oops');
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    const ctx = mount();
    await ctx.onImportFileChange.call(ctx, ev);
    expect(ctx.backupResultErrors).toEqual(['oops']);
  });
});
