import type {
  ReadingGroupSection,
  ReadingSummary,
  SavedReadingState,
} from '../types/readingState.js';
import type { LocalReadingGroupRow, LocalReadingRow } from '../types/localDb.js';
import { DEFAULT_READING_GROUP_ID } from '../types/localDb.js';
import { openTarotDb, STORE_READING_GROUPS, STORE_READINGS, idbRequest } from './indexedDb.js';
import { decodeSavedReadingState, encodeSavedReadingState } from './proto/savedReadingCodec.js';

function rowToSummary(r: LocalReadingRow): ReadingSummary {
  return {
    id: r.id,
    name: r.name,
    updated_at: r.updated_at,
    group_id: r.group_id ?? DEFAULT_READING_GROUP_ID,
  };
}

function normalizeReadingRow(row: LocalReadingRow): LocalReadingRow {
  return {
    ...row,
    group_id: row.group_id?.trim() ? row.group_id : DEFAULT_READING_GROUP_ID,
  };
}

/**
 * Ensures the built-in default reading group row exists.
 */
export async function ensureDefaultReadingGroup(): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READING_GROUPS, 'readwrite');
  const store = tx.objectStore(STORE_READING_GROUPS);
  const existing = (await idbRequest(store.get(DEFAULT_READING_GROUP_ID))) as
    | LocalReadingGroupRow
    | undefined;
  if (!existing) {
    await idbRequest(
      store.put({
        id: DEFAULT_READING_GROUP_ID,
        title: 'Default',
      } satisfies LocalReadingGroupRow),
    );
  }
}

export async function listReadingGroups(): Promise<LocalReadingGroupRow[]> {
  await ensureDefaultReadingGroup();
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READING_GROUPS, 'readonly');
  const rows = (await idbRequest(
    tx.objectStore(STORE_READING_GROUPS).getAll(),
  )) as LocalReadingGroupRow[];
  const sorted = (rows ?? []).sort((a, b) => {
    if (a.id === DEFAULT_READING_GROUP_ID) return -1;
    if (b.id === DEFAULT_READING_GROUP_ID) return 1;
    return a.title.localeCompare(b.title);
  });
  if (sorted.some((g) => g.id === DEFAULT_READING_GROUP_ID)) {
    return sorted;
  }
  return [{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }, ...sorted];
}

export async function putReadingGroup(row: LocalReadingGroupRow): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READING_GROUPS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_READING_GROUPS).put(row));
}

export async function createReadingGroup(title: string): Promise<LocalReadingGroupRow> {
  const row: LocalReadingGroupRow = {
    id: crypto.randomUUID(),
    title: title.trim(),
  };
  await putReadingGroup(row);
  return row;
}

/**
 * Deletes a user group after moving its readings to the default group.
 */
export async function deleteReadingGroup(groupId: string): Promise<void> {
  if (groupId === DEFAULT_READING_GROUP_ID) {
    throw new Error('Cannot delete the built-in default group.');
  }
  await ensureDefaultReadingGroup();
  const readings = await listLocalReadingsAll();
  for (const r of readings) {
    if (r.group_id === groupId) {
      await putLocalReadingRow({
        ...r,
        group_id: DEFAULT_READING_GROUP_ID,
      });
    }
  }
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READING_GROUPS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_READING_GROUPS).delete(groupId));
}

async function repairLegacyReadingRows(rows: LocalReadingRow[]): Promise<LocalReadingRow[]> {
  const needsRepair = rows.filter((row) => !row.group_id?.trim());
  if (needsRepair.length === 0) {
    return rows.map(normalizeReadingRow);
  }
  await ensureDefaultReadingGroup();
  const repaired: LocalReadingRow[] = [];
  for (const row of rows) {
    if (!row.group_id?.trim()) {
      const fixed = { ...row, group_id: DEFAULT_READING_GROUP_ID };
      await putLocalReadingRow(fixed);
      repaired.push(fixed);
    } else {
      repaired.push(normalizeReadingRow(row));
    }
  }
  return repaired;
}

async function listLocalReadingsAll(): Promise<LocalReadingRow[]> {
  await ensureDefaultReadingGroup();
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READINGS, 'readonly');
  const rows = (await idbRequest(tx.objectStore(STORE_READINGS).getAll())) as LocalReadingRow[];
  return repairLegacyReadingRows(rows ?? []);
}

async function putLocalReadingRow(row: LocalReadingRow): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READINGS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_READINGS).put(normalizeReadingRow(row)));
}

export async function listLocalReadings(): Promise<ReadingSummary[]> {
  const rows = await listLocalReadingsAll();
  return rows.map(rowToSummary).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

/**
 * All groups (default first) with their readings sorted by name.
 */
export async function listReadingsGrouped(): Promise<ReadingGroupSection[]> {
  await ensureDefaultReadingGroup();
  const [groups, items] = await Promise.all([listReadingGroups(), listLocalReadings()]);
  const effectiveGroups =
    groups.length > 0
      ? groups
      : [{ id: DEFAULT_READING_GROUP_ID, title: 'Default' } satisfies LocalReadingGroupRow];
  const byG = new Map<string, ReadingSummary[]>();
  for (const g of effectiveGroups) {
    byG.set(g.id, []);
  }
  if (!byG.has(DEFAULT_READING_GROUP_ID)) {
    byG.set(DEFAULT_READING_GROUP_ID, []);
    effectiveGroups.unshift({ id: DEFAULT_READING_GROUP_ID, title: 'Default' });
  }
  for (const r of items) {
    const gid = byG.has(r.group_id) ? r.group_id : DEFAULT_READING_GROUP_ID;
    const list = byG.get(gid) ?? byG.get(DEFAULT_READING_GROUP_ID);
    if (list) list.push(r);
  }
  for (const list of byG.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }
  return effectiveGroups.map((group) => ({
    group,
    items: byG.get(group.id) ?? [],
  }));
}

/**
 * Assigns a reading to a group.
 *
 * @param readingId - Reading id in IndexedDB.
 * @param groupId - Target group id.
 */
export async function assignReadingToGroup(
  readingId: string,
  groupId: string,
): Promise<{ error?: string }> {
  try {
    await ensureDefaultReadingGroup();
    const db = await openTarotDb();
    const rtx = db.transaction(STORE_READINGS, 'readonly');
    const row = (await idbRequest(rtx.objectStore(STORE_READINGS).get(readingId))) as
      | LocalReadingRow
      | undefined;
    if (!row) {
      return { error: 'Reading not found' };
    }
    const groups = await listReadingGroups();
    const validGroup = groups.some((g) => g.id === groupId);
    if (!validGroup) {
      return { error: 'Group not found' };
    }
    await putLocalReadingRow({
      ...normalizeReadingRow(row),
      group_id: groupId,
    });
    return {};
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to assign reading to group' };
  }
}

export async function loadLocalReading(
  id: string,
): Promise<{ state: SavedReadingState; name: string } | null> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READINGS, 'readonly');
  const row = (await idbRequest(tx.objectStore(STORE_READINGS).get(id))) as
    | LocalReadingRow
    | undefined;
  if (!row) return null;
  const raw =
    row.state instanceof Uint8Array ? row.state : new Uint8Array(row.state as ArrayBuffer);
  return {
    state: decodeSavedReadingState(raw),
    name: row.name ?? 'Untitled Reading',
  };
}

export async function saveLocalReading(
  state: SavedReadingState,
  name?: string,
  readingId?: string,
): Promise<{ id: string } | { error: string }> {
  try {
    await ensureDefaultReadingGroup();
    const db = await openTarotDb();
    const now = new Date().toISOString();
    const id = readingId ?? crypto.randomUUID();

    let resolvedName = name ?? 'Untitled Reading';
    let groupId = DEFAULT_READING_GROUP_ID;
    if (readingId !== undefined) {
      const tx = db.transaction(STORE_READINGS, 'readonly');
      const existing = (await idbRequest(tx.objectStore(STORE_READINGS).get(readingId))) as
        | LocalReadingRow
        | undefined;
      if (existing?.name && name === undefined) {
        resolvedName = existing.name;
      }
      if (existing?.group_id) {
        groupId = existing.group_id;
      }
    }

    const row: LocalReadingRow = {
      id,
      name: resolvedName,
      state: encodeSavedReadingState(state),
      updated_at: now,
      group_id: groupId,
    };
    await putLocalReadingRow(row);
    return { id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to save locally' };
  }
}

/**
 * Renames a saved reading without re-encoding canvas state.
 *
 * @param id - Reading id in IndexedDB.
 * @param name - New title; leading/trailing whitespace is trimmed. Must be non-empty after trim.
 * @returns The new `updated_at` timestamp on success.
 */
export async function renameLocalReading(
  id: string,
  name: string,
): Promise<{ updated_at: string } | { error: string }> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { error: 'Title cannot be empty' };
  }
  try {
    const db = await openTarotDb();
    const rtx = db.transaction(STORE_READINGS, 'readonly');
    const row = (await idbRequest(rtx.objectStore(STORE_READINGS).get(id))) as
      | LocalReadingRow
      | undefined;
    if (!row) {
      return { error: 'Reading not found' };
    }
    const now = new Date().toISOString();
    const updated: LocalReadingRow = {
      ...normalizeReadingRow(row),
      name: trimmed,
      updated_at: now,
    };
    await putLocalReadingRow(updated);
    return { updated_at: now };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to rename reading' };
  }
}

export async function deleteLocalReading(id: string): Promise<{ error?: string }> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READINGS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_READINGS).delete(id));
  return {};
}
