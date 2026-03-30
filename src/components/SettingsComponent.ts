import Alpine from 'alpinejs'
import type { BackupProgress, SettingsStoreState } from '../types/settings.js'
import { exportLocalBackup, importLocalBackup } from '../lib/localBackup.js'

function settingsStore(): SettingsStoreState {
  return Alpine.store('settings') as SettingsStoreState
}

Alpine.data('settingsComponent', () => ({
  backupBusy: false,
  backupProgress: { phase: '', current: 0, total: 1 } as BackupProgress,
  backupStartedAt: 0,
  backupElapsedMs: 0,
  backupResultErrors: [] as string[],
  backupResultSummary: '',
  _backupTimer: null as ReturnType<typeof setInterval> | null,

  getBackupPercent() {
    const t = this.backupProgress.total
    const c = this.backupProgress.current
    if (t <= 0) return 0
    return Math.min(100, Math.round((c / t) * 100))
  },

  formatSeconds(sec: number) {
    if (sec < 60) return `${sec}s`
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}m ${s}s`
  },

  getElapsedLabel() {
    const s = Math.round(this.backupElapsedMs / 1000)
    return `Elapsed: ${this.formatSeconds(s)}`
  },

  getEtaLabel() {
    const { current, total } = this.backupProgress
    if (!this.backupBusy || this.backupElapsedMs <= 0 || current <= 0 || current >= total) {
      return ''
    }
    const rate = this.backupElapsedMs / current
    const sec = Math.max(0, Math.round((rate * (total - current)) / 1000))
    return `Est. remaining: ${this.formatSeconds(sec)}`
  },

  clearBackupResult() {
    this.backupResultSummary = ''
    this.backupResultErrors = []
  },

  openExportConfirm() {
    settingsStore().open = false
    Alpine.store('dialog', {
      open: true,
      type: 'confirm',
      title:
        "This may take some time, please do not exit this window or close your browser. Click 'Begin' to proceed.",
      confirmLabel: 'Begin',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      onConfirm: () => {
        void this.startExport()
      },
      onCancel: () => {
        settingsStore().open = true
      },
    })
  },

  async startExport() {
    if (this.backupBusy) return
    settingsStore().open = true
    this.clearBackupResult()
    this.backupBusy = true
    this.backupProgress = { phase: 'Starting…', current: 0, total: 1 }
    this.backupStartedAt = Date.now()
    this.backupElapsedMs = 0
    this._backupTimer = setInterval(() => {
      this.backupElapsedMs = Date.now() - this.backupStartedAt
    }, 250)
    try {
      const { errors } = await exportLocalBackup((p) => {
        this.backupProgress = { ...p }
      })
      this.backupResultErrors = errors
      this.backupResultSummary =
        errors.length === 0 ? 'Export finished.' : 'Export finished with issues (see below).'
    } catch (e) {
      this.backupResultErrors = [e instanceof Error ? e.message : String(e)]
      this.backupResultSummary = 'Export failed.'
    } finally {
      if (this._backupTimer) {
        clearInterval(this._backupTimer)
        this._backupTimer = null
      }
      this.backupBusy = false
    }
  },

  openImportConfirm() {
    settingsStore().open = false
    Alpine.store('dialog', {
      open: true,
      type: 'confirm',
      title:
        "This may take some time, please do not exit this window or close your browser. Click 'Begin' to choose a backup file.",
      confirmLabel: 'Begin',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      onConfirm: () => {
        document.getElementById('settings-backup-file-input')?.click()
      },
      onCancel: () => {
        settingsStore().open = true
      },
    })
  },

  async onImportFileChange(event: Event) {
    const input = event.target as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (!file || this.backupBusy) return

    settingsStore().open = true
    this.clearBackupResult()
    this.backupBusy = true
    this.backupProgress = { phase: 'Reading file…', current: 0, total: 1 }
    this.backupStartedAt = Date.now()
    this.backupElapsedMs = 0
    this._backupTimer = setInterval(() => {
      this.backupElapsedMs = Date.now() - this.backupStartedAt
    }, 250)

    let text: string
    try {
      text = await file.text()
    } catch (e) {
      if (this._backupTimer) {
        clearInterval(this._backupTimer)
        this._backupTimer = null
      }
      this.backupBusy = false
      this.backupResultErrors = [e instanceof Error ? e.message : String(e)]
      this.backupResultSummary = 'Could not read the file.'
      return
    }

    try {
      const { errors } = await importLocalBackup(text, (p) => {
        this.backupProgress = { ...p }
      })
      this.backupResultErrors = errors
      this.backupResultSummary =
        errors.length === 0
          ? 'Import finished. Reopen deck or reading lists, or refresh the page, if lists look outdated.'
          : 'Import finished with issues (see below). Reopen deck or reading lists, or refresh the page, if lists look outdated.'
    } catch (e) {
      this.backupResultErrors = [e instanceof Error ? e.message : String(e)]
      this.backupResultSummary = 'Import failed.'
    } finally {
      if (this._backupTimer) {
        clearInterval(this._backupTimer)
        this._backupTimer = null
      }
      this.backupBusy = false
    }
  },
}))
