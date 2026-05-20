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

const correspondenceMocks = vi.hoisted(() => ({
  exportCorrespondences: vi.fn(),
  importCorrespondences: vi.fn(),
  listCorrespondenceGroups: vi.fn(),
}));

const readingMocks = vi.hoisted(() => ({
  exportReadings: vi.fn(),
  importReadings: vi.fn(),
  listLocalReadings: vi.fn(),
}));

const deckMocks = vi.hoisted(() => ({
  exportDecks: vi.fn(),
  importDecks: vi.fn(),
  listUserCreatedDecks: vi.fn(),
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

vi.mock('../../lib/localCorrespondenceExport.js', () => ({
  exportCorrespondences: correspondenceMocks.exportCorrespondences,
  importCorrespondences: correspondenceMocks.importCorrespondences,
}));

vi.mock('../../lib/localCorrespondences.js', () => ({
  listCorrespondenceGroups: correspondenceMocks.listCorrespondenceGroups,
}));

vi.mock('../../lib/localReadingExport.js', () => ({
  exportReadings: readingMocks.exportReadings,
  importReadings: readingMocks.importReadings,
}));

vi.mock('../../lib/localReadings.js', () => ({
  listLocalReadings: readingMocks.listLocalReadings,
}));

vi.mock('../../lib/localDeckExport.js', () => ({
  exportDecks: deckMocks.exportDecks,
  importDecks: deckMocks.importDecks,
}));

vi.mock('../../lib/localDecks.js', () => ({
  listUserCreatedDecks: deckMocks.listUserCreatedDecks,
}));

import '../../components/SettingsComponent.js';
import { DEFAULT_CORRESPONDENCE_GROUP_ID } from '../../types/localDb.js';

const rawStores = alpineBundle.cap.rawStores;

function settingsState(overrides: Partial<SettingsStoreState> = {}): SettingsStoreState {
  return {
    open: false,
    censored: false,
    showDeckTitleOnCanvas: true,
    showCorrespondenceThumbnailsOnCanvas: false,
    showCorrespondenceCountBarOnCanvas: true,
    showCardCountBarOnCanvas: true,
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
  correspondenceGroups: { id: string; title: string }[];
  selectedCorrespondenceGroupIds: string[];
  correspondenceGroupsLoadError: string | null;
  correspondenceGroupsPending: boolean;
  isSettingsBusy: () => boolean;
  loadCorrespondenceGroupsForExport: () => Promise<void>;
  isCorrespondenceGroupSelected: (id: string) => boolean;
  toggleCorrespondenceGroup: (id: string) => void;
  selectAllCorrespondenceGroups: () => void;
  clearCorrespondenceGroupSelection: () => void;
  canExportCorrespondences: () => boolean;
  correspondenceTransferBusy: boolean;
  correspondenceProgress: { phase: string; current: number; total: number };
  correspondenceStartedAt: number;
  correspondenceElapsedMs: number;
  correspondenceResultErrors: string[];
  correspondenceResultSummary: string;
  _correspondenceTimer: ReturnType<typeof setInterval> | null;
  getCorrespondencePercent: () => number;
  getCorrespondenceElapsedLabel: () => string;
  getCorrespondenceEtaLabel: () => string;
  clearCorrespondenceResult: () => void;
  openCorrespondenceExportConfirm: () => void;
  startCorrespondenceExport: () => Promise<void>;
  openCorrespondenceImportConfirm: () => void;
  onCorrespondenceImportFileChange: (event: Event) => Promise<void>;
  readingsForExport: { id: string; name: string; updated_at: string }[];
  selectedReadingIds: string[];
  readingsLoadError: string | null;
  readingsPending: boolean;
  loadReadingsForExport: () => Promise<void>;
  isReadingSelected: (id: string) => boolean;
  toggleReading: (id: string) => void;
  selectAllReadings: () => void;
  clearReadingSelection: () => void;
  canExportReadings: () => boolean;
  formatReadingUpdatedAt: (iso: string) => string;
  readingTransferBusy: boolean;
  readingProgress: { phase: string; current: number; total: number };
  readingStartedAt: number;
  readingElapsedMs: number;
  readingResultErrors: string[];
  readingResultSummary: string;
  _readingTimer: ReturnType<typeof setInterval> | null;
  getReadingPercent: () => number;
  getReadingElapsedLabel: () => string;
  getReadingEtaLabel: () => string;
  clearReadingResult: () => void;
  openReadingExportConfirm: () => void;
  startReadingExport: () => Promise<void>;
  openReadingImportConfirm: () => void;
  onReadingImportFileChange: (event: Event) => Promise<void>;
  userDecksForExport: {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    modified_at: string;
    from_catalog?: boolean;
  }[];
  selectedDeckIds: string[];
  userDecksLoadError: string | null;
  userDecksPending: boolean;
  loadUserDecksForExport: () => Promise<void>;
  isDeckSelected: (id: string) => boolean;
  toggleDeck: (id: string) => void;
  selectAllDecks: () => void;
  clearDeckSelection: () => void;
  canExportDecks: () => boolean;
  deckTransferBusy: boolean;
  deckProgress: { phase: string; current: number; total: number };
  deckStartedAt: number;
  deckElapsedMs: number;
  deckResultErrors: string[];
  deckResultSummary: string;
  _deckTimer: ReturnType<typeof setInterval> | null;
  getDeckPercent: () => number;
  getDeckElapsedLabel: () => string;
  getDeckEtaLabel: () => string;
  clearDeckResult: () => void;
  openDeckExportConfirm: () => void;
  startDeckExport: () => Promise<void>;
  openDeckImportConfirm: () => void;
  onDeckImportFileChange: (event: Event) => Promise<void>;
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
    correspondenceMocks.exportCorrespondences.mockResolvedValue({ errors: [] });
    correspondenceMocks.importCorrespondences.mockResolvedValue({
      errors: [],
      importedGroups: 1,
      importedCorrespondences: 2,
    });
    correspondenceMocks.listCorrespondenceGroups.mockResolvedValue([
      { id: DEFAULT_CORRESPONDENCE_GROUP_ID, title: 'Default' },
      { id: 'g1', title: 'Herbs' },
    ]);
    readingMocks.exportReadings.mockResolvedValue({ errors: [] });
    readingMocks.importReadings.mockResolvedValue({
      errors: [],
      importedReadings: 2,
    });
    readingMocks.listLocalReadings.mockResolvedValue([
      { id: 'r1', name: 'Celtic Cross', updated_at: '2026-05-20T00:00:00.000Z' },
      { id: 'r2', name: 'Three Card', updated_at: '2026-05-19T00:00:00.000Z' },
    ]);
    deckMocks.exportDecks.mockResolvedValue({ errors: [] });
    deckMocks.importDecks.mockResolvedValue({
      errors: [],
      importedDecks: 1,
      importedCards: 3,
    });
    deckMocks.listUserCreatedDecks.mockResolvedValue([
      {
        id: 'd1',
        title: 'My Deck',
        description: null,
        created_at: '2026-05-20T00:00:00.000Z',
        modified_at: '2026-05-20T00:00:00.000Z',
        from_catalog: false,
      },
      {
        id: 'd2',
        title: 'Other',
        description: null,
        created_at: '2026-05-19T00:00:00.000Z',
        modified_at: '2026-05-19T00:00:00.000Z',
        from_catalog: false,
      },
    ]);
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

  it('init loads correspondence groups when settings opens', async () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.init.call(ctx);
    await vi.waitFor(() => expect(ctx.correspondenceGroupsPending).toBe(false));
    expect(correspondenceMocks.listCorrespondenceGroups).toHaveBeenCalled();
    expect(ctx.correspondenceGroups).toHaveLength(2);
    expect(ctx.selectedCorrespondenceGroupIds).toEqual([DEFAULT_CORRESPONDENCE_GROUP_ID, 'g1']);
  });

  it('init loads readings when settings opens', async () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.init.call(ctx);
    await vi.waitFor(() => expect(ctx.readingsPending).toBe(false));
    expect(readingMocks.listLocalReadings).toHaveBeenCalled();
    expect(ctx.readingsForExport).toHaveLength(2);
    expect(ctx.selectedReadingIds).toEqual(['r1', 'r2']);
  });

  it('init loads user-created decks when settings opens', async () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.init.call(ctx);
    await vi.waitFor(() => expect(ctx.userDecksPending).toBe(false));
    expect(deckMocks.listUserCreatedDecks).toHaveBeenCalled();
    expect(ctx.userDecksForExport).toHaveLength(2);
    expect(ctx.selectedDeckIds).toEqual(['d1', 'd2']);
  });

  it('isSettingsBusy is true when backup, correspondence, reading, or deck transfer is busy', () => {
    const ctx = mount();
    expect(ctx.isSettingsBusy.call(ctx)).toBe(false);
    ctx.backupBusy = true;
    expect(ctx.isSettingsBusy.call(ctx)).toBe(true);
    ctx.backupBusy = false;
    ctx.correspondenceTransferBusy = true;
    expect(ctx.isSettingsBusy.call(ctx)).toBe(true);
    ctx.correspondenceTransferBusy = false;
    ctx.readingTransferBusy = true;
    expect(ctx.isSettingsBusy.call(ctx)).toBe(true);
    ctx.readingTransferBusy = false;
    ctx.deckTransferBusy = true;
    expect(ctx.isSettingsBusy.call(ctx)).toBe(true);
  });

  it('toggleCorrespondenceGroup and canExportCorrespondences gate export', () => {
    const ctx = mount();
    ctx.correspondenceGroups = [{ id: DEFAULT_CORRESPONDENCE_GROUP_ID, title: 'Default' }];
    ctx.selectedCorrespondenceGroupIds = [DEFAULT_CORRESPONDENCE_GROUP_ID];
    expect(ctx.canExportCorrespondences.call(ctx)).toBe(true);
    ctx.toggleCorrespondenceGroup(DEFAULT_CORRESPONDENCE_GROUP_ID);
    expect(ctx.canExportCorrespondences.call(ctx)).toBe(false);
    ctx.selectAllCorrespondenceGroups.call(ctx);
    expect(ctx.selectedCorrespondenceGroupIds).toEqual([DEFAULT_CORRESPONDENCE_GROUP_ID]);
  });

  it('openCorrespondenceExportConfirm no-ops when export not allowed', () => {
    const ctx = mount();
    ctx.correspondenceGroups = [];
    ctx.openCorrespondenceExportConfirm.call(ctx);
    expect(rawStores.dialog).toBeUndefined();
  });

  it('startCorrespondenceExport calls exportCorrespondences with selected group ids', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    ctx.correspondenceGroups = [
      { id: DEFAULT_CORRESPONDENCE_GROUP_ID, title: 'Default' },
      { id: 'g1', title: 'Herbs' },
    ];
    ctx.selectedCorrespondenceGroupIds = ['g1'];
    ctx.correspondenceGroupsPending = false;
    await ctx.startCorrespondenceExport.call(ctx);
    expect(correspondenceMocks.exportCorrespondences).toHaveBeenCalledWith(
      ['g1'],
      expect.any(Function),
    );
    expect(ctx.correspondenceResultSummary).toBe('Correspondence export finished.');
  });

  it('openCorrespondenceImportConfirm wires file input click', () => {
    rawStores.settings = settingsState({ open: true });
    const input = document.createElement('input');
    input.id = 'settings-correspondence-file-input';
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    document.body.appendChild(input);
    const ctx = mount();
    ctx.openCorrespondenceImportConfirm.call(ctx);
    (rawStores.dialog as { onConfirm: () => void }).onConfirm();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('onCorrespondenceImportFileChange dispatches correspondences-changed on success', async () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    vi.stubGlobal('window', { ...window, dispatchEvent: dispatch });
    const file = new File([new Uint8Array([1])], 'corr.pb');
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    const ctx = mount();
    await ctx.onCorrespondenceImportFileChange.call(ctx, ev);
    expect(dispatch).toHaveBeenCalled();
    const evt = dispatch.mock.calls[0][0] as CustomEvent;
    expect(evt.type).toBe('correspondences-changed');
    expect(ctx.correspondenceResultSummary).toContain('Added 1 group(s) and 2 correspondence(s)');
  });

  it('toggleReading and canExportReadings gate export', () => {
    const ctx = mount();
    ctx.readingsForExport = [{ id: 'r1', name: 'A', updated_at: '2026-05-20T00:00:00.000Z' }];
    ctx.selectedReadingIds = ['r1'];
    expect(ctx.canExportReadings.call(ctx)).toBe(true);
    ctx.toggleReading('r1');
    expect(ctx.canExportReadings.call(ctx)).toBe(false);
    ctx.selectAllReadings.call(ctx);
    expect(ctx.selectedReadingIds).toEqual(['r1']);
  });

  it('openReadingExportConfirm no-ops when export not allowed', () => {
    const ctx = mount();
    ctx.readingsForExport = [];
    ctx.openReadingExportConfirm.call(ctx);
    expect(rawStores.dialog).toBeUndefined();
  });

  it('startReadingExport calls exportReadings with selected reading ids', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    ctx.readingsForExport = [
      { id: 'r1', name: 'A', updated_at: '2026-05-20T00:00:00.000Z' },
      { id: 'r2', name: 'B', updated_at: '2026-05-19T00:00:00.000Z' },
    ];
    ctx.selectedReadingIds = ['r2'];
    ctx.readingsPending = false;
    await ctx.startReadingExport.call(ctx);
    expect(readingMocks.exportReadings).toHaveBeenCalledWith(['r2'], expect.any(Function));
    expect(ctx.readingResultSummary).toBe('Reading export finished.');
  });

  it('openReadingImportConfirm wires file input click', () => {
    rawStores.settings = settingsState({ open: true });
    const input = document.createElement('input');
    input.id = 'settings-reading-file-input';
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    document.body.appendChild(input);
    const ctx = mount();
    ctx.openReadingImportConfirm.call(ctx);
    (rawStores.dialog as { onConfirm: () => void }).onConfirm();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('onReadingImportFileChange dispatches readings-changed on success', async () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    vi.stubGlobal('window', { ...window, dispatchEvent: dispatch });
    const file = new File([new Uint8Array([1])], 'readings.pb');
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    const ctx = mount();
    await ctx.onReadingImportFileChange.call(ctx, ev);
    expect(dispatch).toHaveBeenCalled();
    const evt = dispatch.mock.calls[0][0] as CustomEvent;
    expect(evt.type).toBe('readings-changed');
    expect(ctx.readingResultSummary).toContain('Added 2 reading(s)');
  });

  it('toggleDeck and canExportDecks gate export', () => {
    const ctx = mount();
    ctx.userDecksForExport = [
      {
        id: 'd1',
        title: 'A',
        description: null,
        created_at: '1',
        modified_at: '1',
        from_catalog: false,
      },
    ];
    ctx.selectedDeckIds = ['d1'];
    expect(ctx.canExportDecks.call(ctx)).toBe(true);
    ctx.toggleDeck('d1');
    expect(ctx.canExportDecks.call(ctx)).toBe(false);
    ctx.selectAllDecks.call(ctx);
    expect(ctx.selectedDeckIds).toEqual(['d1']);
  });

  it('openDeckExportConfirm no-ops when export not allowed', () => {
    const ctx = mount();
    ctx.userDecksForExport = [];
    ctx.openDeckExportConfirm.call(ctx);
    expect(rawStores.dialog).toBeUndefined();
  });

  it('startDeckExport calls exportDecks with selected deck ids', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    ctx.userDecksForExport = [
      {
        id: 'd1',
        title: 'A',
        description: null,
        created_at: '1',
        modified_at: '1',
        from_catalog: false,
      },
      {
        id: 'd2',
        title: 'B',
        description: null,
        created_at: '2',
        modified_at: '2',
        from_catalog: false,
      },
    ];
    ctx.selectedDeckIds = ['d2'];
    ctx.userDecksPending = false;
    await ctx.startDeckExport.call(ctx);
    expect(deckMocks.exportDecks).toHaveBeenCalledWith(['d2'], expect.any(Function));
    expect(ctx.deckResultSummary).toBe('Deck export finished.');
  });

  it('openDeckImportConfirm wires file input click', () => {
    rawStores.settings = settingsState({ open: true });
    const input = document.createElement('input');
    input.id = 'settings-deck-file-input';
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});
    document.body.appendChild(input);
    const ctx = mount();
    ctx.openDeckImportConfirm.call(ctx);
    (rawStores.dialog as { onConfirm: () => void }).onConfirm();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('onDeckImportFileChange dispatches decks-changed on success', async () => {
    vi.useFakeTimers();
    const dispatch = vi.fn();
    vi.stubGlobal('window', { ...window, dispatchEvent: dispatch });
    const file = new File([new Uint8Array([1])], 'decks.pb');
    const input = document.createElement('input');
    input.type = 'file';
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
    const ev = new Event('change', { bubbles: true });
    Object.defineProperty(ev, 'target', { value: input, enumerable: true });
    const ctx = mount();
    await ctx.onDeckImportFileChange.call(ctx, ev);
    expect(dispatch).toHaveBeenCalled();
    const evt = dispatch.mock.calls[0][0] as CustomEvent;
    expect(evt.type).toBe('decks-changed');
    expect(ctx.deckResultSummary).toContain('Added 1 deck(s) and 3 card(s)');
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
