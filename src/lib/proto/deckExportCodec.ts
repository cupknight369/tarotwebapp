import type { LocalCardRow, LocalDeckRow } from '../../types/localDb.js';
import { DECK_EXPORT_VERSION } from '../../types/settings.js';
import { cktarot } from '../../proto/generated/bundle.js';
import { cardRowToProto, deckRowToProto, materializeCardRowFromProto } from './backupCodec.js';

/**
 * Encodes user-created decks and their cards into a standalone export file.
 *
 * @param payload - Decks and cards to include in the export.
 * @returns Serialized protobuf bytes.
 */
export async function encodeDeckExport(payload: {
  decks: LocalDeckRow[];
  cards: LocalCardRow[];
  exportedAt?: string;
}): Promise<Uint8Array> {
  const msg = new cktarot.CktarotDeckExport();
  msg.version = DECK_EXPORT_VERSION;
  if (payload.exportedAt) msg.exportedAt = payload.exportedAt;
  msg.decks = payload.decks.map(deckRowToProto);
  msg.cards = await Promise.all(payload.cards.map(cardRowToProto));
  return new Uint8Array(cktarot.CktarotDeckExport.encode(msg).finish());
}

/**
 * Decodes a deck export file.
 *
 * @param bytes - File contents.
 * @returns Decoded export and validation errors (non-empty means reject import).
 */
export function decodeDeckExport(bytes: Uint8Array): {
  export: cktarot.CktarotDeckExport;
  errors: string[];
} {
  const errors: string[] = [];
  let exportMsg: cktarot.CktarotDeckExport;
  try {
    exportMsg = cktarot.CktarotDeckExport.decode(bytes);
  } catch (e) {
    errors.push(`Invalid deck export file: ${e instanceof Error ? e.message : String(e)}`);
    return { export: new cktarot.CktarotDeckExport(), errors };
  }
  if (exportMsg.version !== DECK_EXPORT_VERSION) {
    errors.push(
      `Unsupported deck export version (expected ${DECK_EXPORT_VERSION}, got ${exportMsg.version}).`,
    );
  }
  return { export: exportMsg, errors };
}

/**
 * Inserts a deck from an export row with a new id (never preserves exported ids).
 * Skips catalog decks (`fromCatalog === true`).
 *
 * @param d - Protobuf deck row from export file.
 * @param errors - Collects non-fatal errors.
 * @returns Local row ready for IndexedDB put, or null on failure or catalog deck.
 */
export function insertDeckFromProto(d: cktarot.DeckRow, errors: string[]): LocalDeckRow | null {
  if (d.fromCatalog === true) {
    errors.push(`deck import skipped catalog deck title=${d.title ?? ''}`);
    return null;
  }
  try {
    return {
      id: crypto.randomUUID(),
      title: (d.title ?? '').trim() || 'Untitled Deck',
      description:
        d.description !== undefined && d.description !== null && d.description.trim() !== ''
          ? d.description.trim()
          : null,
      created_at: d.createdAt?.trim() ? d.createdAt.trim() : new Date().toISOString(),
      modified_at: d.modifiedAt?.trim() ? d.modifiedAt.trim() : new Date().toISOString(),
      from_catalog: false,
    };
  } catch (e) {
    errors.push(
      `deck import title=${d.title ?? ''}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return null;
  }
}

/**
 * Inserts a card from an export row with new deck and card ids.
 *
 * @param c - Protobuf card row from export file.
 * @param newDeckId - Local deck id to assign (remapped from export).
 * @param validCorrespondenceIds - When set, only these ids are kept on the restored card.
 * @param errors - Collects non-fatal errors.
 * @returns Local row ready for IndexedDB put, or null on failure.
 */
export async function insertCardFromProto(
  c: cktarot.CardRow,
  newDeckId: string,
  validCorrespondenceIds: ReadonlySet<string>,
  errors: string[],
): Promise<LocalCardRow | null> {
  const proto = c as cktarot.CardRow;
  proto.deckId = newDeckId;
  const row = await materializeCardRowFromProto(proto, errors, validCorrespondenceIds);
  if (!row) return null;
  return {
    ...row,
    id: crypto.randomUUID(),
    deck_id: newDeckId,
  };
}
