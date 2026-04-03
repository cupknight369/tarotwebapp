import Alpine from 'alpinejs';
import type { BackupProgress, SettingsStoreState } from '../types/settings.js';
import { exportLocalBackup, importLocalBackup } from '../lib/localBackup.js';

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

  init() {
    Alpine.effect(() => {
      if ((Alpine.store('settings') as SettingsStoreState).open) {
        void this.refreshStorageEstimate();
      }
    });
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

  backupBusy: false,
  backupProgress: { phase: '', current: 0, total: 1 } as BackupProgress,
  backupStartedAt: 0,
  backupElapsedMs: 0,
  backupResultErrors: [] as string[],
  backupResultSummary: '',
  _backupTimer: null as ReturnType<typeof setInterval> | null,

  getBackupPercent() {
    const t = this.backupProgress.total;
    const c = this.backupProgress.current;
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

  getEtaLabel() {
    const { current, total } = this.backupProgress;
    if (!this.backupBusy || this.backupElapsedMs <= 0 || current <= 0 || current >= total) {
      return '';
    }
    const rate = this.backupElapsedMs / current;
    const sec = Math.max(0, Math.round((rate * (total - current)) / 1000));
    return `Est. remaining: ${this.formatSeconds(sec)}`;
  },

  clearBackupResult() {
    this.backupResultSummary = '';
    this.backupResultErrors = [];
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
}));
