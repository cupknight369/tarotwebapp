import type {
  ReadingGroupSection,
  ReadingSummary,
  SavedReadingState,
} from '../types/readingState.js';
import type {
  LocalReadingGroupRow,
  LocalReadingMetaRow,
  LocalReadingRow,
} from '../types/localDb.js';
import { DEFAULT_READING_GROUP_ID } from '../types/localDb.js';
import {
  openTarotDb,
  STORE_READING_GROUPS,
  STORE_READINGS,
  STORE_READING_STATES,
  idbRequest,
} from './indexedDb.js';
import { decodeSavedReadingState, encodeSavedReadingState } from './proto/savedReadingCodec.js';

type ReadingListSnapshot = {
  groups: LocalReadingGroupRow[];
  summaries: ReadingSummary[];
  grouped: ReadingGroupSection[];
};

let readingListSnapshot: ReadingListSnapshot | null = null;

/** Clears cached reading list metadata (call after bulk import or external writes). */
export function invalidateReadingListCache(): void {
  readingListSnapshot = null;
}

function rowToSummary(r: LocalReadingMetaRow): ReadingSummary {
  return {
    id: r.id,
    name: r.name,
    updated_at: r.updated_at,
    group_id: r.group_id ?? DEFAULT_READING_GROUP_ID,
  };
}

function normalizeReadingMeta(row: LocalReadingMetaRow): LocalReadingMetaRow {
  return {
    id: row.id,
    name: row.name,
    updated_at: row.updated_at,
    group_id: row.group_id?.trim() ? row.group_id : DEFAULT_READING_GROUP_ID,
  };
}

function normalizeReadingRow(row: LocalReadingRow): LocalReadingRow {
  return {
    ...normalizeReadingMeta(row),
    state: row.state,
  };
}

function sortReadingGroups(rows: LocalReadingGroupRow[]): LocalReadingGroupRow[] {
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

function buildGroupedSections(
  groups: LocalReadingGroupRow[],
  items: ReadingSummary[],
): ReadingGroupSection[] {
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

function sortSummariesByUpdatedAt(items: ReadingSummary[]): ReadingSummary[] {
  return [...items].sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
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
    invalidateReadingListCache();
  }
}

async function repairLegacyReadingMetaBatch(
  rows: LocalReadingMetaRow[],
): Promise<LocalReadingMetaRow[]> {
  const needsRepair = rows.filter((row) => !row.group_id?.trim());
  if (needsRepair.length === 0) {
    return rows.map(normalizeReadingMeta);
  }
  await ensureDefaultReadingGroup();
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READINGS, 'readwrite');
  const store = tx.objectStore(STORE_READINGS);
  const repairedById = new Map<string, LocalReadingMetaRow>();
  for (const row of needsRepair) {
    const fixed = normalizeReadingMeta({ ...row, group_id: DEFAULT_READING_GROUP_ID });
    await idbRequest(store.put(fixed));
    repairedById.set(row.id, fixed);
  }
  return rows.map((row) => {
    const repaired = repairedById.get(row.id);
    return repaired ? repaired : normalizeReadingMeta(row);
  });
}

function readingRowHasInlineState(row: LocalReadingMetaRow): boolean {
  const state = (row as LocalReadingRow).state;
  return state !== undefined && state !== null;
}

/**
 * Moves legacy inline `state` off metadata rows (IndexedDB still loads it on getAll).
 */
async function splitInlineReadingStatesIfNeeded(
  rows: LocalReadingMetaRow[],
): Promise<LocalReadingMetaRow[]> {
  const inline = rows.filter(readingRowHasInlineState);
  if (inline.length === 0) {
    return rows.map(normalizeReadingMeta);
  }
  const db = await openTarotDb();
  const tx = db.transaction([STORE_READINGS, STORE_READING_STATES], 'readwrite');
  const readingsStore = tx.objectStore(STORE_READINGS);
  const statesStore = tx.objectStore(STORE_READING_STATES);
  for (const row of inline) {
    const full = row as LocalReadingRow;
    const bytes =
      full.state instanceof Uint8Array ? full.state : new Uint8Array(full.state as ArrayBuffer);
    const meta = normalizeReadingMeta(row);
    await idbRequest(statesStore.put({ id: meta.id, state: bytes }));
    await idbRequest(readingsStore.put(meta));
  }
  return rows.map((row) => normalizeReadingMeta(row));
}

async function loadReadingListSnapshot(): Promise<ReadingListSnapshot> {
  if (readingListSnapshot) {
    return readingListSnapshot;
  }

  await ensureDefaultReadingGroup();
  const db = await openTarotDb();
  const tx = db.transaction([STORE_READING_GROUPS, STORE_READINGS], 'readonly');
  const [groupRows, readingRows] = (await Promise.all([
    idbRequest(tx.objectStore(STORE_READING_GROUPS).getAll()),
    idbRequest(tx.objectStore(STORE_READINGS).getAll()),
  ])) as [LocalReadingGroupRow[], LocalReadingMetaRow[]];

  const metaRows = await splitInlineReadingStatesIfNeeded(readingRows ?? []);
  const normalizedRows = await repairLegacyReadingMetaBatch(metaRows);
  const groups = sortReadingGroups(groupRows ?? []);
  const summaries = sortSummariesByUpdatedAt(normalizedRows.map(rowToSummary));
  const grouped = buildGroupedSections(groups, summaries);

  readingListSnapshot = { groups, summaries, grouped };
  return readingListSnapshot;
}

/** Preloads reading list metadata (and runs inline-state repair if needed). */
export async function warmReadingListCache(): Promise<void> {
  await loadReadingListSnapshot();
}

async function getReadingMeta(id: string): Promise<LocalReadingMetaRow | undefined> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READINGS, 'readonly');
  return (await idbRequest(tx.objectStore(STORE_READINGS).get(id))) as
    | LocalReadingMetaRow
    | undefined;
}

async function putLocalReadingMeta(row: LocalReadingMetaRow): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READINGS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_READINGS).put(normalizeReadingMeta(row)));
  invalidateReadingListCache();
}

async function putLocalReadingState(id: string, state: Uint8Array): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READING_STATES, 'readwrite');
  await idbRequest(tx.objectStore(STORE_READING_STATES).put({ id, state }));
}

async function putLocalReadingRow(row: LocalReadingRow): Promise<void> {
  const normalized = normalizeReadingRow(row);
  const db = await openTarotDb();
  const tx = db.transaction([STORE_READINGS, STORE_READING_STATES], 'readwrite');
  const { state, ...meta } = normalized;
  await idbRequest(tx.objectStore(STORE_READINGS).put(meta));
  await idbRequest(tx.objectStore(STORE_READING_STATES).put({ id: meta.id, state }));
  invalidateReadingListCache();
}

/** Writes metadata and protobuf state (import, backup restore). */
export async function upsertLocalReadingRow(row: LocalReadingRow): Promise<void> {
  await putLocalReadingRow(row);
}

/**
 * All reading rows with state joined from `readingStates` (export / backup).
 */
export async function listAllLocalReadingRowsWithState(): Promise<LocalReadingRow[]> {
  await ensureDefaultReadingGroup();
  const db = await openTarotDb();
  const tx = db.transaction([STORE_READINGS, STORE_READING_STATES], 'readonly');
  const [metaRows, stateRows] = (await Promise.all([
    idbRequest(tx.objectStore(STORE_READINGS).getAll()),
    idbRequest(tx.objectStore(STORE_READING_STATES).getAll()),
  ])) as [LocalReadingMetaRow[], { id: string; state: Uint8Array }[]];
  const stateById = new Map((stateRows ?? []).map((s) => [s.id, s.state]));
  return (metaRows ?? []).map((meta) => {
    const legacyInline = meta as LocalReadingMetaRow & { state?: Uint8Array | ArrayBuffer };
    const state =
      stateById.get(meta.id) ??
      (legacyInline.state instanceof Uint8Array
        ? legacyInline.state
        : legacyInline.state
          ? new Uint8Array(legacyInline.state)
          : new Uint8Array());
    return normalizeReadingRow({ ...normalizeReadingMeta(meta), state });
  });
}

export async function listReadingGroups(): Promise<LocalReadingGroupRow[]> {
  const snapshot = await loadReadingListSnapshot();
  return snapshot.groups;
}

export async function putReadingGroup(row: LocalReadingGroupRow): Promise<void> {
  const db = await openTarotDb();
  const tx = db.transaction(STORE_READING_GROUPS, 'readwrite');
  await idbRequest(tx.objectStore(STORE_READING_GROUPS).put(row));
  invalidateReadingListCache();
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
  const db = await openTarotDb();
  const tx = db.transaction([STORE_READINGS, STORE_READING_GROUPS], 'readwrite');
  const readingsStore = tx.objectStore(STORE_READINGS);
  const groupsStore = tx.objectStore(STORE_READING_GROUPS);
  const readings = (await idbRequest(readingsStore.getAll())) as LocalReadingMetaRow[];
  for (const r of readings ?? []) {
    if (r.group_id === groupId) {
      await idbRequest(
        readingsStore.put({
          ...normalizeReadingMeta(r),
          group_id: DEFAULT_READING_GROUP_ID,
        }),
      );
    }
  }
  await idbRequest(groupsStore.delete(groupId));
  invalidateReadingListCache();
}

export async function listLocalReadings(): Promise<ReadingSummary[]> {
  const snapshot = await loadReadingListSnapshot();
  return snapshot.summaries;
}

/**
 * All groups (default first) with their readings sorted by name.
 */
export async function listReadingsGrouped(): Promise<ReadingGroupSection[]> {
  const snapshot = await loadReadingListSnapshot();
  return snapshot.grouped;
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
    const row = await getReadingMeta(readingId);
    if (!row) {
      return { error: 'Reading not found' };
    }
    const groups = await listReadingGroups();
    const validGroup = groups.some((g) => g.id === groupId);
    if (!validGroup) {
      return { error: 'Group not found' };
    }
    await putLocalReadingMeta({
      ...normalizeReadingMeta(row),
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
  const tx = db.transaction([STORE_READINGS, STORE_READING_STATES], 'readonly');
  const meta = (await idbRequest(tx.objectStore(STORE_READINGS).get(id))) as
    | (LocalReadingMetaRow & { state?: Uint8Array | ArrayBuffer })
    | undefined;
  if (!meta) return null;
  const stateRow = (await idbRequest(tx.objectStore(STORE_READING_STATES).get(id))) as
    | { id: string; state: Uint8Array }
    | undefined;
  const rawSource = stateRow?.state ?? meta.state;
  if (rawSource === undefined || rawSource === null) {
    return null;
  }
  const raw =
    rawSource instanceof Uint8Array ? rawSource : new Uint8Array(rawSource as ArrayBuffer);
  return {
    state: decodeSavedReadingState(raw),
    name: meta.name ?? 'Untitled Reading',
  };
}

export async function saveLocalReading(
  state: SavedReadingState,
  name?: string,
  readingId?: string,
): Promise<{ id: string } | { error: string }> {
  try {
    await ensureDefaultReadingGroup();
    const now = new Date().toISOString();
    const id = readingId ?? crypto.randomUUID();

    let resolvedName = name ?? 'Untitled Reading';
    let groupId = DEFAULT_READING_GROUP_ID;
    if (readingId !== undefined) {
      const existing = await getReadingMeta(readingId);
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
    const row = await getReadingMeta(id);
    if (!row) {
      return { error: 'Reading not found' };
    }
    const now = new Date().toISOString();
    await putLocalReadingMeta({
      ...normalizeReadingMeta(row),
      name: trimmed,
      updated_at: now,
    });
    return { updated_at: now };
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Failed to rename reading' };
  }
}

export async function deleteLocalReading(id: string): Promise<{ error?: string }> {
  const db = await openTarotDb();
  const tx = db.transaction([STORE_READINGS, STORE_READING_STATES], 'readwrite');
  await idbRequest(tx.objectStore(STORE_READINGS).delete(id));
  await idbRequest(tx.objectStore(STORE_READING_STATES).delete(id));
  invalidateReadingListCache();
  return {};
}
