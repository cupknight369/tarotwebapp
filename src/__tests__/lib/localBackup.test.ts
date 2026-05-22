import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocalCardRow, LocalDeckRow, LocalReadingRow } from '../../types/localDb.js';
import { DEFAULT_READING_GROUP_ID } from '../../types/localDb.js';

const m = vi.hoisted(() => ({
  logError: vi.fn(),
  openTarotDb: vi.fn(),
  idbRequest: vi.fn(),
  putLocalDeck: vi.fn(),
  putLocalCard: vi.fn(),
  encodeCktarotBackup: vi.fn(),
  decodeCktarotBackup: vi.fn(),
  backupToDecks: vi.fn(),
  backupToReadings: vi.fn(),
  backupToReadingGroups: vi.fn(),
  readingGroupRowFromProto: vi.fn((g: { id: string; title?: string }) => ({
    id: g.id,
    title: g.title ?? 'G',
  })),
  materializeCardRowFromProto: vi.fn(),
  correspondenceGroupRowFromProto: vi.fn((g: { id: string; title?: string }) => ({
    id: g.id,
    title: g.title ?? 'G',
  })),
  materializeCorrespondenceRowFromProto: vi.fn(),
}));

const corrMocks = vi.hoisted(() => ({
  ensureDefaultCorrespondenceGroup: vi.fn(),
  putCorrespondenceGroup: vi.fn(),
  putCorrespondence: vi.fn(),
}));

const readingMocks = vi.hoisted(() => ({
  ensureDefaultReadingGroup: vi.fn(),
  putReadingGroup: vi.fn(),
  listAllLocalReadingRowsWithState: vi.fn(),
  upsertLocalReadingRow: vi.fn(),
}));

vi.mock('../../lib/logError.js', () => ({ logError: m.logError }));

vi.mock('../../lib/indexedDb.js', () => ({
  openTarotDb: m.openTarotDb,
  idbRequest: m.idbRequest,
  STORE_DECKS: 'decks',
  STORE_CARDS: 'cards',
  STORE_READINGS: 'readings',
  STORE_READING_GROUPS: 'readingGroups',
  STORE_CORRESPONDENCE_GROUPS: 'correspondenceGroups',
  STORE_CORRESPONDENCES: 'correspondences',
}));

vi.mock('../../lib/localDecks.js', () => ({
  putLocalDeck: m.putLocalDeck,
  putLocalCard: m.putLocalCard,
}));

vi.mock('../../lib/localCorrespondences.js', () => ({
  ensureDefaultCorrespondenceGroup: corrMocks.ensureDefaultCorrespondenceGroup,
  putCorrespondenceGroup: corrMocks.putCorrespondenceGroup,
  putCorrespondence: corrMocks.putCorrespondence,
}));

vi.mock('../../lib/localReadings.js', () => ({
  ensureDefaultReadingGroup: readingMocks.ensureDefaultReadingGroup,
  putReadingGroup: readingMocks.putReadingGroup,
  invalidateReadingListCache: vi.fn(),
  listAllLocalReadingRowsWithState: readingMocks.listAllLocalReadingRowsWithState,
  upsertLocalReadingRow: readingMocks.upsertLocalReadingRow,
}));

vi.mock('../../lib/proto/backupCodec.js', () => ({
  encodeCktarotBackup: m.encodeCktarotBackup,
  decodeCktarotBackup: m.decodeCktarotBackup,
  backupToDecks: m.backupToDecks,
  backupToReadings: m.backupToReadings,
  backupToReadingGroups: m.backupToReadingGroups,
  materializeCardRowFromProto: m.materializeCardRowFromProto,
  correspondenceGroupRowFromProto: m.correspondenceGroupRowFromProto,
  readingGroupRowFromProto: m.readingGroupRowFromProto,
  materializeCorrespondenceRowFromProto: m.materializeCorrespondenceRowFromProto,
}));

vi.mock('../../proto/generated/bundle.js', () => ({
  cktarot: {},
}));

import { backupFilename, exportLocalBackup, importLocalBackup } from '../../lib/localBackup.js';

const deck: LocalDeckRow = {
  id: 'd1',
  title: 'D',
  description: null,
  created_at: 'c',
  modified_at: 'm',
};

const card: LocalCardRow = {
  id: 'card1',
  deck_id: 'd1',
  title: 'C',
  number: 1,
  imageBlobId: 'b1',
  censorImageBlobId: null,
};

const reading: LocalReadingRow = {
  id: 'r1',
  name: 'R',
  state: new Uint8Array([9, 9]),
  updated_at: 'u',
  group_id: DEFAULT_READING_GROUP_ID,
};

function fakeDb(): IDBDatabase {
  return {
    transaction: vi.fn(() => ({
      objectStore: vi.fn(() => ({
        getAll: vi.fn(() => ({})),
        put: vi.fn(() => ({})),
      })),
    })),
  } as unknown as IDBDatabase;
}

function stubDomDownload(): {
  click: ReturnType<typeof vi.fn>;
  appendChild: ReturnType<typeof vi.fn>;
  removeChild: ReturnType<typeof vi.fn>;
  createElement: ReturnType<typeof vi.fn>;
  createObjectURL: ReturnType<typeof vi.fn>;
  revokeObjectURL: ReturnType<typeof vi.fn>;
} {
  const click = vi.fn();
  const appendChild = vi.fn();
  const removeChild = vi.fn();
  const createElement = vi.fn(() => ({
    href: '',
    download: '',
    rel: '',
    click,
  }));
  const createObjectURL = vi.fn(() => 'blob:fake');
  const revokeObjectURL = vi.fn();
  vi.stubGlobal('document', {
    createElement,
    body: { appendChild, removeChild },
  });
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL,
    revokeObjectURL,
  });
  return { click, appendChild, removeChild, createElement, createObjectURL, revokeObjectURL };
}

describe('localBackup.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.openTarotDb.mockResolvedValue(fakeDb());
    m.putLocalDeck.mockResolvedValue(undefined);
    m.putLocalCard.mockResolvedValue(undefined);
    corrMocks.ensureDefaultCorrespondenceGroup.mockResolvedValue(undefined);
    readingMocks.ensureDefaultReadingGroup.mockResolvedValue(undefined);
    corrMocks.putCorrespondenceGroup.mockResolvedValue(undefined);
    readingMocks.putReadingGroup.mockResolvedValue(undefined);
    readingMocks.listAllLocalReadingRowsWithState.mockResolvedValue([]);
    readingMocks.upsertLocalReadingRow.mockResolvedValue(undefined);
    corrMocks.putCorrespondence.mockResolvedValue(undefined);
    m.materializeCorrespondenceRowFromProto.mockResolvedValue(null);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('backupFilename uses ISO time with safe characters', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2020-01-02T03:04:05.006Z'));
    expect(backupFilename()).toBe('cktarot_backup_2020-01-02T03-04-05-006Z.pb');
  });

  it('exportLocalBackup reads stores, encodes, and triggers download', async () => {
    const dom = stubDomDownload();
    readingMocks.listAllLocalReadingRowsWithState.mockResolvedValue([reading]);
    let step = 0;
    m.idbRequest.mockImplementation(() => {
      step += 1;
      if (step === 1) return Promise.resolve([deck]);
      if (step === 2) return Promise.resolve([card]);
      if (step === 3) return Promise.resolve([]);
      if (step === 4) return Promise.resolve([]);
      if (step === 5) return Promise.resolve([]);
      return Promise.reject(new Error(`unexpected idb step ${step}`));
    });
    m.encodeCktarotBackup.mockResolvedValue(new Uint8Array([7, 8]));

    const onProgress = vi.fn();
    const r = await exportLocalBackup(onProgress);

    expect(r.errors).toEqual([]);
    expect(m.encodeCktarotBackup).toHaveBeenCalledWith(
      expect.objectContaining({
        decks: [deck],
        cards: [card],
        readings: [reading],
        readingGroups: [],
        correspondenceGroups: [],
        correspondences: [],
        exportedAt: expect.any(String) as string,
      }),
    );
    expect(onProgress).toHaveBeenCalled();
    expect(dom.createElement).toHaveBeenCalledWith('a');
    expect(dom.createObjectURL).toHaveBeenCalled();
    expect(dom.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('exportLocalBackup works without onProgress', async () => {
    stubDomDownload();
    readingMocks.listAllLocalReadingRowsWithState.mockResolvedValue([]);
    m.idbRequest
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    m.encodeCktarotBackup.mockResolvedValue(new Uint8Array());
    await expect(exportLocalBackup()).resolves.toEqual({ errors: [] });
  });

  it('exportLocalBackup records non-Error read failures', async () => {
    m.idbRequest.mockRejectedValue('string-fail');
    const r = await exportLocalBackup();
    expect(r.errors.some((e) => e.includes('string-fail'))).toBe(true);
    expect(m.logError).toHaveBeenCalled();
  });

  it('exportLocalBackup handles IndexedDB read Error', async () => {
    m.idbRequest.mockRejectedValue(new Error('tx dead'));
    const r = await exportLocalBackup();
    expect(r.errors).toEqual(['Failed to read IndexedDB: tx dead']);
  });

  it('exportLocalBackup handles serialize failure', async () => {
    m.idbRequest
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    m.encodeCktarotBackup.mockRejectedValue(new Error('encode'));
    const r = await exportLocalBackup();
    expect(r.errors).toEqual(['Failed to serialize backup: encode']);
  });

  it('exportLocalBackup handles download failure without throwing', async () => {
    const dom = stubDomDownload();
    dom.createElement.mockImplementation(() => {
      throw new Error('no anchor');
    });
    m.idbRequest
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    m.encodeCktarotBackup.mockResolvedValue(new Uint8Array([1]));
    const r = await exportLocalBackup();
    expect(r.errors).toEqual(['Failed to start download: no anchor']);
  });

  it('importLocalBackup returns early when decode reports errors', async () => {
    m.decodeCktarotBackup.mockReturnValue({
      backup: {},
      errors: ['bad version'],
    });
    const r = await importLocalBackup(new ArrayBuffer(0));
    expect(r.errors).toEqual(['bad version']);
    expect(m.backupToDecks).not.toHaveBeenCalled();
  });

  it('importLocalBackup handles invalid backup throw', async () => {
    m.decodeCktarotBackup.mockImplementation(() => {
      throw new Error('corrupt');
    });
    const r = await importLocalBackup(new ArrayBuffer(0));
    expect(r.errors).toEqual(['Invalid backup file: corrupt']);
  });

  it('importLocalBackup handles decode throw with non-Error', async () => {
    m.decodeCktarotBackup.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- cover pushError String(e) branch
      throw 'weird';
    });
    const r = await importLocalBackup(new ArrayBuffer(0));
    expect(r.errors).toEqual(['Invalid backup file: weird']);
  });

  it('importLocalBackup restores decks and reports progress', async () => {
    m.decodeCktarotBackup.mockReturnValue({ backup: {}, errors: [] });
    m.backupToDecks.mockReturnValue([deck]);
    m.backupToReadings.mockReturnValue([]);
    m.backupToReadingGroups.mockReturnValue([]);
    m.materializeCardRowFromProto.mockResolvedValue(null);

    const onProgress = vi.fn();
    const r = await importLocalBackup(new ArrayBuffer(0), onProgress);

    expect(r.errors).toEqual([]);
    expect(m.putLocalDeck).toHaveBeenCalledWith(deck);
    expect(onProgress).toHaveBeenCalled();
  });

  it('importLocalBackup records deck import failures', async () => {
    m.decodeCktarotBackup.mockReturnValue({ backup: {}, errors: [] });
    m.backupToDecks.mockReturnValue([deck]);
    m.backupToReadings.mockReturnValue([]);
    m.backupToReadingGroups.mockReturnValue([]);
    m.putLocalDeck.mockRejectedValue(new Error('deck fail'));
    m.materializeCardRowFromProto.mockResolvedValue(null);

    const r = await importLocalBackup(new ArrayBuffer(0));
    expect(r.errors).toEqual(['decks import id=d1: deck fail']);
  });

  it('importLocalBackup records non-Error deck import failures', async () => {
    m.decodeCktarotBackup.mockReturnValue({ backup: {}, errors: [] });
    m.backupToDecks.mockReturnValue([deck]);
    m.backupToReadings.mockReturnValue([]);
    m.backupToReadingGroups.mockReturnValue([]);
    m.putLocalDeck.mockRejectedValue('x');
    m.materializeCardRowFromProto.mockResolvedValue(null);

    const r = await importLocalBackup(new ArrayBuffer(0));
    expect(r.errors).toEqual(['decks import id=d1: x']);
  });

  it('importLocalBackup puts card when materialize returns a row', async () => {
    m.decodeCktarotBackup.mockReturnValue({ backup: { cards: [{}] }, errors: [] });
    m.backupToDecks.mockReturnValue([]);
    m.backupToReadings.mockReturnValue([]);
    m.backupToReadingGroups.mockReturnValue([]);
    m.materializeCardRowFromProto.mockResolvedValue(card);

    const r = await importLocalBackup(new ArrayBuffer(0));
    expect(r.errors).toEqual([]);
    expect(m.putLocalCard).toHaveBeenCalledWith(card);
  });

  it('importLocalBackup skips putLocalCard when materialize returns null', async () => {
    m.decodeCktarotBackup.mockReturnValue({ backup: { cards: [{}] }, errors: [] });
    m.backupToDecks.mockReturnValue([]);
    m.backupToReadings.mockReturnValue([]);
    m.backupToReadingGroups.mockReturnValue([]);
    m.materializeCardRowFromProto.mockResolvedValue(null);

    await importLocalBackup(new ArrayBuffer(0));
    expect(m.putLocalCard).not.toHaveBeenCalled();
  });

  it('importLocalBackup records card import failures from materialize throw', async () => {
    const proto = { id: 'p1' };
    m.decodeCktarotBackup.mockReturnValue({ backup: { cards: [proto] }, errors: [] });
    m.backupToDecks.mockReturnValue([]);
    m.backupToReadings.mockReturnValue([]);
    m.backupToReadingGroups.mockReturnValue([]);
    m.materializeCardRowFromProto.mockRejectedValue(new Error('mat'));

    const r = await importLocalBackup(new ArrayBuffer(0));
    expect(r.errors).toEqual(['cards import id=p1: mat']);
  });

  it('importLocalBackup rejects reading state that is not Uint8Array', async () => {
    m.decodeCktarotBackup.mockReturnValue({ backup: {}, errors: [] });
    m.backupToDecks.mockReturnValue([]);
    m.backupToReadingGroups.mockReturnValue([]);
    m.materializeCardRowFromProto.mockResolvedValue(null);
    m.backupToReadings.mockReturnValue([
      {
        id: 'r2',
        name: 'n',
        state: new ArrayBuffer(0) as unknown as Uint8Array,
        updated_at: 'u',
        group_id: DEFAULT_READING_GROUP_ID,
      },
    ]);

    const r = await importLocalBackup(new ArrayBuffer(0));
    expect(r.errors.some((e) => e.includes('reading state must be protobuf bytes'))).toBe(true);
  });

  it('importLocalBackup restores readings via upsertLocalReadingRow', async () => {
    m.decodeCktarotBackup.mockReturnValue({ backup: {}, errors: [] });
    m.backupToDecks.mockReturnValue([]);
    m.backupToReadingGroups.mockReturnValue([]);
    m.backupToReadings.mockReturnValue([reading]);
    m.materializeCardRowFromProto.mockResolvedValue(null);

    const r = await importLocalBackup(new ArrayBuffer(0));
    expect(r.errors).toEqual([]);
    expect(readingMocks.upsertLocalReadingRow).toHaveBeenCalledTimes(1);
    expect(readingMocks.upsertLocalReadingRow).toHaveBeenCalledWith(reading);
  });

  it('importLocalBackup records reading import failures', async () => {
    m.decodeCktarotBackup.mockReturnValue({ backup: {}, errors: [] });
    m.backupToDecks.mockReturnValue([]);
    m.backupToReadingGroups.mockReturnValue([]);
    m.backupToReadings.mockReturnValue([reading]);
    m.materializeCardRowFromProto.mockResolvedValue(null);
    readingMocks.upsertLocalReadingRow.mockRejectedValue(new Error('put fail'));

    const r = await importLocalBackup(new ArrayBuffer(0));
    expect(r.errors).toEqual(['readings import id=r1: put fail']);
  });

  it('importLocalBackup works without onProgress', async () => {
    m.decodeCktarotBackup.mockReturnValue({ backup: {}, errors: [] });
    m.backupToDecks.mockReturnValue([]);
    m.backupToReadings.mockReturnValue([]);
    m.backupToReadingGroups.mockReturnValue([]);
    m.materializeCardRowFromProto.mockResolvedValue(null);
    await expect(importLocalBackup(new ArrayBuffer(0))).resolves.toEqual({ errors: [] });
  });
});
