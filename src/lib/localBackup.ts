import type { LocalCardImageRow, LocalCardRow, LocalDeckRow, LocalReadingRow } from '../types/localDb.js'
import type { BackupProgress, CardImageBackupEntry, CktarotBackupV1 } from '../types/settings.js'
import { BACKUP_VERSION } from '../types/settings.js'
import {
  openTarotDb,
  STORE_CARD_IMAGES,
  STORE_CARDS,
  STORE_DECKS,
  STORE_READINGS,
  idbRequest,
} from './indexedDb.js'
import { putLocalCard, putLocalDeck, putLocalCardImageRow } from './localDecks.js'

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

/** Chunked binary → base64 to avoid call stack limits on large blobs. */
async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer()
  const bytes = new Uint8Array(buf)
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
    if (i % (chunk * 32) === 0) await yieldToUi()
  }
  return btoa(binary)
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bin = atob(base64)
  const len = bin.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' })
}

export function backupFilename(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  return `cktarot_backup_${ts}.json`
}

function pushError(errors: string[], msg: string, e: unknown): void {
  const detail = e instanceof Error ? e.message : String(e)
  errors.push(`${msg}: ${detail}`)
}

export async function exportLocalBackup(
  onProgress?: (p: BackupProgress) => void
): Promise<{ errors: string[] }> {
  const errors: string[] = []
  const report = (phase: string, current: number, total: number) => {
    onProgress?.({ phase, current, total })
  }

  const db = await openTarotDb()
  let decks: LocalDeckRow[] = []
  let cards: LocalCardRow[] = []
  let imageRows: LocalCardImageRow[] = []
  let readings: LocalReadingRow[] = []

  try {
    const tx = db.transaction(
      [STORE_DECKS, STORE_CARDS, STORE_CARD_IMAGES, STORE_READINGS],
      'readonly'
    )
    decks = (await idbRequest(tx.objectStore(STORE_DECKS).getAll())) as LocalDeckRow[]
    cards = (await idbRequest(tx.objectStore(STORE_CARDS).getAll())) as LocalCardRow[]
    imageRows = (await idbRequest(tx.objectStore(STORE_CARD_IMAGES).getAll())) as LocalCardImageRow[]
    readings = (await idbRequest(tx.objectStore(STORE_READINGS).getAll())) as LocalReadingRow[]
  } catch (e) {
    pushError(errors, 'Failed to read IndexedDB', e)
    return { errors }
  }

  const cardImages: CardImageBackupEntry[] = []
  const total =
    1 + imageRows.length + 1 + 1

  let step = 0
  report('Reading local data', step, total)
  step += 1

  for (let i = 0; i < imageRows.length; i++) {
    const row = imageRows[i]
    try {
      const dataBase64 = await blobToBase64(row.blob)
      cardImages.push({
        id: row.id,
        created_at: row.created_at,
        ...(row.mimeType ? { mimeType: row.mimeType } : {}),
        ...(row.title ? { title: row.title } : {}),
        dataBase64,
      })
    } catch (e) {
      pushError(errors, `cardImages encode id=${row.id}`, e)
    }
    step += 1
    report(`Encoding images (${i + 1}/${imageRows.length})`, step, total)
    await yieldToUi()
  }

  const payload: CktarotBackupV1 = {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    decks,
    cards,
    cardImages,
    readings,
  }

  let json: string
  try {
    report('Building JSON file', step, total)
    json = JSON.stringify(payload)
    step += 1
  } catch (e) {
    pushError(errors, 'Failed to serialize backup', e)
    return { errors }
  }

  try {
    report('Downloading file', step, total)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = backupFilename()
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (e) {
    pushError(errors, 'Failed to start download', e)
  }

  return { errors }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === 'object' && !Array.isArray(x)
}

function parseBackupV1(raw: unknown): { backup?: CktarotBackupV1; errors: string[] } {
  const errors: string[] = []
  if (!isRecord(raw)) {
    errors.push('Backup file must be a JSON object.')
    return { errors }
  }
  if (raw.version !== BACKUP_VERSION) {
    errors.push(
      `Unsupported backup version (expected ${BACKUP_VERSION}, got ${String((raw as { version?: unknown }).version)}).`
    )
    return { errors }
  }
  const decks = raw.decks
  const cards = raw.cards
  const cardImages = raw.cardImages
  const readings = raw.readings
  if (!Array.isArray(decks) || !Array.isArray(cards) || !Array.isArray(cardImages) || !Array.isArray(readings)) {
    errors.push('Backup is missing one of: decks, cards, cardImages, readings (must be arrays).')
    return { errors }
  }
  return {
    backup: {
      version: BACKUP_VERSION,
      ...(typeof raw.exportedAt === 'string' ? { exportedAt: raw.exportedAt } : {}),
      decks: decks as LocalDeckRow[],
      cards: cards as LocalCardRow[],
      cardImages: cardImages as CardImageBackupEntry[],
      readings: readings as LocalReadingRow[],
    },
    errors,
  }
}

async function putLocalReadingRow(row: LocalReadingRow): Promise<void> {
  const db = await openTarotDb()
  const tx = db.transaction(STORE_READINGS, 'readwrite')
  await idbRequest(tx.objectStore(STORE_READINGS).put(row))
}

export async function importLocalBackup(
  jsonText: string,
  onProgress?: (p: BackupProgress) => void
): Promise<{ errors: string[] }> {
  const errors: string[] = []
  const report = (phase: string, current: number, total: number) => {
    onProgress?.({ phase, current, total })
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch (e) {
    pushError(errors, 'Invalid JSON', e)
    return { errors }
  }

  const { backup, errors: parseErrors } = parseBackupV1(parsed)
  errors.push(...parseErrors)
  if (!backup) return { errors }

  const { cardImages, decks, cards, readings } = backup
  const total =
    1 + cardImages.length + decks.length + cards.length + readings.length

  let step = 0
  report('Parsing backup', step, total)
  step += 1

  for (let i = 0; i < cardImages.length; i++) {
    const entry = cardImages[i]
    try {
      if (!entry || typeof entry !== 'object') throw new Error('invalid row')
      const id = (entry as CardImageBackupEntry).id
      const dataBase64 = (entry as CardImageBackupEntry).dataBase64
      const created_at = (entry as CardImageBackupEntry).created_at
      if (typeof id !== 'string' || !id) throw new Error('missing id')
      if (typeof dataBase64 !== 'string') throw new Error('missing dataBase64')
      if (typeof created_at !== 'string') throw new Error('missing created_at')
      const mime = typeof entry.mimeType === 'string' ? entry.mimeType : 'application/octet-stream'
      const blob = base64ToBlob(dataBase64, mime)
      const row: LocalCardImageRow = {
        id,
        blob,
        created_at,
        ...(entry.mimeType ? { mimeType: entry.mimeType } : {}),
        ...(typeof entry.title === 'string' && entry.title ? { title: entry.title } : {}),
      }
      await putLocalCardImageRow(row)
    } catch (e) {
      pushError(errors, `cardImages import id=${String((entry as CardImageBackupEntry)?.id)}`, e)
    }
    step += 1
    report(`Restoring images (${i + 1}/${cardImages.length})`, step, total)
    await yieldToUi()
  }

  for (let i = 0; i < decks.length; i++) {
    const row = decks[i]
    try {
      if (!row || typeof row !== 'object') throw new Error('invalid row')
      if (typeof row.id !== 'string' || typeof row.title !== 'string') throw new Error('missing id/title')
      await putLocalDeck(row as LocalDeckRow)
    } catch (e) {
      pushError(errors, `decks import id=${String((row as LocalDeckRow)?.id)}`, e)
    }
    step += 1
    report(`Restoring decks (${i + 1}/${decks.length})`, step, total)
    await yieldToUi()
  }

  for (let i = 0; i < cards.length; i++) {
    const row = cards[i]
    try {
      if (!row || typeof row !== 'object') throw new Error('invalid row')
      const r = row as LocalCardRow
      if (
        typeof r.id !== 'string' ||
        typeof r.deck_id !== 'string' ||
        typeof r.title !== 'string' ||
        typeof r.number !== 'number' ||
        typeof r.imageBlobId !== 'string'
      ) {
        throw new Error('missing required fields')
      }
      await putLocalCard(r)
    } catch (e) {
      pushError(errors, `cards import id=${String((row as LocalCardRow)?.id)}`, e)
    }
    step += 1
    report(`Restoring cards (${i + 1}/${cards.length})`, step, total)
    await yieldToUi()
  }

  for (let i = 0; i < readings.length; i++) {
    const row = readings[i]
    try {
      if (!row || typeof row !== 'object') throw new Error('invalid row')
      const r = row as LocalReadingRow
      if (typeof r.id !== 'string' || typeof r.name !== 'string' || typeof r.updated_at !== 'string') {
        throw new Error('missing id/name/updated_at')
      }
      if (!r.state || typeof r.state !== 'object') throw new Error('missing state')
      await putLocalReadingRow(r)
    } catch (e) {
      pushError(errors, `readings import id=${String((row as LocalReadingRow)?.id)}`, e)
    }
    step += 1
    report(`Restoring readings (${i + 1}/${readings.length})`, step, total)
    await yieldToUi()
  }

  return { errors }
}
