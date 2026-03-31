import type { LocalCardImageRow, LocalCardRow, LocalDeckRow, LocalReadingRow } from '../../types/localDb.js'
import { BACKUP_VERSION } from '../../types/settings.js'
import { cktarot } from '../../proto/generated/bundle.js'

function deckRowToProto(d: LocalDeckRow): cktarot.DeckRow {
  const row = new cktarot.DeckRow()
  row.id = d.id
  row.title = d.title
  if (d.description !== null && d.description !== undefined) {
    row.description = d.description
  }
  row.createdAt = d.created_at
  row.modifiedAt = d.modified_at
  return row
}

function deckRowFromProto(d: cktarot.DeckRow): LocalDeckRow {
  return {
    id: d.id,
    title: d.title,
    description: d.description !== undefined && d.description !== '' ? d.description : null,
    created_at: d.createdAt,
    modified_at: d.modifiedAt,
  }
}

function cardRowToProto(c: LocalCardRow): cktarot.CardRow {
  const row = new cktarot.CardRow()
  row.id = c.id
  row.deckId = c.deck_id
  row.title = c.title
  row.number = c.number
  row.imageBlobId = c.imageBlobId
  if (c.censorImageBlobId !== null && c.censorImageBlobId !== undefined) {
    row.censorImageBlobId = c.censorImageBlobId
  }
  return row
}

function cardRowFromProto(c: cktarot.CardRow): LocalCardRow {
  return {
    id: c.id,
    deck_id: c.deckId,
    title: c.title,
    number: c.number,
    imageBlobId: c.imageBlobId,
    censorImageBlobId:
      c.censorImageBlobId !== undefined && c.censorImageBlobId !== ''
        ? c.censorImageBlobId
        : null,
  }
}

async function cardImageToProto(row: LocalCardImageRow): Promise<cktarot.CardImageRow> {
  const buf = await row.blob.arrayBuffer()
  const img = new cktarot.CardImageRow()
  img.id = row.id
  img.createdAt = row.created_at
  if (row.mimeType) img.mimeType = row.mimeType
  if (row.title) img.title = row.title
  img.data = new Uint8Array(buf)
  return img
}

function cardImageFromProto(
  img: cktarot.CardImageRow,
  errors: string[]
): LocalCardImageRow | null {
  try {
    if (!img.data || img.data.length === 0) throw new Error('missing image data')
    const mime = img.mimeType || 'application/octet-stream'
    const blob = new Blob([new Uint8Array(img.data)], { type: mime })
    return {
      id: img.id,
      blob,
      created_at: img.createdAt,
      ...(img.mimeType ? { mimeType: img.mimeType } : {}),
      ...(img.title ? { title: img.title } : {}),
    }
  } catch (e) {
    errors.push(
      `cardImages id=${img.id}: ${e instanceof Error ? e.message : String(e)}`
    )
    return null
  }
}

function readingRowToProto(r: LocalReadingRow): cktarot.ReadingRow {
  const row = new cktarot.ReadingRow()
  row.id = r.id
  row.name = r.name
  row.state = r.state instanceof Uint8Array ? r.state : new Uint8Array(r.state)
  row.updatedAt = r.updated_at
  return row
}

function readingRowFromProto(r: cktarot.ReadingRow): LocalReadingRow {
  const bytes = r.state instanceof Uint8Array ? r.state : new Uint8Array(r.state)
  return {
    id: r.id,
    name: r.name,
    state: bytes,
    updated_at: r.updatedAt,
  }
}

export async function encodeCktarotBackup(payload: {
  decks: LocalDeckRow[]
  cards: LocalCardRow[]
  cardImages: LocalCardImageRow[]
  readings: LocalReadingRow[]
  exportedAt?: string
}): Promise<Uint8Array> {
  const msg = new cktarot.CktarotBackup()
  msg.version = BACKUP_VERSION
  if (payload.exportedAt) msg.exportedAt = payload.exportedAt
  msg.decks = payload.decks.map(deckRowToProto)
  msg.cards = payload.cards.map(cardRowToProto)
  msg.cardImages = await Promise.all(payload.cardImages.map(cardImageToProto))
  msg.readings = payload.readings.map(readingRowToProto)
  return new Uint8Array(cktarot.CktarotBackup.encode(msg).finish())
}

export function decodeCktarotBackup(bytes: Uint8Array): {
  backup: cktarot.CktarotBackup
  errors: string[]
} {
  const errors: string[] = []
  const backup = cktarot.CktarotBackup.decode(bytes)
  if (backup.version !== BACKUP_VERSION) {
    errors.push(
      `Unsupported backup version (expected ${BACKUP_VERSION}, got ${backup.version}).`
    )
  }
  return { backup, errors }
}

export function backupToDecks(backup: cktarot.CktarotBackup): LocalDeckRow[] {
  return (backup.decks ?? []).map((d) => deckRowFromProto(d as cktarot.DeckRow))
}

export function backupToCards(backup: cktarot.CktarotBackup): LocalCardRow[] {
  return (backup.cards ?? []).map((c) => cardRowFromProto(c as cktarot.CardRow))
}

export function backupToCardImages(
  backup: cktarot.CktarotBackup,
  errors: string[]
): LocalCardImageRow[] {
  const out: LocalCardImageRow[] = []
  for (const img of backup.cardImages ?? []) {
    const row = cardImageFromProto(img as cktarot.CardImageRow, errors)
    if (row) out.push(row)
  }
  return out
}

export function backupToReadings(backup: cktarot.CktarotBackup): LocalReadingRow[] {
  return (backup.readings ?? []).map((r) => readingRowFromProto(r as cktarot.ReadingRow))
}
