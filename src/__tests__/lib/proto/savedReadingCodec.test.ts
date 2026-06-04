import { afterEach, describe, expect, it, vi } from 'vitest';

import { cktarot } from '../../../proto/generated/bundle.js';
import {
  decodeSavedReadingState,
  encodeSavedReadingState,
} from '../../../lib/proto/savedReadingCodec.js';
import type { SavedReadingState } from '../../../types/readingState.js';

type SavedReadingStateDecodeInput = Parameters<typeof cktarot.SavedReadingState.decode>[0];

function minimalState(overrides?: Partial<SavedReadingState>): SavedReadingState {
  return {
    viewport: { scale: 1, offsetX: 0, offsetY: 0 },
    cards: [],
    textLabels: [],
    ...overrides,
  };
}

function baseTextLabel(
  overrides?: Partial<SavedReadingState['textLabels'][number]>,
): SavedReadingState['textLabels'][number] {
  return {
    id: 'tl1',
    text: 'hi',
    x: 0,
    y: 0,
    fontSize: 14,
    fontWeight: 400,
    fontStyle: 'normal',
    textDecoration: 'none',
    color: '#000',
    zIndex: 0,
    anchorCardId: null,
    anchorPosition: null,
    fixedWidth: false,
    fixedWidthPx: 0,
    fontProfileId: null,
    ...overrides,
  };
}

describe('savedReadingCodec.ts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('round-trips a rich state (cards + text labels with all optional card fields)', () => {
    const state = minimalState({
      viewport: { scale: 2, offsetX: 10, offsetY: -5 },
      cards: [
        {
          id: 'c1',
          deck_id: 'd1',
          card_id: 'card1',
          deck_title: 'Deck',
          card_title: 'Star',
          image_source: 'img/key',
          censor_image_source: 'cen/key',
          image_created_at: '2026-01-01T00:00:00.000Z',
          mime_type: 'image/png',
          data: new Uint8Array([1, 2, 3]),
          censored_data: new Uint8Array([4]),
          censored_mime_type: 'image/webp',
          card_number: 7,
          x: 1,
          y: 2,
          rotation: 0.5,
          zIndex: 3,
          opacity: 0.9,
        },
      ],
      textLabels: [
        baseTextLabel({
          id: 'a',
          fontStyle: 'italic',
          textDecoration: 'underline',
          anchorCardId: 'c1',
          anchorPosition: 'above',
        }),
        baseTextLabel({ id: 'b', anchorPosition: 'below' }),
        baseTextLabel({ id: 'c', anchorPosition: 'left' }),
        baseTextLabel({ id: 'd', anchorPosition: 'right' }),
      ],
    });
    const bytes = encodeSavedReadingState(state);
    expect(decodeSavedReadingState(bytes)).toEqual(state);
  });

  it('round-trips text label fixed width fields', () => {
    const state = minimalState({
      textLabels: [
        baseTextLabel({ id: 'w1', fixedWidth: true, fixedWidthPx: 333 }),
        baseTextLabel({ id: 'w2', fixedWidth: false, fixedWidthPx: 400 }),
      ],
    });
    expect(decodeSavedReadingState(encodeSavedReadingState(state))).toEqual(state);
  });

  it('round-trips minimal cards and labels (optional card fields omitted)', () => {
    const state = minimalState({
      cards: [
        {
          id: 'c1',
          deck_id: 'd1',
          card_id: 'x',
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 0,
          opacity: 1,
        },
      ],
      textLabels: [baseTextLabel({ id: 't1' })],
    });
    const decoded = decodeSavedReadingState(encodeSavedReadingState(state));
    expect(decoded.cards[0]).toMatchObject({
      id: 'c1',
      deck_id: 'd1',
      card_id: 'x',
      censor_image_source: null,
    });
    expect(decoded.cards[0]).not.toHaveProperty('deck_title');
    expect(decoded.cards[0]).not.toHaveProperty('data');
    expect(decoded.textLabels[0]).toMatchObject({
      fontStyle: 'normal',
      textDecoration: 'none',
      anchorCardId: null,
      anchorPosition: null,
    });
  });

  it('does not encode empty image blobs; omits censor_image_source when undefined or null', () => {
    const state = minimalState({
      cards: [
        {
          id: 'c1',
          deck_id: 'd1',
          card_id: 'x',
          censor_image_source: undefined,
          data: new Uint8Array(0),
          censored_data: new Uint8Array(0),
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 0,
          opacity: 1,
        },
        {
          id: 'c2',
          deck_id: 'd2',
          card_id: 'y',
          censor_image_source: null,
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 0,
          opacity: 1,
        },
      ],
    });
    const decoded = decodeSavedReadingState(encodeSavedReadingState(state));
    expect(decoded.cards[0].censor_image_source).toBeNull();
    expect(decoded.cards[1].censor_image_source).toBeNull();
    expect(decoded.cards[0]).not.toHaveProperty('data');
    expect(decoded.cards[0]).not.toHaveProperty('censored_data');
  });

  it('maps empty censorImageSource in proto to null on decode', () => {
    const msg = new cktarot.SavedReadingState();
    const vp = new cktarot.Viewport();
    vp.scale = 1;
    vp.offsetX = 0;
    vp.offsetY = 0;
    msg.viewport = vp;
    const card = new cktarot.PlacedCard();
    card.id = 'c1';
    card.deckId = 'd1';
    card.cardId = 'x';
    card.censorImageSource = '';
    msg.cards = [card];
    msg.textLabels = [];
    const bytes = new Uint8Array(cktarot.SavedReadingState.encode(msg).finish());
    const out = decodeSavedReadingState(bytes);
    expect(out.cards[0].censor_image_source).toBeNull();
  });

  it('throws when viewport is missing', () => {
    const msg = new cktarot.SavedReadingState();
    msg.cards = [];
    msg.textLabels = [];
    const bytes = new Uint8Array(cktarot.SavedReadingState.encode(msg).finish());
    expect(() => decodeSavedReadingState(bytes)).toThrow('SavedReadingState: missing viewport');
  });

  it('uses encodeAnchorPosition default for unknown runtime anchor string', () => {
    const state = minimalState({
      textLabels: [
        {
          ...baseTextLabel({ id: 'bad' }),
          anchorPosition: 'bogus' as SavedReadingState['textLabels'][number]['anchorPosition'],
        },
      ],
    });
    const bytes = encodeSavedReadingState(state);
    const decoded = decodeSavedReadingState(bytes);
    expect(decoded.textLabels[0].anchorPosition).toBeNull();
  });

  it('decodes unknown anchor enum as null', () => {
    const msg = new cktarot.SavedReadingState();
    const vp = new cktarot.Viewport();
    msg.viewport = vp;
    const tl = new cktarot.TextLabel();
    tl.id = 't';
    tl.text = 'x';
    tl.anchorPosition = 99999;
    msg.textLabels = [tl];
    msg.cards = [];
    const bytes = new Uint8Array(cktarot.SavedReadingState.encode(msg).finish());
    const out = decodeSavedReadingState(bytes);
    expect(out.textLabels[0].anchorPosition).toBeNull();
  });

  it('decodes unknown font style and text decoration as normal / none', () => {
    const msg = new cktarot.SavedReadingState();
    const vp = new cktarot.Viewport();
    msg.viewport = vp;
    const tl = new cktarot.TextLabel();
    tl.id = 't';
    tl.text = 'x';
    tl.fontStyle = 99;
    tl.textDecoration = 99;
    msg.textLabels = [tl];
    msg.cards = [];
    const bytes = new Uint8Array(cktarot.SavedReadingState.encode(msg).finish());
    const out = decodeSavedReadingState(bytes);
    expect(out.textLabels[0].fontStyle).toBe('normal');
    expect(out.textLabels[0].textDecoration).toBe('none');
  });

  it('normalizes card bytes when decode returns non-Uint8Array data', () => {
    const state = minimalState({
      cards: [
        {
          id: 'c1',
          deck_id: 'd1',
          card_id: 'x',
          data: new Uint8Array([9, 8, 7]),
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 0,
          opacity: 1,
        },
      ],
    });
    const bytes = encodeSavedReadingState(state);
    const origDecode = cktarot.SavedReadingState.decode.bind(cktarot.SavedReadingState);
    vi.spyOn(cktarot.SavedReadingState, 'decode').mockImplementationOnce(
      (u: SavedReadingStateDecodeInput) => {
        const m = origDecode(u);
        const c0 = m.cards?.[0];
        if (c0) {
          Object.assign(c0, { data: [9, 8, 7] });
        }
        return m;
      },
    );
    const out = decodeSavedReadingState(bytes);
    expect(out.cards[0].data).toEqual(new Uint8Array([9, 8, 7]));
  });

  it('normalizes censoredData when decode returns non-Uint8Array', () => {
    const state = minimalState({
      cards: [
        {
          id: 'c1',
          deck_id: 'd1',
          card_id: 'x',
          censored_data: new Uint8Array([1]),
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 0,
          opacity: 1,
        },
      ],
    });
    const bytes = encodeSavedReadingState(state);
    const origDecode = cktarot.SavedReadingState.decode.bind(cktarot.SavedReadingState);
    vi.spyOn(cktarot.SavedReadingState, 'decode').mockImplementationOnce(
      (u: SavedReadingStateDecodeInput) => {
        const m = origDecode(u);
        const c0 = m.cards?.[0];
        if (c0) {
          Object.assign(c0, { censoredData: [1] });
        }
        return m;
      },
    );
    const out = decodeSavedReadingState(bytes);
    expect(out.cards[0].censored_data).toEqual(new Uint8Array([1]));
  });

  it('applies viewport defaults when scale and offsets are nullish on decode', () => {
    const bytes = encodeSavedReadingState(minimalState());
    const origDecode = cktarot.SavedReadingState.decode.bind(cktarot.SavedReadingState);
    vi.spyOn(cktarot.SavedReadingState, 'decode').mockImplementationOnce(
      (u: SavedReadingStateDecodeInput) => {
        const m = origDecode(u);
        const vp = m.viewport;
        if (vp) {
          Object.assign(vp, {
            scale: undefined,
            offsetX: undefined,
            offsetY: undefined,
          });
        }
        return m;
      },
    );
    const out = decodeSavedReadingState(bytes);
    expect(out.viewport).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });

  it('omits optional card titles when proto values are empty strings', () => {
    const msg = new cktarot.SavedReadingState();
    const vp = new cktarot.Viewport();
    msg.viewport = vp;
    const card = new cktarot.PlacedCard();
    card.id = 'c1';
    card.deckId = 'd1';
    card.cardId = 'x';
    card.deckTitle = '';
    card.cardTitle = '';
    card.imageSource = '';
    msg.cards = [card];
    msg.textLabels = [];
    const bytes = new Uint8Array(cktarot.SavedReadingState.encode(msg).finish());
    const out = decodeSavedReadingState(bytes);
    expect(out.cards[0]).not.toHaveProperty('deck_title');
    expect(out.cards[0]).not.toHaveProperty('card_title');
    expect(out.cards[0]).not.toHaveProperty('image_source');
  });

  it('omits card_number when proto cardNumber is null or undefined', () => {
    const withNull = new cktarot.SavedReadingState();
    withNull.viewport = new cktarot.Viewport();
    const c1 = new cktarot.PlacedCard();
    c1.id = 'c1';
    c1.deckId = 'd1';
    c1.cardId = 'x';
    c1.cardNumber = null;
    withNull.cards = [c1];
    withNull.textLabels = [];
    const out1 = decodeSavedReadingState(
      new Uint8Array(cktarot.SavedReadingState.encode(withNull).finish()),
    );
    expect(out1.cards[0]).not.toHaveProperty('card_number');

    const withUndef = new cktarot.PlacedCard();
    withUndef.id = 'c2';
    withUndef.deckId = 'd1';
    withUndef.cardId = 'y';
    const msg2 = new cktarot.SavedReadingState();
    msg2.viewport = new cktarot.Viewport();
    msg2.cards = [withUndef];
    msg2.textLabels = [];
    const out2 = decodeSavedReadingState(
      new Uint8Array(cktarot.SavedReadingState.encode(msg2).finish()),
    );
    expect(out2.cards[0]).not.toHaveProperty('card_number');
  });

  it('sets card_number including zero', () => {
    const msg = new cktarot.SavedReadingState();
    msg.viewport = new cktarot.Viewport();
    const card = new cktarot.PlacedCard();
    card.id = 'c1';
    card.deckId = 'd1';
    card.cardId = 'x';
    card.cardNumber = 0;
    msg.cards = [card];
    msg.textLabels = [];
    const out = decodeSavedReadingState(
      new Uint8Array(cktarot.SavedReadingState.encode(msg).finish()),
    );
    expect(out.cards[0].card_number).toBe(0);
  });

  it('treats empty anchorCardId as null', () => {
    const msg = new cktarot.SavedReadingState();
    msg.viewport = new cktarot.Viewport();
    const tl = new cktarot.TextLabel();
    tl.id = 't';
    tl.text = 'x';
    tl.anchorCardId = '';
    msg.textLabels = [tl];
    msg.cards = [];
    const out = decodeSavedReadingState(
      new Uint8Array(cktarot.SavedReadingState.encode(msg).finish()),
    );
    expect(out.textLabels[0].anchorCardId).toBeNull();
  });

  it('does not set anchorCardId on proto when null (encode path)', () => {
    const state = minimalState({
      textLabels: [baseTextLabel({ anchorCardId: null })],
    });
    const bytes = encodeSavedReadingState(state);
    const msg = cktarot.SavedReadingState.decode(bytes);
    const tl = msg.textLabels?.[0];
    expect(tl?.anchorCardId).toBeFalsy();
  });

  it('treats null cards and textLabels on decode as empty arrays', () => {
    const bytes = encodeSavedReadingState(minimalState());
    const origDecode = cktarot.SavedReadingState.decode.bind(cktarot.SavedReadingState);
    vi.spyOn(cktarot.SavedReadingState, 'decode').mockImplementationOnce(
      (u: SavedReadingStateDecodeInput) => {
        const m = origDecode(u);
        Object.assign(m, {
          cards: null,
          textLabels: null,
        });
        return m;
      },
    );
    const out = decodeSavedReadingState(bytes);
    expect(out.cards).toEqual([]);
    expect(out.textLabels).toEqual([]);
  });

  it('skips row.data when decoded data is an empty Uint8Array', () => {
    const bytes = encodeSavedReadingState(
      minimalState({
        cards: [
          {
            id: 'c1',
            deck_id: 'd1',
            card_id: 'x',
            data: new Uint8Array([1]),
            x: 0,
            y: 0,
            rotation: 0,
            zIndex: 0,
            opacity: 1,
          },
        ],
      }),
    );
    const origDecode = cktarot.SavedReadingState.decode.bind(cktarot.SavedReadingState);
    vi.spyOn(cktarot.SavedReadingState, 'decode').mockImplementationOnce(
      (u: SavedReadingStateDecodeInput) => {
        const m = origDecode(u);
        const c0 = m.cards?.[0];
        if (c0) {
          c0.data = new Uint8Array(0);
        }
        return m;
      },
    );
    const out = decodeSavedReadingState(bytes);
    expect(out.cards[0]).not.toHaveProperty('data');
  });

  it('skips censored_data when decoded censoredData is an empty Uint8Array', () => {
    const bytes = encodeSavedReadingState(
      minimalState({
        cards: [
          {
            id: 'c1',
            deck_id: 'd1',
            card_id: 'x',
            censored_data: new Uint8Array([1]),
            x: 0,
            y: 0,
            rotation: 0,
            zIndex: 0,
            opacity: 1,
          },
        ],
      }),
    );
    const origDecode = cktarot.SavedReadingState.decode.bind(cktarot.SavedReadingState);
    vi.spyOn(cktarot.SavedReadingState, 'decode').mockImplementationOnce(
      (u: SavedReadingStateDecodeInput) => {
        const m = origDecode(u);
        const c0 = m.cards?.[0];
        if (c0) {
          c0.censoredData = new Uint8Array(0);
        }
        return m;
      },
    );
    const out = decodeSavedReadingState(bytes);
    expect(out.cards[0]).not.toHaveProperty('censored_data');
  });

  it('uses text label fallbacks when proto fields are undefined', () => {
    const bytes = encodeSavedReadingState(minimalState());
    const origDecode = cktarot.SavedReadingState.decode.bind(cktarot.SavedReadingState);
    vi.spyOn(cktarot.SavedReadingState, 'decode').mockImplementationOnce(
      (u: SavedReadingStateDecodeInput) => {
        const m = origDecode(u);
        m.textLabels = [{} as cktarot.TextLabel];
        return m;
      },
    );
    const out = decodeSavedReadingState(bytes);
    expect(out.textLabels[0]).toEqual({
      id: '',
      text: '',
      x: 0,
      y: 0,
      fontSize: 14,
      fontWeight: 400,
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#000000',
      zIndex: 0,
      anchorCardId: null,
      anchorPosition: null,
      fixedWidth: false,
      fixedWidthPx: 0,
      fontProfileId: null,
    });
  });

  it('round-trips text label fontProfileId', () => {
    const state = minimalState({
      textLabels: [baseTextLabel({ fontProfileId: 'fp-abc' })],
    });
    const out = decodeSavedReadingState(encodeSavedReadingState(state));
    expect(out.textLabels[0]?.fontProfileId).toBe('fp-abc');
  });

  it('round-trips card image rotation on placed cards', () => {
    const state = minimalState({
      cards: [
        {
          id: 'c1',
          deck_id: 'd1',
          card_id: 'x',
          x: 0,
          y: 0,
          rotation: 270,
          zIndex: 0,
          opacity: 1,
        },
      ],
    });
    const out = decodeSavedReadingState(encodeSavedReadingState(state));
    expect(out.cards[0].rotation).toBe(270);
  });

  it('omits optional card string fields when proto values are falsy', () => {
    const msg = new cktarot.SavedReadingState();
    msg.viewport = new cktarot.Viewport();
    const card = new cktarot.PlacedCard();
    card.id = 'c1';
    card.deckId = 'd1';
    card.cardId = 'x';
    card.createdAt = '';
    card.mimeType = '';
    card.censoredMimeType = '';
    msg.cards = [card];
    msg.textLabels = [];
    const out = decodeSavedReadingState(
      new Uint8Array(cktarot.SavedReadingState.encode(msg).finish()),
    );
    expect(out.cards[0]).not.toHaveProperty('image_created_at');
    expect(out.cards[0]).not.toHaveProperty('mime_type');
    expect(out.cards[0]).not.toHaveProperty('censored_mime_type');
  });

  it('keeps censored_data as Uint8Array when decode returns Uint8Array', () => {
    const state = minimalState({
      cards: [
        {
          id: 'c1',
          deck_id: 'd1',
          card_id: 'x',
          censored_data: new Uint8Array([2, 3]),
          x: 0,
          y: 0,
          rotation: 0,
          zIndex: 0,
          opacity: 1,
        },
      ],
    });
    const out = decodeSavedReadingState(encodeSavedReadingState(state));
    expect(out.cards[0].censored_data).toBeInstanceOf(Uint8Array);
    expect([...out.cards[0].censored_data!]).toEqual([2, 3]);
  });

  it('applies card fallbacks when proto omits id, deck, card, pose, and censor fields', () => {
    const bytes = encodeSavedReadingState(minimalState());
    const origDecode = cktarot.SavedReadingState.decode.bind(cktarot.SavedReadingState);
    vi.spyOn(cktarot.SavedReadingState, 'decode').mockImplementationOnce(
      (u: SavedReadingStateDecodeInput) => {
        const m = origDecode(u);
        m.cards = [{} as cktarot.PlacedCard];
        return m;
      },
    );
    const out = decodeSavedReadingState(bytes);
    expect(out.cards[0]).toEqual({
      id: '',
      deck_id: '',
      card_id: '',
      x: 0,
      y: 0,
      rotation: 0,
      zIndex: 0,
      opacity: 1,
      censor_image_source: null,
    });
  });

  it('preserves numeric zero for opacity when proto sets opacity to 0', () => {
    const msg = new cktarot.SavedReadingState();
    msg.viewport = new cktarot.Viewport();
    const card = new cktarot.PlacedCard();
    card.id = 'c1';
    card.deckId = 'd1';
    card.cardId = 'x';
    card.opacity = 0;
    msg.cards = [card];
    msg.textLabels = [];
    const out = decodeSavedReadingState(
      new Uint8Array(cktarot.SavedReadingState.encode(msg).finish()),
    );
    expect(out.cards[0].opacity).toBe(0);
  });
});
