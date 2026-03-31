import type { LocalCardImageRow, LocalCardRow, LocalDeckRow, LocalReadingRow } from '../types/localDb.js'
import type { BackupProgress } from '../types/settings.js'
import {
  openTarotDb,
  STORE_CARD_IMAGES,
  STORE_CARDS,
  STORE_DECKS,
  STORE_READINGS,
  idbRequest,
} from './indexedDb.js'
import { putLocalCard, putLocalDeck, putLocalCardImageRow } from './localDecks.js'
import {
  backupToCardImages,
  backupToCards,
  backupToDecks,
  backupToReadings,
  decodeCktarotBackup,
  encodeCktarotBackup,
} from './proto/backupCodec.js'

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

export function backupFilename(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  return `cktarot_backup_${ts}.pb`
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

  const total = 3
  let step = 0
  report('Reading local data', step, total)
  step += 1

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

  let bytes: Uint8Array
  try {
    report('Building backup', step, total)
    step += 1
    bytes = await encodeCktarotBackup({
      decks,
      cards,
      cardImages: imageRows,
      readings,
      exportedAt: new Date().toISOString(),
    })
  } catch (e) {
    pushError(errors, 'Failed to serialize backup', e)
    return { errors }
  }

  try {
    report('Downloading file', step, total)
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' })
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

async function putLocalReadingRow(row: LocalReadingRow): Promise<void> {
  const db = await openTarotDb()
  const tx = db.transaction(STORE_READINGS, 'readwrite')
  await idbRequest(tx.objectStore(STORE_READINGS).put(row))
}

export async function importLocalBackup(
  data: ArrayBuffer,
  onProgress?: (p: BackupProgress) => void
): Promise<{ errors: string[] }> {
  const errors: string[] = []
  const report = (phase: string, current: number, total: number) => {
    onProgress?.({ phase, current, total })
  }

  let backup: ReturnType<typeof decodeCktarotBackup>['backup']
  try {
    const decoded = decodeCktarotBackup(new Uint8Array(data))
    errors.push(...decoded.errors)
    if (decoded.errors.length > 0) return { errors }
    backup = decoded.backup
  } catch (e) {
    pushError(errors, 'Invalid backup file', e)
    return { errors }
  }

  const cardImages = backupToCardImages(backup, errors)
  const decks = backupToDecks(backup)
  const cards = backupToCards(backup)
  const readings = backupToReadings(backup)

  const total = 1 + cardImages.length + decks.length + cards.length + readings.length

  let step = 0
  report('Parsing backup', step, total)
  step += 1

  for (let i = 0; i < cardImages.length; i++) {
    const row = cardImages[i]
    try {
      await putLocalCardImageRow(row)
    } catch (e) {
      pushError(errors, `cardImages import id=${row.id}`, e)
    }
    step += 1
    report(`Restoring images (${i + 1}/${cardImages.length})`, step, total)
    await yieldToUi()
  }

  for (let i = 0; i < decks.length; i++) {
    const row = decks[i]
    try {
      await putLocalDeck(row)
    } catch (e) {
      pushError(errors, `decks import id=${row.id}`, e)
    }
    step += 1
    report(`Restoring decks (${i + 1}/${decks.length})`, step, total)
    await yieldToUi()
  }

  for (let i = 0; i < cards.length; i++) {
    const row = cards[i]
    try {
      await putLocalCard(row)
    } catch (e) {
      pushError(errors, `cards import id=${row.id}`, e)
    }
    step += 1
    report(`Restoring cards (${i + 1}/${cards.length})`, step, total)
    await yieldToUi()
  }

  for (let i = 0; i < readings.length; i++) {
    const row = readings[i]
    try {
      if (!(row.state instanceof Uint8Array)) {
        throw new Error('reading state must be protobuf bytes')
      }
      await putLocalReadingRow(row)
    } catch (e) {
      pushError(errors, `readings import id=${row.id}`, e)
    }
    step += 1
    report(`Restoring readings (${i + 1}/${readings.length})`, step, total)
    await yieldToUi()
  }

  return { errors }
}
