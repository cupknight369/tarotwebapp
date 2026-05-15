import type {
  LocalCardImageRow,
  LocalCardRow,
  LocalCorrespondenceGroupRow,
  LocalCorrespondenceRow,
} from '../types/localDb.js';
import { DEFAULT_CORRESPONDENCE_GROUP_ID } from '../types/localDb.js';
import {
  STORE_CARDS,
  STORE_CORRESPONDENCE_GROUPS,
  STORE_CORRESPONDENCE_IMAGES,
  STORE_CORRESPONDENCES,
  idbRequest,
  openTarotDb,
} from './indexedDb.js';
import { getLocalCardsByIds, normalizeLocalCardRow, putLocalCard } from './localDecks.js';

const correspondenceBlobUrlById = new Map<string, string>();

export function getCachedCorrespondenceThumbUrl(blobId: string): string | undefined {
  return correspondenceBlobUrlById.get(blobId);
}

export function setCachedCorrespondenceThumbUrl(blobId: string, url: string): void {
  const prev = correspondenceBlobUrlById.get(blobId);
  if (prev && prev !== url) URL.revokeObjectURL(prev);
  correspondenceBlobUrlById.set(blobId, url);
}

export function revokeCorrespondenceThumbBlobUrl(blobId: string): void {
  const u = correspondenceBlobUrlById.get(blobId);
  if (u) {
    URL.revokeObjectURL(u);
    correspondenceBlobUrlById.delete(blobId);
  }
}

/** True if `url` is the live deck-style cache entry for a correspondence thumbnail blob. */
export function isCorrespondenceThumbUrlManagedByCache(url: string): boolean {
  for (const u of correspondenceBlobUrlById.values()) {
    if (u === url) return true;
  }
  return false;
}

/**
 * Ensures the built-in default group row exists (covers fake-IDB upgrades without a transaction).
 */
export async function ensureDefaultCorrespondenceGroup(): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CORRESPONDENCE_GROUPS, 'readwrite');
  const store = tx.objectStore(STORE_CORRESPONDENCE_GROUPS);
  const existing = (await idbRequest(store.get(DEFAULT_CORRESPONDENCE_GROUP_ID))) as
    | LocalCorrespondenceGroupRow
    | undefined;
  if (!existing) {
    await idbRequest(
      store.put({
        id: DEFAULT_CORRESPONDENCE_GROUP_ID,
        title: 'Default',
      } satisfies LocalCorrespondenceGroupRow),
    );
  }
}

export async function listCorrespondenceGroups(): Promise<LocalCorrespondenceGroupRow[]> {
  await ensureDefaultCorrespondenceGroup();
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CORRESPONDENCE_GROUPS, 'readonly');
  const rows = (await idbRequest(
    tx.objectStore(STORE_CORRESPONDENCE_GROUPS).getAll(),
  )) as LocalCorrespondenceGroupRow[];
  return rows.sort((a, b) => {
    if (a.id === DEFAULT_CORRESPONDENCE_GROUP_ID) return -1;
    if (b.id === DEFAULT_CORRESPONDENCE_GROUP_ID) return 1;
    return a.title.localeCompare(b.title);
  });
}

export async function putCorrespondenceGroup(row: LocalCorrespondenceGroupRow): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CORRESPONDENCE_GROUPS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_CORRESPONDENCE_GROUPS).put(row));
}

export async function createCorrespondenceGroup(
  title: string,
): Promise<LocalCorrespondenceGroupRow> {
  const row: LocalCorrespondenceGroupRow = {
    id: crypto.randomUUID(),
    title: title.trim(),
  };
  await putCorrespondenceGroup(row);
  return row;
}

/**
 * Deletes a user group after moving its correspondences to the default group.
 */
export async function deleteCorrespondenceGroup(groupId: string): Promise<void> {
  if (groupId === DEFAULT_CORRESPONDENCE_GROUP_ID) {
    throw new Error('Cannot delete the built-in default group.');
  }
  await ensureDefaultCorrespondenceGroup();
  const correspondences = await listCorrespondencesAll();
  for (const c of correspondences) {
    if (c.group_id === groupId) {
      await putCorrespondence({
        ...c,
        group_id: DEFAULT_CORRESPONDENCE_GROUP_ID,
      });
    }
  }
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CORRESPONDENCE_GROUPS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_CORRESPONDENCE_GROUPS).delete(groupId));
}

export async function listCorrespondencesAll(): Promise<LocalCorrespondenceRow[]> {
  await ensureDefaultCorrespondenceGroup();
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CORRESPONDENCES, 'readonly');
  return (await idbRequest(
    tx.objectStore(STORE_CORRESPONDENCES).getAll(),
  )) as LocalCorrespondenceRow[];
}

export async function getCorrespondenceById(id: string): Promise<LocalCorrespondenceRow | null> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CORRESPONDENCES, 'readonly');
  const row = (await idbRequest(tx.objectStore(STORE_CORRESPONDENCES).get(id))) as
    | LocalCorrespondenceRow
    | undefined;
  return row ?? null;
}

export async function putCorrespondence(row: LocalCorrespondenceRow): Promise<void> {
  const gid = row.group_id.trim() || DEFAULT_CORRESPONDENCE_GROUP_ID;
  const normalized: LocalCorrespondenceRow = {
    ...row,
    title: row.title.trim(),
    description: row.description?.trim() ? row.description.trim() : null,
    group_id: gid,
  };
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CORRESPONDENCES, 'readwrite');
  await idbRequest(tx.objectStore(STORE_CORRESPONDENCES).put(normalized));
}

export async function putCorrespondenceImageRow(row: LocalCardImageRow): Promise<void> {
  revokeCorrespondenceThumbBlobUrl(row.id);
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CORRESPONDENCE_IMAGES, 'readwrite');
  await idbRequest(tx.objectStore(STORE_CORRESPONDENCE_IMAGES).put(row));
}

export async function getCorrespondenceImageRow(id: string): Promise<LocalCardImageRow | null> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CORRESPONDENCE_IMAGES, 'readonly');
  const row = (await idbRequest(tx.objectStore(STORE_CORRESPONDENCE_IMAGES).get(id))) as
    | LocalCardImageRow
    | undefined;
  return row ?? null;
}

async function deleteCorrespondenceImageRow(id: string): Promise<void> {
  revokeCorrespondenceThumbBlobUrl(id);
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CORRESPONDENCE_IMAGES, 'readwrite');
  await idbRequest(tx.objectStore(STORE_CORRESPONDENCE_IMAGES).delete(id));
}

export async function putCorrespondenceThumbnailBlob(
  blob: Blob,
  mimeType?: string,
  title?: string,
): Promise<string> {
  const id = crypto.randomUUID();
  const row: LocalCardImageRow = {
    id,
    blob,
    mimeType: mimeType ?? blob.type,
    created_at: new Date().toISOString(),
    ...(title?.trim() ? { title: title.trim() } : {}),
  };
  await putCorrespondenceImageRow(row);
  return id;
}

/**
 * Creates or updates a correspondence, optionally replacing or clearing the thumbnail.
 */
export async function upsertCorrespondence(opts: {
  id?: string;
  title: string;
  description: string | null;
  group_id: string;
  thumbnailFile?: File | null;
  clearThumbnail?: boolean;
}): Promise<LocalCorrespondenceRow> {
  const id = opts.id ?? crypto.randomUUID();
  const existing = await getCorrespondenceById(id);
  let thumbnailBlobId = existing?.thumbnailBlobId ?? null;

  if (opts.clearThumbnail) {
    if (thumbnailBlobId) await deleteCorrespondenceImageRow(thumbnailBlobId);
    thumbnailBlobId = null;
  } else if (opts.thumbnailFile && opts.thumbnailFile.size > 0) {
    if (thumbnailBlobId) await deleteCorrespondenceImageRow(thumbnailBlobId);
    thumbnailBlobId = await putCorrespondenceThumbnailBlob(
      opts.thumbnailFile,
      opts.thumbnailFile.type,
      opts.thumbnailFile.name,
    );
  }

  const row: LocalCorrespondenceRow = {
    id,
    title: opts.title.trim(),
    description: opts.description?.trim() ? opts.description.trim() : null,
    group_id: opts.group_id.trim() || DEFAULT_CORRESPONDENCE_GROUP_ID,
    thumbnailBlobId,
  };
  await putCorrespondence(row);
  return row;
}

async function removeCorrespondenceIdFromAllCards(correspondenceId: string): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CARDS, 'readonly');
  const all = (await idbRequest(tx.objectStore(STORE_CARDS).getAll())) as LocalCardRow[];
  for (const card of all) {
    const ids = card.correspondence_ids ?? [];
    if (!ids.includes(correspondenceId)) continue;
    const next = ids.filter((x) => x !== correspondenceId);
    await putLocalCard({
      ...normalizeLocalCardRow(card),
      correspondence_ids: next,
    });
  }
}

export async function deleteCorrespondence(id: string): Promise<void> {
  const row = await getCorrespondenceById(id);
  if (!row) return;
  await removeCorrespondenceIdFromAllCards(id);
  if (row.thumbnailBlobId) {
    await deleteCorrespondenceImageRow(row.thumbnailBlobId);
  }
  const db = await openTarotDb();
  const tx = db.transaction(STORE_CORRESPONDENCES, 'readwrite');
  await idbRequest(tx.objectStore(STORE_CORRESPONDENCES).delete(id));
}

export interface CorrespondenceGroupSection {
  group: LocalCorrespondenceGroupRow;
  items: LocalCorrespondenceRow[];
}

/**
 * All groups (default first) with their correspondences sorted by title.
 */
export async function listCorrespondencesGrouped(): Promise<CorrespondenceGroupSection[]> {
  await ensureDefaultCorrespondenceGroup();
  const [groups, items] = await Promise.all([listCorrespondenceGroups(), listCorrespondencesAll()]);
  const byG = new Map<string, LocalCorrespondenceRow[]>();
  for (const g of groups) {
    byG.set(g.id, []);
  }
  for (const c of items) {
    const gid = byG.has(c.group_id) ? c.group_id : DEFAULT_CORRESPONDENCE_GROUP_ID;
    const list = byG.get(gid);
    if (list) list.push(c);
  }
  for (const list of byG.values()) {
    list.sort((a, b) => a.title.localeCompare(b.title));
  }
  return groups.map((group) => ({
    group,
    items: byG.get(group.id) ?? [],
  }));
}

export async function updateLocalCardCorrespondenceIds(
  cardId: string,
  correspondenceIds: readonly string[],
): Promise<void> {
  const map = await getLocalCardsByIds([cardId]);
  const row = map.get(cardId);
  if (!row) throw new Error(`Card not found: ${cardId}`);
  const unique = [...new Set([...correspondenceIds].map((x) => x.trim()).filter(Boolean))];
  await putLocalCard({
    ...row,
    correspondence_ids: unique,
  });
}
