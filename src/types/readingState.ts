/** Serialized state for a saved reading (stored in DB). */
export interface SavedReadingState {
  viewport: { scale: number; offsetX: number; offsetY: number };
  cards: Array<{
    id: string;
    deck_id: string;
    card_id: string;
    /** Snapshot names to help restore after local deck/card deletion. */
    deck_title?: string;
    card_title?: string;
    /** Cloud: storage object key; local IndexedDB: image blob id. */
    image_source?: string;
    censor_image_source?: string | null;
    /** Embedded main image (from on-device card at save time). */
    image_created_at?: string;
    mime_type?: string;
    data?: Uint8Array;
    censored_data?: Uint8Array;
    censored_mime_type?: string;
    /** Snapshot card number for placeholder when art is missing. */
    card_number?: number;
    x: number;
    y: number;
    /** Card image rotation in degrees. */
    rotation: number;
    zIndex: number;
    opacity: number;
  }>;
  textLabels: Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline';
    color: string;
    zIndex: number;
    anchorCardId: string | null;
    anchorPosition: 'above' | 'below' | 'left' | 'right' | null;
    fixedWidth: boolean;
    fixedWidthPx: number;
  }>;
}

import type { LocalReadingGroupRow } from './localDb.js';

export interface ReadingSummary {
  id: string;
  name: string;
  updated_at: string;
  group_id: string;
}

/** Group with its readings for list UI. */
export interface ReadingGroupSection {
  group: LocalReadingGroupRow;
  items: ReadingSummary[];
}
