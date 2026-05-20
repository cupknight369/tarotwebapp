import type { LocalCorrespondenceGroupRow, LocalCorrespondenceRow } from '../../types/localDb.js';
import { DEFAULT_CORRESPONDENCE_GROUP_ID } from '../../types/localDb.js';
import { CORRESPONDENCE_EXPORT_VERSION } from '../../types/settings.js';
import { cktarot } from '../../proto/generated/bundle.js';
import { putCorrespondenceImageRow } from '../localCorrespondences.js';
import { correspondenceGroupToProto, correspondenceRowToProto } from './backupCodec.js';

/**
 * Encodes correspondence groups and entries into a standalone export file.
 *
 * @param payload - Groups and correspondences to include in the export.
 * @returns Serialized protobuf bytes.
 */
export async function encodeCorrespondenceExport(payload: {
  groups: LocalCorrespondenceGroupRow[];
  correspondences: LocalCorrespondenceRow[];
  exportedAt?: string;
}): Promise<Uint8Array> {
  const msg = new cktarot.CktarotCorrespondenceExport();
  msg.version = CORRESPONDENCE_EXPORT_VERSION;
  if (payload.exportedAt) msg.exportedAt = payload.exportedAt;
  msg.groups = payload.groups.map(correspondenceGroupToProto);
  msg.correspondences = await Promise.all(payload.correspondences.map(correspondenceRowToProto));
  return new Uint8Array(cktarot.CktarotCorrespondenceExport.encode(msg).finish());
}

/**
 * Decodes a correspondence export file.
 *
 * @param bytes - File contents.
 * @returns Decoded export and validation errors (non-empty means reject import).
 */
export function decodeCorrespondenceExport(bytes: Uint8Array): {
  export: cktarot.CktarotCorrespondenceExport;
  errors: string[];
} {
  const errors: string[] = [];
  let exportMsg: cktarot.CktarotCorrespondenceExport;
  try {
    exportMsg = cktarot.CktarotCorrespondenceExport.decode(bytes);
  } catch (e) {
    errors.push(
      `Invalid correspondence export file: ${e instanceof Error ? e.message : String(e)}`,
    );
    return { export: new cktarot.CktarotCorrespondenceExport(), errors };
  }
  if (exportMsg.version !== CORRESPONDENCE_EXPORT_VERSION) {
    errors.push(
      `Unsupported correspondence export version (expected ${CORRESPONDENCE_EXPORT_VERSION}, got ${exportMsg.version}).`,
    );
  }
  return { export: exportMsg, errors };
}

/**
 * Inserts a correspondence from an export row with new ids (never preserves exported ids).
 *
 * @param c - Protobuf correspondence row from export file.
 * @param groupIdMap - Maps exported `groupId` to local group id.
 * @param errors - Collects non-fatal errors.
 * @returns Local row ready for `putCorrespondence`, or null on failure.
 */
export async function insertCorrespondenceFromProto(
  c: cktarot.CorrespondenceRow,
  groupIdMap: ReadonlyMap<string, string>,
  errors: string[],
): Promise<LocalCorrespondenceRow | null> {
  const exportedGid = c.groupId?.trim() ? c.groupId.trim() : DEFAULT_CORRESPONDENCE_GROUP_ID;
  const gid = groupIdMap.get(exportedGid) ?? DEFAULT_CORRESPONDENCE_GROUP_ID;

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
      id: crypto.randomUUID(),
      title: (c.title ?? '').trim() || 'Untitled',
      description:
        c.description !== undefined && c.description !== null && c.description.trim() !== ''
          ? c.description.trim()
          : null,
      group_id: gid,
      thumbnailBlobId,
    };
  } catch (e) {
    errors.push(
      `correspondence import title=${c.title ?? ''}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
}
