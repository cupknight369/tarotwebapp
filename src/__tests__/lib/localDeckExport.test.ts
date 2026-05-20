import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LocalCardRow, LocalDeckRow } from '../../types/localDb.js';

const m = vi.hoisted(() => ({
  logError: vi.fn(),
  listUserCreatedDecks: vi.fn(),
  listLocalCardsByDeckId: vi.fn(),
  putLocalDeck: vi.fn(),
  putLocalCard: vi.fn(),
  listCorrespondencesAll: vi.fn(),
  encodeDeckExport: vi.fn(),
  decodeDeckExport: vi.fn(),
  insertDeckFromProto: vi.fn(),
  insertCardFromProto: vi.fn(),
}));

vi.mock('../../lib/logError.js', () => ({ logError: m.logError }));

vi.mock('../../lib/localDecks.js', () => ({
  isUserCreatedDeck: (d: LocalDeckRow) => d.from_catalog !== true,
  listUserCreatedDecks: m.listUserCreatedDecks,
  listLocalCardsByDeckId: m.listLocalCardsByDeckId,
  putLocalDeck: m.putLocalDeck,
  putLocalCard: m.putLocalCard,
}));

vi.mock('../../lib/localCorrespondences.js', () => ({
  listCorrespondencesAll: m.listCorrespondencesAll,
}));

vi.mock('../../lib/proto/deckExportCodec.js', () => ({
  encodeDeckExport: m.encodeDeckExport,
  decodeDeckExport: m.decodeDeckExport,
  insertDeckFromProto: m.insertDeckFromProto,
  insertCardFromProto: m.insertCardFromProto,
}));

vi.mock('../../proto/generated/bundle.js', () => ({
  cktarot: {},
}));

import { exportDecks, importDecks, deckExportFilename } from '../../lib/localDeckExport.js';

const userDeck: LocalDeckRow = {
  id: 'd-user',
  title: 'My Deck',
  description: null,
  created_at: '2026-05-20T00:00:00.000Z',
  modified_at: '2026-05-20T00:00:00.000Z',
  from_catalog: false,
};

const catalogDeck: LocalDeckRow = {
  id: 'd-cloud',
  title: 'Cloud Deck',
  description: null,
  created_at: '2026-05-20T00:00:00.000Z',
  modified_at: '2026-05-20T00:00:00.000Z',
  from_catalog: true,
};

const cardA: LocalCardRow = {
  id: 'c-a',
  deck_id: 'd-user',
  title: 'Ace',
  number: 1,
  imageBlobId: 'b1',
  censorImageBlobId: null,
  correspondence_ids: [],
};

function stubDomDownload(): { click: ReturnType<typeof vi.fn> } {
  const click = vi.fn();
  vi.stubGlobal('document', {
    createElement: vi.fn(() => ({
      href: '',
      download: '',
      rel: '',
      click,
    })),
    body: { appendChild: vi.fn(), removeChild: vi.fn() },
  });
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: vi.fn(() => 'blob:fake'),
    revokeObjectURL: vi.fn(),
  });
  return { click };
}

describe('localDeckExport.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    m.encodeDeckExport.mockResolvedValue(new Uint8Array([1, 2, 3]));
    m.listCorrespondencesAll.mockResolvedValue([]);
    m.putLocalDeck.mockResolvedValue(undefined);
    m.putLocalCard.mockResolvedValue(undefined);
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('deckExportFilename includes prefix and extension', () => {
    expect(deckExportFilename()).toMatch(/^cktarot_decks_.*\.pb$/);
  });

  it('exportDecks rejects empty deckIds', async () => {
    const { errors } = await exportDecks([]);
    expect(errors).toContain('Select at least one deck to export.');
    expect(m.encodeDeckExport).not.toHaveBeenCalled();
  });

  it('exportDecks includes only user-created selected decks and their cards', async () => {
    const dom = stubDomDownload();
    m.listUserCreatedDecks.mockResolvedValue([userDeck, catalogDeck]);
    m.listLocalCardsByDeckId.mockResolvedValue([cardA]);

    const r = await exportDecks(['d-user', 'd-cloud']);

    expect(r.errors).toEqual([]);
    expect(m.encodeDeckExport).toHaveBeenCalledWith(
      expect.objectContaining({
        decks: [userDeck],
        cards: [cardA],
      }),
    );
    expect(dom.click).toHaveBeenCalled();
  });

  it('exportDecks errors when no user decks match selection', async () => {
    m.listUserCreatedDecks.mockResolvedValue([catalogDeck]);

    const r = await exportDecks(['d-cloud']);

    expect(r.errors).toContain('No user-created decks selected for export.');
    expect(m.encodeDeckExport).not.toHaveBeenCalled();
  });

  it('importDecks returns errors from decode without importing', async () => {
    m.decodeDeckExport.mockReturnValue({
      export: { decks: [], cards: [] },
      errors: ['bad version'],
    });

    const result = await importDecks(new ArrayBuffer(8));

    expect(result.errors).toContain('bad version');
    expect(result.importedDecks).toBe(0);
    expect(result.importedCards).toBe(0);
    expect(m.insertDeckFromProto).not.toHaveBeenCalled();
  });

  it('importDecks inserts decks and cards with new ids including duplicate titles', async () => {
    m.decodeDeckExport.mockReturnValue({
      export: {
        decks: [
          { id: 'exp-d1', title: 'Same', fromCatalog: false },
          { id: 'exp-d2', title: 'Same', fromCatalog: false },
        ],
        cards: [
          { id: 'exp-c1', deckId: 'exp-d1', title: 'Card', number: 0 },
          { id: 'exp-c2', deckId: 'exp-d2', title: 'Card', number: 1 },
        ],
      },
      errors: [],
    });
    m.insertDeckFromProto
      .mockReturnValueOnce({
        id: 'new-d1',
        title: 'Same',
        description: null,
        created_at: '1',
        modified_at: '1',
        from_catalog: false,
      })
      .mockReturnValueOnce({
        id: 'new-d2',
        title: 'Same',
        description: null,
        created_at: '2',
        modified_at: '2',
        from_catalog: false,
      });
    m.insertCardFromProto
      .mockResolvedValueOnce({
        id: 'new-c1',
        deck_id: 'new-d1',
        title: 'Card',
        number: 0,
        imageBlobId: 'b1',
        censorImageBlobId: null,
        correspondence_ids: [],
      })
      .mockResolvedValueOnce({
        id: 'new-c2',
        deck_id: 'new-d2',
        title: 'Card',
        number: 1,
        imageBlobId: 'b2',
        censorImageBlobId: null,
        correspondence_ids: [],
      });

    const result = await importDecks(new ArrayBuffer(8));

    expect(m.insertDeckFromProto).toHaveBeenCalledTimes(2);
    expect(m.putLocalDeck).toHaveBeenCalledTimes(2);
    expect(m.insertCardFromProto).toHaveBeenCalledTimes(2);
    expect(m.putLocalCard).toHaveBeenCalledTimes(2);
    expect(result.importedDecks).toBe(2);
    expect(result.importedCards).toBe(2);
  });

  it('importDecks skips catalog decks in file', async () => {
    m.decodeDeckExport.mockReturnValue({
      export: {
        decks: [{ id: 'cloud', title: 'Cloud', fromCatalog: true }],
        cards: [],
      },
      errors: [],
    });
    m.insertDeckFromProto.mockReturnValue(null);

    const result = await importDecks(new ArrayBuffer(8));

    expect(result.importedDecks).toBe(0);
    expect(m.putLocalDeck).not.toHaveBeenCalled();
  });
});
