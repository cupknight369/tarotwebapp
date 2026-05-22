import type { LocalReadingGroupRow, LocalReadingRow } from '../../types/localDb.js';
import { DEFAULT_READING_GROUP_ID } from '../../types/localDb.js';
import { READING_EXPORT_VERSION } from '../../types/settings.js';
import { cktarot } from '../../proto/generated/bundle.js';
import { readingGroupToProto, readingRowToProto } from './backupCodec.js';

const SUPPORTED_READING_EXPORT_VERSIONS = [1, 2] as const;

/**
 * Encodes readings and referenced groups into a standalone export file.
 *
 * @param payload - Groups and readings to include in the export.
 * @returns Serialized protobuf bytes.
 */
export async function encodeReadingExport(payload: {
  groups: LocalReadingGroupRow[];
  readings: LocalReadingRow[];
  exportedAt?: string;
}): Promise<Uint8Array> {
  const msg = new cktarot.CktarotReadingExport();
  msg.version = READING_EXPORT_VERSION;
  if (payload.exportedAt) msg.exportedAt = payload.exportedAt;
  msg.groups = payload.groups.map(readingGroupToProto);
  msg.readings = payload.readings.map(readingRowToProto);
  return new Uint8Array(cktarot.CktarotReadingExport.encode(msg).finish());
}

/**
 * Decodes a reading export file.
 *
 * @param bytes - File contents.
 * @returns Decoded export and validation errors (non-empty means reject import).
 */
export function decodeReadingExport(bytes: Uint8Array): {
  export: cktarot.CktarotReadingExport;
  errors: string[];
} {
  const errors: string[] = [];
  let exportMsg: cktarot.CktarotReadingExport;
  try {
    exportMsg = cktarot.CktarotReadingExport.decode(bytes);
  } catch (e) {
    errors.push(`Invalid reading export file: ${e instanceof Error ? e.message : String(e)}`);
    return { export: new cktarot.CktarotReadingExport(), errors };
  }
  if (
    !SUPPORTED_READING_EXPORT_VERSIONS.includes(
      exportMsg.version as (typeof SUPPORTED_READING_EXPORT_VERSIONS)[number],
    )
  ) {
    errors.push(
      `Unsupported reading export version (expected ${SUPPORTED_READING_EXPORT_VERSIONS.join(' or ')}, got ${exportMsg.version}).`,
    );
  }
  return { export: exportMsg, errors };
}

/**
 * Inserts a reading from an export row with a new id (never preserves exported ids).
 *
 * @param r - Protobuf reading row from export file.
 * @param groupIdMap - Maps exported `groupId` to local group id.
 * @param errors - Collects non-fatal errors.
 * @returns Local row ready for IndexedDB put, or null on failure.
 */
export function insertReadingFromProto(
  r: cktarot.ReadingRow,
  groupIdMap: ReadonlyMap<string, string>,
  errors: string[],
): LocalReadingRow | null {
  try {
    const bytes = r.state instanceof Uint8Array ? r.state : new Uint8Array(r.state);
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
      throw new Error('reading state must be non-empty protobuf bytes');
    }
    const exportedGid = r.groupId?.trim() ? r.groupId.trim() : DEFAULT_READING_GROUP_ID;
    const gid = groupIdMap.get(exportedGid) ?? DEFAULT_READING_GROUP_ID;
    return {
      id: crypto.randomUUID(),
      name: (r.name ?? '').trim() || 'Untitled Reading',
      state: bytes,
      updated_at: r.updatedAt?.trim() ? r.updatedAt.trim() : new Date().toISOString(),
      group_id: gid,
    };
  } catch (e) {
    errors.push(
      `reading import name=${r.name ?? ''}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
}
