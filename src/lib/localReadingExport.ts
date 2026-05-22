import { logError } from './logError.js';
import type { LocalReadingGroupRow, LocalReadingRow } from '../types/localDb.js';
import { DEFAULT_READING_GROUP_ID } from '../types/localDb.js';
import type { BackupProgress } from '../types/settings.js';
import { openTarotDb, STORE_READING_GROUPS, idbRequest } from './indexedDb.js';
import {
  createReadingGroup,
  ensureDefaultReadingGroup,
  invalidateReadingListCache,
  listAllLocalReadingRowsWithState,
  upsertLocalReadingRow,
} from './localReadings.js';
import {
  decodeReadingExport,
  encodeReadingExport,
  insertReadingFromProto,
} from './proto/readingExportCodec.js';
import { readingGroupRowFromProto } from './proto/backupCodec.js';
import { cktarot } from '../proto/generated/bundle.js';

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function readingExportFilename(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `cktarot_readings_${ts}.pb`;
}

function pushError(errors: string[], msg: string, e: unknown): void {
  logError(`localReadingExport.${msg}`, e);
  const detail = e instanceof Error ? e.message : String(e);
  errors.push(`${msg}: ${detail}`);
}

/**
 * Exports selected readings to a protobuf file.
 *
 * @param readingIds - Non-empty list of reading ids to include.
 * @param onProgress - Optional progress callback.
 * @returns Collected errors (empty on full success).
 */
export async function exportReadings(
  readingIds: readonly string[],
  onProgress?: (p: BackupProgress) => void,
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  const report = (phase: string, current: number, total: number) => {
    onProgress?.({ phase, current, total });
  };

  if (readingIds.length === 0) {
    errors.push('Select at least one reading to export.');
    return { errors };
  }

  const selected = new Set(readingIds);

  try {
    await ensureDefaultReadingGroup();
  } catch (e) {
    pushError(errors, 'Failed to prepare reading data', e);
    return { errors };
  }

  const db = await openTarotDb();
  let allReadings: LocalReadingRow[] = [];
  let allGroups: LocalReadingGroupRow[] = [];

  const total = 3;
  let step = 0;
  report('Reading saved readings', step, total);
  step += 1;

  try {
    allReadings = await listAllLocalReadingRowsWithState();
    const tx = db.transaction([STORE_READING_GROUPS], 'readonly');
    allGroups = (await idbRequest(
      tx.objectStore(STORE_READING_GROUPS).getAll(),
    )) as LocalReadingGroupRow[];
  } catch (e) {
    pushError(errors, 'Failed to read IndexedDB', e);
    return { errors };
  }

  const readings = allReadings.filter((r) => selected.has(r.id));
  const referencedGroupIds = new Set(
    readings.map((r) => (r.group_id?.trim() ? r.group_id : DEFAULT_READING_GROUP_ID)),
  );
  const groups = allGroups.filter((g) => referencedGroupIds.has(g.id));

  let bytes: Uint8Array;
  try {
    report('Building export', step, total);
    step += 1;
    bytes = await encodeReadingExport({
      groups,
      readings,
      exportedAt: new Date().toISOString(),
    });
  } catch (e) {
    pushError(errors, 'Failed to serialize export', e);
    return { errors };
  }

  try {
    report('Downloading file', step, total);
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = readingExportFilename();
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    pushError(errors, 'Failed to start download', e);
  }

  return { errors };
}

/**
 * Imports reading data from an export file, always inserting new rows (no overwrites).
 *
 * @param data - File contents.
 * @param onProgress - Optional progress callback.
 * @returns Errors and count of imported readings.
 */
export async function importReadings(
  data: ArrayBuffer,
  onProgress?: (p: BackupProgress) => void,
): Promise<{
  errors: string[];
  importedReadings: number;
}> {
  const errors: string[] = [];
  const report = (phase: string, current: number, total: number) => {
    onProgress?.({ phase, current, total });
  };

  let exportMsg: cktarot.CktarotReadingExport;
  try {
    const decoded = decodeReadingExport(new Uint8Array(data));
    errors.push(...decoded.errors);
    if (decoded.errors.length > 0) {
      return { errors, importedReadings: 0 };
    }
    exportMsg = decoded.export;
  } catch (e) {
    pushError(errors, 'Invalid export file', e);
    return { errors, importedReadings: 0 };
  }

  try {
    await ensureDefaultReadingGroup();
  } catch (e) {
    pushError(errors, 'Failed to prepare reading data', e);
    return { errors, importedReadings: 0 };
  }

  const groupProtos = (exportMsg.groups ?? []) as cktarot.ReadingGroupRow[];
  const readingProtos = (exportMsg.readings ?? []) as cktarot.ReadingRow[];
  const total = groupProtos.length + readingProtos.length + 1;
  let step = 0;

  const groupIdMap = new Map<string, string>();

  for (let i = 0; i < groupProtos.length; i++) {
    const gp = groupProtos[i];
    const local = readingGroupRowFromProto(gp);
    try {
      if (local.id === DEFAULT_READING_GROUP_ID) {
        groupIdMap.set(local.id, DEFAULT_READING_GROUP_ID);
      } else {
        const created = await createReadingGroup(local.title);
        groupIdMap.set(local.id, created.id);
      }
    } catch (e) {
      pushError(errors, `groups import id=${gp.id}`, e);
    }
    report(`Importing groups (${i + 1}/${groupProtos.length})`, step, total);
    step += 1;
    await yieldToUi();
  }

  groupIdMap.set(DEFAULT_READING_GROUP_ID, DEFAULT_READING_GROUP_ID);

  let importedReadings = 0;
  for (let i = 0; i < readingProtos.length; i++) {
    const proto = readingProtos[i];
    try {
      const row = insertReadingFromProto(proto, groupIdMap, errors);
      if (!row) continue;
      await upsertLocalReadingRow(row);
      importedReadings += 1;
    } catch (e) {
      pushError(errors, `readings import name=${proto.name ?? ''}`, e);
    }
    report(`Importing readings (${i + 1}/${readingProtos.length})`, step, total);
    step += 1;
    await yieldToUi();
  }

  report('Done', total, total);
  invalidateReadingListCache();
  return { errors, importedReadings };
}
