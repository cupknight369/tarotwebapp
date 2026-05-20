import type {
  LocalCardRow,
  LocalCorrespondenceGroupRow,
  LocalCorrespondenceRow,
  LocalDeckRow,
  LocalReadingRow,
} from '../../types/localDb.js';
import { DEFAULT_CORRESPONDENCE_GROUP_ID } from '../../types/localDb.js';
import { BACKUP_VERSION } from '../../types/settings.js';
import { cktarot } from '../../proto/generated/bundle.js';
import { getCardImageRow, putLocalCardImageRow } from '../localDecks.js';
import { getCorrespondenceImageRow, putCorrespondenceImageRow } from '../localCorrespondences.js';

function deckRowToProto(d: LocalDeckRow): cktarot.DeckRow {
  const row = new cktarot.DeckRow();
  row.id = d.id;
  row.title = d.title;
  if (d.description !== null && d.description !== undefined) {
    row.description = d.description;
  }
  row.createdAt = d.created_at;
  row.modifiedAt = d.modified_at;
  row.fromCatalog = d.from_catalog ?? false;
  return row;
}

function deckRowFromProto(d: cktarot.DeckRow): LocalDeckRow {
  return {
    id: d.id,
    title: d.title,
    description: d.description !== undefined && d.description !== '' ? d.description : null,
    created_at: d.createdAt,
    modified_at: d.modifiedAt,
    from_catalog: d.fromCatalog,
  };
}

export function correspondenceGroupToProto(
  d: LocalCorrespondenceGroupRow,
): cktarot.CorrespondenceGroupRow {
  const row = new cktarot.CorrespondenceGroupRow();
  row.id = d.id;
  row.title = d.title;
  return row;
}

export async function correspondenceRowToProto(
  c: LocalCorrespondenceRow,
): Promise<cktarot.CorrespondenceRow> {
  const row = new cktarot.CorrespondenceRow();
  row.id = c.id;
  row.title = c.title;
  if (c.description !== null && c.description !== undefined && c.description !== '') {
    row.description = c.description;
  }
  row.groupId = c.group_id;

  if (c.thumbnailBlobId) {
    const thumb = await getCorrespondenceImageRow(c.thumbnailBlobId);
    if (thumb?.blob) {
      const buf = await thumb.blob.arrayBuffer();
      row.thumbnailData = new Uint8Array(buf);
      if (thumb.mimeType) row.thumbnailMimeType = thumb.mimeType;
    }
  }

  return row;
}

async function cardRowToProto(c: LocalCardRow): Promise<cktarot.CardRow> {
  const row = new cktarot.CardRow();
  row.id = c.id;
  row.deckId = c.deck_id;
  row.title = c.title;
  row.number = c.number;

  const main = await getCardImageRow(c.imageBlobId);
  if (main?.blob) {
    const buf = await main.blob.arrayBuffer();
    row.data = new Uint8Array(buf);
    row.createdAt = main.created_at;
    if (main.mimeType) row.mimeType = main.mimeType;
  }

  if (c.censorImageBlobId) {
    const censor = await getCardImageRow(c.censorImageBlobId);
    if (censor?.blob) {
      const buf = await censor.blob.arrayBuffer();
      row.censoredData = new Uint8Array(buf);
      if (censor.mimeType) row.censoredMimeType = censor.mimeType;
    }
  }

  row.correspondenceIds = [...(c.correspondence_ids ?? [])];
  return row;
}

/**
 * Restore a single backup `CardRow` into IndexedDB image rows + a `LocalCardRow`.
 *
 * @param validCorrespondenceIds - When set, only these ids are kept on the restored card.
 */
export async function materializeCardRowFromProto(
  c: cktarot.CardRow,
  errors: string[],
  validCorrespondenceIds?: ReadonlySet<string>,
): Promise<LocalCardRow | null> {
  const hasMain = c.data && c.data.length > 0;
  if (!hasMain) {
    errors.push(`card id=${c.id}: missing main image data`);
    return null;
  }
  try {
    const mainId = crypto.randomUUID();
    const mime =
      c.mimeType !== undefined && c.mimeType !== null && c.mimeType !== ''
        ? c.mimeType
        : 'application/octet-stream';
    const mainBlob = new Blob([new Uint8Array(c.data as Uint8Array)], { type: mime });
    await putLocalCardImageRow({
      id: mainId,
      blob: mainBlob,
      created_at: c.createdAt || new Date().toISOString(),
      mimeType: mime,
    });

    let censorId: string | null = null;
    if (c.censoredData && c.censoredData.length > 0) {
      const id = crypto.randomUUID();
      const cm =
        c.censoredMimeType !== undefined && c.censoredMimeType !== null && c.censoredMimeType !== ''
          ? c.censoredMimeType
          : 'application/octet-stream';
      const blob = new Blob([new Uint8Array(c.censoredData)], {
        type: cm,
      });
      await putLocalCardImageRow({
        id,
        blob,
        created_at: c.createdAt || new Date().toISOString(),
        mimeType: cm,
      });
      censorId = id;
    }

    const rawCorr = c.correspondenceIds ?? [];
    const correspondence_ids =
      validCorrespondenceIds !== undefined
        ? rawCorr.filter((id) => validCorrespondenceIds.has(id))
        : [...rawCorr];

    return {
      id: c.id,
      deck_id: c.deckId,
      title: c.title,
      number: c.number,
      imageBlobId: mainId,
      censorImageBlobId: censorId,
      correspondence_ids,
    };
  } catch (e) {
    errors.push(`card id=${c.id}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

export function correspondenceGroupRowFromProto(
  g: cktarot.CorrespondenceGroupRow,
): LocalCorrespondenceGroupRow {
  return {
    id: g.id,
    title: (g.title ?? '').trim() || 'Untitled',
  };
}

/**
 * Restore a backup `CorrespondenceRow` into a new IndexedDB row (new thumbnail blob id when present).
 */
export async function materializeCorrespondenceRowFromProto(
  c: cktarot.CorrespondenceRow,
  validGroupIds: ReadonlySet<string>,
  errors: string[],
): Promise<LocalCorrespondenceRow | null> {
  let gid = c.groupId?.trim() ? c.groupId.trim() : DEFAULT_CORRESPONDENCE_GROUP_ID;
  if (!validGroupIds.has(gid)) gid = DEFAULT_CORRESPONDENCE_GROUP_ID;

  let thumbnailBlobId: string | null = null;
  try {
    const hasThumb = c.thumbnailData && c.thumbnailData.length > 0;
    if (hasThumb) {
      const thumbId = crypto.randomUUID();
      const tm =
        c.thumbnailMimeType !== undefined &&
        c.thumbnailMimeType !== null &&
        c.thumbnailMimeType !== ''
          ? c.thumbnailMimeType
          : 'application/octet-stream';
      const blob = new Blob([new Uint8Array(c.thumbnailData as Uint8Array)], { type: tm });
      await putCorrespondenceImageRow({
        id: thumbId,
        blob,
        created_at: new Date().toISOString(),
        mimeType: tm,
      });
      thumbnailBlobId = thumbId;
    }

    return {
      id: c.id,
      title: (c.title ?? '').trim() || 'Untitled',
      description:
        c.description !== undefined && c.description !== null && c.description.trim() !== ''
          ? c.description.trim()
          : null,
      group_id: gid,
      thumbnailBlobId,
    };
  } catch (e) {
    errors.push(`correspondence id=${c.id}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

function readingRowToProto(r: LocalReadingRow): cktarot.ReadingRow {
  const row = new cktarot.ReadingRow();
  row.id = r.id;
  row.name = r.name;
  row.state = r.state instanceof Uint8Array ? r.state : new Uint8Array(r.state);
  row.updatedAt = r.updated_at;
  return row;
}

function readingRowFromProto(r: cktarot.ReadingRow): LocalReadingRow {
  const bytes = r.state instanceof Uint8Array ? r.state : new Uint8Array(r.state);
  return {
    id: r.id,
    name: r.name,
    state: bytes,
    updated_at: r.updatedAt,
  };
}

export async function encodeCktarotBackup(payload: {
  decks: LocalDeckRow[];
  cards: LocalCardRow[];
  readings: LocalReadingRow[];
  correspondenceGroups: LocalCorrespondenceGroupRow[];
  correspondences: LocalCorrespondenceRow[];
  exportedAt?: string;
}): Promise<Uint8Array> {
  const msg = new cktarot.CktarotBackup();
  msg.version = BACKUP_VERSION;
  if (payload.exportedAt) msg.exportedAt = payload.exportedAt;
  msg.decks = payload.decks.map(deckRowToProto);
  msg.cards = await Promise.all(payload.cards.map(cardRowToProto));
  msg.readings = payload.readings.map(readingRowToProto);
  msg.correspondenceGroups = payload.correspondenceGroups.map(correspondenceGroupToProto);
  msg.correspondences = await Promise.all(payload.correspondences.map(correspondenceRowToProto));
  return new Uint8Array(cktarot.CktarotBackup.encode(msg).finish());
}

export function decodeCktarotBackup(bytes: Uint8Array): {
  backup: cktarot.CktarotBackup;
  errors: string[];
} {
  const errors: string[] = [];
  const backup = cktarot.CktarotBackup.decode(bytes);
  if (backup.version !== BACKUP_VERSION) {
    errors.push(`Unsupported backup version (expected ${BACKUP_VERSION}, got ${backup.version}).`);
  }
  return { backup, errors };
}

export function backupToDecks(backup: cktarot.CktarotBackup): LocalDeckRow[] {
  return (backup.decks ?? []).map((d) => deckRowFromProto(d as cktarot.DeckRow));
}

export function backupToReadings(backup: cktarot.CktarotBackup): LocalReadingRow[] {
  return (backup.readings ?? []).map((r) => readingRowFromProto(r as cktarot.ReadingRow));
}
