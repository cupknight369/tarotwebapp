import { logError } from './logError.js';
import type { LocalCorrespondenceGroupRow, LocalCorrespondenceRow } from '../types/localDb.js';
import { DEFAULT_CORRESPONDENCE_GROUP_ID } from '../types/localDb.js';
import type { BackupProgress } from '../types/settings.js';
import {
  openTarotDb,
  STORE_CORRESPONDENCE_GROUPS,
  STORE_CORRESPONDENCES,
  idbRequest,
} from './indexedDb.js';
import {
  createCorrespondenceGroup,
  ensureDefaultCorrespondenceGroup,
  putCorrespondence,
} from './localCorrespondences.js';
import {
  decodeCorrespondenceExport,
  encodeCorrespondenceExport,
  insertCorrespondenceFromProto,
} from './proto/correspondenceExportCodec.js';
import { correspondenceGroupRowFromProto } from './proto/backupCodec.js';
import { cktarot } from '../proto/generated/bundle.js';

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function correspondenceExportFilename(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `cktarot_correspondences_${ts}.pb`;
}

function pushError(errors: string[], msg: string, e: unknown): void {
  logError(`localCorrespondenceExport.${msg}`, e);
  const detail = e instanceof Error ? e.message : String(e);
  errors.push(`${msg}: ${detail}`);
}

/**
 * Exports selected correspondence groups and their entries to a protobuf file.
 *
 * @param groupIds - Non-empty list of group ids to include.
 * @param onProgress - Optional progress callback.
 * @returns Collected errors (empty on full success).
 */
export async function exportCorrespondences(
  groupIds: readonly string[],
  onProgress?: (p: BackupProgress) => void,
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  const report = (phase: string, current: number, total: number) => {
    onProgress?.({ phase, current, total });
  };

  if (groupIds.length === 0) {
    errors.push('Select at least one group to export.');
    return { errors };
  }

  const selected = new Set(groupIds);

  try {
    await ensureDefaultCorrespondenceGroup();
  } catch (e) {
    pushError(errors, 'Failed to prepare correspondence data', e);
    return { errors };
  }

  const db = await openTarotDb();
  let allGroups: LocalCorrespondenceGroupRow[] = [];
  let allCorrespondences: LocalCorrespondenceRow[] = [];

  const total = 3;
  let step = 0;
  report('Reading correspondence data', step, total);
  step += 1;

  try {
    const tx = db.transaction([STORE_CORRESPONDENCE_GROUPS, STORE_CORRESPONDENCES], 'readonly');
    allGroups = (await idbRequest(
      tx.objectStore(STORE_CORRESPONDENCE_GROUPS).getAll(),
    )) as LocalCorrespondenceGroupRow[];
    allCorrespondences = (await idbRequest(
      tx.objectStore(STORE_CORRESPONDENCES).getAll(),
    )) as LocalCorrespondenceRow[];
  } catch (e) {
    pushError(errors, 'Failed to read IndexedDB', e);
    return { errors };
  }

  const groups = allGroups.filter((g) => selected.has(g.id));
  const correspondences = allCorrespondences.filter((c) => selected.has(c.group_id));

  let bytes: Uint8Array;
  try {
    report('Building export', step, total);
    step += 1;
    bytes = await encodeCorrespondenceExport({
      groups,
      correspondences,
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
    a.download = correspondenceExportFilename();
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
 * Imports correspondence data from an export file, always inserting new rows (no overwrites).
 *
 * @param data - File contents.
 * @param onProgress - Optional progress callback.
 * @returns Errors and counts of imported groups and correspondences.
 */
export async function importCorrespondences(
  data: ArrayBuffer,
  onProgress?: (p: BackupProgress) => void,
): Promise<{
  errors: string[];
  importedGroups: number;
  importedCorrespondences: number;
}> {
  const errors: string[] = [];
  const report = (phase: string, current: number, total: number) => {
    onProgress?.({ phase, current, total });
  };

  let exportMsg: cktarot.CktarotCorrespondenceExport;
  try {
    const decoded = decodeCorrespondenceExport(new Uint8Array(data));
    errors.push(...decoded.errors);
    if (decoded.errors.length > 0) {
      return { errors, importedGroups: 0, importedCorrespondences: 0 };
    }
    exportMsg = decoded.export;
  } catch (e) {
    pushError(errors, 'Invalid export file', e);
    return { errors, importedGroups: 0, importedCorrespondences: 0 };
  }

  try {
    await ensureDefaultCorrespondenceGroup();
  } catch (e) {
    pushError(errors, 'Failed to prepare correspondence data', e);
    return { errors, importedGroups: 0, importedCorrespondences: 0 };
  }

  const groupProtos = (exportMsg.groups ?? []) as cktarot.CorrespondenceGroupRow[];
  const corrProtos = (exportMsg.correspondences ?? []) as cktarot.CorrespondenceRow[];
  const total = groupProtos.length + corrProtos.length + 1;
  let step = 0;

  const groupIdMap = new Map<string, string>();
  let importedGroups = 0;

  for (let i = 0; i < groupProtos.length; i++) {
    const gp = groupProtos[i];
    const local = correspondenceGroupRowFromProto(gp);
    try {
      if (local.id === DEFAULT_CORRESPONDENCE_GROUP_ID) {
        groupIdMap.set(local.id, DEFAULT_CORRESPONDENCE_GROUP_ID);
      } else {
        const created = await createCorrespondenceGroup(local.title);
        groupIdMap.set(local.id, created.id);
        importedGroups += 1;
      }
    } catch (e) {
      pushError(errors, `groups import id=${gp.id}`, e);
    }
    report(`Importing groups (${i + 1}/${groupProtos.length})`, step, total);
    step += 1;
    await yieldToUi();
  }

  groupIdMap.set(DEFAULT_CORRESPONDENCE_GROUP_ID, DEFAULT_CORRESPONDENCE_GROUP_ID);

  let importedCorrespondences = 0;
  for (let i = 0; i < corrProtos.length; i++) {
    const proto = corrProtos[i];
    try {
      const row = await insertCorrespondenceFromProto(proto, groupIdMap, errors);
      if (!row) continue;
      await putCorrespondence(row);
      importedCorrespondences += 1;
    } catch (e) {
      pushError(errors, `correspondences import title=${proto.title ?? ''}`, e);
    }
    report(`Importing correspondences (${i + 1}/${corrProtos.length})`, step, total);
    step += 1;
    await yieldToUi();
  }

  report('Done', total, total);
  return { errors, importedGroups, importedCorrespondences };
}
