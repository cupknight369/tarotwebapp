import * as $protobuf from "protobufjs";
import Long = require("long");
/** Namespace cktarot. */
export namespace cktarot {

    /** Properties of a Viewport. */
    interface IViewport {

        /** Viewport scale */
        scale?: (number|null);

        /** Viewport offsetX */
        offsetX?: (number|null);

        /** Viewport offsetY */
        offsetY?: (number|null);
    }

    /** Represents a Viewport. */
    class Viewport implements IViewport {

        /**
         * Constructs a new Viewport.
         * @param [properties] Properties to set
         */
        constructor(properties?: cktarot.IViewport);

        /** Viewport scale. */
        public scale: number;

        /** Viewport offsetX. */
        public offsetX: number;

        /** Viewport offsetY. */
        public offsetY: number;

        /**
         * Creates a new Viewport instance using the specified properties.
         * @param [properties] Properties to set
         * @returns Viewport instance
         */
        public static create(properties?: cktarot.IViewport): cktarot.Viewport;

        /**
         * Encodes the specified Viewport message. Does not implicitly {@link cktarot.Viewport.verify|verify} messages.
         * @param message Viewport message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: cktarot.IViewport, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified Viewport message, length delimited. Does not implicitly {@link cktarot.Viewport.verify|verify} messages.
         * @param message Viewport message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: cktarot.IViewport, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a Viewport message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns Viewport
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cktarot.Viewport;

        /**
         * Decodes a Viewport message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns Viewport
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cktarot.Viewport;

        /**
         * Verifies a Viewport message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a Viewport message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns Viewport
         */
        public static fromObject(object: { [k: string]: any }): cktarot.Viewport;

        /**
         * Creates a plain object from a Viewport message. Also converts values to other types if specified.
         * @param message Viewport
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: cktarot.Viewport, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this Viewport to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for Viewport
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a PlacedCard. */
    interface IPlacedCard {

        /** PlacedCard id */
        id?: (string|null);

        /** PlacedCard deckId */
        deckId?: (string|null);

        /** PlacedCard cardId */
        cardId?: (string|null);

        /** PlacedCard deckTitle */
        deckTitle?: (string|null);

        /** PlacedCard cardTitle */
        cardTitle?: (string|null);

        /** PlacedCard imageSource */
        imageSource?: (string|null);

        /** PlacedCard censorImageSource */
        censorImageSource?: (string|null);

        /** PlacedCard x */
        x?: (number|null);

        /** PlacedCard y */
        y?: (number|null);

        /** PlacedCard rotation */
        rotation?: (number|null);

        /** PlacedCard zIndex */
        zIndex?: (number|null);

        /** PlacedCard opacity */
        opacity?: (number|null);
    }

    /** Represents a PlacedCard. */
    class PlacedCard implements IPlacedCard {

        /**
         * Constructs a new PlacedCard.
         * @param [properties] Properties to set
         */
        constructor(properties?: cktarot.IPlacedCard);

        /** PlacedCard id. */
        public id: string;

        /** PlacedCard deckId. */
        public deckId: string;

        /** PlacedCard cardId. */
        public cardId: string;

        /** PlacedCard deckTitle. */
        public deckTitle?: (string|null);

        /** PlacedCard cardTitle. */
        public cardTitle?: (string|null);

        /** PlacedCard imageSource. */
        public imageSource?: (string|null);

        /** PlacedCard censorImageSource. */
        public censorImageSource?: (string|null);

        /** PlacedCard x. */
        public x: number;

        /** PlacedCard y. */
        public y: number;

        /** PlacedCard rotation. */
        public rotation: number;

        /** PlacedCard zIndex. */
        public zIndex: number;

        /** PlacedCard opacity. */
        public opacity: number;

        /**
         * Creates a new PlacedCard instance using the specified properties.
         * @param [properties] Properties to set
         * @returns PlacedCard instance
         */
        public static create(properties?: cktarot.IPlacedCard): cktarot.PlacedCard;

        /**
         * Encodes the specified PlacedCard message. Does not implicitly {@link cktarot.PlacedCard.verify|verify} messages.
         * @param message PlacedCard message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: cktarot.IPlacedCard, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified PlacedCard message, length delimited. Does not implicitly {@link cktarot.PlacedCard.verify|verify} messages.
         * @param message PlacedCard message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: cktarot.IPlacedCard, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a PlacedCard message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns PlacedCard
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cktarot.PlacedCard;

        /**
         * Decodes a PlacedCard message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns PlacedCard
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cktarot.PlacedCard;

        /**
         * Verifies a PlacedCard message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a PlacedCard message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns PlacedCard
         */
        public static fromObject(object: { [k: string]: any }): cktarot.PlacedCard;

        /**
         * Creates a plain object from a PlacedCard message. Also converts values to other types if specified.
         * @param message PlacedCard
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: cktarot.PlacedCard, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this PlacedCard to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for PlacedCard
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** FontStyle enum. */
    enum FontStyle {
        FONT_STYLE_UNSPECIFIED = 0,
        FONT_STYLE_NORMAL = 1,
        FONT_STYLE_ITALIC = 2
    }

    /** TextDecoration enum. */
    enum TextDecoration {
        TEXT_DECORATION_UNSPECIFIED = 0,
        TEXT_DECORATION_NONE = 1,
        TEXT_DECORATION_UNDERLINE = 2
    }

    /** AnchorPosition enum. */
    enum AnchorPosition {
        ANCHOR_POSITION_UNSPECIFIED = 0,
        ANCHOR_POSITION_ABOVE = 1,
        ANCHOR_POSITION_BELOW = 2,
        ANCHOR_POSITION_LEFT = 3,
        ANCHOR_POSITION_RIGHT = 4
    }

    /** Properties of a TextLabel. */
    interface ITextLabel {

        /** TextLabel id */
        id?: (string|null);

        /** TextLabel text */
        text?: (string|null);

        /** TextLabel x */
        x?: (number|null);

        /** TextLabel y */
        y?: (number|null);

        /** TextLabel fontSize */
        fontSize?: (number|null);

        /** TextLabel fontWeight */
        fontWeight?: (number|null);

        /** TextLabel fontStyle */
        fontStyle?: (cktarot.FontStyle|null);

        /** TextLabel textDecoration */
        textDecoration?: (cktarot.TextDecoration|null);

        /** TextLabel color */
        color?: (string|null);

        /** TextLabel zIndex */
        zIndex?: (number|null);

        /** TextLabel anchorCardId */
        anchorCardId?: (string|null);

        /** TextLabel anchorPosition */
        anchorPosition?: (cktarot.AnchorPosition|null);
    }

    /** Represents a TextLabel. */
    class TextLabel implements ITextLabel {

        /**
         * Constructs a new TextLabel.
         * @param [properties] Properties to set
         */
        constructor(properties?: cktarot.ITextLabel);

        /** TextLabel id. */
        public id: string;

        /** TextLabel text. */
        public text: string;

        /** TextLabel x. */
        public x: number;

        /** TextLabel y. */
        public y: number;

        /** TextLabel fontSize. */
        public fontSize: number;

        /** TextLabel fontWeight. */
        public fontWeight: number;

        /** TextLabel fontStyle. */
        public fontStyle: cktarot.FontStyle;

        /** TextLabel textDecoration. */
        public textDecoration: cktarot.TextDecoration;

        /** TextLabel color. */
        public color: string;

        /** TextLabel zIndex. */
        public zIndex: number;

        /** TextLabel anchorCardId. */
        public anchorCardId?: (string|null);

        /** TextLabel anchorPosition. */
        public anchorPosition: cktarot.AnchorPosition;

        /**
         * Creates a new TextLabel instance using the specified properties.
         * @param [properties] Properties to set
         * @returns TextLabel instance
         */
        public static create(properties?: cktarot.ITextLabel): cktarot.TextLabel;

        /**
         * Encodes the specified TextLabel message. Does not implicitly {@link cktarot.TextLabel.verify|verify} messages.
         * @param message TextLabel message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: cktarot.ITextLabel, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified TextLabel message, length delimited. Does not implicitly {@link cktarot.TextLabel.verify|verify} messages.
         * @param message TextLabel message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: cktarot.ITextLabel, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a TextLabel message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns TextLabel
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cktarot.TextLabel;

        /**
         * Decodes a TextLabel message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns TextLabel
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cktarot.TextLabel;

        /**
         * Verifies a TextLabel message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a TextLabel message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns TextLabel
         */
        public static fromObject(object: { [k: string]: any }): cktarot.TextLabel;

        /**
         * Creates a plain object from a TextLabel message. Also converts values to other types if specified.
         * @param message TextLabel
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: cktarot.TextLabel, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this TextLabel to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for TextLabel
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a SavedReadingState. */
    interface ISavedReadingState {

        /** SavedReadingState viewport */
        viewport?: (cktarot.IViewport|null);

        /** SavedReadingState cards */
        cards?: (cktarot.IPlacedCard[]|null);

        /** SavedReadingState textLabels */
        textLabels?: (cktarot.ITextLabel[]|null);
    }

    /** Represents a SavedReadingState. */
    class SavedReadingState implements ISavedReadingState {

        /**
         * Constructs a new SavedReadingState.
         * @param [properties] Properties to set
         */
        constructor(properties?: cktarot.ISavedReadingState);

        /** SavedReadingState viewport. */
        public viewport?: (cktarot.IViewport|null);

        /** SavedReadingState cards. */
        public cards: cktarot.IPlacedCard[];

        /** SavedReadingState textLabels. */
        public textLabels: cktarot.ITextLabel[];

        /**
         * Creates a new SavedReadingState instance using the specified properties.
         * @param [properties] Properties to set
         * @returns SavedReadingState instance
         */
        public static create(properties?: cktarot.ISavedReadingState): cktarot.SavedReadingState;

        /**
         * Encodes the specified SavedReadingState message. Does not implicitly {@link cktarot.SavedReadingState.verify|verify} messages.
         * @param message SavedReadingState message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: cktarot.ISavedReadingState, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified SavedReadingState message, length delimited. Does not implicitly {@link cktarot.SavedReadingState.verify|verify} messages.
         * @param message SavedReadingState message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: cktarot.ISavedReadingState, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a SavedReadingState message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns SavedReadingState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cktarot.SavedReadingState;

        /**
         * Decodes a SavedReadingState message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns SavedReadingState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cktarot.SavedReadingState;

        /**
         * Verifies a SavedReadingState message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a SavedReadingState message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns SavedReadingState
         */
        public static fromObject(object: { [k: string]: any }): cktarot.SavedReadingState;

        /**
         * Creates a plain object from a SavedReadingState message. Also converts values to other types if specified.
         * @param message SavedReadingState
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: cktarot.SavedReadingState, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this SavedReadingState to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for SavedReadingState
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a DeckRow. */
    interface IDeckRow {

        /** DeckRow id */
        id?: (string|null);

        /** DeckRow title */
        title?: (string|null);

        /** DeckRow description */
        description?: (string|null);

        /** DeckRow createdAt */
        createdAt?: (string|null);

        /** DeckRow modifiedAt */
        modifiedAt?: (string|null);
    }

    /** Represents a DeckRow. */
    class DeckRow implements IDeckRow {

        /**
         * Constructs a new DeckRow.
         * @param [properties] Properties to set
         */
        constructor(properties?: cktarot.IDeckRow);

        /** DeckRow id. */
        public id: string;

        /** DeckRow title. */
        public title: string;

        /** DeckRow description. */
        public description?: (string|null);

        /** DeckRow createdAt. */
        public createdAt: string;

        /** DeckRow modifiedAt. */
        public modifiedAt: string;

        /**
         * Creates a new DeckRow instance using the specified properties.
         * @param [properties] Properties to set
         * @returns DeckRow instance
         */
        public static create(properties?: cktarot.IDeckRow): cktarot.DeckRow;

        /**
         * Encodes the specified DeckRow message. Does not implicitly {@link cktarot.DeckRow.verify|verify} messages.
         * @param message DeckRow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: cktarot.IDeckRow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified DeckRow message, length delimited. Does not implicitly {@link cktarot.DeckRow.verify|verify} messages.
         * @param message DeckRow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: cktarot.IDeckRow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a DeckRow message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns DeckRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cktarot.DeckRow;

        /**
         * Decodes a DeckRow message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns DeckRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cktarot.DeckRow;

        /**
         * Verifies a DeckRow message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a DeckRow message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns DeckRow
         */
        public static fromObject(object: { [k: string]: any }): cktarot.DeckRow;

        /**
         * Creates a plain object from a DeckRow message. Also converts values to other types if specified.
         * @param message DeckRow
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: cktarot.DeckRow, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this DeckRow to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for DeckRow
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CardRow. */
    interface ICardRow {

        /** CardRow id */
        id?: (string|null);

        /** CardRow deckId */
        deckId?: (string|null);

        /** CardRow title */
        title?: (string|null);

        /** CardRow number */
        number?: (number|null);

        /** CardRow imageBlobId */
        imageBlobId?: (string|null);

        /** CardRow censorImageBlobId */
        censorImageBlobId?: (string|null);
    }

    /** Represents a CardRow. */
    class CardRow implements ICardRow {

        /**
         * Constructs a new CardRow.
         * @param [properties] Properties to set
         */
        constructor(properties?: cktarot.ICardRow);

        /** CardRow id. */
        public id: string;

        /** CardRow deckId. */
        public deckId: string;

        /** CardRow title. */
        public title: string;

        /** CardRow number. */
        public number: number;

        /** CardRow imageBlobId. */
        public imageBlobId: string;

        /** CardRow censorImageBlobId. */
        public censorImageBlobId?: (string|null);

        /**
         * Creates a new CardRow instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CardRow instance
         */
        public static create(properties?: cktarot.ICardRow): cktarot.CardRow;

        /**
         * Encodes the specified CardRow message. Does not implicitly {@link cktarot.CardRow.verify|verify} messages.
         * @param message CardRow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: cktarot.ICardRow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CardRow message, length delimited. Does not implicitly {@link cktarot.CardRow.verify|verify} messages.
         * @param message CardRow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: cktarot.ICardRow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CardRow message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CardRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cktarot.CardRow;

        /**
         * Decodes a CardRow message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CardRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cktarot.CardRow;

        /**
         * Verifies a CardRow message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CardRow message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CardRow
         */
        public static fromObject(object: { [k: string]: any }): cktarot.CardRow;

        /**
         * Creates a plain object from a CardRow message. Also converts values to other types if specified.
         * @param message CardRow
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: cktarot.CardRow, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CardRow to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CardRow
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CardImageRow. */
    interface ICardImageRow {

        /** CardImageRow id */
        id?: (string|null);

        /** CardImageRow createdAt */
        createdAt?: (string|null);

        /** CardImageRow mimeType */
        mimeType?: (string|null);

        /** CardImageRow title */
        title?: (string|null);

        /** CardImageRow data */
        data?: (Uint8Array|null);
    }

    /** Represents a CardImageRow. */
    class CardImageRow implements ICardImageRow {

        /**
         * Constructs a new CardImageRow.
         * @param [properties] Properties to set
         */
        constructor(properties?: cktarot.ICardImageRow);

        /** CardImageRow id. */
        public id: string;

        /** CardImageRow createdAt. */
        public createdAt: string;

        /** CardImageRow mimeType. */
        public mimeType?: (string|null);

        /** CardImageRow title. */
        public title?: (string|null);

        /** CardImageRow data. */
        public data: Uint8Array;

        /**
         * Creates a new CardImageRow instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CardImageRow instance
         */
        public static create(properties?: cktarot.ICardImageRow): cktarot.CardImageRow;

        /**
         * Encodes the specified CardImageRow message. Does not implicitly {@link cktarot.CardImageRow.verify|verify} messages.
         * @param message CardImageRow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: cktarot.ICardImageRow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CardImageRow message, length delimited. Does not implicitly {@link cktarot.CardImageRow.verify|verify} messages.
         * @param message CardImageRow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: cktarot.ICardImageRow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CardImageRow message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CardImageRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cktarot.CardImageRow;

        /**
         * Decodes a CardImageRow message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CardImageRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cktarot.CardImageRow;

        /**
         * Verifies a CardImageRow message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CardImageRow message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CardImageRow
         */
        public static fromObject(object: { [k: string]: any }): cktarot.CardImageRow;

        /**
         * Creates a plain object from a CardImageRow message. Also converts values to other types if specified.
         * @param message CardImageRow
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: cktarot.CardImageRow, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CardImageRow to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CardImageRow
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a ReadingRow. */
    interface IReadingRow {

        /** ReadingRow id */
        id?: (string|null);

        /** ReadingRow name */
        name?: (string|null);

        /** ReadingRow state */
        state?: (Uint8Array|null);

        /** ReadingRow updatedAt */
        updatedAt?: (string|null);
    }

    /** Represents a ReadingRow. */
    class ReadingRow implements IReadingRow {

        /**
         * Constructs a new ReadingRow.
         * @param [properties] Properties to set
         */
        constructor(properties?: cktarot.IReadingRow);

        /** ReadingRow id. */
        public id: string;

        /** ReadingRow name. */
        public name: string;

        /** ReadingRow state. */
        public state: Uint8Array;

        /** ReadingRow updatedAt. */
        public updatedAt: string;

        /**
         * Creates a new ReadingRow instance using the specified properties.
         * @param [properties] Properties to set
         * @returns ReadingRow instance
         */
        public static create(properties?: cktarot.IReadingRow): cktarot.ReadingRow;

        /**
         * Encodes the specified ReadingRow message. Does not implicitly {@link cktarot.ReadingRow.verify|verify} messages.
         * @param message ReadingRow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: cktarot.IReadingRow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified ReadingRow message, length delimited. Does not implicitly {@link cktarot.ReadingRow.verify|verify} messages.
         * @param message ReadingRow message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: cktarot.IReadingRow, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a ReadingRow message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns ReadingRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cktarot.ReadingRow;

        /**
         * Decodes a ReadingRow message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns ReadingRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cktarot.ReadingRow;

        /**
         * Verifies a ReadingRow message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a ReadingRow message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns ReadingRow
         */
        public static fromObject(object: { [k: string]: any }): cktarot.ReadingRow;

        /**
         * Creates a plain object from a ReadingRow message. Also converts values to other types if specified.
         * @param message ReadingRow
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: cktarot.ReadingRow, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this ReadingRow to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for ReadingRow
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }

    /** Properties of a CktarotBackup. */
    interface ICktarotBackup {

        /** CktarotBackup version */
        version?: (number|null);

        /** CktarotBackup exportedAt */
        exportedAt?: (string|null);

        /** CktarotBackup decks */
        decks?: (cktarot.IDeckRow[]|null);

        /** CktarotBackup cards */
        cards?: (cktarot.ICardRow[]|null);

        /** CktarotBackup cardImages */
        cardImages?: (cktarot.ICardImageRow[]|null);

        /** CktarotBackup readings */
        readings?: (cktarot.IReadingRow[]|null);
    }

    /** Represents a CktarotBackup. */
    class CktarotBackup implements ICktarotBackup {

        /**
         * Constructs a new CktarotBackup.
         * @param [properties] Properties to set
         */
        constructor(properties?: cktarot.ICktarotBackup);

        /** CktarotBackup version. */
        public version: number;

        /** CktarotBackup exportedAt. */
        public exportedAt?: (string|null);

        /** CktarotBackup decks. */
        public decks: cktarot.IDeckRow[];

        /** CktarotBackup cards. */
        public cards: cktarot.ICardRow[];

        /** CktarotBackup cardImages. */
        public cardImages: cktarot.ICardImageRow[];

        /** CktarotBackup readings. */
        public readings: cktarot.IReadingRow[];

        /**
         * Creates a new CktarotBackup instance using the specified properties.
         * @param [properties] Properties to set
         * @returns CktarotBackup instance
         */
        public static create(properties?: cktarot.ICktarotBackup): cktarot.CktarotBackup;

        /**
         * Encodes the specified CktarotBackup message. Does not implicitly {@link cktarot.CktarotBackup.verify|verify} messages.
         * @param message CktarotBackup message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encode(message: cktarot.ICktarotBackup, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Encodes the specified CktarotBackup message, length delimited. Does not implicitly {@link cktarot.CktarotBackup.verify|verify} messages.
         * @param message CktarotBackup message or plain object to encode
         * @param [writer] Writer to encode to
         * @returns Writer
         */
        public static encodeDelimited(message: cktarot.ICktarotBackup, writer?: $protobuf.Writer): $protobuf.Writer;

        /**
         * Decodes a CktarotBackup message from the specified reader or buffer.
         * @param reader Reader or buffer to decode from
         * @param [length] Message length if known beforehand
         * @returns CktarotBackup
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): cktarot.CktarotBackup;

        /**
         * Decodes a CktarotBackup message from the specified reader or buffer, length delimited.
         * @param reader Reader or buffer to decode from
         * @returns CktarotBackup
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): cktarot.CktarotBackup;

        /**
         * Verifies a CktarotBackup message.
         * @param message Plain object to verify
         * @returns `null` if valid, otherwise the reason why it is not
         */
        public static verify(message: { [k: string]: any }): (string|null);

        /**
         * Creates a CktarotBackup message from a plain object. Also converts values to their respective internal types.
         * @param object Plain object
         * @returns CktarotBackup
         */
        public static fromObject(object: { [k: string]: any }): cktarot.CktarotBackup;

        /**
         * Creates a plain object from a CktarotBackup message. Also converts values to other types if specified.
         * @param message CktarotBackup
         * @param [options] Conversion options
         * @returns Plain object
         */
        public static toObject(message: cktarot.CktarotBackup, options?: $protobuf.IConversionOptions): { [k: string]: any };

        /**
         * Converts this CktarotBackup to JSON.
         * @returns JSON object
         */
        public toJSON(): { [k: string]: any };

        /**
         * Gets the default type url for CktarotBackup
         * @param [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns The default type url
         */
        public static getTypeUrl(typeUrlPrefix?: string): string;
    }
}
