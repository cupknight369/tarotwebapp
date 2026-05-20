/** State for the global settings store (Alpine.store('settings')). */
export interface SettingsStoreState {
  open: boolean;
  censored: boolean;
  /** When false, the active deck name is hidden in the bottom-left of the canvas. */
  showDeckTitleOnCanvas: boolean;
  /** When true, correspondence thumbnails render in a row under each local card image on the canvas. */
  showCorrespondenceThumbnailsOnCanvas: boolean;
  /** When true, the correspondence count status bar is shown on the left side of the canvas. */
  showCorrespondenceCountBarOnCanvas: boolean;
  /** When true, the card count status bar is shown on the left side of the canvas. */
  showCardCountBarOnCanvas: boolean;
}

/** Protobuf `CktarotBackup.version` field — must match generated backup files. */
export const BACKUP_VERSION = 1 as const;

/** Protobuf `CktarotCorrespondenceExport.version` field — must match correspondence export files. */
export const CORRESPONDENCE_EXPORT_VERSION = 1 as const;

/** Protobuf `CktarotReadingExport.version` field — must match reading export files. */
export const READING_EXPORT_VERSION = 1 as const;

export interface BackupProgress {
  phase: string;
  current: number;
  total: number;
}
