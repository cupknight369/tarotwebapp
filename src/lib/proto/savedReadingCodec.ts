import type { SavedReadingState } from '../../types/readingState.js';
import { cktarot } from '../../proto/generated/bundle.js';

function encodeFontStyle(s: 'normal' | 'italic'): number {
  return s === 'italic' ? cktarot.FontStyle.FONT_STYLE_ITALIC : cktarot.FontStyle.FONT_STYLE_NORMAL;
}

function decodeFontStyle(n: number): 'normal' | 'italic' {
  return (n as cktarot.FontStyle) === cktarot.FontStyle.FONT_STYLE_ITALIC ? 'italic' : 'normal';
}

function encodeTextDecoration(s: 'none' | 'underline'): number {
  return s === 'underline'
    ? cktarot.TextDecoration.TEXT_DECORATION_UNDERLINE
    : cktarot.TextDecoration.TEXT_DECORATION_NONE;
}

function decodeTextDecoration(n: number): 'none' | 'underline' {
  return (n as cktarot.TextDecoration) === cktarot.TextDecoration.TEXT_DECORATION_UNDERLINE
    ? 'underline'
    : 'none';
}

function encodeAnchorPosition(s: 'above' | 'below' | 'left' | 'right' | null): number {
  if (s === null) return cktarot.AnchorPosition.ANCHOR_POSITION_UNSPECIFIED;
  switch (s) {
    case 'above':
      return cktarot.AnchorPosition.ANCHOR_POSITION_ABOVE;
    case 'below':
      return cktarot.AnchorPosition.ANCHOR_POSITION_BELOW;
    case 'left':
      return cktarot.AnchorPosition.ANCHOR_POSITION_LEFT;
    case 'right':
      return cktarot.AnchorPosition.ANCHOR_POSITION_RIGHT;
    default:
      return cktarot.AnchorPosition.ANCHOR_POSITION_UNSPECIFIED;
  }
}

function decodeAnchorPosition(n: number): 'above' | 'below' | 'left' | 'right' | null {
  switch (n as cktarot.AnchorPosition) {
    case cktarot.AnchorPosition.ANCHOR_POSITION_ABOVE:
      return 'above';
    case cktarot.AnchorPosition.ANCHOR_POSITION_BELOW:
      return 'below';
    case cktarot.AnchorPosition.ANCHOR_POSITION_LEFT:
      return 'left';
    case cktarot.AnchorPosition.ANCHOR_POSITION_RIGHT:
      return 'right';
    default:
      return null;
  }
}

export function encodeSavedReadingState(state: SavedReadingState): Uint8Array {
  const cards = state.cards.map((c) => {
    const pc = new cktarot.PlacedCard();
    pc.id = c.id;
    pc.deckId = c.deck_id;
    pc.cardId = c.card_id;
    if (c.deck_title !== undefined) pc.deckTitle = c.deck_title;
    if (c.card_title !== undefined) pc.cardTitle = c.card_title;
    if (c.image_source !== undefined) pc.imageSource = c.image_source;
    if (c.censor_image_source !== undefined && c.censor_image_source !== null) {
      pc.censorImageSource = c.censor_image_source;
    }
    pc.x = c.x;
    pc.y = c.y;
    pc.rotation = c.rotation;
    pc.zIndex = c.zIndex;
    pc.opacity = c.opacity;
    if (c.image_created_at !== undefined) pc.createdAt = c.image_created_at;
    if (c.mime_type !== undefined) pc.mimeType = c.mime_type;
    if (c.data !== undefined && c.data.length > 0) pc.data = c.data;
    if (c.censored_data !== undefined && c.censored_data.length > 0) {
      pc.censoredData = c.censored_data;
    }
    if (c.censored_mime_type !== undefined) {
      pc.censoredMimeType = c.censored_mime_type;
    }
    if (c.card_number !== undefined) pc.cardNumber = c.card_number;
    return pc;
  });

  const textLabels = state.textLabels.map((t) => {
    const tl = new cktarot.TextLabel();
    tl.id = t.id;
    tl.text = t.text;
    tl.x = t.x;
    tl.y = t.y;
    tl.fontSize = t.fontSize;
    tl.fontWeight = t.fontWeight;
    tl.fontStyle = encodeFontStyle(t.fontStyle);
    tl.textDecoration = encodeTextDecoration(t.textDecoration);
    tl.color = t.color;
    tl.zIndex = t.zIndex;
    if (t.anchorCardId !== null) tl.anchorCardId = t.anchorCardId;
    tl.anchorPosition = encodeAnchorPosition(t.anchorPosition);
    return tl;
  });

  const viewport = new cktarot.Viewport();
  viewport.scale = state.viewport.scale;
  viewport.offsetX = state.viewport.offsetX;
  viewport.offsetY = state.viewport.offsetY;

  const msg = new cktarot.SavedReadingState();
  msg.viewport = viewport;
  msg.cards = cards;
  msg.textLabels = textLabels;

  return new Uint8Array(cktarot.SavedReadingState.encode(msg).finish());
}

export function decodeSavedReadingState(bytes: Uint8Array): SavedReadingState {
  const msg = cktarot.SavedReadingState.decode(bytes);
  const vp = msg.viewport;
  if (!vp) {
    throw new Error('SavedReadingState: missing viewport');
  }
  const out: SavedReadingState = {
    viewport: {
      scale: vp.scale ?? 1,
      offsetX: vp.offsetX ?? 0,
      offsetY: vp.offsetY ?? 0,
    },
    cards: (msg.cards ?? []).map((c) => {
      const deckTitle = c.deckTitle;
      const cardTitle = c.cardTitle;
      const imageSource = c.imageSource;
      const row: SavedReadingState['cards'][number] = {
        id: c.id ?? '',
        deck_id: c.deckId ?? '',
        card_id: c.cardId ?? '',
        x: c.x ?? 0,
        y: c.y ?? 0,
        rotation: c.rotation ?? 0,
        zIndex: c.zIndex ?? 0,
        opacity: c.opacity ?? 1,
        censor_image_source:
          c.censorImageSource !== undefined && c.censorImageSource !== ''
            ? c.censorImageSource
            : null,
      };
      if (deckTitle) row.deck_title = deckTitle;
      if (cardTitle) row.card_title = cardTitle;
      if (imageSource) row.image_source = imageSource;
      if (c.createdAt) row.image_created_at = c.createdAt;
      if (c.mimeType) row.mime_type = c.mimeType;
      if (c.data && c.data.length > 0) {
        row.data =
          c.data instanceof Uint8Array ? c.data : new Uint8Array(c.data as ArrayLike<number>);
      }
      if (c.censoredData && c.censoredData.length > 0) {
        row.censored_data =
          c.censoredData instanceof Uint8Array
            ? c.censoredData
            : new Uint8Array(c.censoredData as ArrayLike<number>);
      }
      if (c.censoredMimeType) row.censored_mime_type = c.censoredMimeType;
      if (c.cardNumber !== undefined && c.cardNumber !== null) {
        row.card_number = c.cardNumber;
      }
      return row;
    }),
    textLabels: (msg.textLabels ?? []).map((t): SavedReadingState['textLabels'][number] => ({
      id: t.id ?? '',
      text: t.text ?? '',
      x: t.x ?? 0,
      y: t.y ?? 0,
      fontSize: t.fontSize ?? 14,
      fontWeight: t.fontWeight ?? 400,
      fontStyle: decodeFontStyle(Number(t.fontStyle ?? 0)),
      textDecoration: decodeTextDecoration(Number(t.textDecoration ?? 0)),
      color: t.color ?? '#000000',
      zIndex: t.zIndex ?? 0,
      anchorCardId: t.anchorCardId !== undefined && t.anchorCardId !== '' ? t.anchorCardId : null,
      anchorPosition: decodeAnchorPosition(Number(t.anchorPosition ?? 0)),
    })),
  };
  return out;
}
