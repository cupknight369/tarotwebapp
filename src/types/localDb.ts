/** Local saved reading row in IndexedDB `readings` store (`state` is protobuf bytes). */
export interface LocalReadingRow {
  id: string
  name: string
  state: Uint8Array
  updated_at: string
}

/** Local custom deck in IndexedDB `decks` store. */
export interface LocalDeckRow {
  id: string
  title: string
  description: string | null
  created_at: string
  modified_at: string
}

/** Local card in IndexedDB `cards` store (references `cardImages`). */
export interface LocalCardRow {
  id: string
  deck_id: string
  title: string
  number: number
  imageBlobId: string
  censorImageBlobId: string | null
}

/** Blob asset in IndexedDB `cardImages` store. */
export interface LocalCardImageRow {
  id: string
  blob: Blob
  mimeType?: string
  created_at: string
  /** Human-readable source (e.g. original filename) for saves / invalid-card UI — not the blob id. */
  title?: string
}
