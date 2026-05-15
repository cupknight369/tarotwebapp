/** Local saved reading row in IndexedDB `readings` store (`state` is protobuf bytes). */
export interface LocalReadingRow {
  id: string;
  name: string;
  state: Uint8Array;
  updated_at: string;
}

/** Local custom deck in IndexedDB `decks` store. */
export interface LocalDeckRow {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  modified_at: string;
  /**
   * True when installed from the cloud catalog; false for user-created decks.
   * Omitted on legacy rows until repaired (see `listOnDeviceDeckEntries` migration).
   */
  from_catalog?: boolean;
}

/** Stable id for the built-in correspondence group (always present after DB init). */
export const DEFAULT_CORRESPONDENCE_GROUP_ID = '__cktarot_default_group__';

/** User-defined or built-in correspondence group in IndexedDB. */
export interface LocalCorrespondenceGroupRow {
  id: string;
  title: string;
}

/** Correspondence library entry in IndexedDB (optional thumbnail in `correspondenceImages`). */
export interface LocalCorrespondenceRow {
  id: string;
  title: string;
  description: string | null;
  group_id: string;
  thumbnailBlobId: string | null;
}

/** Local card in IndexedDB `cards` store (references `cardImages`). */
export interface LocalCardRow {
  id: string;
  deck_id: string;
  title: string;
  number: number;
  imageBlobId: string;
  censorImageBlobId: string | null;
  /** Ids of {@link LocalCorrespondenceRow} entries shown for this card on the canvas (local decks only). Omitted on legacy rows. */
  correspondence_ids?: string[];
}

/** Blob asset in IndexedDB `cardImages` store. */
export interface LocalCardImageRow {
  id: string;
  blob: Blob;
  mimeType?: string;
  created_at: string;
  /** Human-readable source (e.g. original filename) for saves / invalid-card UI — not the blob id. */
  title?: string;
}
