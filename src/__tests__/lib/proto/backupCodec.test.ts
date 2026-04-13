import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  LocalCardImageRow,
  LocalCardRow,
  LocalDeckRow,
  LocalReadingRow,
} from '../../../types/localDb.js';
import { BACKUP_VERSION } from '../../../types/settings.js';
import { cktarot } from '../../../proto/generated/bundle.js';

const getCardImageRow = vi.hoisted(() => vi.fn());
const putLocalCardImageRow = vi.hoisted(() => vi.fn());

vi.mock('../../../lib/localDecks.js', () => ({
  getCardImageRow,
  putLocalCardImageRow,
}));

import {
  backupToDecks,
  backupToReadings,
  decodeCktarotBackup,
  encodeCktarotBackup,
  materializeCardRowFromProto,
} from '../../../lib/proto/backupCodec.js';

describe('backupCodec.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    putLocalCardImageRow.mockResolvedValue(undefined);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-10T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('encodeCktarotBackup / decodeCktarotBackup', () => {
    it('round-trips decks with description null, undefined, and string', async () => {
      const decks: LocalDeckRow[] = [
        {
          id: 'd1',
          title: 'A',
          description: null,
          created_at: 'c1',
          modified_at: 'm1',
        },
        {
          id: 'd2',
          title: 'B',
          description: undefined as unknown as null,
          created_at: 'c2',
          modified_at: 'm2',
          from_catalog: true,
        },
        {
          id: 'd3',
          title: 'C',
          description: 'has desc',
          created_at: 'c3',
          modified_at: 'm3',
          from_catalog: false,
        },
      ];
      const bytes = await encodeCktarotBackup({ decks, cards: [], readings: [] });
      const { backup, errors } = decodeCktarotBackup(bytes);
      expect(errors).toEqual([]);
      expect(backup.version).toBe(BACKUP_VERSION);
      const out = backupToDecks(backup);
      expect(out).toHaveLength(3);
      expect(out[0]).toMatchObject({ id: 'd1', description: null, from_catalog: false });
      expect(out[1]).toMatchObject({ id: 'd2', description: null, from_catalog: true });
      expect(out[2]).toMatchObject({ id: 'd3', description: 'has desc', from_catalog: false });
    });

    it('sets exportedAt when provided', async () => {
      const bytes = await encodeCktarotBackup({
        decks: [],
        cards: [],
        readings: [],
        exportedAt: '2026-01-01T00:00:00.000Z',
      });
      const { backup } = decodeCktarotBackup(bytes);
      expect(backup.exportedAt).toBe('2026-01-01T00:00:00.000Z');
    });

    it('omits exportedAt when not provided', async () => {
      const bytes = await encodeCktarotBackup({ decks: [], cards: [], readings: [] });
      const { backup } = decodeCktarotBackup(bytes);
      expect(backup.exportedAt).toBeFalsy();
    });

    it('encodes cards with main blob, main mime, censor blob, and skips missing blobs', async () => {
      const mainBlob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' });
      const cenBlob = new Blob([new Uint8Array([4])], { type: 'image/png' });
      getCardImageRow.mockImplementation((id: string) => {
        if (id === 'b-main')
          return Promise.resolve({
            id: 'b-main',
            blob: mainBlob,
            created_at: 'cm',
            mimeType: 'image/webp',
          });
        if (id === 'b-cen')
          return Promise.resolve({
            id: 'b-cen',
            blob: cenBlob,
            created_at: 'cc',
            mimeType: 'image/png',
          });
        if (id === 'b-skip')
          return Promise.resolve({
            id: 'b-skip',
            blob: null as unknown as Blob,
            created_at: 'x',
          });
        return Promise.resolve(null);
      });

      const cards: LocalCardRow[] = [
        {
          id: 'c1',
          deck_id: 'd1',
          title: 'Card',
          number: 0,
          imageBlobId: 'b-main',
          censorImageBlobId: 'b-cen',
        },
        {
          id: 'c2',
          deck_id: 'd1',
          title: 'No mime main',
          number: 1,
          imageBlobId: 'b-skip',
          censorImageBlobId: null,
        },
      ];

      const bytes = await encodeCktarotBackup({ decks: [], cards, readings: [] });
      const { backup } = decodeCktarotBackup(bytes);
      expect(backup.cards).toHaveLength(2);
      expect(backup.cards[0]?.data?.length).toBe(3);
      expect(backup.cards[0]?.mimeType).toBe('image/webp');
      expect(backup.cards[0]?.censoredData?.length).toBe(1);
      expect(backup.cards[1]?.data?.length).toBeFalsy();
    });

    it('encodes main blob without optional mimeType on image row', async () => {
      const mainBlob = new Blob([new Uint8Array([9])], { type: 'application/octet-stream' });
      getCardImageRow.mockResolvedValue({
        id: 'bm',
        blob: mainBlob,
        created_at: 't',
      });
      const cards: LocalCardRow[] = [
        {
          id: 'cx',
          deck_id: 'd',
          title: 'X',
          number: 0,
          imageBlobId: 'bm',
          censorImageBlobId: null,
        },
      ];
      const bytes = await encodeCktarotBackup({ decks: [], cards, readings: [] });
      const { backup } = decodeCktarotBackup(bytes);
      expect(backup.cards[0]?.data?.length).toBe(1);
      expect(backup.cards[0]?.mimeType).toBeFalsy();
    });

    it('skips censor bytes when censorImageBlobId is set but image row has no blob', async () => {
      const mainBlob = new Blob([new Uint8Array([1])]);
      getCardImageRow.mockImplementation((id: string) => {
        if (id === 'm-only')
          return Promise.resolve({ id: 'm-only', blob: mainBlob, created_at: 't' });
        if (id === 'cen-none') return Promise.resolve({ id: 'cen-none', created_at: 't' });
        return Promise.resolve(null);
      });
      const cards: LocalCardRow[] = [
        {
          id: 'cnc',
          deck_id: 'd',
          title: 'C',
          number: 0,
          imageBlobId: 'm-only',
          censorImageBlobId: 'cen-none',
        },
      ];
      const bytes = await encodeCktarotBackup({ decks: [], cards, readings: [] });
      const { backup } = decodeCktarotBackup(bytes);
      expect(backup.cards[0]?.data?.length).toBe(1);
      expect(backup.cards[0]?.censoredData?.length).toBeFalsy();
    });

    it('encodes censor blob without optional censoredMimeType when censor mime is empty', async () => {
      const mainBlob = new Blob([new Uint8Array([1])]);
      const cenBlob = new Blob([new Uint8Array([2])]);
      getCardImageRow.mockImplementation((id: string) => {
        if (id === 'm')
          return Promise.resolve({
            id: 'm',
            blob: mainBlob,
            created_at: 't',
            mimeType: 'image/webp',
          });
        if (id === 'c')
          return Promise.resolve({ id: 'c', blob: cenBlob, created_at: 't', mimeType: '' });
        return Promise.resolve(null);
      });
      const cards: LocalCardRow[] = [
        {
          id: 'c1',
          deck_id: 'd',
          title: 'C',
          number: 0,
          imageBlobId: 'm',
          censorImageBlobId: 'c',
        },
      ];
      const bytes = await encodeCktarotBackup({ decks: [], cards, readings: [] });
      const { backup } = decodeCktarotBackup(bytes);
      expect(backup.cards[0]?.censoredData?.length).toBe(1);
      expect(backup.cards[0]?.censoredMimeType).toBeFalsy();
    });

    it('decodeCktarotBackup adds error when version mismatches', () => {
      const bad = new cktarot.CktarotBackup();
      bad.version = 999;
      const bytes = new Uint8Array(cktarot.CktarotBackup.encode(bad).finish());
      const { errors } = decodeCktarotBackup(bytes);
      expect(errors).toEqual([
        `Unsupported backup version (expected ${BACKUP_VERSION}, got 999).`,
      ]);
    });

    it('backupToDecks and backupToReadings use empty arrays when missing', () => {
      const empty = new cktarot.CktarotBackup();
      empty.version = BACKUP_VERSION;
      expect(backupToDecks(empty)).toEqual([]);
      expect(backupToReadings(empty)).toEqual([]);
    });

    it('backupToDecks and backupToReadings treat null decks/readings as empty', () => {
      const b = new cktarot.CktarotBackup();
      b.version = BACKUP_VERSION;
      Object.assign(b, { decks: null, readings: null });
      expect(backupToDecks(b)).toEqual([]);
      expect(backupToReadings(b)).toEqual([]);
    });

    it('deckRowFromProto maps empty description to null', () => {
      const d = new cktarot.DeckRow();
      d.id = 'x';
      d.title = 't';
      d.description = '';
      d.createdAt = 'c';
      d.modifiedAt = 'm';
      d.fromCatalog = false;
      const backup = new cktarot.CktarotBackup();
      backup.version = BACKUP_VERSION;
      backup.decks = [d];
      const [row] = backupToDecks(backup);
      expect(row?.description).toBeNull();
    });

    it('readingRowFromProto wraps non-Uint8Array state', () => {
      const r = new cktarot.ReadingRow();
      r.id = 'rid';
      r.name = 'n';
      r.updatedAt = 'u';
      const buf = new ArrayBuffer(2);
      Object.assign(r, { state: buf });
      const backup = new cktarot.CktarotBackup();
      backup.version = BACKUP_VERSION;
      backup.readings = [r];
      const [row] = backupToReadings(backup);
      expect(row?.state).toBeInstanceOf(Uint8Array);
      expect(row?.state.byteLength).toBe(2);
    });

    it('round-trips readings with Uint8Array state and ArrayBuffer state', async () => {
      const r1: LocalReadingRow = {
        id: 'r1',
        name: 'A',
        state: new Uint8Array([10, 11]),
        updated_at: 'u1',
      };
      const r2 = {
        id: 'r2',
        name: 'B',
        state: new ArrayBuffer(1),
        updated_at: 'u2',
      } as unknown as LocalReadingRow;

      const bytes = await encodeCktarotBackup({ decks: [], cards: [], readings: [r1, r2] });
      const { backup, errors } = decodeCktarotBackup(bytes);
      expect(errors).toEqual([]);
      const readings = backupToReadings(backup);
      expect(readings).toHaveLength(2);
      const st0 = readings[0]?.state;
      expect(st0).toBeInstanceOf(Uint8Array);
      if (!(st0 instanceof Uint8Array)) throw new Error('expected Uint8Array');
      expect([...st0]).toEqual([10, 11]);
      expect(readings[1]?.state).toBeInstanceOf(Uint8Array);
    });
  });

  describe('materializeCardRowFromProto', () => {
    it('returns null and records error when main data missing', async () => {
      const errors: string[] = [];
      const c = new cktarot.CardRow();
      c.id = 'c0';
      c.deckId = 'd';
      c.title = 'T';
      c.number = 0;
      await expect(materializeCardRowFromProto(c, errors)).resolves.toBeNull();
      expect(errors).toEqual(['card id=c0: missing main image data']);
    });

    it('returns null when main data length is zero', async () => {
      const errors: string[] = [];
      const c = new cktarot.CardRow();
      c.id = 'cz';
      c.data = new Uint8Array();
      await expect(materializeCardRowFromProto(c, errors)).resolves.toBeNull();
      expect(errors.some((e) => e.includes('missing main image'))).toBe(true);
    });

    it('materializes main only with default mime and createdAt fallback', async () => {
      vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('uuid-main');
      const errors: string[] = [];
      const c = new cktarot.CardRow();
      c.id = 'c1';
      c.deckId = 'd1';
      c.title = 'T';
      c.number = 3;
      c.data = new Uint8Array([7, 8]);
      const row = await materializeCardRowFromProto(c, errors);
      expect(errors).toEqual([]);
      expect(row).toEqual({
        id: 'c1',
        deck_id: 'd1',
        title: 'T',
        number: 3,
        imageBlobId: 'uuid-main',
        censorImageBlobId: null,
      });
      expect(putLocalCardImageRow).toHaveBeenCalledTimes(1);
      const put = putLocalCardImageRow.mock.calls[0][0] as LocalCardImageRow;
      expect(put.mimeType).toBe('application/octet-stream');
      expect(put.created_at).toBe('2026-01-10T12:00:00.000Z');
    });

    it('uses explicit mimeType and censoredData with default censored mime', async () => {
      vi.spyOn(globalThis.crypto, 'randomUUID')
        .mockReturnValueOnce('m1')
        .mockReturnValueOnce('c1');
      const errors: string[] = [];
      const c = new cktarot.CardRow();
      c.id = 'c2';
      c.deckId = 'd';
      c.title = 'T';
      c.number = 0;
      c.data = new Uint8Array([1]);
      c.mimeType = 'image/webp';
      c.createdAt = 'saved-at';
      c.censoredData = new Uint8Array([2]);
      const row = await materializeCardRowFromProto(c, errors);
      expect(row?.censorImageBlobId).toBe('c1');
      expect(putLocalCardImageRow).toHaveBeenCalledTimes(2);
      const censorPut = putLocalCardImageRow.mock.calls[1][0] as LocalCardImageRow;
      expect(censorPut.mimeType).toBe('application/octet-stream');
      expect(censorPut.created_at).toBe('saved-at');
    });

    it('uses explicit censoredMimeType when set', async () => {
      vi.spyOn(globalThis.crypto, 'randomUUID')
        .mockReturnValueOnce('m2')
        .mockReturnValueOnce('c2');
      const errors: string[] = [];
      const c = new cktarot.CardRow();
      c.id = 'c3';
      c.deckId = 'd';
      c.title = 'T';
      c.number = 0;
      c.data = new Uint8Array([1]);
      c.censoredData = new Uint8Array([2]);
      c.censoredMimeType = 'image/png';
      const row = await materializeCardRowFromProto(c, errors);
      expect(row).not.toBeNull();
      const secondPut = putLocalCardImageRow.mock.calls[1][0] as LocalCardImageRow;
      expect(secondPut.mimeType).toBe('image/png');
    });

    it('records error and returns null when putLocalCardImageRow throws', async () => {
      vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('m-err');
      putLocalCardImageRow.mockRejectedValueOnce(new Error('idb full'));
      const errors: string[] = [];
      const c = new cktarot.CardRow();
      c.id = 'ce';
      c.deckId = 'd';
      c.title = 'T';
      c.number = 0;
      c.data = new Uint8Array([1]);
      await expect(materializeCardRowFromProto(c, errors)).resolves.toBeNull();
      expect(errors).toEqual(['card id=ce: idb full']);
    });

    it('records non-Error throw as string', async () => {
      vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('m-x');
      putLocalCardImageRow.mockRejectedValueOnce('weird');
      const errors: string[] = [];
      const c = new cktarot.CardRow();
      c.id = 'cx';
      c.deckId = 'd';
      c.title = 'T';
      c.number = 0;
      c.data = new Uint8Array([1]);
      await expect(materializeCardRowFromProto(c, errors)).resolves.toBeNull();
      expect(errors).toEqual(['card id=cx: weird']);
    });
  });
});
