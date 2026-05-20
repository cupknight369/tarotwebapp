import { logError } from './logError.js';
import type { LocalCardRow, LocalDeckRow } from '../types/localDb.js';
import type { BackupProgress } from '../types/settings.js';
import {
  isUserCreatedDeck,
  listLocalCardsByDeckId,
  listUserCreatedDecks,
  putLocalCard,
  putLocalDeck,
} from './localDecks.js';
import { listCorrespondencesAll } from './localCorrespondences.js';
import {
  decodeDeckExport,
  encodeDeckExport,
  insertCardFromProto,
  insertDeckFromProto,
} from './proto/deckExportCodec.js';
import { cktarot } from '../proto/generated/bundle.js';

function yieldToUi(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

export function deckExportFilename(): string {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return `cktarot_decks_${ts}.pb`;
}

function pushError(errors: string[], msg: string, e: unknown): void {
  logError(`localDeckExport.${msg}`, e);
  const detail = e instanceof Error ? e.message : String(e);
  errors.push(`${msg}: ${detail}`);
}

/**
 * Exports selected user-created decks and their cards to a protobuf file.
 *
 * @param deckIds - Non-empty list of deck ids to include.
 * @param onProgress - Optional progress callback.
 * @returns Collected errors (empty on full success).
 */
export async function exportDecks(
  deckIds: readonly string[],
  onProgress?: (p: BackupProgress) => void,
): Promise<{ errors: string[] }> {
  const errors: string[] = [];
  const report = (phase: string, current: number, total: number) => {
    onProgress?.({ phase, current, total });
  };

  if (deckIds.length === 0) {
    errors.push('Select at least one deck to export.');
    return { errors };
  }

  const selected = new Set(deckIds);

  const total = 3;
  let step = 0;
  report('Reading deck data', step, total);
  step += 1;

  let decks: LocalDeckRow[] = [];
  let cards: LocalCardRow[] = [];

  try {
    const allDecks = await listUserCreatedDecks();
    decks = allDecks.filter((d) => selected.has(d.id) && isUserCreatedDeck(d));

    for (const deck of decks) {
      const deckCards = await listLocalCardsByDeckId(deck.id);
      cards.push(...deckCards);
    }
  } catch (e) {
    pushError(errors, 'Failed to read IndexedDB', e);
    return { errors };
  }

  if (decks.length === 0) {
    errors.push('No user-created decks selected for export.');
    return { errors };
  }

  let bytes: Uint8Array;
  try {
    report('Building export', step, total);
    step += 1;
    bytes = await encodeDeckExport({
      decks,
      cards,
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
    a.download = deckExportFilename();
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
 * Imports deck data from an export file, always inserting new rows (no overwrites).
 *
 * @param data - File contents.
 * @param onProgress - Optional progress callback.
 * @returns Errors and counts of imported decks and cards.
 */
export async function importDecks(
  data: ArrayBuffer,
  onProgress?: (p: BackupProgress) => void,
): Promise<{
  errors: string[];
  importedDecks: number;
  importedCards: number;
}> {
  const errors: string[] = [];
  const report = (phase: string, current: number, total: number) => {
    onProgress?.({ phase, current, total });
  };

  let exportMsg: cktarot.CktarotDeckExport;
  try {
    const decoded = decodeDeckExport(new Uint8Array(data));
    errors.push(...decoded.errors);
    if (decoded.errors.length > 0) {
      return { errors, importedDecks: 0, importedCards: 0 };
    }
    exportMsg = decoded.export;
  } catch (e) {
    pushError(errors, 'Invalid export file', e);
    return { errors, importedDecks: 0, importedCards: 0 };
  }

  const validCorrespondenceIds = new Set<string>();
  try {
    const correspondences = await listCorrespondencesAll();
    for (const c of correspondences) {
      validCorrespondenceIds.add(c.id);
    }
  } catch (e) {
    pushError(errors, 'Failed to load correspondences for import', e);
    return { errors, importedDecks: 0, importedCards: 0 };
  }

  const deckProtos = (exportMsg.decks ?? []) as cktarot.DeckRow[];
  const cardProtos = (exportMsg.cards ?? []) as cktarot.CardRow[];
  const total = deckProtos.length + cardProtos.length + 1;
  let step = 0;

  const deckIdMap = new Map<string, string>();
  let importedDecks = 0;

  for (let i = 0; i < deckProtos.length; i++) {
    const proto = deckProtos[i];
    try {
      const row = insertDeckFromProto(proto, errors);
      if (!row) continue;
      await putLocalDeck(row);
      const exportedId = proto.id?.trim();
      if (exportedId) deckIdMap.set(exportedId, row.id);
      importedDecks += 1;
    } catch (e) {
      pushError(errors, `decks import title=${proto.title ?? ''}`, e);
    }
    report(`Importing decks (${i + 1}/${deckProtos.length})`, step, total);
    step += 1;
    await yieldToUi();
  }

  let importedCards = 0;
  for (let i = 0; i < cardProtos.length; i++) {
    const proto = cardProtos[i];
    const exportedDeckId = proto.deckId?.trim();
    const newDeckId = exportedDeckId ? deckIdMap.get(exportedDeckId) : undefined;
    if (!newDeckId) {
      step += 1;
      await yieldToUi();
      continue;
    }
    try {
      const row = await insertCardFromProto(proto, newDeckId, validCorrespondenceIds, errors);
      if (!row) continue;
      await putLocalCard(row);
      importedCards += 1;
    } catch (e) {
      pushError(errors, `cards import title=${proto.title ?? ''}`, e);
    }
    report(`Importing cards (${i + 1}/${cardProtos.length})`, step, total);
    step += 1;
    await yieldToUi();
  }

  report('Done', total, total);
  return { errors, importedDecks, importedCards };
}
