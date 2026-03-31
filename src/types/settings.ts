/** State for the global settings store (Alpine.store('settings')). */
export interface SettingsStoreState {
    open: boolean;
    censored: boolean;
}

/** Protobuf `CktarotBackup.version` field — must match generated backup files. */
export const BACKUP_VERSION = 1 as const

export interface BackupProgress {
  phase: string
  current: number
  total: number
}
