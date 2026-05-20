import type { LocalReadingRow } from '../../types/localDb.js';
import { READING_EXPORT_VERSION } from '../../types/settings.js';
import { cktarot } from '../../proto/generated/bundle.js';
import { readingRowToProto } from './backupCodec.js';

/**
 * Encodes readings into a standalone export file.
 *
 * @param payload - Readings to include in the export.
 * @returns Serialized protobuf bytes.
 */
export async function encodeReadingExport(payload: {
  readings: LocalReadingRow[];
  exportedAt?: string;
}): Promise<Uint8Array> {
  const msg = new cktarot.CktarotReadingExport();
  msg.version = READING_EXPORT_VERSION;
  if (payload.exportedAt) msg.exportedAt = payload.exportedAt;
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
  if (exportMsg.version !== READING_EXPORT_VERSION) {
    errors.push(
      `Unsupported reading export version (expected ${READING_EXPORT_VERSION}, got ${exportMsg.version}).`,
    );
  }
  return { export: exportMsg, errors };
}

/**
 * Inserts a reading from an export row with a new id (never preserves exported ids).
 *
 * @param r - Protobuf reading row from export file.
 * @param errors - Collects non-fatal errors.
 * @returns Local row ready for IndexedDB put, or null on failure.
 */
export function insertReadingFromProto(
  r: cktarot.ReadingRow,
  errors: string[],
): LocalReadingRow | null {
  try {
    const bytes = r.state instanceof Uint8Array ? r.state : new Uint8Array(r.state);
    if (!(bytes instanceof Uint8Array) || bytes.length === 0) {
      throw new Error('reading state must be non-empty protobuf bytes');
    }
    return {
      id: crypto.randomUUID(),
      name: (r.name ?? '').trim() || 'Untitled Reading',
      state: bytes,
      updated_at: r.updatedAt?.trim() ? r.updatedAt.trim() : new Date().toISOString(),
    };
  } catch (e) {
    errors.push(
      `reading import name=${r.name ?? ''}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
}
