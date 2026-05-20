import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocalCardRow, LocalDeckRow } from '../../../types/localDb.js';
import { DECK_EXPORT_VERSION } from '../../../types/settings.js';
import { cktarot } from '../../../proto/generated/bundle.js';

const getCardImageRow = vi.hoisted(() => vi.fn());
const putLocalCardImageRow = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/localDecks.js', () => ({
  getCardImageRow,
  putLocalCardImageRow,
}));

import {
  decodeDeckExport,
  encodeDeckExport,
  insertCardFromProto,
  insertDeckFromProto,
} from '../../../lib/proto/deckExportCodec.js';

describe('deckExportCodec.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    putLocalCardImageRow.mockResolvedValue(undefined);
    getCardImageRow.mockResolvedValue({
      id: 'blob-1',
      blob: new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      mimeType: 'image/png',
      created_at: '2026-05-20T00:00:00.000Z',
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-20T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('round-trips decks and cards', async () => {
    const decks: LocalDeckRow[] = [
      {
        id: 'd1',
        title: 'My Deck',
        description: 'A note',
        created_at: '2026-05-20T00:00:00.000Z',
        modified_at: '2026-05-20T00:00:00.000Z',
        from_catalog: false,
      },
    ];
    const cards: LocalCardRow[] = [
      {
        id: 'c1',
        deck_id: 'd1',
        title: 'The Fool',
        number: 0,
        imageBlobId: 'blob-1',
        censorImageBlobId: null,
        correspondence_ids: [],
      },
    ];

    const bytes = await encodeDeckExport({
      decks,
      cards,
      exportedAt: '2026-05-20T00:00:00.000Z',
    });
    const { export: exportMsg, errors } = decodeDeckExport(bytes);
    expect(errors).toEqual([]);
    expect(exportMsg.version).toBe(DECK_EXPORT_VERSION);
    expect(exportMsg.exportedAt).toBe('2026-05-20T00:00:00.000Z');
    expect(exportMsg.decks).toHaveLength(1);
    expect(exportMsg.decks?.[0]?.title).toBe('My Deck');
    expect(exportMsg.decks?.[0]?.fromCatalog).toBe(false);
    expect(exportMsg.cards).toHaveLength(1);
    expect(exportMsg.cards?.[0]?.title).toBe('The Fool');
  });

  it('decodeDeckExport adds error when version mismatches', async () => {
    const msg = new cktarot.CktarotDeckExport();
    msg.version = 99;
    const bytes = new Uint8Array(cktarot.CktarotDeckExport.encode(msg).finish());
    const { errors } = decodeDeckExport(bytes);
    expect(errors.some((e) => e.includes('Unsupported deck export version'))).toBe(true);
  });

  it('decodeDeckExport reports invalid protobuf', () => {
    const { errors } = decodeDeckExport(new Uint8Array([0xff, 0xff]));
    expect(errors.some((e) => e.includes('Invalid deck export file'))).toBe(true);
  });

  it('insertDeckFromProto assigns new id and forces from_catalog false', () => {
    const proto = new cktarot.DeckRow();
    proto.id = 'exported-id';
    proto.title = 'Same Title';
    proto.description = 'desc';
    proto.createdAt = '2026-05-19T10:00:00.000Z';
    proto.modifiedAt = '2026-05-19T11:00:00.000Z';
    proto.fromCatalog = false;

    const errors: string[] = [];
    const row = insertDeckFromProto(proto, errors);

    expect(errors).toEqual([]);
    expect(row).not.toBeNull();
    expect(row!.id).not.toBe('exported-id');
    expect(row!.title).toBe('Same Title');
    expect(row!.description).toBe('desc');
    expect(row!.from_catalog).toBe(false);
  });

  it('insertDeckFromProto skips catalog decks', () => {
    const proto = new cktarot.DeckRow();
    proto.id = 'catalog-id';
    proto.title = 'Cloud Deck';
    proto.fromCatalog = true;

    const errors: string[] = [];
    const row = insertDeckFromProto(proto, errors);

    expect(row).toBeNull();
    expect(errors.some((e) => e.includes('skipped catalog deck'))).toBe(true);
  });

  it('insertCardFromProto assigns new card id and remapped deck_id', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('blob-new')
      .mockReturnValueOnce('card-new');

    const proto = new cktarot.CardRow();
    proto.id = 'exported-card';
    proto.deckId = 'exported-deck';
    proto.title = 'Ace';
    proto.number = 1;
    proto.data = new Uint8Array([9]);

    const errors: string[] = [];
    const row = await insertCardFromProto(proto, 'new-deck-id', new Set(['corr-1']), errors);

    expect(errors).toEqual([]);
    expect(row).not.toBeNull();
    expect(row!.id).toBe('card-new');
    expect(row!.deck_id).toBe('new-deck-id');
    expect(row!.title).toBe('Ace');
  });

  it('insertCardFromProto filters correspondence ids to valid set', async () => {
    vi.spyOn(globalThis.crypto, 'randomUUID')
      .mockReturnValueOnce('blob-new')
      .mockReturnValueOnce('card-new');

    const proto = new cktarot.CardRow();
    proto.id = 'c1';
    proto.deckId = 'd1';
    proto.title = 'T';
    proto.number = 0;
    proto.data = new Uint8Array([1]);
    proto.correspondenceIds = ['keep-me', 'drop-me'];

    const errors: string[] = [];
    const row = await insertCardFromProto(proto, 'new-deck', new Set(['keep-me']), errors);

    expect(row!.correspondence_ids).toEqual(['keep-me']);
  });
});
