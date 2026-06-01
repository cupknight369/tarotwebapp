import Alpine from 'alpinejs';
import type { BackupProgress, SettingsStoreState } from '../types/settings.js';
import { exportLocalBackup, importLocalBackup } from '../lib/localBackup.js';
import { exportCorrespondences, importCorrespondences } from '../lib/localCorrespondenceExport.js';
import { exportDecks, importDecks } from '../lib/localDeckExport.js';
import { exportReadings, importReadings } from '../lib/localReadingExport.js';
import { listCorrespondenceGroups } from '../lib/localCorrespondences.js';
import { listUserCreatedDecks } from '../lib/localDecks.js';
import { listReadingsGrouped } from '../lib/localReadings.js';
import type {
  LocalCorrespondenceGroupRow,
  LocalDeckRow,
  LocalReadingGroupRow,
} from '../types/localDb.js';
import type { ReadingGroupSection, ReadingSummary } from '../types/readingState.js';

function settingsStore(): SettingsStoreState {
  return Alpine.store('settings') as SettingsStoreState;
}

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return '—';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

Alpine.data('settingsComponent', () => ({
  storageEstimate: null as { usage: number; quota: number } | null,
  storageEstimateError: null as string | null,
  storageEstimatePending: false,

  correspondenceGroups: [] as LocalCorrespondenceGroupRow[],
  selectedCorrespondenceGroupIds: [] as string[],
  correspondenceGroupsLoadError: null as string | null,
  correspondenceGroupsPending: false,

  readingsForExport: [] as ReadingSummary[],
  readingExportSections: [] as ReadingGroupSection[],
  readingGroupsForExport: [] as LocalReadingGroupRow[],
  settingsCollapsedReadingGroupIds: {} as Record<string, boolean>,
  selectedReadingIds: [] as string[],
  readingsLoadError: null as string | null,
  readingsPending: false,

  userDecksForExport: [] as LocalDeckRow[],
  selectedDeckIds: [] as string[],
  userDecksLoadError: null as string | null,
  userDecksPending: false,

  init() {
    let settingsWereOpen = false;
    Alpine.effect(() => {
      const open = settingsStore().open;
      if (open && !settingsWereOpen) {
        settingsWereOpen = true;
        void this.refreshStorageEstimate();
        void this.loadCorrespondenceGroupsForExport();
        void this.loadReadingsForExport();
        void this.loadUserDecksForExport();
      } else if (!open) {
        settingsWereOpen = false;
      }
    });
  },

  isSettingsBusy(): boolean {
    return (
      this.backupBusy ||
      this.correspondenceTransferBusy ||
      this.readingTransferBusy ||
      this.deckTransferBusy
    );
  },

  closeSettings() {
    if (this.isSettingsBusy()) {
      return;
    }
    settingsStore().open = false;
  },

  formatStorageLine(): string {
    if (this.storageEstimatePending) return 'Getting storage estimate…';
    if (this.storageEstimateError) return this.storageEstimateError;
    const e = this.storageEstimate;
    if (!e || e.quota <= 0) return 'Storage estimate unavailable.';
    const available = Math.max(0, e.quota - e.usage);
    return `~${formatBytes(available)} available of ${formatBytes(e.quota)} total (${formatBytes(e.usage)} in use) for this site.`;
  },

  async refreshStorageEstimate() {
    this.storageEstimateError = null;
    this.storageEstimatePending = true;
    try {
      if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
        this.storageEstimate = null;
        this.storageEstimateError =
          'Storage estimate is not supported in this context (try a secure HTTPS connection).';
        return;
      }
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      this.storageEstimate = { usage, quota };
    } catch (e) {
      this.storageEstimate = null;
      this.storageEstimateError =
        e instanceof Error ? e.message : 'Could not read storage estimate.';
    } finally {
      this.storageEstimatePending = false;
    }
  },

  async loadCorrespondenceGroupsForExport() {
    this.correspondenceGroupsLoadError = null;
    this.correspondenceGroupsPending = true;
    try {
      const groups = await listCorrespondenceGroups();
      this.correspondenceGroups = groups;
      this.selectedCorrespondenceGroupIds = groups.map((g) => g.id);
    } catch (e) {
      this.correspondenceGroups = [];
      this.selectedCorrespondenceGroupIds = [];
      this.correspondenceGroupsLoadError =
        e instanceof Error ? e.message : 'Could not load correspondence groups.';
    } finally {
      this.correspondenceGroupsPending = false;
    }
  },

  isCorrespondenceGroupSelected(id: string): boolean {
    return this.selectedCorrespondenceGroupIds.includes(id);
  },

  toggleCorrespondenceGroup(id: string) {
    if (this.isCorrespondenceGroupSelected(id)) {
      this.selectedCorrespondenceGroupIds = this.selectedCorrespondenceGroupIds.filter(
        (x) => x !== id,
      );
    } else {
      this.selectedCorrespondenceGroupIds = [...this.selectedCorrespondenceGroupIds, id];
    }
  },

  selectAllCorrespondenceGroups() {
    this.selectedCorrespondenceGroupIds = this.correspondenceGroups.map((g) => g.id);
  },

  clearCorrespondenceGroupSelection() {
    this.selectedCorrespondenceGroupIds = [];
  },

  canExportCorrespondences(): boolean {
    return (
      !this.correspondenceTransferBusy &&
      !this.correspondenceGroupsPending &&
      this.correspondenceGroups.length > 0 &&
      this.selectedCorrespondenceGroupIds.length > 0
    );
  },

  async loadReadingsForExport() {
    this.readingsLoadError = null;
    this.readingsPending = true;
    try {
      const sections = await listReadingsGrouped();
      this.readingExportSections = sections;
      this.readingGroupsForExport = sections.map((s) => s.group);
      const readings = sections.flatMap((s) => s.items);
      this.readingsForExport = readings;
      this.selectedReadingIds = readings.map((r) => r.id);
    } catch (e) {
      this.readingExportSections = [];
      this.readingGroupsForExport = [];
      this.readingsForExport = [];
      this.selectedReadingIds = [];
      this.readingsLoadError = e instanceof Error ? e.message : 'Could not load readings.';
    } finally {
      this.readingsPending = false;
    }
  },

  isSettingsReadingGroupCollapsed(groupId: string): boolean {
    return this.settingsCollapsedReadingGroupIds[groupId] === true;
  },

  toggleSettingsReadingGroupCollapsed(groupId: string) {
    const collapsed = this.isSettingsReadingGroupCollapsed(groupId);
    this.settingsCollapsedReadingGroupIds = {
      ...this.settingsCollapsedReadingGroupIds,
      [groupId]: !collapsed,
    };
  },

  readingsInExportGroup(groupId: string): ReadingSummary[] {
    const section = this.readingExportSections.find((s) => s.group.id === groupId);
    return section?.items ?? [];
  },

  isReadingGroupExportSelected(groupId: string): boolean {
    const items = this.readingsInExportGroup(groupId);
    if (items.length === 0) return false;
    return items.every((r) => this.selectedReadingIds.includes(r.id));
  },

  toggleReadingGroupExport(groupId: string) {
    const items = this.readingsInExportGroup(groupId);
    const ids = items.map((r) => r.id);
    if (ids.length === 0) return;
    if (this.isReadingGroupExportSelected(groupId)) {
      const remove = new Set(ids);
      this.selectedReadingIds = this.selectedReadingIds.filter((id) => !remove.has(id));
    } else {
      const merged = new Set([...this.selectedReadingIds, ...ids]);
      this.selectedReadingIds = [...merged];
    }
  },

  isReadingSelected(id: string): boolean {
    return this.selectedReadingIds.includes(id);
  },

  toggleReading(id: string) {
    if (this.isReadingSelected(id)) {
      this.selectedReadingIds = this.selectedReadingIds.filter((x) => x !== id);
    } else {
      this.selectedReadingIds = [...this.selectedReadingIds, id];
    }
  },

  selectAllReadings() {
    this.selectedReadingIds = this.readingsForExport.map((r) => r.id);
  },

  clearReadingSelection() {
    this.selectedReadingIds = [];
  },

  canExportReadings(): boolean {
    return (
      !this.readingTransferBusy &&
      !this.readingsPending &&
      this.readingsForExport.length > 0 &&
      this.selectedReadingIds.length > 0
    );
  },

  formatReadingUpdatedAt(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  },

  async loadUserDecksForExport() {
    this.userDecksLoadError = null;
    this.userDecksPending = true;
    try {
      const decks = await listUserCreatedDecks();
      this.userDecksForExport = decks;
      this.selectedDeckIds = decks.map((d) => d.id);
    } catch (e) {
      this.userDecksForExport = [];
      this.selectedDeckIds = [];
      this.userDecksLoadError =
        e instanceof Error ? e.message : 'Could not load user-created decks.';
    } finally {
      this.userDecksPending = false;
    }
  },

  isDeckSelected(id: string): boolean {
    return this.selectedDeckIds.includes(id);
  },

  toggleDeck(id: string) {
    if (this.isDeckSelected(id)) {
      this.selectedDeckIds = this.selectedDeckIds.filter((x) => x !== id);
    } else {
      this.selectedDeckIds = [...this.selectedDeckIds, id];
    }
  },

  selectAllDecks() {
    this.selectedDeckIds = this.userDecksForExport.map((d) => d.id);
  },

  clearDeckSelection() {
    this.selectedDeckIds = [];
  },

  canExportDecks(): boolean {
    return (
      !this.deckTransferBusy &&
      !this.userDecksPending &&
      this.userDecksForExport.length > 0 &&
      this.selectedDeckIds.length > 0
    );
  },

  backupBusy: false,
  backupProgress: { phase: '', current: 0, total: 1 } as BackupProgress,
  backupStartedAt: 0,
  backupElapsedMs: 0,
  backupResultErrors: [] as string[],
  backupResultSummary: '',
  _backupTimer: null as ReturnType<typeof setInterval> | null,

  correspondenceTransferBusy: false,
  correspondenceProgress: { phase: '', current: 0, total: 1 } as BackupProgress,
  correspondenceStartedAt: 0,
  correspondenceElapsedMs: 0,
  correspondenceResultErrors: [] as string[],
  correspondenceResultSummary: '',
  _correspondenceTimer: null as ReturnType<typeof setInterval> | null,

  readingTransferBusy: false,
  readingProgress: { phase: '', current: 0, total: 1 } as BackupProgress,
  readingStartedAt: 0,
  readingElapsedMs: 0,
  readingResultErrors: [] as string[],
  readingResultSummary: '',
  _readingTimer: null as ReturnType<typeof setInterval> | null,

  deckTransferBusy: false,
  deckProgress: { phase: '', current: 0, total: 1 } as BackupProgress,
  deckStartedAt: 0,
  deckElapsedMs: 0,
  deckResultErrors: [] as string[],
  deckResultSummary: '',
  _deckTimer: null as ReturnType<typeof setInterval> | null,

  getBackupPercent() {
    const t = this.backupProgress.total;
    const c = this.backupProgress.current;
    if (t <= 0) return 0;
    return Math.min(100, Math.round((c / t) * 100));
  },

  getCorrespondencePercent() {
    const t = this.correspondenceProgress.total;
    const c = this.correspondenceProgress.current;
    if (t <= 0) return 0;
    return Math.min(100, Math.round((c / t) * 100));
  },

  getReadingPercent() {
    const t = this.readingProgress.total;
    const c = this.readingProgress.current;
    if (t <= 0) return 0;
    return Math.min(100, Math.round((c / t) * 100));
  },

  getDeckPercent() {
    const t = this.deckProgress.total;
    const c = this.deckProgress.current;
    if (t <= 0) return 0;
    return Math.min(100, Math.round((c / t) * 100));
  },

  formatSeconds(sec: number) {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s}s`;
  },

  getElapsedLabel() {
    const s = Math.round(this.backupElapsedMs / 1000);
    return `Elapsed: ${this.formatSeconds(s)}`;
  },

  getCorrespondenceElapsedLabel() {
    const s = Math.round(this.correspondenceElapsedMs / 1000);
    return `Elapsed: ${this.formatSeconds(s)}`;
  },

  getReadingElapsedLabel() {
    const s = Math.round(this.readingElapsedMs / 1000);
    return `Elapsed: ${this.formatSeconds(s)}`;
  },

  getDeckElapsedLabel() {
    const s = Math.round(this.deckElapsedMs / 1000);
    return `Elapsed: ${this.formatSeconds(s)}`;
  },

  getEtaLabel() {
    const { current, total } = this.backupProgress;
    if (!this.backupBusy || this.backupElapsedMs <= 0 || current <= 0 || current >= total) {
      return '';
    }
    const rate = this.backupElapsedMs / current;
    const sec = Math.max(0, Math.round((rate * (total - current)) / 1000));
    return `Est. remaining: ${this.formatSeconds(sec)}`;
  },

  getCorrespondenceEtaLabel() {
    const { current, total } = this.correspondenceProgress;
    if (
      !this.correspondenceTransferBusy ||
      this.correspondenceElapsedMs <= 0 ||
      current <= 0 ||
      current >= total
    ) {
      return '';
    }
    const rate = this.correspondenceElapsedMs / current;
    const sec = Math.max(0, Math.round((rate * (total - current)) / 1000));
    return `Est. remaining: ${this.formatSeconds(sec)}`;
  },

  getReadingEtaLabel() {
    const { current, total } = this.readingProgress;
    if (
      !this.readingTransferBusy ||
      this.readingElapsedMs <= 0 ||
      current <= 0 ||
      current >= total
    ) {
      return '';
    }
    const rate = this.readingElapsedMs / current;
    const sec = Math.max(0, Math.round((rate * (total - current)) / 1000));
    return `Est. remaining: ${this.formatSeconds(sec)}`;
  },

  getDeckEtaLabel() {
    const { current, total } = this.deckProgress;
    if (!this.deckTransferBusy || this.deckElapsedMs <= 0 || current <= 0 || current >= total) {
      return '';
    }
    const rate = this.deckElapsedMs / current;
    const sec = Math.max(0, Math.round((rate * (total - current)) / 1000));
    return `Est. remaining: ${this.formatSeconds(sec)}`;
  },

  clearBackupResult() {
    this.backupResultSummary = '';
    this.backupResultErrors = [];
  },

  clearCorrespondenceResult() {
    this.correspondenceResultSummary = '';
    this.correspondenceResultErrors = [];
  },

  clearReadingResult() {
    this.readingResultSummary = '';
    this.readingResultErrors = [];
  },

  clearDeckResult() {
    this.deckResultSummary = '';
    this.deckResultErrors = [];
  },

  openExportConfirm() {
    settingsStore().open = false;
    Alpine.store('dialog', {
      open: true,
      type: 'confirm',
      title:
        "This may take some time, please do not exit this window or close your browser. Click 'Begin' to proceed.",
      confirmLabel: 'Begin',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      onConfirm: () => {
        void this.startExport();
      },
      onCancel: () => {
        settingsStore().open = true;
      },
    });
  },

  async startExport() {
    if (this.backupBusy) return;
    settingsStore().open = true;
    this.clearBackupResult();
    this.backupBusy = true;
    this.backupProgress = { phase: 'Starting…', current: 0, total: 1 };
    this.backupStartedAt = Date.now();
    this.backupElapsedMs = 0;
    this._backupTimer = setInterval(() => {
      this.backupElapsedMs = Date.now() - this.backupStartedAt;
    }, 250);
    try {
      const { errors } = await exportLocalBackup((p) => {
        this.backupProgress = { ...p };
      });
      this.backupResultErrors = errors;
      this.backupResultSummary =
        errors.length === 0 ? 'Export finished.' : 'Export finished with issues (see below).';
    } catch (e) {
      this.backupResultErrors = [e instanceof Error ? e.message : String(e)];
      this.backupResultSummary = 'Export failed.';
    } finally {
      if (this._backupTimer) {
        clearInterval(this._backupTimer);
        this._backupTimer = null;
      }
      this.backupBusy = false;
    }
  },

  openImportConfirm() {
    settingsStore().open = false;
    Alpine.store('dialog', {
      open: true,
      type: 'confirm',
      title:
        "This may take some time, please do not exit this window or close your browser. Click 'Begin' to choose a backup file.",
      confirmLabel: 'Begin',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      onConfirm: () => {
        document.getElementById('settings-backup-file-input')?.click();
      },
      onCancel: () => {
        settingsStore().open = true;
      },
    });
  },

  async onImportFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.backupBusy) return;

    settingsStore().open = true;
    this.clearBackupResult();
    this.backupBusy = true;
    this.backupProgress = { phase: 'Reading file…', current: 0, total: 1 };
    this.backupStartedAt = Date.now();
    this.backupElapsedMs = 0;
    this._backupTimer = setInterval(() => {
      this.backupElapsedMs = Date.now() - this.backupStartedAt;
    }, 250);

    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (e) {
      if (this._backupTimer) {
        clearInterval(this._backupTimer);
        this._backupTimer = null;
      }
      this.backupBusy = false;
      this.backupResultErrors = [e instanceof Error ? e.message : String(e)];
      this.backupResultSummary = 'Could not read the file.';
      return;
    }

    try {
      const { errors } = await importLocalBackup(buffer, (p) => {
        this.backupProgress = { ...p };
      });
      this.backupResultErrors = errors;
      this.backupResultSummary =
        errors.length === 0
          ? 'Import finished. Reopen deck or reading lists, or refresh the page, if lists look outdated.'
          : 'Import finished with issues (see below). Reopen deck or reading lists, or refresh the page, if lists look outdated.';
    } catch (e) {
      this.backupResultErrors = [e instanceof Error ? e.message : String(e)];
      this.backupResultSummary = 'Import failed.';
    } finally {
      if (this._backupTimer) {
        clearInterval(this._backupTimer);
        this._backupTimer = null;
      }
      this.backupBusy = false;
    }
  },

  openCorrespondenceExportConfirm() {
    if (!this.canExportCorrespondences()) return;
    settingsStore().open = false;
    Alpine.store('dialog', {
      open: true,
      type: 'confirm',
      title: "Export selected correspondence groups. Click 'Begin' to proceed.",
      confirmLabel: 'Begin',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      onConfirm: () => {
        void this.startCorrespondenceExport();
      },
      onCancel: () => {
        settingsStore().open = true;
      },
    });
  },

  async startCorrespondenceExport() {
    if (this.correspondenceTransferBusy || !this.canExportCorrespondences()) return;
    settingsStore().open = true;
    this.clearCorrespondenceResult();
    this.correspondenceTransferBusy = true;
    this.correspondenceProgress = { phase: 'Starting…', current: 0, total: 1 };
    this.correspondenceStartedAt = Date.now();
    this.correspondenceElapsedMs = 0;
    this._correspondenceTimer = setInterval(() => {
      this.correspondenceElapsedMs = Date.now() - this.correspondenceStartedAt;
    }, 250);
    try {
      const { errors } = await exportCorrespondences(this.selectedCorrespondenceGroupIds, (p) => {
        this.correspondenceProgress = { ...p };
      });
      this.correspondenceResultErrors = errors;
      this.correspondenceResultSummary =
        errors.length === 0
          ? 'Correspondence export finished.'
          : 'Correspondence export finished with issues (see below).';
    } catch (e) {
      this.correspondenceResultErrors = [e instanceof Error ? e.message : String(e)];
      this.correspondenceResultSummary = 'Correspondence export failed.';
    } finally {
      if (this._correspondenceTimer) {
        clearInterval(this._correspondenceTimer);
        this._correspondenceTimer = null;
      }
      this.correspondenceTransferBusy = false;
    }
  },

  openCorrespondenceImportConfirm() {
    settingsStore().open = false;
    Alpine.store('dialog', {
      open: true,
      type: 'confirm',
      title:
        "Import adds new correspondence entries without replacing existing ones. Click 'Begin' to choose a file.",
      confirmLabel: 'Begin',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      onConfirm: () => {
        document.getElementById('settings-correspondence-file-input')?.click();
      },
      onCancel: () => {
        settingsStore().open = true;
      },
    });
  },

  async onCorrespondenceImportFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.correspondenceTransferBusy) return;

    settingsStore().open = true;
    this.clearCorrespondenceResult();
    this.correspondenceTransferBusy = true;
    this.correspondenceProgress = { phase: 'Reading file…', current: 0, total: 1 };
    this.correspondenceStartedAt = Date.now();
    this.correspondenceElapsedMs = 0;
    this._correspondenceTimer = setInterval(() => {
      this.correspondenceElapsedMs = Date.now() - this.correspondenceStartedAt;
    }, 250);

    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (e) {
      if (this._correspondenceTimer) {
        clearInterval(this._correspondenceTimer);
        this._correspondenceTimer = null;
      }
      this.correspondenceTransferBusy = false;
      this.correspondenceResultErrors = [e instanceof Error ? e.message : String(e)];
      this.correspondenceResultSummary = 'Could not read the file.';
      return;
    }

    try {
      const { errors, importedGroups, importedCorrespondences } = await importCorrespondences(
        buffer,
        (p) => {
          this.correspondenceProgress = { ...p };
        },
      );
      this.correspondenceResultErrors = errors;
      if (errors.length === 0) {
        this.correspondenceResultSummary = `Import finished. Added ${importedGroups} group(s) and ${importedCorrespondences} correspondence(s).`;
        window.dispatchEvent(new CustomEvent('correspondences-changed'));
        void this.loadCorrespondenceGroupsForExport();
      } else {
        this.correspondenceResultSummary =
          'Import finished with issues (see below). Some entries may have been added.';
        if (importedCorrespondences > 0) {
          window.dispatchEvent(new CustomEvent('correspondences-changed'));
          void this.loadCorrespondenceGroupsForExport();
        }
      }
    } catch (e) {
      this.correspondenceResultErrors = [e instanceof Error ? e.message : String(e)];
      this.correspondenceResultSummary = 'Correspondence import failed.';
    } finally {
      if (this._correspondenceTimer) {
        clearInterval(this._correspondenceTimer);
        this._correspondenceTimer = null;
      }
      this.correspondenceTransferBusy = false;
    }
  },

  openReadingExportConfirm() {
    if (!this.canExportReadings()) return;
    settingsStore().open = false;
    Alpine.store('dialog', {
      open: true,
      type: 'confirm',
      title: "Export selected readings. Click 'Begin' to proceed.",
      confirmLabel: 'Begin',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      onConfirm: () => {
        void this.startReadingExport();
      },
      onCancel: () => {
        settingsStore().open = true;
      },
    });
  },

  async startReadingExport() {
    if (this.readingTransferBusy || !this.canExportReadings()) return;
    settingsStore().open = true;
    this.clearReadingResult();
    this.readingTransferBusy = true;
    this.readingProgress = { phase: 'Starting…', current: 0, total: 1 };
    this.readingStartedAt = Date.now();
    this.readingElapsedMs = 0;
    this._readingTimer = setInterval(() => {
      this.readingElapsedMs = Date.now() - this.readingStartedAt;
    }, 250);
    try {
      const { errors } = await exportReadings(this.selectedReadingIds, (p) => {
        this.readingProgress = { ...p };
      });
      this.readingResultErrors = errors;
      this.readingResultSummary =
        errors.length === 0
          ? 'Reading export finished.'
          : 'Reading export finished with issues (see below).';
    } catch (e) {
      this.readingResultErrors = [e instanceof Error ? e.message : String(e)];
      this.readingResultSummary = 'Reading export failed.';
    } finally {
      if (this._readingTimer) {
        clearInterval(this._readingTimer);
        this._readingTimer = null;
      }
      this.readingTransferBusy = false;
    }
  },

  openReadingImportConfirm() {
    settingsStore().open = false;
    Alpine.store('dialog', {
      open: true,
      type: 'confirm',
      title:
        "Import adds new readings without replacing existing ones. Click 'Begin' to choose a file.",
      confirmLabel: 'Begin',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      onConfirm: () => {
        document.getElementById('settings-reading-file-input')?.click();
      },
      onCancel: () => {
        settingsStore().open = true;
      },
    });
  },

  async onReadingImportFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.readingTransferBusy) return;

    settingsStore().open = true;
    this.clearReadingResult();
    this.readingTransferBusy = true;
    this.readingProgress = { phase: 'Reading file…', current: 0, total: 1 };
    this.readingStartedAt = Date.now();
    this.readingElapsedMs = 0;
    this._readingTimer = setInterval(() => {
      this.readingElapsedMs = Date.now() - this.readingStartedAt;
    }, 250);

    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (e) {
      if (this._readingTimer) {
        clearInterval(this._readingTimer);
        this._readingTimer = null;
      }
      this.readingTransferBusy = false;
      this.readingResultErrors = [e instanceof Error ? e.message : String(e)];
      this.readingResultSummary = 'Could not read the file.';
      return;
    }

    try {
      const { errors, importedReadings } = await importReadings(buffer, (p) => {
        this.readingProgress = { ...p };
      });
      this.readingResultErrors = errors;
      if (errors.length === 0) {
        this.readingResultSummary = `Import finished. Added ${importedReadings} reading(s). Reopen reading lists if they look outdated.`;
        window.dispatchEvent(new CustomEvent('readings-changed'));
        void this.loadReadingsForExport();
      } else {
        this.readingResultSummary =
          'Import finished with issues (see below). Some readings may have been added. Reopen reading lists if they look outdated.';
        if (importedReadings > 0) {
          window.dispatchEvent(new CustomEvent('readings-changed'));
          void this.loadReadingsForExport();
        }
      }
    } catch (e) {
      this.readingResultErrors = [e instanceof Error ? e.message : String(e)];
      this.readingResultSummary = 'Reading import failed.';
    } finally {
      if (this._readingTimer) {
        clearInterval(this._readingTimer);
        this._readingTimer = null;
      }
      this.readingTransferBusy = false;
    }
  },

  openDeckExportConfirm() {
    if (!this.canExportDecks()) return;
    settingsStore().open = false;
    Alpine.store('dialog', {
      open: true,
      type: 'confirm',
      title: "Export selected user-created decks. Click 'Begin' to proceed.",
      confirmLabel: 'Begin',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      onConfirm: () => {
        void this.startDeckExport();
      },
      onCancel: () => {
        settingsStore().open = true;
      },
    });
  },

  async startDeckExport() {
    if (this.deckTransferBusy || !this.canExportDecks()) return;
    settingsStore().open = true;
    this.clearDeckResult();
    this.deckTransferBusy = true;
    this.deckProgress = { phase: 'Starting…', current: 0, total: 1 };
    this.deckStartedAt = Date.now();
    this.deckElapsedMs = 0;
    this._deckTimer = setInterval(() => {
      this.deckElapsedMs = Date.now() - this.deckStartedAt;
    }, 250);
    try {
      const { errors } = await exportDecks(this.selectedDeckIds, (p) => {
        this.deckProgress = { ...p };
      });
      this.deckResultErrors = errors;
      this.deckResultSummary =
        errors.length === 0
          ? 'Deck export finished.'
          : 'Deck export finished with issues (see below).';
    } catch (e) {
      this.deckResultErrors = [e instanceof Error ? e.message : String(e)];
      this.deckResultSummary = 'Deck export failed.';
    } finally {
      if (this._deckTimer) {
        clearInterval(this._deckTimer);
        this._deckTimer = null;
      }
      this.deckTransferBusy = false;
    }
  },

  openDeckImportConfirm() {
    settingsStore().open = false;
    Alpine.store('dialog', {
      open: true,
      type: 'confirm',
      title:
        "Import adds new user-created decks without replacing existing ones. Click 'Begin' to choose a file.",
      confirmLabel: 'Begin',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      onConfirm: () => {
        document.getElementById('settings-deck-file-input')?.click();
      },
      onCancel: () => {
        settingsStore().open = true;
      },
    });
  },

  async onDeckImportFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.deckTransferBusy) return;

    settingsStore().open = true;
    this.clearDeckResult();
    this.deckTransferBusy = true;
    this.deckProgress = { phase: 'Reading file…', current: 0, total: 1 };
    this.deckStartedAt = Date.now();
    this.deckElapsedMs = 0;
    this._deckTimer = setInterval(() => {
      this.deckElapsedMs = Date.now() - this.deckStartedAt;
    }, 250);

    let buffer: ArrayBuffer;
    try {
      buffer = await file.arrayBuffer();
    } catch (e) {
      if (this._deckTimer) {
        clearInterval(this._deckTimer);
        this._deckTimer = null;
      }
      this.deckTransferBusy = false;
      this.deckResultErrors = [e instanceof Error ? e.message : String(e)];
      this.deckResultSummary = 'Could not read the file.';
      return;
    }

    try {
      const { errors, importedDecks, importedCards } = await importDecks(buffer, (p) => {
        this.deckProgress = { ...p };
      });
      this.deckResultErrors = errors;
      if (errors.length === 0) {
        this.deckResultSummary = `Import finished. Added ${importedDecks} deck(s) and ${importedCards} card(s).`;
        window.dispatchEvent(new CustomEvent('decks-changed'));
        void this.loadUserDecksForExport();
      } else {
        this.deckResultSummary =
          'Import finished with issues (see below). Some decks or cards may have been added.';
        if (importedDecks > 0 || importedCards > 0) {
          window.dispatchEvent(new CustomEvent('decks-changed'));
          void this.loadUserDecksForExport();
        }
      }
    } catch (e) {
      this.deckResultErrors = [e instanceof Error ? e.message : String(e)];
      this.deckResultSummary = 'Deck import failed.';
    } finally {
      if (this._deckTimer) {
        clearInterval(this._deckTimer);
        this._deckTimer = null;
      }
      this.deckTransferBusy = false;
    }
  },
}));
