import type { LocalCardRow, LocalDeckRow, LocalReadingRow } from '../types/localDb.js'

/** State for the global settings store (Alpine.store('settings')). */
export interface SettingsStoreState {
    open: boolean;
    censored: boolean;
}

export const BACKUP_VERSION = 1 as const

export interface BackupProgress {
  phase: string
  current: number
  total: number
}

export interface CardImageBackupEntry {
  id: string
  created_at: string
  mimeType?: string
  title?: string
  dataBase64: string
}

export interface CktarotBackupV1 {
  version: typeof BACKUP_VERSION
  exportedAt?: string
  decks: LocalDeckRow[]
  cards: LocalCardRow[]
  cardImages: CardImageBackupEntry[]
  readings: LocalReadingRow[]
}
