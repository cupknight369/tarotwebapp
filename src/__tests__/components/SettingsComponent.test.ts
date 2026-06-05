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
  listReadingsGrouped: vi.fn(),
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
  const effectCallbacks: Array<() => void> = [];
  return {
    cap,
    effectCallbacks,
    runEffects: () => {
      for (const fn of effectCallbacks) {
        fn();
      }
    },
    Alpine: {
      data: cap.Alpine.data.bind(cap.Alpine),
      store: cap.Alpine.store.bind(cap.Alpine),
      effect: (fn: () => void) => {
        effectCallbacks.push(fn);
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
  listReadingsGrouped: readingMocks.listReadingsGrouped,
}));

vi.mock('../../lib/localDeckExport.js', () => ({
  exportDecks: deckMocks.exportDecks,
  importDecks: deckMocks.importDecks,
}));

vi.mock('../../lib/localDecks.js', () => ({
  listUserCreatedDecks: deckMocks.listUserCreatedDecks,
}));

import '../../components/SettingsComponent.js';
import { DEFAULT_CORRESPONDENCE_GROUP_ID, DEFAULT_READING_GROUP_ID } from '../../types/localDb.js';

const rawStores = alpineBundle.cap.rawStores;

function settingsState(overrides: Partial<SettingsStoreState> = {}): SettingsStoreState {
  return {
    open: false,
    censored: false,
    showDeckTitleOnCanvas: true,
    showCorrespondenceThumbnailsOnCanvas: false,
    showCorrespondenceCountBarOnCanvas: true,
    showCardCountBarOnCanvas: true,
    canvasZoomSensitivity: 100,
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
  closeSettings: () => void;
  focusSettingsFirstInput: () => void;
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
  readingExportSections: {
    group: { id: string; title: string };
    items: { id: string; name: string; updated_at: string; group_id?: string }[];
  }[];
  readingGroupsForExport: { id: string; title: string }[];
  settingsCollapsedReadingGroupIds: Record<string, boolean>;
  isSettingsReadingGroupCollapsed: (groupId: string) => boolean;
  toggleSettingsReadingGroupCollapsed: (groupId: string) => void;
  readingsInExportGroup: (groupId: string) => { id: string; name: string; updated_at: string }[];
  isReadingGroupExportSelected: (groupId: string) => boolean;
  toggleReadingGroupExport: (groupId: string) => void;
  clearReadingSelection: () => void;
  clearCorrespondenceGroupSelection: () => void;
  clearDeckSelection: () => void;
};

function fileChangeEvent(file?: File): Event {
  const input = document.createElement('input');
  input.type = 'file';
  if (file) {
    const dt = new DataTransfer();
    dt.items.add(file);
    Object.defineProperty(input, 'files', { value: dt.files, configurable: true });
  }
  const ev = new Event('change', { bubbles: true });
  Object.defineProperty(ev, 'target', { value: input, enumerable: true });
  return ev;
}

function mount(): SettingsCtx & {
  $refs: Record<string, HTMLElement>;
  $nextTick: (cb?: () => void) => void;
} {
  const f = alpineBundle.cap.getFactory();
  if (!f) {
    throw new Error('settingsComponent factory not registered');
  }
  return {
    ...(f() as SettingsCtx),
    $refs: {},
    $nextTick: (cb?: () => void) => {
      cb?.();
    },
  };
}

function storageEstimateMock(): ReturnType<typeof vi.fn> {
  return (navigator as unknown as { storage: { estimate: ReturnType<typeof vi.fn> } }).storage
    .estimate;
}

describe('settingsComponent (SettingsComponent.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    alpineBundle.effectCallbacks.length = 0;
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
    readingMocks.listReadingsGrouped.mockResolvedValue([
      {
        group: { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
        items: [
          {
            id: 'r1',
            name: 'Celtic Cross',
            updated_at: '2026-05-20T00:00:00.000Z',
            group_id: DEFAULT_READING_GROUP_ID,
          },
          {
            id: 'r2',
            name: 'Three Card',
            updated_at: '2026-05-19T00:00:00.000Z',
            group_id: DEFAULT_READING_GROUP_ID,
          },
        ],
      },
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
    expect(readingMocks.listReadingsGrouped).toHaveBeenCalled();
    expect(ctx.readingsForExport).toHaveLength(2);
    expect(ctx.readingExportSections).toHaveLength(1);
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

  it('closeSettings closes the settings store when not busy', () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.closeSettings.call(ctx);
    expect((rawStores.settings as SettingsStoreState).open).toBe(false);
  });

  it('closeSettings is a no-op while settings transfer is busy', () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.backupBusy = true;
    ctx.closeSettings.call(ctx);
    expect((rawStores.settings as SettingsStoreState).open).toBe(true);
  });

  it('focusSettingsFirstInput focuses the first settings input on the next tick', () => {
    const focus = vi.fn();
    const ctx = mount();
    ctx.$refs.settingsFirstInput = { focus } as unknown as HTMLElement;
    ctx.focusSettingsFirstInput.call(ctx);
    expect(focus).toHaveBeenCalledTimes(1);
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
    ctx.readingsForExport = [
      {
        id: 'r1',
        name: 'A',
        updated_at: '2026-05-20T00:00:00.000Z',
        group_id: DEFAULT_READING_GROUP_ID,
      },
    ];
    ctx.selectedReadingIds = ['r1'];
    expect(ctx.canExportReadings.call(ctx)).toBe(true);
    ctx.toggleReading('r1');
    expect(ctx.canExportReadings.call(ctx)).toBe(false);
    ctx.selectAllReadings.call(ctx);
    expect(ctx.selectedReadingIds).toEqual(['r1']);
  });

  it('toggleReadingGroupExport selects and deselects all readings in a group', () => {
    const ctx = mount();
    ctx.readingExportSections = [
      {
        group: { id: 'g1', title: 'Client' },
        items: [
          { id: 'r1', name: 'A', updated_at: 't', group_id: 'g1' },
          { id: 'r2', name: 'B', updated_at: 't', group_id: 'g1' },
        ],
      },
    ];
    ctx.readingsForExport = ctx.readingExportSections[0].items;
    ctx.selectedReadingIds = [];
    ctx.toggleReadingGroupExport('g1');
    expect(ctx.selectedReadingIds).toEqual(['r1', 'r2']);
    ctx.toggleReadingGroupExport('g1');
    expect(ctx.selectedReadingIds).toEqual([]);
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

  it('init effect resets settingsWereOpen when settings close and reloads on reopen', async () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    const spy = vi.spyOn(ctx, 'refreshStorageEstimate');
    ctx.init.call(ctx);
    await vi.waitFor(() => expect(ctx.storageEstimatePending).toBe(false));
    expect(spy).toHaveBeenCalledTimes(1);

    rawStores.settings = settingsState({ open: false });
    alpineBundle.runEffects();
    rawStores.settings = settingsState({ open: true });
    alpineBundle.runEffects();
    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  it('focusSettingsFirstInput no-ops when ref is missing', () => {
    const ctx = mount();
    ctx.$refs = {};
    expect(() => ctx.focusSettingsFirstInput.call(ctx)).not.toThrow();
  });

  it('loadCorrespondenceGroupsForExport maps Error and non-Error failures', async () => {
    const ctx = mount();
    correspondenceMocks.listCorrespondenceGroups.mockRejectedValueOnce(new Error('load fail'));
    await ctx.loadCorrespondenceGroupsForExport.call(ctx);
    expect(ctx.correspondenceGroupsLoadError).toBe('load fail');
    expect(ctx.correspondenceGroups).toEqual([]);
    correspondenceMocks.listCorrespondenceGroups.mockRejectedValueOnce('x');
    await ctx.loadCorrespondenceGroupsForExport.call(ctx);
    expect(ctx.correspondenceGroupsLoadError).toBe('Could not load correspondence groups.');
  });

  it('toggleCorrespondenceGroup adds unselected groups and clearCorrespondenceGroupSelection empties selection', () => {
    const ctx = mount();
    ctx.correspondenceGroups = [
      { id: DEFAULT_CORRESPONDENCE_GROUP_ID, title: 'Default' },
      { id: 'g1', title: 'Herbs' },
    ];
    ctx.selectedCorrespondenceGroupIds = [DEFAULT_CORRESPONDENCE_GROUP_ID];
    ctx.toggleCorrespondenceGroup('g1');
    expect(ctx.selectedCorrespondenceGroupIds).toEqual([DEFAULT_CORRESPONDENCE_GROUP_ID, 'g1']);
    ctx.clearCorrespondenceGroupSelection.call(ctx);
    expect(ctx.selectedCorrespondenceGroupIds).toEqual([]);
  });

  it('openCorrespondenceExportConfirm opens dialog and onConfirm starts export', () => {
    vi.useFakeTimers();
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.correspondenceGroups = [{ id: 'g1', title: 'Herbs' }];
    ctx.selectedCorrespondenceGroupIds = ['g1'];
    ctx.correspondenceGroupsPending = false;
    const startSpy = vi.spyOn(ctx, 'startCorrespondenceExport');
    ctx.openCorrespondenceExportConfirm.call(ctx);
    expect((rawStores.settings as SettingsStoreState).open).toBe(false);
    (rawStores.dialog as { onConfirm: () => void; onCancel: () => void }).onConfirm();
    expect(startSpy).toHaveBeenCalled();
    (rawStores.dialog as { onCancel: () => void }).onCancel();
    expect((rawStores.settings as SettingsStoreState).open).toBe(true);
  });

  it('startCorrespondenceExport returns when busy or export not allowed', async () => {
    const ctx = mount();
    ctx.correspondenceTransferBusy = true;
    await ctx.startCorrespondenceExport.call(ctx);
    expect(correspondenceMocks.exportCorrespondences).not.toHaveBeenCalled();
    ctx.correspondenceTransferBusy = false;
    ctx.correspondenceGroups = [];
    await ctx.startCorrespondenceExport.call(ctx);
    expect(correspondenceMocks.exportCorrespondences).not.toHaveBeenCalled();
  });

  it('startCorrespondenceExport handles errors, catch, and falsy timer cleanup', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    ctx.correspondenceGroups = [{ id: 'g1', title: 'Herbs' }];
    ctx.selectedCorrespondenceGroupIds = ['g1'];
    ctx.correspondenceGroupsPending = false;

    correspondenceMocks.exportCorrespondences.mockResolvedValueOnce({ errors: ['warn'] });
    await ctx.startCorrespondenceExport.call(ctx);
    expect(ctx.correspondenceResultSummary).toContain('issues');

    correspondenceMocks.exportCorrespondences.mockRejectedValueOnce(new Error('export fail'));
    await ctx.startCorrespondenceExport.call(ctx);
    expect(ctx.correspondenceResultSummary).toBe('Correspondence export failed.');

    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    correspondenceMocks.exportCorrespondences.mockResolvedValueOnce({ errors: [] });
    await ctx.startCorrespondenceExport.call(ctx);
    expect(ctx._correspondenceTimer).toBe(0);
    si.mockRestore();
  });

  it('getCorrespondencePercent elapsed and eta labels mirror backup helpers', () => {
    const ctx = mount();
    ctx.correspondenceProgress = { phase: '', current: 0, total: 0 };
    expect(ctx.getCorrespondencePercent.call(ctx)).toBe(0);
    ctx.correspondenceProgress = { phase: '', current: 2, total: 1 };
    expect(ctx.getCorrespondencePercent.call(ctx)).toBe(100);
    ctx.correspondenceElapsedMs = 90_000;
    expect(ctx.getCorrespondenceElapsedLabel.call(ctx)).toBe('Elapsed: 1m 30s');
    ctx.correspondenceTransferBusy = true;
    ctx.correspondenceElapsedMs = 1000;
    ctx.correspondenceProgress = { phase: 'x', current: 1, total: 4 };
    expect(ctx.getCorrespondenceEtaLabel.call(ctx)).toMatch(/Est\. remaining:/);
  });

  it('clearCorrespondenceResult resets summary and errors', () => {
    const ctx = mount();
    ctx.correspondenceResultSummary = 'x';
    ctx.correspondenceResultErrors = ['a'];
    ctx.clearCorrespondenceResult.call(ctx);
    expect(ctx.correspondenceResultSummary).toBe('');
    expect(ctx.correspondenceResultErrors).toEqual([]);
  });

  it('onCorrespondenceImportFileChange handles no file, busy, read failure, partial import, and catch', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    await ctx.onCorrespondenceImportFileChange.call(ctx, fileChangeEvent());
    expect(correspondenceMocks.importCorrespondences).not.toHaveBeenCalled();

    ctx.correspondenceTransferBusy = true;
    await ctx.onCorrespondenceImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([1])], 'c.pb')),
    );
    expect(correspondenceMocks.importCorrespondences).not.toHaveBeenCalled();
    ctx.correspondenceTransferBusy = false;

    const bad = new File([new Uint8Array([1])], 'bad.pb');
    vi.spyOn(bad, 'arrayBuffer').mockRejectedValue(new Error('read fail'));
    await ctx.onCorrespondenceImportFileChange.call(ctx, fileChangeEvent(bad));
    expect(ctx.correspondenceResultSummary).toBe('Could not read the file.');

    const dispatch = vi.fn();
    vi.stubGlobal('window', { ...window, dispatchEvent: dispatch });
    correspondenceMocks.importCorrespondences.mockResolvedValueOnce({
      errors: ['partial'],
      importedGroups: 0,
      importedCorrespondences: 2,
    });
    await ctx.onCorrespondenceImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([2])], 'partial.pb')),
    );
    expect(dispatch).toHaveBeenCalled();
    expect(ctx.correspondenceResultSummary).toContain('issues');

    correspondenceMocks.importCorrespondences.mockResolvedValueOnce({
      errors: ['partial'],
      importedGroups: 0,
      importedCorrespondences: 0,
    });
    dispatch.mockClear();
    await ctx.onCorrespondenceImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([3])], 'none.pb')),
    );
    expect(dispatch).not.toHaveBeenCalled();

    correspondenceMocks.importCorrespondences.mockRejectedValueOnce('boom');
    await ctx.onCorrespondenceImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([4])], 'fail.pb')),
    );
    expect(ctx.correspondenceResultSummary).toBe('Correspondence import failed.');
    expect(ctx.correspondenceResultErrors).toEqual(['boom']);
  });

  it('loadReadingsForExport maps Error and non-Error failures', async () => {
    const ctx = mount();
    readingMocks.listReadingsGrouped.mockRejectedValueOnce(new Error('readings fail'));
    await ctx.loadReadingsForExport.call(ctx);
    expect(ctx.readingsLoadError).toBe('readings fail');
    readingMocks.listReadingsGrouped.mockRejectedValueOnce(1);
    await ctx.loadReadingsForExport.call(ctx);
    expect(ctx.readingsLoadError).toBe('Could not load readings.');
  });

  it('reading group collapse, selection helpers, and clearReadingSelection', () => {
    const ctx = mount();
    expect(ctx.isSettingsReadingGroupCollapsed('g1')).toBe(false);
    ctx.toggleSettingsReadingGroupCollapsed('g1');
    expect(ctx.isSettingsReadingGroupCollapsed('g1')).toBe(true);
    ctx.toggleSettingsReadingGroupCollapsed('g1');
    expect(ctx.isSettingsReadingGroupCollapsed('g1')).toBe(false);

    expect(ctx.readingsInExportGroup('missing')).toEqual([]);
    expect(ctx.isReadingGroupExportSelected('missing')).toBe(false);
    ctx.toggleReadingGroupExport('missing');

    ctx.readingExportSections = [
      {
        group: { id: 'g1', title: 'Client' },
        items: [{ id: 'r1', name: 'A', updated_at: 't', group_id: 'g1' }],
      },
    ];
    ctx.selectedReadingIds = [];
    ctx.toggleReading('r1');
    expect(ctx.isReadingSelected('r1')).toBe(true);
    ctx.clearReadingSelection.call(ctx);
    expect(ctx.selectedReadingIds).toEqual([]);
  });

  it('formatReadingUpdatedAt returns locale string or raw iso when invalid', () => {
    const ctx = mount();
    const formatted = ctx.formatReadingUpdatedAt('2026-05-20T12:00:00.000Z');
    expect(formatted).not.toBe('2026-05-20T12:00:00.000Z');
    expect(ctx.formatReadingUpdatedAt('not-a-date')).toBe('not-a-date');
  });

  it('openReadingExportConfirm opens dialog; onConfirm and onCancel wired', () => {
    vi.useFakeTimers();
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.readingsForExport = [{ id: 'r1', name: 'A', updated_at: 't' }];
    ctx.selectedReadingIds = ['r1'];
    ctx.readingsPending = false;
    const startSpy = vi.spyOn(ctx, 'startReadingExport');
    ctx.openReadingExportConfirm.call(ctx);
    (rawStores.dialog as { onConfirm: () => void; onCancel: () => void }).onConfirm();
    expect(startSpy).toHaveBeenCalled();
    (rawStores.dialog as { onCancel: () => void }).onCancel();
    expect((rawStores.settings as SettingsStoreState).open).toBe(true);
  });

  it('startReadingExport returns when busy or export not allowed and handles failures', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    ctx.readingTransferBusy = true;
    await ctx.startReadingExport.call(ctx);
    expect(readingMocks.exportReadings).not.toHaveBeenCalled();

    ctx.readingTransferBusy = false;
    ctx.readingsForExport = [];
    await ctx.startReadingExport.call(ctx);
    expect(readingMocks.exportReadings).not.toHaveBeenCalled();

    ctx.readingsForExport = [{ id: 'r1', name: 'A', updated_at: 't' }];
    ctx.selectedReadingIds = ['r1'];
    ctx.readingsPending = false;
    readingMocks.exportReadings.mockResolvedValueOnce({ errors: ['warn'] });
    await ctx.startReadingExport.call(ctx);
    expect(ctx.readingResultSummary).toContain('issues');

    readingMocks.exportReadings.mockRejectedValueOnce(new Error('fail'));
    await ctx.startReadingExport.call(ctx);
    expect(ctx.readingResultSummary).toBe('Reading export failed.');
  });

  it('getReadingPercent elapsed and eta labels mirror backup helpers', () => {
    const ctx = mount();
    ctx.readingProgress = { phase: '', current: 1, total: 2 };
    expect(ctx.getReadingPercent.call(ctx)).toBe(50);
    ctx.readingElapsedMs = 30_000;
    expect(ctx.getReadingElapsedLabel.call(ctx)).toBe('Elapsed: 30s');
    ctx.readingTransferBusy = true;
    ctx.readingProgress = { phase: 'x', current: 1, total: 3 };
    expect(ctx.getReadingEtaLabel.call(ctx)).toMatch(/Est\. remaining:/);
  });

  it('clearReadingResult resets summary and errors', () => {
    const ctx = mount();
    ctx.readingResultSummary = 'x';
    ctx.readingResultErrors = ['a'];
    ctx.clearReadingResult.call(ctx);
    expect(ctx.readingResultSummary).toBe('');
    expect(ctx.readingResultErrors).toEqual([]);
  });

  it('onReadingImportFileChange handles read failure, partial import, and catch', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    const bad = new File([new Uint8Array([1])], 'bad.pb');
    vi.spyOn(bad, 'arrayBuffer').mockRejectedValue('read err');
    await ctx.onReadingImportFileChange.call(ctx, fileChangeEvent(bad));
    expect(ctx.readingResultSummary).toBe('Could not read the file.');

    const dispatch = vi.fn();
    vi.stubGlobal('window', { ...window, dispatchEvent: dispatch });
    readingMocks.importReadings.mockResolvedValueOnce({ errors: ['partial'], importedReadings: 1 });
    await ctx.onReadingImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([2])], 'partial.pb')),
    );
    expect(dispatch).toHaveBeenCalled();

    readingMocks.importReadings.mockResolvedValueOnce({ errors: ['partial'], importedReadings: 0 });
    dispatch.mockClear();
    await ctx.onReadingImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([3])], 'none.pb')),
    );
    expect(dispatch).not.toHaveBeenCalled();

    readingMocks.importReadings.mockRejectedValueOnce(new Error('import fail'));
    await ctx.onReadingImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([4])], 'fail.pb')),
    );
    expect(ctx.readingResultSummary).toBe('Reading import failed.');
  });

  it('loadUserDecksForExport maps Error and non-Error failures', async () => {
    const ctx = mount();
    deckMocks.listUserCreatedDecks.mockRejectedValueOnce(new Error('decks fail'));
    await ctx.loadUserDecksForExport.call(ctx);
    expect(ctx.userDecksLoadError).toBe('decks fail');
    deckMocks.listUserCreatedDecks.mockRejectedValueOnce(null);
    await ctx.loadUserDecksForExport.call(ctx);
    expect(ctx.userDecksLoadError).toBe('Could not load user-created decks.');
  });

  it('toggleDeck adds unselected decks and clearDeckSelection empties selection', () => {
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
    ctx.selectedDeckIds = ['d1'];
    ctx.toggleDeck('d2');
    expect(ctx.selectedDeckIds).toEqual(['d1', 'd2']);
    ctx.clearDeckSelection.call(ctx);
    expect(ctx.selectedDeckIds).toEqual([]);
  });

  it('openDeckExportConfirm opens dialog; onConfirm and onCancel wired', () => {
    vi.useFakeTimers();
    rawStores.settings = settingsState({ open: true });
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
    ctx.userDecksPending = false;
    const startSpy = vi.spyOn(ctx, 'startDeckExport');
    ctx.openDeckExportConfirm.call(ctx);
    (rawStores.dialog as { onConfirm: () => void; onCancel: () => void }).onConfirm();
    expect(startSpy).toHaveBeenCalled();
    (rawStores.dialog as { onCancel: () => void }).onCancel();
    expect((rawStores.settings as SettingsStoreState).open).toBe(true);
  });

  it('startDeckExport returns when busy or export not allowed and handles failures', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    ctx.deckTransferBusy = true;
    await ctx.startDeckExport.call(ctx);
    expect(deckMocks.exportDecks).not.toHaveBeenCalled();

    ctx.deckTransferBusy = false;
    ctx.userDecksForExport = [];
    await ctx.startDeckExport.call(ctx);
    expect(deckMocks.exportDecks).not.toHaveBeenCalled();

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
    ctx.userDecksPending = false;
    deckMocks.exportDecks.mockResolvedValueOnce({ errors: ['warn'] });
    await ctx.startDeckExport.call(ctx);
    expect(ctx.deckResultSummary).toContain('issues');

    deckMocks.exportDecks.mockRejectedValueOnce(404);
    await ctx.startDeckExport.call(ctx);
    expect(ctx.deckResultSummary).toBe('Deck export failed.');
    expect(ctx.deckResultErrors).toEqual(['404']);
  });

  it('getDeckPercent elapsed and eta labels mirror backup helpers', () => {
    const ctx = mount();
    ctx.deckProgress = { phase: '', current: 1, total: 4 };
    expect(ctx.getDeckPercent.call(ctx)).toBe(25);
    ctx.deckElapsedMs = 125_000;
    expect(ctx.getDeckElapsedLabel.call(ctx)).toBe('Elapsed: 2m 5s');
    ctx.deckTransferBusy = true;
    ctx.deckProgress = { phase: 'x', current: 1, total: 5 };
    expect(ctx.getDeckEtaLabel.call(ctx)).toMatch(/Est\. remaining:/);
    ctx.deckTransferBusy = false;
    expect(ctx.getDeckEtaLabel.call(ctx)).toBe('');
  });

  it('clearDeckResult resets summary and errors', () => {
    const ctx = mount();
    ctx.deckResultSummary = 'x';
    ctx.deckResultErrors = ['a'];
    ctx.clearDeckResult.call(ctx);
    expect(ctx.deckResultSummary).toBe('');
    expect(ctx.deckResultErrors).toEqual([]);
  });

  it('onDeckImportFileChange handles read failure, partial import by cards, and catch', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    const bad = new File([new Uint8Array([1])], 'bad.pb');
    vi.spyOn(bad, 'arrayBuffer').mockRejectedValue(new Error('read fail'));
    await ctx.onDeckImportFileChange.call(ctx, fileChangeEvent(bad));
    expect(ctx.deckResultSummary).toBe('Could not read the file.');

    const dispatch = vi.fn();
    vi.stubGlobal('window', { ...window, dispatchEvent: dispatch });
    deckMocks.importDecks.mockResolvedValueOnce({
      errors: ['partial'],
      importedDecks: 0,
      importedCards: 2,
    });
    await ctx.onDeckImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([2])], 'cards.pb')),
    );
    expect(dispatch).toHaveBeenCalled();

    deckMocks.importDecks.mockResolvedValueOnce({
      errors: ['partial'],
      importedDecks: 0,
      importedCards: 0,
    });
    dispatch.mockClear();
    await ctx.onDeckImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([3])], 'none.pb')),
    );
    expect(dispatch).not.toHaveBeenCalled();

    deckMocks.importDecks.mockRejectedValueOnce(new Error('import fail'));
    await ctx.onDeckImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([4])], 'fail.pb')),
    );
    expect(ctx.deckResultSummary).toBe('Deck import failed.');
  });

  it('openCorrespondenceImportConfirm onCancel reopens settings', () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.openCorrespondenceImportConfirm.call(ctx);
    (rawStores.dialog as { onCancel: () => void }).onCancel();
    expect((rawStores.settings as SettingsStoreState).open).toBe(true);
  });

  it('openReadingImportConfirm onCancel reopens settings', () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.openReadingImportConfirm.call(ctx);
    (rawStores.dialog as { onCancel: () => void }).onCancel();
    expect((rawStores.settings as SettingsStoreState).open).toBe(true);
  });

  it('openDeckImportConfirm onCancel reopens settings', () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    ctx.openDeckImportConfirm.call(ctx);
    (rawStores.dialog as { onCancel: () => void }).onCancel();
    expect((rawStores.settings as SettingsStoreState).open).toBe(true);
  });

  it('getEtaLabel returns empty when elapsed is zero or current is zero', () => {
    const ctx = mount();
    ctx.backupBusy = true;
    ctx.backupElapsedMs = 0;
    ctx.backupProgress = { phase: 'x', current: 1, total: 4 };
    expect(ctx.getEtaLabel.call(ctx)).toBe('');
    ctx.backupElapsedMs = 1000;
    ctx.backupProgress = { phase: 'x', current: 0, total: 4 };
    expect(ctx.getEtaLabel.call(ctx)).toBe('');
  });

  it('init effect does not reload data while settings stay open', async () => {
    rawStores.settings = settingsState({ open: true });
    const ctx = mount();
    const spy = vi.spyOn(ctx, 'refreshStorageEstimate');
    ctx.init.call(ctx);
    await vi.waitFor(() => expect(ctx.storageEstimatePending).toBe(false));
    alpineBundle.runEffects();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('getReadingPercent and getDeckPercent return 0 when total is not positive', () => {
    const ctx = mount();
    ctx.readingProgress = { phase: '', current: 5, total: 0 };
    expect(ctx.getReadingPercent.call(ctx)).toBe(0);
    ctx.deckProgress = { phase: '', current: 5, total: -1 };
    expect(ctx.getDeckPercent.call(ctx)).toBe(0);
  });

  it('getCorrespondenceEtaLabel and getReadingEtaLabel return empty when complete or idle', () => {
    const ctx = mount();
    ctx.correspondenceTransferBusy = false;
    expect(ctx.getCorrespondenceEtaLabel.call(ctx)).toBe('');
    ctx.readingTransferBusy = true;
    ctx.readingElapsedMs = 1000;
    ctx.readingProgress = { phase: 'x', current: 3, total: 3 };
    expect(ctx.getReadingEtaLabel.call(ctx)).toBe('');
  });

  it('startCorrespondenceExport forwards progress and updates elapsed timer', async () => {
    vi.useFakeTimers();
    let t = 50_000;
    vi.spyOn(Date, 'now').mockImplementation(() => t);
    let finishExport!: (v: { errors: string[] }) => void;
    correspondenceMocks.exportCorrespondences.mockImplementation(
      (_ids: string[], onProgress?: (p: BackupProgress) => void) => {
        onProgress?.({ phase: 'Pack', current: 2, total: 4 });
        return new Promise((resolve) => {
          finishExport = resolve;
        });
      },
    );
    const ctx = mount();
    ctx.correspondenceGroups = [{ id: 'g1', title: 'Herbs' }];
    ctx.selectedCorrespondenceGroupIds = ['g1'];
    ctx.correspondenceGroupsPending = false;
    const done = ctx.startCorrespondenceExport.call(ctx);
    expect(ctx.correspondenceProgress).toEqual({ phase: 'Pack', current: 2, total: 4 });
    t = 50_250;
    await vi.advanceTimersByTimeAsync(250);
    expect(ctx.correspondenceElapsedMs).toBe(250);
    finishExport({ errors: [] });
    await done;
  });

  it('startCorrespondenceExport maps non-Error rejections', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    ctx.correspondenceGroups = [{ id: 'g1', title: 'Herbs' }];
    ctx.selectedCorrespondenceGroupIds = ['g1'];
    ctx.correspondenceGroupsPending = false;
    correspondenceMocks.exportCorrespondences.mockRejectedValueOnce('nope');
    await ctx.startCorrespondenceExport.call(ctx);
    expect(ctx.correspondenceResultErrors).toEqual(['nope']);
  });

  it('onCorrespondenceImportFileChange updates elapsed timer and forwards import progress', async () => {
    vi.useFakeTimers();
    let t = 80_000;
    vi.spyOn(Date, 'now').mockImplementation(() => t);
    let finish!: (v: {
      errors: string[];
      importedGroups: number;
      importedCorrespondences: number;
    }) => void;
    correspondenceMocks.importCorrespondences.mockImplementation(
      (_buf: ArrayBuffer, onProgress?: (p: BackupProgress) => void) => {
        onProgress?.({ phase: 'Import', current: 1, total: 3 });
        return new Promise((resolve) => {
          finish = resolve;
        });
      },
    );
    const ctx = mount();
    const done = ctx.onCorrespondenceImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([1])], 'slow.pb')),
    );
    t = 80_250;
    await vi.advanceTimersByTimeAsync(250);
    expect(ctx.correspondenceElapsedMs).toBe(250);
    expect(ctx.correspondenceProgress).toEqual({ phase: 'Import', current: 1, total: 3 });
    finish({ errors: [], importedGroups: 0, importedCorrespondences: 0 });
    await done;
  });

  it('onCorrespondenceImportFileChange catch skips clearInterval when timer id is falsy', async () => {
    vi.useFakeTimers();
    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const file = new File([new Uint8Array([1])], 'bad.pb');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('read fail'));
    const ctx = mount();
    await ctx.onCorrespondenceImportFileChange.call(ctx, fileChangeEvent(file));
    expect(clearSpy).not.toHaveBeenCalled();
    si.mockRestore();
    clearSpy.mockRestore();
  });

  it('onCorrespondenceImportFileChange maps arrayBuffer non-Error rejection', async () => {
    vi.useFakeTimers();
    const file = new File([new Uint8Array([1])], 'bad.pb');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue('raw fail');
    const ctx = mount();
    await ctx.onCorrespondenceImportFileChange.call(ctx, fileChangeEvent(file));
    expect(ctx.correspondenceResultErrors).toEqual(['raw fail']);
  });

  it('startReadingExport forwards progress and updates elapsed timer', async () => {
    vi.useFakeTimers();
    let t = 60_000;
    vi.spyOn(Date, 'now').mockImplementation(() => t);
    let finishExport!: (v: { errors: string[] }) => void;
    readingMocks.exportReadings.mockImplementation(
      (_ids: string[], onProgress?: (p: BackupProgress) => void) => {
        onProgress?.({ phase: 'Pack', current: 1, total: 2 });
        return new Promise((resolve) => {
          finishExport = resolve;
        });
      },
    );
    const ctx = mount();
    ctx.readingsForExport = [{ id: 'r1', name: 'A', updated_at: 't' }];
    ctx.selectedReadingIds = ['r1'];
    ctx.readingsPending = false;
    const done = ctx.startReadingExport.call(ctx);
    expect(ctx.readingProgress).toEqual({ phase: 'Pack', current: 1, total: 2 });
    t = 60_250;
    await vi.advanceTimersByTimeAsync(250);
    expect(ctx.readingElapsedMs).toBe(250);
    finishExport({ errors: [] });
    await done;
  });

  it('startReadingExport maps non-Error rejections', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    ctx.readingsForExport = [{ id: 'r1', name: 'A', updated_at: 't' }];
    ctx.selectedReadingIds = ['r1'];
    ctx.readingsPending = false;
    readingMocks.exportReadings.mockRejectedValueOnce(42);
    await ctx.startReadingExport.call(ctx);
    expect(ctx.readingResultErrors).toEqual(['42']);
  });

  it('onReadingImportFileChange no-ops when busy and forwards import progress', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    ctx.readingTransferBusy = true;
    await ctx.onReadingImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([1])], 'busy.pb')),
    );
    expect(readingMocks.importReadings).not.toHaveBeenCalled();

    ctx.readingTransferBusy = false;
    readingMocks.importReadings.mockImplementation(
      (_buf: ArrayBuffer, onProgress?: (p: BackupProgress) => void) => {
        onProgress?.({ phase: 'Import', current: 2, total: 5 });
        return Promise.resolve({ errors: [], importedReadings: 1 });
      },
    );
    await ctx.onReadingImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([2])], 'prog.pb')),
    );
    expect(ctx.readingProgress).toEqual({ phase: 'Import', current: 2, total: 5 });
  });

  it('onReadingImportFileChange catch and finally skip clearInterval when timer id is falsy', async () => {
    vi.useFakeTimers();
    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    readingMocks.importReadings.mockRejectedValueOnce(new Error('import fail'));
    const ctx = mount();
    await ctx.onReadingImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([1])], 'fail.pb')),
    );
    expect(clearSpy).not.toHaveBeenCalled();
    si.mockRestore();
    clearSpy.mockRestore();
  });

  it('startDeckExport forwards progress and updates elapsed timer', async () => {
    vi.useFakeTimers();
    let t = 70_000;
    vi.spyOn(Date, 'now').mockImplementation(() => t);
    let finishExport!: (v: { errors: string[] }) => void;
    deckMocks.exportDecks.mockImplementation(
      (_ids: string[], onProgress?: (p: BackupProgress) => void) => {
        onProgress?.({ phase: 'Pack', current: 3, total: 6 });
        return new Promise((resolve) => {
          finishExport = resolve;
        });
      },
    );
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
    ctx.userDecksPending = false;
    const done = ctx.startDeckExport.call(ctx);
    expect(ctx.deckProgress).toEqual({ phase: 'Pack', current: 3, total: 6 });
    t = 70_250;
    await vi.advanceTimersByTimeAsync(250);
    expect(ctx.deckElapsedMs).toBe(250);
    finishExport({ errors: [] });
    await done;
  });

  it('onDeckImportFileChange no-ops when busy and forwards import progress', async () => {
    vi.useFakeTimers();
    const ctx = mount();
    ctx.deckTransferBusy = true;
    await ctx.onDeckImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([1])], 'busy.pb')),
    );
    expect(deckMocks.importDecks).not.toHaveBeenCalled();

    ctx.deckTransferBusy = false;
    deckMocks.importDecks.mockImplementation(
      (_buf: ArrayBuffer, onProgress?: (p: BackupProgress) => void) => {
        onProgress?.({ phase: 'Import', current: 1, total: 2 });
        return Promise.resolve({ errors: [], importedDecks: 1, importedCards: 0 });
      },
    );
    await ctx.onDeckImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([2])], 'prog.pb')),
    );
    expect(ctx.deckProgress).toEqual({ phase: 'Import', current: 1, total: 2 });
  });

  it('onDeckImportFileChange catch and finally skip clearInterval when timer id is falsy', async () => {
    vi.useFakeTimers();
    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    deckMocks.importDecks.mockRejectedValueOnce('deck fail');
    const ctx = mount();
    await ctx.onDeckImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([1])], 'fail.pb')),
    );
    expect(ctx.deckResultErrors).toEqual(['deck fail']);
    expect(clearSpy).not.toHaveBeenCalled();
    si.mockRestore();
    clearSpy.mockRestore();
  });

  it('onDeckImportFileChange maps arrayBuffer non-Error rejection', async () => {
    vi.useFakeTimers();
    const file = new File([new Uint8Array([1])], 'bad.pb');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue('raw fail');
    const ctx = mount();
    await ctx.onDeckImportFileChange.call(ctx, fileChangeEvent(file));
    expect(ctx.deckResultErrors).toEqual(['raw fail']);
  });

  it('isReadingGroupExportSelected is true when every reading in group is selected', () => {
    const ctx = mount();
    ctx.readingExportSections = [
      {
        group: { id: 'g1', title: 'Client' },
        items: [
          { id: 'r1', name: 'A', updated_at: 't', group_id: 'g1' },
          { id: 'r2', name: 'B', updated_at: 't', group_id: 'g1' },
        ],
      },
    ];
    ctx.selectedReadingIds = ['r1', 'r2'];
    expect(ctx.isReadingGroupExportSelected('g1')).toBe(true);
  });

  it('onReadingImportFileChange updates elapsed timer while import is in flight', async () => {
    vi.useFakeTimers();
    let t = 90_000;
    vi.spyOn(Date, 'now').mockImplementation(() => t);
    let finishImport!: (v: { errors: string[]; importedReadings: number }) => void;
    readingMocks.importReadings.mockReturnValue(
      new Promise((resolve) => {
        finishImport = resolve;
      }),
    );
    const ctx = mount();
    const done = ctx.onReadingImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([1])], 'slow.pb')),
    );
    t = 90_250;
    await vi.advanceTimersByTimeAsync(250);
    expect(ctx.readingElapsedMs).toBe(250);
    finishImport({ errors: [], importedReadings: 0 });
    await done;
  });

  it('onDeckImportFileChange updates elapsed timer while import is in flight', async () => {
    vi.useFakeTimers();
    let t = 95_000;
    vi.spyOn(Date, 'now').mockImplementation(() => t);
    let finishImport!: (v: {
      errors: string[];
      importedDecks: number;
      importedCards: number;
    }) => void;
    deckMocks.importDecks.mockReturnValue(
      new Promise((resolve) => {
        finishImport = resolve;
      }),
    );
    const ctx = mount();
    const done = ctx.onDeckImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([1])], 'slow.pb')),
    );
    t = 95_250;
    await vi.advanceTimersByTimeAsync(250);
    expect(ctx.deckElapsedMs).toBe(250);
    finishImport({ errors: [], importedDecks: 0, importedCards: 0 });
    await done;
  });

  it('startReadingExport finally skips clearInterval when timer id is falsy', async () => {
    vi.useFakeTimers();
    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    readingMocks.exportReadings.mockResolvedValue({ errors: [] });
    const ctx = mount();
    ctx.readingsForExport = [{ id: 'r1', name: 'A', updated_at: 't' }];
    ctx.selectedReadingIds = ['r1'];
    ctx.readingsPending = false;
    await ctx.startReadingExport.call(ctx);
    expect(clearSpy).not.toHaveBeenCalled();
    si.mockRestore();
    clearSpy.mockRestore();
  });

  it('startDeckExport finally skips clearInterval when timer id is falsy', async () => {
    vi.useFakeTimers();
    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    deckMocks.exportDecks.mockResolvedValue({ errors: [] });
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
    ctx.userDecksPending = false;
    await ctx.startDeckExport.call(ctx);
    expect(clearSpy).not.toHaveBeenCalled();
    si.mockRestore();
    clearSpy.mockRestore();
  });

  it('onCorrespondenceImportFileChange maps import Error rejections and finally skips falsy timer', async () => {
    vi.useFakeTimers();
    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    correspondenceMocks.importCorrespondences.mockRejectedValueOnce(new Error('import fail'));
    const ctx = mount();
    await ctx.onCorrespondenceImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([1])], 'fail.pb')),
    );
    expect(ctx.correspondenceResultSummary).toBe('Correspondence import failed.');
    expect(clearSpy).not.toHaveBeenCalled();
    si.mockRestore();
    clearSpy.mockRestore();
  });

  it('onReadingImportFileChange arrayBuffer catch skips clearInterval when timer id is falsy', async () => {
    vi.useFakeTimers();
    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const file = new File([new Uint8Array([1])], 'bad.pb');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue('raw fail');
    const ctx = mount();
    await ctx.onReadingImportFileChange.call(ctx, fileChangeEvent(file));
    expect(ctx.readingResultErrors).toEqual(['raw fail']);
    expect(clearSpy).not.toHaveBeenCalled();
    si.mockRestore();
    clearSpy.mockRestore();
  });

  it('onDeckImportFileChange arrayBuffer catch skips clearInterval when timer id is falsy', async () => {
    vi.useFakeTimers();
    const si = vi
      .spyOn(globalThis, 'setInterval')
      .mockReturnValue(0 as unknown as ReturnType<typeof setInterval>);
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const file = new File([new Uint8Array([1])], 'bad.pb');
    vi.spyOn(file, 'arrayBuffer').mockRejectedValue(new Error('read fail'));
    const ctx = mount();
    await ctx.onDeckImportFileChange.call(ctx, fileChangeEvent(file));
    expect(clearSpy).not.toHaveBeenCalled();
    si.mockRestore();
    clearSpy.mockRestore();
  });

  it('startDeckExport maps non-Error rejections in catch', async () => {
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
    ];
    ctx.selectedDeckIds = ['d1'];
    ctx.userDecksPending = false;
    deckMocks.exportDecks.mockRejectedValueOnce('export fail');
    await ctx.startDeckExport.call(ctx);
    expect(ctx.deckResultErrors).toEqual(['export fail']);
  });

  it('maps Error and non-Error rejections in remaining catch ternaries', async () => {
    vi.useFakeTimers();
    const ctx = mount();

    const bufferErrFile = new File([new Uint8Array([1])], 'buffer-err.pb');
    vi.spyOn(bufferErrFile, 'arrayBuffer').mockRejectedValue(new Error('buffer err'));
    await ctx.onReadingImportFileChange.call(ctx, fileChangeEvent(bufferErrFile));
    expect(ctx.readingResultErrors).toEqual(['buffer err']);

    readingMocks.importReadings.mockRejectedValueOnce('plain import fail');
    await ctx.onReadingImportFileChange.call(
      ctx,
      fileChangeEvent(new File([new Uint8Array([2])], 'plain.pb')),
    );
    expect(ctx.readingResultErrors).toEqual(['plain import fail']);

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
    ctx.userDecksPending = false;
    deckMocks.exportDecks.mockRejectedValueOnce(new Error('deck export err'));
    await ctx.startDeckExport.call(ctx);
    expect(ctx.deckResultErrors).toEqual(['deck export err']);
  });
});
