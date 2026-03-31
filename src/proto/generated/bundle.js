/*eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars*/
import * as $protobuf from "protobufjs/minimal";

// Common aliases
const $Reader = $protobuf.Reader, $Writer = $protobuf.Writer, $util = $protobuf.util;

// Exported root namespace
const $root = $protobuf.roots["default"] || ($protobuf.roots["default"] = {});

export const cktarot = $root.cktarot = (() => {

    /**
     * Namespace cktarot.
     * @exports cktarot
     * @namespace
     */
    const cktarot = {};

    cktarot.Viewport = (function() {

        /**
         * Properties of a Viewport.
         * @memberof cktarot
         * @interface IViewport
         * @property {number|null} [scale] Viewport scale
         * @property {number|null} [offsetX] Viewport offsetX
         * @property {number|null} [offsetY] Viewport offsetY
         */

        /**
         * Constructs a new Viewport.
         * @memberof cktarot
         * @classdesc Represents a Viewport.
         * @implements IViewport
         * @constructor
         * @param {cktarot.IViewport=} [properties] Properties to set
         */
        function Viewport(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * Viewport scale.
         * @member {number} scale
         * @memberof cktarot.Viewport
         * @instance
         */
        Viewport.prototype.scale = 0;

        /**
         * Viewport offsetX.
         * @member {number} offsetX
         * @memberof cktarot.Viewport
         * @instance
         */
        Viewport.prototype.offsetX = 0;

        /**
         * Viewport offsetY.
         * @member {number} offsetY
         * @memberof cktarot.Viewport
         * @instance
         */
        Viewport.prototype.offsetY = 0;

        /**
         * Creates a new Viewport instance using the specified properties.
         * @function create
         * @memberof cktarot.Viewport
         * @static
         * @param {cktarot.IViewport=} [properties] Properties to set
         * @returns {cktarot.Viewport} Viewport instance
         */
        Viewport.create = function create(properties) {
            return new Viewport(properties);
        };

        /**
         * Encodes the specified Viewport message. Does not implicitly {@link cktarot.Viewport.verify|verify} messages.
         * @function encode
         * @memberof cktarot.Viewport
         * @static
         * @param {cktarot.IViewport} message Viewport message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Viewport.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.scale != null && Object.hasOwnProperty.call(message, "scale"))
                writer.uint32(/* id 1, wireType 1 =*/9).double(message.scale);
            if (message.offsetX != null && Object.hasOwnProperty.call(message, "offsetX"))
                writer.uint32(/* id 2, wireType 1 =*/17).double(message.offsetX);
            if (message.offsetY != null && Object.hasOwnProperty.call(message, "offsetY"))
                writer.uint32(/* id 3, wireType 1 =*/25).double(message.offsetY);
            return writer;
        };

        /**
         * Encodes the specified Viewport message, length delimited. Does not implicitly {@link cktarot.Viewport.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cktarot.Viewport
         * @static
         * @param {cktarot.IViewport} message Viewport message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        Viewport.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a Viewport message from the specified reader or buffer.
         * @function decode
         * @memberof cktarot.Viewport
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cktarot.Viewport} Viewport
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Viewport.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.cktarot.Viewport();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.scale = reader.double();
                        break;
                    }
                case 2: {
                        message.offsetX = reader.double();
                        break;
                    }
                case 3: {
                        message.offsetY = reader.double();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a Viewport message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cktarot.Viewport
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cktarot.Viewport} Viewport
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        Viewport.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a Viewport message.
         * @function verify
         * @memberof cktarot.Viewport
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        Viewport.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.scale != null && message.hasOwnProperty("scale"))
                if (typeof message.scale !== "number")
                    return "scale: number expected";
            if (message.offsetX != null && message.hasOwnProperty("offsetX"))
                if (typeof message.offsetX !== "number")
                    return "offsetX: number expected";
            if (message.offsetY != null && message.hasOwnProperty("offsetY"))
                if (typeof message.offsetY !== "number")
                    return "offsetY: number expected";
            return null;
        };

        /**
         * Creates a Viewport message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cktarot.Viewport
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cktarot.Viewport} Viewport
         */
        Viewport.fromObject = function fromObject(object) {
            if (object instanceof $root.cktarot.Viewport)
                return object;
            let message = new $root.cktarot.Viewport();
            if (object.scale != null)
                message.scale = Number(object.scale);
            if (object.offsetX != null)
                message.offsetX = Number(object.offsetX);
            if (object.offsetY != null)
                message.offsetY = Number(object.offsetY);
            return message;
        };

        /**
         * Creates a plain object from a Viewport message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cktarot.Viewport
         * @static
         * @param {cktarot.Viewport} message Viewport
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        Viewport.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.scale = 0;
                object.offsetX = 0;
                object.offsetY = 0;
            }
            if (message.scale != null && message.hasOwnProperty("scale"))
                object.scale = options.json && !isFinite(message.scale) ? String(message.scale) : message.scale;
            if (message.offsetX != null && message.hasOwnProperty("offsetX"))
                object.offsetX = options.json && !isFinite(message.offsetX) ? String(message.offsetX) : message.offsetX;
            if (message.offsetY != null && message.hasOwnProperty("offsetY"))
                object.offsetY = options.json && !isFinite(message.offsetY) ? String(message.offsetY) : message.offsetY;
            return object;
        };

        /**
         * Converts this Viewport to JSON.
         * @function toJSON
         * @memberof cktarot.Viewport
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        Viewport.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for Viewport
         * @function getTypeUrl
         * @memberof cktarot.Viewport
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        Viewport.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/cktarot.Viewport";
        };

        return Viewport;
    })();

    cktarot.PlacedCard = (function() {

        /**
         * Properties of a PlacedCard.
         * @memberof cktarot
         * @interface IPlacedCard
         * @property {string|null} [id] PlacedCard id
         * @property {string|null} [deckId] PlacedCard deckId
         * @property {string|null} [cardId] PlacedCard cardId
         * @property {string|null} [deckTitle] PlacedCard deckTitle
         * @property {string|null} [cardTitle] PlacedCard cardTitle
         * @property {string|null} [imageSource] PlacedCard imageSource
         * @property {string|null} [censorImageSource] PlacedCard censorImageSource
         * @property {number|null} [x] PlacedCard x
         * @property {number|null} [y] PlacedCard y
         * @property {number|null} [rotation] PlacedCard rotation
         * @property {number|null} [zIndex] PlacedCard zIndex
         * @property {number|null} [opacity] PlacedCard opacity
         * @property {string|null} [createdAt] PlacedCard createdAt
         * @property {string|null} [mimeType] PlacedCard mimeType
         * @property {Uint8Array|null} [data] PlacedCard data
         * @property {Uint8Array|null} [censoredData] PlacedCard censoredData
         * @property {number|null} [cardNumber] PlacedCard cardNumber
         * @property {string|null} [censoredMimeType] PlacedCard censoredMimeType
         */

        /**
         * Constructs a new PlacedCard.
         * @memberof cktarot
         * @classdesc Represents a PlacedCard.
         * @implements IPlacedCard
         * @constructor
         * @param {cktarot.IPlacedCard=} [properties] Properties to set
         */
        function PlacedCard(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * PlacedCard id.
         * @member {string} id
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.id = "";

        /**
         * PlacedCard deckId.
         * @member {string} deckId
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.deckId = "";

        /**
         * PlacedCard cardId.
         * @member {string} cardId
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.cardId = "";

        /**
         * PlacedCard deckTitle.
         * @member {string|null|undefined} deckTitle
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.deckTitle = null;

        /**
         * PlacedCard cardTitle.
         * @member {string|null|undefined} cardTitle
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.cardTitle = null;

        /**
         * PlacedCard imageSource.
         * @member {string|null|undefined} imageSource
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.imageSource = null;

        /**
         * PlacedCard censorImageSource.
         * @member {string|null|undefined} censorImageSource
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.censorImageSource = null;

        /**
         * PlacedCard x.
         * @member {number} x
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.x = 0;

        /**
         * PlacedCard y.
         * @member {number} y
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.y = 0;

        /**
         * PlacedCard rotation.
         * @member {number} rotation
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.rotation = 0;

        /**
         * PlacedCard zIndex.
         * @member {number} zIndex
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.zIndex = 0;

        /**
         * PlacedCard opacity.
         * @member {number} opacity
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.opacity = 0;

        /**
         * PlacedCard createdAt.
         * @member {string|null|undefined} createdAt
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.createdAt = null;

        /**
         * PlacedCard mimeType.
         * @member {string|null|undefined} mimeType
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.mimeType = null;

        /**
         * PlacedCard data.
         * @member {Uint8Array|null|undefined} data
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.data = null;

        /**
         * PlacedCard censoredData.
         * @member {Uint8Array|null|undefined} censoredData
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.censoredData = null;

        /**
         * PlacedCard cardNumber.
         * @member {number|null|undefined} cardNumber
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.cardNumber = null;

        /**
         * PlacedCard censoredMimeType.
         * @member {string|null|undefined} censoredMimeType
         * @memberof cktarot.PlacedCard
         * @instance
         */
        PlacedCard.prototype.censoredMimeType = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(PlacedCard.prototype, "_deckTitle", {
            get: $util.oneOfGetter($oneOfFields = ["deckTitle"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(PlacedCard.prototype, "_cardTitle", {
            get: $util.oneOfGetter($oneOfFields = ["cardTitle"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(PlacedCard.prototype, "_imageSource", {
            get: $util.oneOfGetter($oneOfFields = ["imageSource"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(PlacedCard.prototype, "_censorImageSource", {
            get: $util.oneOfGetter($oneOfFields = ["censorImageSource"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(PlacedCard.prototype, "_createdAt", {
            get: $util.oneOfGetter($oneOfFields = ["createdAt"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(PlacedCard.prototype, "_mimeType", {
            get: $util.oneOfGetter($oneOfFields = ["mimeType"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(PlacedCard.prototype, "_data", {
            get: $util.oneOfGetter($oneOfFields = ["data"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(PlacedCard.prototype, "_censoredData", {
            get: $util.oneOfGetter($oneOfFields = ["censoredData"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(PlacedCard.prototype, "_cardNumber", {
            get: $util.oneOfGetter($oneOfFields = ["cardNumber"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(PlacedCard.prototype, "_censoredMimeType", {
            get: $util.oneOfGetter($oneOfFields = ["censoredMimeType"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new PlacedCard instance using the specified properties.
         * @function create
         * @memberof cktarot.PlacedCard
         * @static
         * @param {cktarot.IPlacedCard=} [properties] Properties to set
         * @returns {cktarot.PlacedCard} PlacedCard instance
         */
        PlacedCard.create = function create(properties) {
            return new PlacedCard(properties);
        };

        /**
         * Encodes the specified PlacedCard message. Does not implicitly {@link cktarot.PlacedCard.verify|verify} messages.
         * @function encode
         * @memberof cktarot.PlacedCard
         * @static
         * @param {cktarot.IPlacedCard} message PlacedCard message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PlacedCard.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.deckId != null && Object.hasOwnProperty.call(message, "deckId"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.deckId);
            if (message.cardId != null && Object.hasOwnProperty.call(message, "cardId"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.cardId);
            if (message.deckTitle != null && Object.hasOwnProperty.call(message, "deckTitle"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.deckTitle);
            if (message.cardTitle != null && Object.hasOwnProperty.call(message, "cardTitle"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.cardTitle);
            if (message.imageSource != null && Object.hasOwnProperty.call(message, "imageSource"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.imageSource);
            if (message.censorImageSource != null && Object.hasOwnProperty.call(message, "censorImageSource"))
                writer.uint32(/* id 7, wireType 2 =*/58).string(message.censorImageSource);
            if (message.x != null && Object.hasOwnProperty.call(message, "x"))
                writer.uint32(/* id 8, wireType 1 =*/65).double(message.x);
            if (message.y != null && Object.hasOwnProperty.call(message, "y"))
                writer.uint32(/* id 9, wireType 1 =*/73).double(message.y);
            if (message.rotation != null && Object.hasOwnProperty.call(message, "rotation"))
                writer.uint32(/* id 10, wireType 1 =*/81).double(message.rotation);
            if (message.zIndex != null && Object.hasOwnProperty.call(message, "zIndex"))
                writer.uint32(/* id 11, wireType 0 =*/88).sint32(message.zIndex);
            if (message.opacity != null && Object.hasOwnProperty.call(message, "opacity"))
                writer.uint32(/* id 12, wireType 1 =*/97).double(message.opacity);
            if (message.createdAt != null && Object.hasOwnProperty.call(message, "createdAt"))
                writer.uint32(/* id 13, wireType 2 =*/106).string(message.createdAt);
            if (message.mimeType != null && Object.hasOwnProperty.call(message, "mimeType"))
                writer.uint32(/* id 14, wireType 2 =*/114).string(message.mimeType);
            if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                writer.uint32(/* id 15, wireType 2 =*/122).bytes(message.data);
            if (message.censoredData != null && Object.hasOwnProperty.call(message, "censoredData"))
                writer.uint32(/* id 16, wireType 2 =*/130).bytes(message.censoredData);
            if (message.cardNumber != null && Object.hasOwnProperty.call(message, "cardNumber"))
                writer.uint32(/* id 17, wireType 0 =*/136).int32(message.cardNumber);
            if (message.censoredMimeType != null && Object.hasOwnProperty.call(message, "censoredMimeType"))
                writer.uint32(/* id 18, wireType 2 =*/146).string(message.censoredMimeType);
            return writer;
        };

        /**
         * Encodes the specified PlacedCard message, length delimited. Does not implicitly {@link cktarot.PlacedCard.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cktarot.PlacedCard
         * @static
         * @param {cktarot.IPlacedCard} message PlacedCard message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        PlacedCard.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a PlacedCard message from the specified reader or buffer.
         * @function decode
         * @memberof cktarot.PlacedCard
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cktarot.PlacedCard} PlacedCard
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PlacedCard.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.cktarot.PlacedCard();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                case 2: {
                        message.deckId = reader.string();
                        break;
                    }
                case 3: {
                        message.cardId = reader.string();
                        break;
                    }
                case 4: {
                        message.deckTitle = reader.string();
                        break;
                    }
                case 5: {
                        message.cardTitle = reader.string();
                        break;
                    }
                case 6: {
                        message.imageSource = reader.string();
                        break;
                    }
                case 7: {
                        message.censorImageSource = reader.string();
                        break;
                    }
                case 8: {
                        message.x = reader.double();
                        break;
                    }
                case 9: {
                        message.y = reader.double();
                        break;
                    }
                case 10: {
                        message.rotation = reader.double();
                        break;
                    }
                case 11: {
                        message.zIndex = reader.sint32();
                        break;
                    }
                case 12: {
                        message.opacity = reader.double();
                        break;
                    }
                case 13: {
                        message.createdAt = reader.string();
                        break;
                    }
                case 14: {
                        message.mimeType = reader.string();
                        break;
                    }
                case 15: {
                        message.data = reader.bytes();
                        break;
                    }
                case 16: {
                        message.censoredData = reader.bytes();
                        break;
                    }
                case 17: {
                        message.cardNumber = reader.int32();
                        break;
                    }
                case 18: {
                        message.censoredMimeType = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a PlacedCard message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cktarot.PlacedCard
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cktarot.PlacedCard} PlacedCard
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        PlacedCard.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a PlacedCard message.
         * @function verify
         * @memberof cktarot.PlacedCard
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        PlacedCard.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.deckId != null && message.hasOwnProperty("deckId"))
                if (!$util.isString(message.deckId))
                    return "deckId: string expected";
            if (message.cardId != null && message.hasOwnProperty("cardId"))
                if (!$util.isString(message.cardId))
                    return "cardId: string expected";
            if (message.deckTitle != null && message.hasOwnProperty("deckTitle")) {
                properties._deckTitle = 1;
                if (!$util.isString(message.deckTitle))
                    return "deckTitle: string expected";
            }
            if (message.cardTitle != null && message.hasOwnProperty("cardTitle")) {
                properties._cardTitle = 1;
                if (!$util.isString(message.cardTitle))
                    return "cardTitle: string expected";
            }
            if (message.imageSource != null && message.hasOwnProperty("imageSource")) {
                properties._imageSource = 1;
                if (!$util.isString(message.imageSource))
                    return "imageSource: string expected";
            }
            if (message.censorImageSource != null && message.hasOwnProperty("censorImageSource")) {
                properties._censorImageSource = 1;
                if (!$util.isString(message.censorImageSource))
                    return "censorImageSource: string expected";
            }
            if (message.x != null && message.hasOwnProperty("x"))
                if (typeof message.x !== "number")
                    return "x: number expected";
            if (message.y != null && message.hasOwnProperty("y"))
                if (typeof message.y !== "number")
                    return "y: number expected";
            if (message.rotation != null && message.hasOwnProperty("rotation"))
                if (typeof message.rotation !== "number")
                    return "rotation: number expected";
            if (message.zIndex != null && message.hasOwnProperty("zIndex"))
                if (!$util.isInteger(message.zIndex))
                    return "zIndex: integer expected";
            if (message.opacity != null && message.hasOwnProperty("opacity"))
                if (typeof message.opacity !== "number")
                    return "opacity: number expected";
            if (message.createdAt != null && message.hasOwnProperty("createdAt")) {
                properties._createdAt = 1;
                if (!$util.isString(message.createdAt))
                    return "createdAt: string expected";
            }
            if (message.mimeType != null && message.hasOwnProperty("mimeType")) {
                properties._mimeType = 1;
                if (!$util.isString(message.mimeType))
                    return "mimeType: string expected";
            }
            if (message.data != null && message.hasOwnProperty("data")) {
                properties._data = 1;
                if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                    return "data: buffer expected";
            }
            if (message.censoredData != null && message.hasOwnProperty("censoredData")) {
                properties._censoredData = 1;
                if (!(message.censoredData && typeof message.censoredData.length === "number" || $util.isString(message.censoredData)))
                    return "censoredData: buffer expected";
            }
            if (message.cardNumber != null && message.hasOwnProperty("cardNumber")) {
                properties._cardNumber = 1;
                if (!$util.isInteger(message.cardNumber))
                    return "cardNumber: integer expected";
            }
            if (message.censoredMimeType != null && message.hasOwnProperty("censoredMimeType")) {
                properties._censoredMimeType = 1;
                if (!$util.isString(message.censoredMimeType))
                    return "censoredMimeType: string expected";
            }
            return null;
        };

        /**
         * Creates a PlacedCard message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cktarot.PlacedCard
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cktarot.PlacedCard} PlacedCard
         */
        PlacedCard.fromObject = function fromObject(object) {
            if (object instanceof $root.cktarot.PlacedCard)
                return object;
            let message = new $root.cktarot.PlacedCard();
            if (object.id != null)
                message.id = String(object.id);
            if (object.deckId != null)
                message.deckId = String(object.deckId);
            if (object.cardId != null)
                message.cardId = String(object.cardId);
            if (object.deckTitle != null)
                message.deckTitle = String(object.deckTitle);
            if (object.cardTitle != null)
                message.cardTitle = String(object.cardTitle);
            if (object.imageSource != null)
                message.imageSource = String(object.imageSource);
            if (object.censorImageSource != null)
                message.censorImageSource = String(object.censorImageSource);
            if (object.x != null)
                message.x = Number(object.x);
            if (object.y != null)
                message.y = Number(object.y);
            if (object.rotation != null)
                message.rotation = Number(object.rotation);
            if (object.zIndex != null)
                message.zIndex = object.zIndex | 0;
            if (object.opacity != null)
                message.opacity = Number(object.opacity);
            if (object.createdAt != null)
                message.createdAt = String(object.createdAt);
            if (object.mimeType != null)
                message.mimeType = String(object.mimeType);
            if (object.data != null)
                if (typeof object.data === "string")
                    $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
                else if (object.data.length >= 0)
                    message.data = object.data;
            if (object.censoredData != null)
                if (typeof object.censoredData === "string")
                    $util.base64.decode(object.censoredData, message.censoredData = $util.newBuffer($util.base64.length(object.censoredData)), 0);
                else if (object.censoredData.length >= 0)
                    message.censoredData = object.censoredData;
            if (object.cardNumber != null)
                message.cardNumber = object.cardNumber | 0;
            if (object.censoredMimeType != null)
                message.censoredMimeType = String(object.censoredMimeType);
            return message;
        };

        /**
         * Creates a plain object from a PlacedCard message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cktarot.PlacedCard
         * @static
         * @param {cktarot.PlacedCard} message PlacedCard
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        PlacedCard.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.deckId = "";
                object.cardId = "";
                object.x = 0;
                object.y = 0;
                object.rotation = 0;
                object.zIndex = 0;
                object.opacity = 0;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.deckId != null && message.hasOwnProperty("deckId"))
                object.deckId = message.deckId;
            if (message.cardId != null && message.hasOwnProperty("cardId"))
                object.cardId = message.cardId;
            if (message.deckTitle != null && message.hasOwnProperty("deckTitle")) {
                object.deckTitle = message.deckTitle;
                if (options.oneofs)
                    object._deckTitle = "deckTitle";
            }
            if (message.cardTitle != null && message.hasOwnProperty("cardTitle")) {
                object.cardTitle = message.cardTitle;
                if (options.oneofs)
                    object._cardTitle = "cardTitle";
            }
            if (message.imageSource != null && message.hasOwnProperty("imageSource")) {
                object.imageSource = message.imageSource;
                if (options.oneofs)
                    object._imageSource = "imageSource";
            }
            if (message.censorImageSource != null && message.hasOwnProperty("censorImageSource")) {
                object.censorImageSource = message.censorImageSource;
                if (options.oneofs)
                    object._censorImageSource = "censorImageSource";
            }
            if (message.x != null && message.hasOwnProperty("x"))
                object.x = options.json && !isFinite(message.x) ? String(message.x) : message.x;
            if (message.y != null && message.hasOwnProperty("y"))
                object.y = options.json && !isFinite(message.y) ? String(message.y) : message.y;
            if (message.rotation != null && message.hasOwnProperty("rotation"))
                object.rotation = options.json && !isFinite(message.rotation) ? String(message.rotation) : message.rotation;
            if (message.zIndex != null && message.hasOwnProperty("zIndex"))
                object.zIndex = message.zIndex;
            if (message.opacity != null && message.hasOwnProperty("opacity"))
                object.opacity = options.json && !isFinite(message.opacity) ? String(message.opacity) : message.opacity;
            if (message.createdAt != null && message.hasOwnProperty("createdAt")) {
                object.createdAt = message.createdAt;
                if (options.oneofs)
                    object._createdAt = "createdAt";
            }
            if (message.mimeType != null && message.hasOwnProperty("mimeType")) {
                object.mimeType = message.mimeType;
                if (options.oneofs)
                    object._mimeType = "mimeType";
            }
            if (message.data != null && message.hasOwnProperty("data")) {
                object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
                if (options.oneofs)
                    object._data = "data";
            }
            if (message.censoredData != null && message.hasOwnProperty("censoredData")) {
                object.censoredData = options.bytes === String ? $util.base64.encode(message.censoredData, 0, message.censoredData.length) : options.bytes === Array ? Array.prototype.slice.call(message.censoredData) : message.censoredData;
                if (options.oneofs)
                    object._censoredData = "censoredData";
            }
            if (message.cardNumber != null && message.hasOwnProperty("cardNumber")) {
                object.cardNumber = message.cardNumber;
                if (options.oneofs)
                    object._cardNumber = "cardNumber";
            }
            if (message.censoredMimeType != null && message.hasOwnProperty("censoredMimeType")) {
                object.censoredMimeType = message.censoredMimeType;
                if (options.oneofs)
                    object._censoredMimeType = "censoredMimeType";
            }
            return object;
        };

        /**
         * Converts this PlacedCard to JSON.
         * @function toJSON
         * @memberof cktarot.PlacedCard
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        PlacedCard.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for PlacedCard
         * @function getTypeUrl
         * @memberof cktarot.PlacedCard
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        PlacedCard.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/cktarot.PlacedCard";
        };

        return PlacedCard;
    })();

    /**
     * FontStyle enum.
     * @name cktarot.FontStyle
     * @enum {number}
     * @property {number} FONT_STYLE_UNSPECIFIED=0 FONT_STYLE_UNSPECIFIED value
     * @property {number} FONT_STYLE_NORMAL=1 FONT_STYLE_NORMAL value
     * @property {number} FONT_STYLE_ITALIC=2 FONT_STYLE_ITALIC value
     */
    cktarot.FontStyle = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "FONT_STYLE_UNSPECIFIED"] = 0;
        values[valuesById[1] = "FONT_STYLE_NORMAL"] = 1;
        values[valuesById[2] = "FONT_STYLE_ITALIC"] = 2;
        return values;
    })();

    /**
     * TextDecoration enum.
     * @name cktarot.TextDecoration
     * @enum {number}
     * @property {number} TEXT_DECORATION_UNSPECIFIED=0 TEXT_DECORATION_UNSPECIFIED value
     * @property {number} TEXT_DECORATION_NONE=1 TEXT_DECORATION_NONE value
     * @property {number} TEXT_DECORATION_UNDERLINE=2 TEXT_DECORATION_UNDERLINE value
     */
    cktarot.TextDecoration = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "TEXT_DECORATION_UNSPECIFIED"] = 0;
        values[valuesById[1] = "TEXT_DECORATION_NONE"] = 1;
        values[valuesById[2] = "TEXT_DECORATION_UNDERLINE"] = 2;
        return values;
    })();

    /**
     * AnchorPosition enum.
     * @name cktarot.AnchorPosition
     * @enum {number}
     * @property {number} ANCHOR_POSITION_UNSPECIFIED=0 ANCHOR_POSITION_UNSPECIFIED value
     * @property {number} ANCHOR_POSITION_ABOVE=1 ANCHOR_POSITION_ABOVE value
     * @property {number} ANCHOR_POSITION_BELOW=2 ANCHOR_POSITION_BELOW value
     * @property {number} ANCHOR_POSITION_LEFT=3 ANCHOR_POSITION_LEFT value
     * @property {number} ANCHOR_POSITION_RIGHT=4 ANCHOR_POSITION_RIGHT value
     */
    cktarot.AnchorPosition = (function() {
        const valuesById = {}, values = Object.create(valuesById);
        values[valuesById[0] = "ANCHOR_POSITION_UNSPECIFIED"] = 0;
        values[valuesById[1] = "ANCHOR_POSITION_ABOVE"] = 1;
        values[valuesById[2] = "ANCHOR_POSITION_BELOW"] = 2;
        values[valuesById[3] = "ANCHOR_POSITION_LEFT"] = 3;
        values[valuesById[4] = "ANCHOR_POSITION_RIGHT"] = 4;
        return values;
    })();

    cktarot.TextLabel = (function() {

        /**
         * Properties of a TextLabel.
         * @memberof cktarot
         * @interface ITextLabel
         * @property {string|null} [id] TextLabel id
         * @property {string|null} [text] TextLabel text
         * @property {number|null} [x] TextLabel x
         * @property {number|null} [y] TextLabel y
         * @property {number|null} [fontSize] TextLabel fontSize
         * @property {number|null} [fontWeight] TextLabel fontWeight
         * @property {cktarot.FontStyle|null} [fontStyle] TextLabel fontStyle
         * @property {cktarot.TextDecoration|null} [textDecoration] TextLabel textDecoration
         * @property {string|null} [color] TextLabel color
         * @property {number|null} [zIndex] TextLabel zIndex
         * @property {string|null} [anchorCardId] TextLabel anchorCardId
         * @property {cktarot.AnchorPosition|null} [anchorPosition] TextLabel anchorPosition
         */

        /**
         * Constructs a new TextLabel.
         * @memberof cktarot
         * @classdesc Represents a TextLabel.
         * @implements ITextLabel
         * @constructor
         * @param {cktarot.ITextLabel=} [properties] Properties to set
         */
        function TextLabel(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * TextLabel id.
         * @member {string} id
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.id = "";

        /**
         * TextLabel text.
         * @member {string} text
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.text = "";

        /**
         * TextLabel x.
         * @member {number} x
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.x = 0;

        /**
         * TextLabel y.
         * @member {number} y
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.y = 0;

        /**
         * TextLabel fontSize.
         * @member {number} fontSize
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.fontSize = 0;

        /**
         * TextLabel fontWeight.
         * @member {number} fontWeight
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.fontWeight = 0;

        /**
         * TextLabel fontStyle.
         * @member {cktarot.FontStyle} fontStyle
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.fontStyle = 0;

        /**
         * TextLabel textDecoration.
         * @member {cktarot.TextDecoration} textDecoration
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.textDecoration = 0;

        /**
         * TextLabel color.
         * @member {string} color
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.color = "";

        /**
         * TextLabel zIndex.
         * @member {number} zIndex
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.zIndex = 0;

        /**
         * TextLabel anchorCardId.
         * @member {string|null|undefined} anchorCardId
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.anchorCardId = null;

        /**
         * TextLabel anchorPosition.
         * @member {cktarot.AnchorPosition} anchorPosition
         * @memberof cktarot.TextLabel
         * @instance
         */
        TextLabel.prototype.anchorPosition = 0;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(TextLabel.prototype, "_anchorCardId", {
            get: $util.oneOfGetter($oneOfFields = ["anchorCardId"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new TextLabel instance using the specified properties.
         * @function create
         * @memberof cktarot.TextLabel
         * @static
         * @param {cktarot.ITextLabel=} [properties] Properties to set
         * @returns {cktarot.TextLabel} TextLabel instance
         */
        TextLabel.create = function create(properties) {
            return new TextLabel(properties);
        };

        /**
         * Encodes the specified TextLabel message. Does not implicitly {@link cktarot.TextLabel.verify|verify} messages.
         * @function encode
         * @memberof cktarot.TextLabel
         * @static
         * @param {cktarot.ITextLabel} message TextLabel message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TextLabel.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.text != null && Object.hasOwnProperty.call(message, "text"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.text);
            if (message.x != null && Object.hasOwnProperty.call(message, "x"))
                writer.uint32(/* id 3, wireType 1 =*/25).double(message.x);
            if (message.y != null && Object.hasOwnProperty.call(message, "y"))
                writer.uint32(/* id 4, wireType 1 =*/33).double(message.y);
            if (message.fontSize != null && Object.hasOwnProperty.call(message, "fontSize"))
                writer.uint32(/* id 5, wireType 1 =*/41).double(message.fontSize);
            if (message.fontWeight != null && Object.hasOwnProperty.call(message, "fontWeight"))
                writer.uint32(/* id 6, wireType 1 =*/49).double(message.fontWeight);
            if (message.fontStyle != null && Object.hasOwnProperty.call(message, "fontStyle"))
                writer.uint32(/* id 7, wireType 0 =*/56).int32(message.fontStyle);
            if (message.textDecoration != null && Object.hasOwnProperty.call(message, "textDecoration"))
                writer.uint32(/* id 8, wireType 0 =*/64).int32(message.textDecoration);
            if (message.color != null && Object.hasOwnProperty.call(message, "color"))
                writer.uint32(/* id 9, wireType 2 =*/74).string(message.color);
            if (message.zIndex != null && Object.hasOwnProperty.call(message, "zIndex"))
                writer.uint32(/* id 10, wireType 0 =*/80).sint32(message.zIndex);
            if (message.anchorCardId != null && Object.hasOwnProperty.call(message, "anchorCardId"))
                writer.uint32(/* id 11, wireType 2 =*/90).string(message.anchorCardId);
            if (message.anchorPosition != null && Object.hasOwnProperty.call(message, "anchorPosition"))
                writer.uint32(/* id 12, wireType 0 =*/96).int32(message.anchorPosition);
            return writer;
        };

        /**
         * Encodes the specified TextLabel message, length delimited. Does not implicitly {@link cktarot.TextLabel.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cktarot.TextLabel
         * @static
         * @param {cktarot.ITextLabel} message TextLabel message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        TextLabel.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a TextLabel message from the specified reader or buffer.
         * @function decode
         * @memberof cktarot.TextLabel
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cktarot.TextLabel} TextLabel
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TextLabel.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.cktarot.TextLabel();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                case 2: {
                        message.text = reader.string();
                        break;
                    }
                case 3: {
                        message.x = reader.double();
                        break;
                    }
                case 4: {
                        message.y = reader.double();
                        break;
                    }
                case 5: {
                        message.fontSize = reader.double();
                        break;
                    }
                case 6: {
                        message.fontWeight = reader.double();
                        break;
                    }
                case 7: {
                        message.fontStyle = reader.int32();
                        break;
                    }
                case 8: {
                        message.textDecoration = reader.int32();
                        break;
                    }
                case 9: {
                        message.color = reader.string();
                        break;
                    }
                case 10: {
                        message.zIndex = reader.sint32();
                        break;
                    }
                case 11: {
                        message.anchorCardId = reader.string();
                        break;
                    }
                case 12: {
                        message.anchorPosition = reader.int32();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a TextLabel message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cktarot.TextLabel
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cktarot.TextLabel} TextLabel
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        TextLabel.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a TextLabel message.
         * @function verify
         * @memberof cktarot.TextLabel
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        TextLabel.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.text != null && message.hasOwnProperty("text"))
                if (!$util.isString(message.text))
                    return "text: string expected";
            if (message.x != null && message.hasOwnProperty("x"))
                if (typeof message.x !== "number")
                    return "x: number expected";
            if (message.y != null && message.hasOwnProperty("y"))
                if (typeof message.y !== "number")
                    return "y: number expected";
            if (message.fontSize != null && message.hasOwnProperty("fontSize"))
                if (typeof message.fontSize !== "number")
                    return "fontSize: number expected";
            if (message.fontWeight != null && message.hasOwnProperty("fontWeight"))
                if (typeof message.fontWeight !== "number")
                    return "fontWeight: number expected";
            if (message.fontStyle != null && message.hasOwnProperty("fontStyle"))
                switch (message.fontStyle) {
                default:
                    return "fontStyle: enum value expected";
                case 0:
                case 1:
                case 2:
                    break;
                }
            if (message.textDecoration != null && message.hasOwnProperty("textDecoration"))
                switch (message.textDecoration) {
                default:
                    return "textDecoration: enum value expected";
                case 0:
                case 1:
                case 2:
                    break;
                }
            if (message.color != null && message.hasOwnProperty("color"))
                if (!$util.isString(message.color))
                    return "color: string expected";
            if (message.zIndex != null && message.hasOwnProperty("zIndex"))
                if (!$util.isInteger(message.zIndex))
                    return "zIndex: integer expected";
            if (message.anchorCardId != null && message.hasOwnProperty("anchorCardId")) {
                properties._anchorCardId = 1;
                if (!$util.isString(message.anchorCardId))
                    return "anchorCardId: string expected";
            }
            if (message.anchorPosition != null && message.hasOwnProperty("anchorPosition"))
                switch (message.anchorPosition) {
                default:
                    return "anchorPosition: enum value expected";
                case 0:
                case 1:
                case 2:
                case 3:
                case 4:
                    break;
                }
            return null;
        };

        /**
         * Creates a TextLabel message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cktarot.TextLabel
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cktarot.TextLabel} TextLabel
         */
        TextLabel.fromObject = function fromObject(object) {
            if (object instanceof $root.cktarot.TextLabel)
                return object;
            let message = new $root.cktarot.TextLabel();
            if (object.id != null)
                message.id = String(object.id);
            if (object.text != null)
                message.text = String(object.text);
            if (object.x != null)
                message.x = Number(object.x);
            if (object.y != null)
                message.y = Number(object.y);
            if (object.fontSize != null)
                message.fontSize = Number(object.fontSize);
            if (object.fontWeight != null)
                message.fontWeight = Number(object.fontWeight);
            switch (object.fontStyle) {
            default:
                if (typeof object.fontStyle === "number") {
                    message.fontStyle = object.fontStyle;
                    break;
                }
                break;
            case "FONT_STYLE_UNSPECIFIED":
            case 0:
                message.fontStyle = 0;
                break;
            case "FONT_STYLE_NORMAL":
            case 1:
                message.fontStyle = 1;
                break;
            case "FONT_STYLE_ITALIC":
            case 2:
                message.fontStyle = 2;
                break;
            }
            switch (object.textDecoration) {
            default:
                if (typeof object.textDecoration === "number") {
                    message.textDecoration = object.textDecoration;
                    break;
                }
                break;
            case "TEXT_DECORATION_UNSPECIFIED":
            case 0:
                message.textDecoration = 0;
                break;
            case "TEXT_DECORATION_NONE":
            case 1:
                message.textDecoration = 1;
                break;
            case "TEXT_DECORATION_UNDERLINE":
            case 2:
                message.textDecoration = 2;
                break;
            }
            if (object.color != null)
                message.color = String(object.color);
            if (object.zIndex != null)
                message.zIndex = object.zIndex | 0;
            if (object.anchorCardId != null)
                message.anchorCardId = String(object.anchorCardId);
            switch (object.anchorPosition) {
            default:
                if (typeof object.anchorPosition === "number") {
                    message.anchorPosition = object.anchorPosition;
                    break;
                }
                break;
            case "ANCHOR_POSITION_UNSPECIFIED":
            case 0:
                message.anchorPosition = 0;
                break;
            case "ANCHOR_POSITION_ABOVE":
            case 1:
                message.anchorPosition = 1;
                break;
            case "ANCHOR_POSITION_BELOW":
            case 2:
                message.anchorPosition = 2;
                break;
            case "ANCHOR_POSITION_LEFT":
            case 3:
                message.anchorPosition = 3;
                break;
            case "ANCHOR_POSITION_RIGHT":
            case 4:
                message.anchorPosition = 4;
                break;
            }
            return message;
        };

        /**
         * Creates a plain object from a TextLabel message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cktarot.TextLabel
         * @static
         * @param {cktarot.TextLabel} message TextLabel
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        TextLabel.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.text = "";
                object.x = 0;
                object.y = 0;
                object.fontSize = 0;
                object.fontWeight = 0;
                object.fontStyle = options.enums === String ? "FONT_STYLE_UNSPECIFIED" : 0;
                object.textDecoration = options.enums === String ? "TEXT_DECORATION_UNSPECIFIED" : 0;
                object.color = "";
                object.zIndex = 0;
                object.anchorPosition = options.enums === String ? "ANCHOR_POSITION_UNSPECIFIED" : 0;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.text != null && message.hasOwnProperty("text"))
                object.text = message.text;
            if (message.x != null && message.hasOwnProperty("x"))
                object.x = options.json && !isFinite(message.x) ? String(message.x) : message.x;
            if (message.y != null && message.hasOwnProperty("y"))
                object.y = options.json && !isFinite(message.y) ? String(message.y) : message.y;
            if (message.fontSize != null && message.hasOwnProperty("fontSize"))
                object.fontSize = options.json && !isFinite(message.fontSize) ? String(message.fontSize) : message.fontSize;
            if (message.fontWeight != null && message.hasOwnProperty("fontWeight"))
                object.fontWeight = options.json && !isFinite(message.fontWeight) ? String(message.fontWeight) : message.fontWeight;
            if (message.fontStyle != null && message.hasOwnProperty("fontStyle"))
                object.fontStyle = options.enums === String ? $root.cktarot.FontStyle[message.fontStyle] === undefined ? message.fontStyle : $root.cktarot.FontStyle[message.fontStyle] : message.fontStyle;
            if (message.textDecoration != null && message.hasOwnProperty("textDecoration"))
                object.textDecoration = options.enums === String ? $root.cktarot.TextDecoration[message.textDecoration] === undefined ? message.textDecoration : $root.cktarot.TextDecoration[message.textDecoration] : message.textDecoration;
            if (message.color != null && message.hasOwnProperty("color"))
                object.color = message.color;
            if (message.zIndex != null && message.hasOwnProperty("zIndex"))
                object.zIndex = message.zIndex;
            if (message.anchorCardId != null && message.hasOwnProperty("anchorCardId")) {
                object.anchorCardId = message.anchorCardId;
                if (options.oneofs)
                    object._anchorCardId = "anchorCardId";
            }
            if (message.anchorPosition != null && message.hasOwnProperty("anchorPosition"))
                object.anchorPosition = options.enums === String ? $root.cktarot.AnchorPosition[message.anchorPosition] === undefined ? message.anchorPosition : $root.cktarot.AnchorPosition[message.anchorPosition] : message.anchorPosition;
            return object;
        };

        /**
         * Converts this TextLabel to JSON.
         * @function toJSON
         * @memberof cktarot.TextLabel
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        TextLabel.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for TextLabel
         * @function getTypeUrl
         * @memberof cktarot.TextLabel
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        TextLabel.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/cktarot.TextLabel";
        };

        return TextLabel;
    })();

    cktarot.SavedReadingState = (function() {

        /**
         * Properties of a SavedReadingState.
         * @memberof cktarot
         * @interface ISavedReadingState
         * @property {cktarot.IViewport|null} [viewport] SavedReadingState viewport
         * @property {Array.<cktarot.IPlacedCard>|null} [cards] SavedReadingState cards
         * @property {Array.<cktarot.ITextLabel>|null} [textLabels] SavedReadingState textLabels
         */

        /**
         * Constructs a new SavedReadingState.
         * @memberof cktarot
         * @classdesc Represents a SavedReadingState.
         * @implements ISavedReadingState
         * @constructor
         * @param {cktarot.ISavedReadingState=} [properties] Properties to set
         */
        function SavedReadingState(properties) {
            this.cards = [];
            this.textLabels = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * SavedReadingState viewport.
         * @member {cktarot.IViewport|null|undefined} viewport
         * @memberof cktarot.SavedReadingState
         * @instance
         */
        SavedReadingState.prototype.viewport = null;

        /**
         * SavedReadingState cards.
         * @member {Array.<cktarot.IPlacedCard>} cards
         * @memberof cktarot.SavedReadingState
         * @instance
         */
        SavedReadingState.prototype.cards = $util.emptyArray;

        /**
         * SavedReadingState textLabels.
         * @member {Array.<cktarot.ITextLabel>} textLabels
         * @memberof cktarot.SavedReadingState
         * @instance
         */
        SavedReadingState.prototype.textLabels = $util.emptyArray;

        /**
         * Creates a new SavedReadingState instance using the specified properties.
         * @function create
         * @memberof cktarot.SavedReadingState
         * @static
         * @param {cktarot.ISavedReadingState=} [properties] Properties to set
         * @returns {cktarot.SavedReadingState} SavedReadingState instance
         */
        SavedReadingState.create = function create(properties) {
            return new SavedReadingState(properties);
        };

        /**
         * Encodes the specified SavedReadingState message. Does not implicitly {@link cktarot.SavedReadingState.verify|verify} messages.
         * @function encode
         * @memberof cktarot.SavedReadingState
         * @static
         * @param {cktarot.ISavedReadingState} message SavedReadingState message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SavedReadingState.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.viewport != null && Object.hasOwnProperty.call(message, "viewport"))
                $root.cktarot.Viewport.encode(message.viewport, writer.uint32(/* id 1, wireType 2 =*/10).fork()).ldelim();
            if (message.cards != null && message.cards.length)
                for (let i = 0; i < message.cards.length; ++i)
                    $root.cktarot.PlacedCard.encode(message.cards[i], writer.uint32(/* id 2, wireType 2 =*/18).fork()).ldelim();
            if (message.textLabels != null && message.textLabels.length)
                for (let i = 0; i < message.textLabels.length; ++i)
                    $root.cktarot.TextLabel.encode(message.textLabels[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified SavedReadingState message, length delimited. Does not implicitly {@link cktarot.SavedReadingState.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cktarot.SavedReadingState
         * @static
         * @param {cktarot.ISavedReadingState} message SavedReadingState message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        SavedReadingState.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a SavedReadingState message from the specified reader or buffer.
         * @function decode
         * @memberof cktarot.SavedReadingState
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cktarot.SavedReadingState} SavedReadingState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SavedReadingState.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.cktarot.SavedReadingState();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.viewport = $root.cktarot.Viewport.decode(reader, reader.uint32());
                        break;
                    }
                case 2: {
                        if (!(message.cards && message.cards.length))
                            message.cards = [];
                        message.cards.push($root.cktarot.PlacedCard.decode(reader, reader.uint32()));
                        break;
                    }
                case 3: {
                        if (!(message.textLabels && message.textLabels.length))
                            message.textLabels = [];
                        message.textLabels.push($root.cktarot.TextLabel.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a SavedReadingState message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cktarot.SavedReadingState
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cktarot.SavedReadingState} SavedReadingState
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        SavedReadingState.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a SavedReadingState message.
         * @function verify
         * @memberof cktarot.SavedReadingState
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        SavedReadingState.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.viewport != null && message.hasOwnProperty("viewport")) {
                let error = $root.cktarot.Viewport.verify(message.viewport);
                if (error)
                    return "viewport." + error;
            }
            if (message.cards != null && message.hasOwnProperty("cards")) {
                if (!Array.isArray(message.cards))
                    return "cards: array expected";
                for (let i = 0; i < message.cards.length; ++i) {
                    let error = $root.cktarot.PlacedCard.verify(message.cards[i]);
                    if (error)
                        return "cards." + error;
                }
            }
            if (message.textLabels != null && message.hasOwnProperty("textLabels")) {
                if (!Array.isArray(message.textLabels))
                    return "textLabels: array expected";
                for (let i = 0; i < message.textLabels.length; ++i) {
                    let error = $root.cktarot.TextLabel.verify(message.textLabels[i]);
                    if (error)
                        return "textLabels." + error;
                }
            }
            return null;
        };

        /**
         * Creates a SavedReadingState message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cktarot.SavedReadingState
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cktarot.SavedReadingState} SavedReadingState
         */
        SavedReadingState.fromObject = function fromObject(object) {
            if (object instanceof $root.cktarot.SavedReadingState)
                return object;
            let message = new $root.cktarot.SavedReadingState();
            if (object.viewport != null) {
                if (typeof object.viewport !== "object")
                    throw TypeError(".cktarot.SavedReadingState.viewport: object expected");
                message.viewport = $root.cktarot.Viewport.fromObject(object.viewport);
            }
            if (object.cards) {
                if (!Array.isArray(object.cards))
                    throw TypeError(".cktarot.SavedReadingState.cards: array expected");
                message.cards = [];
                for (let i = 0; i < object.cards.length; ++i) {
                    if (typeof object.cards[i] !== "object")
                        throw TypeError(".cktarot.SavedReadingState.cards: object expected");
                    message.cards[i] = $root.cktarot.PlacedCard.fromObject(object.cards[i]);
                }
            }
            if (object.textLabels) {
                if (!Array.isArray(object.textLabels))
                    throw TypeError(".cktarot.SavedReadingState.textLabels: array expected");
                message.textLabels = [];
                for (let i = 0; i < object.textLabels.length; ++i) {
                    if (typeof object.textLabels[i] !== "object")
                        throw TypeError(".cktarot.SavedReadingState.textLabels: object expected");
                    message.textLabels[i] = $root.cktarot.TextLabel.fromObject(object.textLabels[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a SavedReadingState message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cktarot.SavedReadingState
         * @static
         * @param {cktarot.SavedReadingState} message SavedReadingState
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        SavedReadingState.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.cards = [];
                object.textLabels = [];
            }
            if (options.defaults)
                object.viewport = null;
            if (message.viewport != null && message.hasOwnProperty("viewport"))
                object.viewport = $root.cktarot.Viewport.toObject(message.viewport, options);
            if (message.cards && message.cards.length) {
                object.cards = [];
                for (let j = 0; j < message.cards.length; ++j)
                    object.cards[j] = $root.cktarot.PlacedCard.toObject(message.cards[j], options);
            }
            if (message.textLabels && message.textLabels.length) {
                object.textLabels = [];
                for (let j = 0; j < message.textLabels.length; ++j)
                    object.textLabels[j] = $root.cktarot.TextLabel.toObject(message.textLabels[j], options);
            }
            return object;
        };

        /**
         * Converts this SavedReadingState to JSON.
         * @function toJSON
         * @memberof cktarot.SavedReadingState
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        SavedReadingState.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for SavedReadingState
         * @function getTypeUrl
         * @memberof cktarot.SavedReadingState
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        SavedReadingState.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/cktarot.SavedReadingState";
        };

        return SavedReadingState;
    })();

    cktarot.DeckRow = (function() {

        /**
         * Properties of a DeckRow.
         * @memberof cktarot
         * @interface IDeckRow
         * @property {string|null} [id] DeckRow id
         * @property {string|null} [title] DeckRow title
         * @property {string|null} [description] DeckRow description
         * @property {string|null} [createdAt] DeckRow createdAt
         * @property {string|null} [modifiedAt] DeckRow modifiedAt
         */

        /**
         * Constructs a new DeckRow.
         * @memberof cktarot
         * @classdesc Represents a DeckRow.
         * @implements IDeckRow
         * @constructor
         * @param {cktarot.IDeckRow=} [properties] Properties to set
         */
        function DeckRow(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * DeckRow id.
         * @member {string} id
         * @memberof cktarot.DeckRow
         * @instance
         */
        DeckRow.prototype.id = "";

        /**
         * DeckRow title.
         * @member {string} title
         * @memberof cktarot.DeckRow
         * @instance
         */
        DeckRow.prototype.title = "";

        /**
         * DeckRow description.
         * @member {string|null|undefined} description
         * @memberof cktarot.DeckRow
         * @instance
         */
        DeckRow.prototype.description = null;

        /**
         * DeckRow createdAt.
         * @member {string} createdAt
         * @memberof cktarot.DeckRow
         * @instance
         */
        DeckRow.prototype.createdAt = "";

        /**
         * DeckRow modifiedAt.
         * @member {string} modifiedAt
         * @memberof cktarot.DeckRow
         * @instance
         */
        DeckRow.prototype.modifiedAt = "";

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(DeckRow.prototype, "_description", {
            get: $util.oneOfGetter($oneOfFields = ["description"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new DeckRow instance using the specified properties.
         * @function create
         * @memberof cktarot.DeckRow
         * @static
         * @param {cktarot.IDeckRow=} [properties] Properties to set
         * @returns {cktarot.DeckRow} DeckRow instance
         */
        DeckRow.create = function create(properties) {
            return new DeckRow(properties);
        };

        /**
         * Encodes the specified DeckRow message. Does not implicitly {@link cktarot.DeckRow.verify|verify} messages.
         * @function encode
         * @memberof cktarot.DeckRow
         * @static
         * @param {cktarot.IDeckRow} message DeckRow message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeckRow.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.title != null && Object.hasOwnProperty.call(message, "title"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.title);
            if (message.description != null && Object.hasOwnProperty.call(message, "description"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.description);
            if (message.createdAt != null && Object.hasOwnProperty.call(message, "createdAt"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.createdAt);
            if (message.modifiedAt != null && Object.hasOwnProperty.call(message, "modifiedAt"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.modifiedAt);
            return writer;
        };

        /**
         * Encodes the specified DeckRow message, length delimited. Does not implicitly {@link cktarot.DeckRow.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cktarot.DeckRow
         * @static
         * @param {cktarot.IDeckRow} message DeckRow message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        DeckRow.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a DeckRow message from the specified reader or buffer.
         * @function decode
         * @memberof cktarot.DeckRow
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cktarot.DeckRow} DeckRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeckRow.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.cktarot.DeckRow();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                case 2: {
                        message.title = reader.string();
                        break;
                    }
                case 3: {
                        message.description = reader.string();
                        break;
                    }
                case 4: {
                        message.createdAt = reader.string();
                        break;
                    }
                case 5: {
                        message.modifiedAt = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a DeckRow message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cktarot.DeckRow
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cktarot.DeckRow} DeckRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        DeckRow.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a DeckRow message.
         * @function verify
         * @memberof cktarot.DeckRow
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        DeckRow.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.title != null && message.hasOwnProperty("title"))
                if (!$util.isString(message.title))
                    return "title: string expected";
            if (message.description != null && message.hasOwnProperty("description")) {
                properties._description = 1;
                if (!$util.isString(message.description))
                    return "description: string expected";
            }
            if (message.createdAt != null && message.hasOwnProperty("createdAt"))
                if (!$util.isString(message.createdAt))
                    return "createdAt: string expected";
            if (message.modifiedAt != null && message.hasOwnProperty("modifiedAt"))
                if (!$util.isString(message.modifiedAt))
                    return "modifiedAt: string expected";
            return null;
        };

        /**
         * Creates a DeckRow message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cktarot.DeckRow
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cktarot.DeckRow} DeckRow
         */
        DeckRow.fromObject = function fromObject(object) {
            if (object instanceof $root.cktarot.DeckRow)
                return object;
            let message = new $root.cktarot.DeckRow();
            if (object.id != null)
                message.id = String(object.id);
            if (object.title != null)
                message.title = String(object.title);
            if (object.description != null)
                message.description = String(object.description);
            if (object.createdAt != null)
                message.createdAt = String(object.createdAt);
            if (object.modifiedAt != null)
                message.modifiedAt = String(object.modifiedAt);
            return message;
        };

        /**
         * Creates a plain object from a DeckRow message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cktarot.DeckRow
         * @static
         * @param {cktarot.DeckRow} message DeckRow
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        DeckRow.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.title = "";
                object.createdAt = "";
                object.modifiedAt = "";
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.title != null && message.hasOwnProperty("title"))
                object.title = message.title;
            if (message.description != null && message.hasOwnProperty("description")) {
                object.description = message.description;
                if (options.oneofs)
                    object._description = "description";
            }
            if (message.createdAt != null && message.hasOwnProperty("createdAt"))
                object.createdAt = message.createdAt;
            if (message.modifiedAt != null && message.hasOwnProperty("modifiedAt"))
                object.modifiedAt = message.modifiedAt;
            return object;
        };

        /**
         * Converts this DeckRow to JSON.
         * @function toJSON
         * @memberof cktarot.DeckRow
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        DeckRow.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for DeckRow
         * @function getTypeUrl
         * @memberof cktarot.DeckRow
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        DeckRow.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/cktarot.DeckRow";
        };

        return DeckRow;
    })();

    cktarot.CardRow = (function() {

        /**
         * Properties of a CardRow.
         * @memberof cktarot
         * @interface ICardRow
         * @property {string|null} [id] CardRow id
         * @property {string|null} [deckId] CardRow deckId
         * @property {string|null} [title] CardRow title
         * @property {number|null} [number] CardRow number
         * @property {string|null} [createdAt] CardRow createdAt
         * @property {string|null} [mimeType] CardRow mimeType
         * @property {Uint8Array|null} [data] CardRow data
         * @property {Uint8Array|null} [censoredData] CardRow censoredData
         * @property {string|null} [censoredMimeType] CardRow censoredMimeType
         */

        /**
         * Constructs a new CardRow.
         * @memberof cktarot
         * @classdesc Represents a CardRow.
         * @implements ICardRow
         * @constructor
         * @param {cktarot.ICardRow=} [properties] Properties to set
         */
        function CardRow(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * CardRow id.
         * @member {string} id
         * @memberof cktarot.CardRow
         * @instance
         */
        CardRow.prototype.id = "";

        /**
         * CardRow deckId.
         * @member {string} deckId
         * @memberof cktarot.CardRow
         * @instance
         */
        CardRow.prototype.deckId = "";

        /**
         * CardRow title.
         * @member {string} title
         * @memberof cktarot.CardRow
         * @instance
         */
        CardRow.prototype.title = "";

        /**
         * CardRow number.
         * @member {number} number
         * @memberof cktarot.CardRow
         * @instance
         */
        CardRow.prototype.number = 0;

        /**
         * CardRow createdAt.
         * @member {string|null|undefined} createdAt
         * @memberof cktarot.CardRow
         * @instance
         */
        CardRow.prototype.createdAt = null;

        /**
         * CardRow mimeType.
         * @member {string|null|undefined} mimeType
         * @memberof cktarot.CardRow
         * @instance
         */
        CardRow.prototype.mimeType = null;

        /**
         * CardRow data.
         * @member {Uint8Array|null|undefined} data
         * @memberof cktarot.CardRow
         * @instance
         */
        CardRow.prototype.data = null;

        /**
         * CardRow censoredData.
         * @member {Uint8Array|null|undefined} censoredData
         * @memberof cktarot.CardRow
         * @instance
         */
        CardRow.prototype.censoredData = null;

        /**
         * CardRow censoredMimeType.
         * @member {string|null|undefined} censoredMimeType
         * @memberof cktarot.CardRow
         * @instance
         */
        CardRow.prototype.censoredMimeType = null;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(CardRow.prototype, "_createdAt", {
            get: $util.oneOfGetter($oneOfFields = ["createdAt"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(CardRow.prototype, "_mimeType", {
            get: $util.oneOfGetter($oneOfFields = ["mimeType"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(CardRow.prototype, "_data", {
            get: $util.oneOfGetter($oneOfFields = ["data"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(CardRow.prototype, "_censoredData", {
            get: $util.oneOfGetter($oneOfFields = ["censoredData"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(CardRow.prototype, "_censoredMimeType", {
            get: $util.oneOfGetter($oneOfFields = ["censoredMimeType"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new CardRow instance using the specified properties.
         * @function create
         * @memberof cktarot.CardRow
         * @static
         * @param {cktarot.ICardRow=} [properties] Properties to set
         * @returns {cktarot.CardRow} CardRow instance
         */
        CardRow.create = function create(properties) {
            return new CardRow(properties);
        };

        /**
         * Encodes the specified CardRow message. Does not implicitly {@link cktarot.CardRow.verify|verify} messages.
         * @function encode
         * @memberof cktarot.CardRow
         * @static
         * @param {cktarot.ICardRow} message CardRow message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CardRow.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.deckId != null && Object.hasOwnProperty.call(message, "deckId"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.deckId);
            if (message.title != null && Object.hasOwnProperty.call(message, "title"))
                writer.uint32(/* id 3, wireType 2 =*/26).string(message.title);
            if (message.number != null && Object.hasOwnProperty.call(message, "number"))
                writer.uint32(/* id 4, wireType 0 =*/32).int32(message.number);
            if (message.createdAt != null && Object.hasOwnProperty.call(message, "createdAt"))
                writer.uint32(/* id 5, wireType 2 =*/42).string(message.createdAt);
            if (message.mimeType != null && Object.hasOwnProperty.call(message, "mimeType"))
                writer.uint32(/* id 6, wireType 2 =*/50).string(message.mimeType);
            if (message.data != null && Object.hasOwnProperty.call(message, "data"))
                writer.uint32(/* id 7, wireType 2 =*/58).bytes(message.data);
            if (message.censoredData != null && Object.hasOwnProperty.call(message, "censoredData"))
                writer.uint32(/* id 8, wireType 2 =*/66).bytes(message.censoredData);
            if (message.censoredMimeType != null && Object.hasOwnProperty.call(message, "censoredMimeType"))
                writer.uint32(/* id 9, wireType 2 =*/74).string(message.censoredMimeType);
            return writer;
        };

        /**
         * Encodes the specified CardRow message, length delimited. Does not implicitly {@link cktarot.CardRow.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cktarot.CardRow
         * @static
         * @param {cktarot.ICardRow} message CardRow message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CardRow.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a CardRow message from the specified reader or buffer.
         * @function decode
         * @memberof cktarot.CardRow
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cktarot.CardRow} CardRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CardRow.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.cktarot.CardRow();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                case 2: {
                        message.deckId = reader.string();
                        break;
                    }
                case 3: {
                        message.title = reader.string();
                        break;
                    }
                case 4: {
                        message.number = reader.int32();
                        break;
                    }
                case 5: {
                        message.createdAt = reader.string();
                        break;
                    }
                case 6: {
                        message.mimeType = reader.string();
                        break;
                    }
                case 7: {
                        message.data = reader.bytes();
                        break;
                    }
                case 8: {
                        message.censoredData = reader.bytes();
                        break;
                    }
                case 9: {
                        message.censoredMimeType = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a CardRow message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cktarot.CardRow
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cktarot.CardRow} CardRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CardRow.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CardRow message.
         * @function verify
         * @memberof cktarot.CardRow
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CardRow.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.deckId != null && message.hasOwnProperty("deckId"))
                if (!$util.isString(message.deckId))
                    return "deckId: string expected";
            if (message.title != null && message.hasOwnProperty("title"))
                if (!$util.isString(message.title))
                    return "title: string expected";
            if (message.number != null && message.hasOwnProperty("number"))
                if (!$util.isInteger(message.number))
                    return "number: integer expected";
            if (message.createdAt != null && message.hasOwnProperty("createdAt")) {
                properties._createdAt = 1;
                if (!$util.isString(message.createdAt))
                    return "createdAt: string expected";
            }
            if (message.mimeType != null && message.hasOwnProperty("mimeType")) {
                properties._mimeType = 1;
                if (!$util.isString(message.mimeType))
                    return "mimeType: string expected";
            }
            if (message.data != null && message.hasOwnProperty("data")) {
                properties._data = 1;
                if (!(message.data && typeof message.data.length === "number" || $util.isString(message.data)))
                    return "data: buffer expected";
            }
            if (message.censoredData != null && message.hasOwnProperty("censoredData")) {
                properties._censoredData = 1;
                if (!(message.censoredData && typeof message.censoredData.length === "number" || $util.isString(message.censoredData)))
                    return "censoredData: buffer expected";
            }
            if (message.censoredMimeType != null && message.hasOwnProperty("censoredMimeType")) {
                properties._censoredMimeType = 1;
                if (!$util.isString(message.censoredMimeType))
                    return "censoredMimeType: string expected";
            }
            return null;
        };

        /**
         * Creates a CardRow message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cktarot.CardRow
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cktarot.CardRow} CardRow
         */
        CardRow.fromObject = function fromObject(object) {
            if (object instanceof $root.cktarot.CardRow)
                return object;
            let message = new $root.cktarot.CardRow();
            if (object.id != null)
                message.id = String(object.id);
            if (object.deckId != null)
                message.deckId = String(object.deckId);
            if (object.title != null)
                message.title = String(object.title);
            if (object.number != null)
                message.number = object.number | 0;
            if (object.createdAt != null)
                message.createdAt = String(object.createdAt);
            if (object.mimeType != null)
                message.mimeType = String(object.mimeType);
            if (object.data != null)
                if (typeof object.data === "string")
                    $util.base64.decode(object.data, message.data = $util.newBuffer($util.base64.length(object.data)), 0);
                else if (object.data.length >= 0)
                    message.data = object.data;
            if (object.censoredData != null)
                if (typeof object.censoredData === "string")
                    $util.base64.decode(object.censoredData, message.censoredData = $util.newBuffer($util.base64.length(object.censoredData)), 0);
                else if (object.censoredData.length >= 0)
                    message.censoredData = object.censoredData;
            if (object.censoredMimeType != null)
                message.censoredMimeType = String(object.censoredMimeType);
            return message;
        };

        /**
         * Creates a plain object from a CardRow message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cktarot.CardRow
         * @static
         * @param {cktarot.CardRow} message CardRow
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CardRow.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.deckId = "";
                object.title = "";
                object.number = 0;
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.deckId != null && message.hasOwnProperty("deckId"))
                object.deckId = message.deckId;
            if (message.title != null && message.hasOwnProperty("title"))
                object.title = message.title;
            if (message.number != null && message.hasOwnProperty("number"))
                object.number = message.number;
            if (message.createdAt != null && message.hasOwnProperty("createdAt")) {
                object.createdAt = message.createdAt;
                if (options.oneofs)
                    object._createdAt = "createdAt";
            }
            if (message.mimeType != null && message.hasOwnProperty("mimeType")) {
                object.mimeType = message.mimeType;
                if (options.oneofs)
                    object._mimeType = "mimeType";
            }
            if (message.data != null && message.hasOwnProperty("data")) {
                object.data = options.bytes === String ? $util.base64.encode(message.data, 0, message.data.length) : options.bytes === Array ? Array.prototype.slice.call(message.data) : message.data;
                if (options.oneofs)
                    object._data = "data";
            }
            if (message.censoredData != null && message.hasOwnProperty("censoredData")) {
                object.censoredData = options.bytes === String ? $util.base64.encode(message.censoredData, 0, message.censoredData.length) : options.bytes === Array ? Array.prototype.slice.call(message.censoredData) : message.censoredData;
                if (options.oneofs)
                    object._censoredData = "censoredData";
            }
            if (message.censoredMimeType != null && message.hasOwnProperty("censoredMimeType")) {
                object.censoredMimeType = message.censoredMimeType;
                if (options.oneofs)
                    object._censoredMimeType = "censoredMimeType";
            }
            return object;
        };

        /**
         * Converts this CardRow to JSON.
         * @function toJSON
         * @memberof cktarot.CardRow
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CardRow.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for CardRow
         * @function getTypeUrl
         * @memberof cktarot.CardRow
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        CardRow.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/cktarot.CardRow";
        };

        return CardRow;
    })();

    cktarot.ReadingRow = (function() {

        /**
         * Properties of a ReadingRow.
         * @memberof cktarot
         * @interface IReadingRow
         * @property {string|null} [id] ReadingRow id
         * @property {string|null} [name] ReadingRow name
         * @property {Uint8Array|null} [state] ReadingRow state
         * @property {string|null} [updatedAt] ReadingRow updatedAt
         */

        /**
         * Constructs a new ReadingRow.
         * @memberof cktarot
         * @classdesc Represents a ReadingRow.
         * @implements IReadingRow
         * @constructor
         * @param {cktarot.IReadingRow=} [properties] Properties to set
         */
        function ReadingRow(properties) {
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * ReadingRow id.
         * @member {string} id
         * @memberof cktarot.ReadingRow
         * @instance
         */
        ReadingRow.prototype.id = "";

        /**
         * ReadingRow name.
         * @member {string} name
         * @memberof cktarot.ReadingRow
         * @instance
         */
        ReadingRow.prototype.name = "";

        /**
         * ReadingRow state.
         * @member {Uint8Array} state
         * @memberof cktarot.ReadingRow
         * @instance
         */
        ReadingRow.prototype.state = $util.newBuffer([]);

        /**
         * ReadingRow updatedAt.
         * @member {string} updatedAt
         * @memberof cktarot.ReadingRow
         * @instance
         */
        ReadingRow.prototype.updatedAt = "";

        /**
         * Creates a new ReadingRow instance using the specified properties.
         * @function create
         * @memberof cktarot.ReadingRow
         * @static
         * @param {cktarot.IReadingRow=} [properties] Properties to set
         * @returns {cktarot.ReadingRow} ReadingRow instance
         */
        ReadingRow.create = function create(properties) {
            return new ReadingRow(properties);
        };

        /**
         * Encodes the specified ReadingRow message. Does not implicitly {@link cktarot.ReadingRow.verify|verify} messages.
         * @function encode
         * @memberof cktarot.ReadingRow
         * @static
         * @param {cktarot.IReadingRow} message ReadingRow message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ReadingRow.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.id != null && Object.hasOwnProperty.call(message, "id"))
                writer.uint32(/* id 1, wireType 2 =*/10).string(message.id);
            if (message.name != null && Object.hasOwnProperty.call(message, "name"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.name);
            if (message.state != null && Object.hasOwnProperty.call(message, "state"))
                writer.uint32(/* id 3, wireType 2 =*/26).bytes(message.state);
            if (message.updatedAt != null && Object.hasOwnProperty.call(message, "updatedAt"))
                writer.uint32(/* id 4, wireType 2 =*/34).string(message.updatedAt);
            return writer;
        };

        /**
         * Encodes the specified ReadingRow message, length delimited. Does not implicitly {@link cktarot.ReadingRow.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cktarot.ReadingRow
         * @static
         * @param {cktarot.IReadingRow} message ReadingRow message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        ReadingRow.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a ReadingRow message from the specified reader or buffer.
         * @function decode
         * @memberof cktarot.ReadingRow
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cktarot.ReadingRow} ReadingRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ReadingRow.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.cktarot.ReadingRow();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.id = reader.string();
                        break;
                    }
                case 2: {
                        message.name = reader.string();
                        break;
                    }
                case 3: {
                        message.state = reader.bytes();
                        break;
                    }
                case 4: {
                        message.updatedAt = reader.string();
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a ReadingRow message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cktarot.ReadingRow
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cktarot.ReadingRow} ReadingRow
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        ReadingRow.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a ReadingRow message.
         * @function verify
         * @memberof cktarot.ReadingRow
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        ReadingRow.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            if (message.id != null && message.hasOwnProperty("id"))
                if (!$util.isString(message.id))
                    return "id: string expected";
            if (message.name != null && message.hasOwnProperty("name"))
                if (!$util.isString(message.name))
                    return "name: string expected";
            if (message.state != null && message.hasOwnProperty("state"))
                if (!(message.state && typeof message.state.length === "number" || $util.isString(message.state)))
                    return "state: buffer expected";
            if (message.updatedAt != null && message.hasOwnProperty("updatedAt"))
                if (!$util.isString(message.updatedAt))
                    return "updatedAt: string expected";
            return null;
        };

        /**
         * Creates a ReadingRow message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cktarot.ReadingRow
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cktarot.ReadingRow} ReadingRow
         */
        ReadingRow.fromObject = function fromObject(object) {
            if (object instanceof $root.cktarot.ReadingRow)
                return object;
            let message = new $root.cktarot.ReadingRow();
            if (object.id != null)
                message.id = String(object.id);
            if (object.name != null)
                message.name = String(object.name);
            if (object.state != null)
                if (typeof object.state === "string")
                    $util.base64.decode(object.state, message.state = $util.newBuffer($util.base64.length(object.state)), 0);
                else if (object.state.length >= 0)
                    message.state = object.state;
            if (object.updatedAt != null)
                message.updatedAt = String(object.updatedAt);
            return message;
        };

        /**
         * Creates a plain object from a ReadingRow message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cktarot.ReadingRow
         * @static
         * @param {cktarot.ReadingRow} message ReadingRow
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        ReadingRow.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.defaults) {
                object.id = "";
                object.name = "";
                if (options.bytes === String)
                    object.state = "";
                else {
                    object.state = [];
                    if (options.bytes !== Array)
                        object.state = $util.newBuffer(object.state);
                }
                object.updatedAt = "";
            }
            if (message.id != null && message.hasOwnProperty("id"))
                object.id = message.id;
            if (message.name != null && message.hasOwnProperty("name"))
                object.name = message.name;
            if (message.state != null && message.hasOwnProperty("state"))
                object.state = options.bytes === String ? $util.base64.encode(message.state, 0, message.state.length) : options.bytes === Array ? Array.prototype.slice.call(message.state) : message.state;
            if (message.updatedAt != null && message.hasOwnProperty("updatedAt"))
                object.updatedAt = message.updatedAt;
            return object;
        };

        /**
         * Converts this ReadingRow to JSON.
         * @function toJSON
         * @memberof cktarot.ReadingRow
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        ReadingRow.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for ReadingRow
         * @function getTypeUrl
         * @memberof cktarot.ReadingRow
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        ReadingRow.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/cktarot.ReadingRow";
        };

        return ReadingRow;
    })();

    cktarot.CktarotBackup = (function() {

        /**
         * Properties of a CktarotBackup.
         * @memberof cktarot
         * @interface ICktarotBackup
         * @property {number|null} [version] CktarotBackup version
         * @property {string|null} [exportedAt] CktarotBackup exportedAt
         * @property {Array.<cktarot.IDeckRow>|null} [decks] CktarotBackup decks
         * @property {Array.<cktarot.ICardRow>|null} [cards] CktarotBackup cards
         * @property {Array.<cktarot.IReadingRow>|null} [readings] CktarotBackup readings
         */

        /**
         * Constructs a new CktarotBackup.
         * @memberof cktarot
         * @classdesc Represents a CktarotBackup.
         * @implements ICktarotBackup
         * @constructor
         * @param {cktarot.ICktarotBackup=} [properties] Properties to set
         */
        function CktarotBackup(properties) {
            this.decks = [];
            this.cards = [];
            this.readings = [];
            if (properties)
                for (let keys = Object.keys(properties), i = 0; i < keys.length; ++i)
                    if (properties[keys[i]] != null)
                        this[keys[i]] = properties[keys[i]];
        }

        /**
         * CktarotBackup version.
         * @member {number} version
         * @memberof cktarot.CktarotBackup
         * @instance
         */
        CktarotBackup.prototype.version = 0;

        /**
         * CktarotBackup exportedAt.
         * @member {string|null|undefined} exportedAt
         * @memberof cktarot.CktarotBackup
         * @instance
         */
        CktarotBackup.prototype.exportedAt = null;

        /**
         * CktarotBackup decks.
         * @member {Array.<cktarot.IDeckRow>} decks
         * @memberof cktarot.CktarotBackup
         * @instance
         */
        CktarotBackup.prototype.decks = $util.emptyArray;

        /**
         * CktarotBackup cards.
         * @member {Array.<cktarot.ICardRow>} cards
         * @memberof cktarot.CktarotBackup
         * @instance
         */
        CktarotBackup.prototype.cards = $util.emptyArray;

        /**
         * CktarotBackup readings.
         * @member {Array.<cktarot.IReadingRow>} readings
         * @memberof cktarot.CktarotBackup
         * @instance
         */
        CktarotBackup.prototype.readings = $util.emptyArray;

        // OneOf field names bound to virtual getters and setters
        let $oneOfFields;

        // Virtual OneOf for proto3 optional field
        Object.defineProperty(CktarotBackup.prototype, "_exportedAt", {
            get: $util.oneOfGetter($oneOfFields = ["exportedAt"]),
            set: $util.oneOfSetter($oneOfFields)
        });

        /**
         * Creates a new CktarotBackup instance using the specified properties.
         * @function create
         * @memberof cktarot.CktarotBackup
         * @static
         * @param {cktarot.ICktarotBackup=} [properties] Properties to set
         * @returns {cktarot.CktarotBackup} CktarotBackup instance
         */
        CktarotBackup.create = function create(properties) {
            return new CktarotBackup(properties);
        };

        /**
         * Encodes the specified CktarotBackup message. Does not implicitly {@link cktarot.CktarotBackup.verify|verify} messages.
         * @function encode
         * @memberof cktarot.CktarotBackup
         * @static
         * @param {cktarot.ICktarotBackup} message CktarotBackup message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CktarotBackup.encode = function encode(message, writer) {
            if (!writer)
                writer = $Writer.create();
            if (message.version != null && Object.hasOwnProperty.call(message, "version"))
                writer.uint32(/* id 1, wireType 0 =*/8).int32(message.version);
            if (message.exportedAt != null && Object.hasOwnProperty.call(message, "exportedAt"))
                writer.uint32(/* id 2, wireType 2 =*/18).string(message.exportedAt);
            if (message.decks != null && message.decks.length)
                for (let i = 0; i < message.decks.length; ++i)
                    $root.cktarot.DeckRow.encode(message.decks[i], writer.uint32(/* id 3, wireType 2 =*/26).fork()).ldelim();
            if (message.cards != null && message.cards.length)
                for (let i = 0; i < message.cards.length; ++i)
                    $root.cktarot.CardRow.encode(message.cards[i], writer.uint32(/* id 4, wireType 2 =*/34).fork()).ldelim();
            if (message.readings != null && message.readings.length)
                for (let i = 0; i < message.readings.length; ++i)
                    $root.cktarot.ReadingRow.encode(message.readings[i], writer.uint32(/* id 5, wireType 2 =*/42).fork()).ldelim();
            return writer;
        };

        /**
         * Encodes the specified CktarotBackup message, length delimited. Does not implicitly {@link cktarot.CktarotBackup.verify|verify} messages.
         * @function encodeDelimited
         * @memberof cktarot.CktarotBackup
         * @static
         * @param {cktarot.ICktarotBackup} message CktarotBackup message or plain object to encode
         * @param {$protobuf.Writer} [writer] Writer to encode to
         * @returns {$protobuf.Writer} Writer
         */
        CktarotBackup.encodeDelimited = function encodeDelimited(message, writer) {
            return this.encode(message, writer).ldelim();
        };

        /**
         * Decodes a CktarotBackup message from the specified reader or buffer.
         * @function decode
         * @memberof cktarot.CktarotBackup
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @param {number} [length] Message length if known beforehand
         * @returns {cktarot.CktarotBackup} CktarotBackup
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CktarotBackup.decode = function decode(reader, length, error) {
            if (!(reader instanceof $Reader))
                reader = $Reader.create(reader);
            let end = length === undefined ? reader.len : reader.pos + length, message = new $root.cktarot.CktarotBackup();
            while (reader.pos < end) {
                let tag = reader.uint32();
                if (tag === error)
                    break;
                switch (tag >>> 3) {
                case 1: {
                        message.version = reader.int32();
                        break;
                    }
                case 2: {
                        message.exportedAt = reader.string();
                        break;
                    }
                case 3: {
                        if (!(message.decks && message.decks.length))
                            message.decks = [];
                        message.decks.push($root.cktarot.DeckRow.decode(reader, reader.uint32()));
                        break;
                    }
                case 4: {
                        if (!(message.cards && message.cards.length))
                            message.cards = [];
                        message.cards.push($root.cktarot.CardRow.decode(reader, reader.uint32()));
                        break;
                    }
                case 5: {
                        if (!(message.readings && message.readings.length))
                            message.readings = [];
                        message.readings.push($root.cktarot.ReadingRow.decode(reader, reader.uint32()));
                        break;
                    }
                default:
                    reader.skipType(tag & 7);
                    break;
                }
            }
            return message;
        };

        /**
         * Decodes a CktarotBackup message from the specified reader or buffer, length delimited.
         * @function decodeDelimited
         * @memberof cktarot.CktarotBackup
         * @static
         * @param {$protobuf.Reader|Uint8Array} reader Reader or buffer to decode from
         * @returns {cktarot.CktarotBackup} CktarotBackup
         * @throws {Error} If the payload is not a reader or valid buffer
         * @throws {$protobuf.util.ProtocolError} If required fields are missing
         */
        CktarotBackup.decodeDelimited = function decodeDelimited(reader) {
            if (!(reader instanceof $Reader))
                reader = new $Reader(reader);
            return this.decode(reader, reader.uint32());
        };

        /**
         * Verifies a CktarotBackup message.
         * @function verify
         * @memberof cktarot.CktarotBackup
         * @static
         * @param {Object.<string,*>} message Plain object to verify
         * @returns {string|null} `null` if valid, otherwise the reason why it is not
         */
        CktarotBackup.verify = function verify(message) {
            if (typeof message !== "object" || message === null)
                return "object expected";
            let properties = {};
            if (message.version != null && message.hasOwnProperty("version"))
                if (!$util.isInteger(message.version))
                    return "version: integer expected";
            if (message.exportedAt != null && message.hasOwnProperty("exportedAt")) {
                properties._exportedAt = 1;
                if (!$util.isString(message.exportedAt))
                    return "exportedAt: string expected";
            }
            if (message.decks != null && message.hasOwnProperty("decks")) {
                if (!Array.isArray(message.decks))
                    return "decks: array expected";
                for (let i = 0; i < message.decks.length; ++i) {
                    let error = $root.cktarot.DeckRow.verify(message.decks[i]);
                    if (error)
                        return "decks." + error;
                }
            }
            if (message.cards != null && message.hasOwnProperty("cards")) {
                if (!Array.isArray(message.cards))
                    return "cards: array expected";
                for (let i = 0; i < message.cards.length; ++i) {
                    let error = $root.cktarot.CardRow.verify(message.cards[i]);
                    if (error)
                        return "cards." + error;
                }
            }
            if (message.readings != null && message.hasOwnProperty("readings")) {
                if (!Array.isArray(message.readings))
                    return "readings: array expected";
                for (let i = 0; i < message.readings.length; ++i) {
                    let error = $root.cktarot.ReadingRow.verify(message.readings[i]);
                    if (error)
                        return "readings." + error;
                }
            }
            return null;
        };

        /**
         * Creates a CktarotBackup message from a plain object. Also converts values to their respective internal types.
         * @function fromObject
         * @memberof cktarot.CktarotBackup
         * @static
         * @param {Object.<string,*>} object Plain object
         * @returns {cktarot.CktarotBackup} CktarotBackup
         */
        CktarotBackup.fromObject = function fromObject(object) {
            if (object instanceof $root.cktarot.CktarotBackup)
                return object;
            let message = new $root.cktarot.CktarotBackup();
            if (object.version != null)
                message.version = object.version | 0;
            if (object.exportedAt != null)
                message.exportedAt = String(object.exportedAt);
            if (object.decks) {
                if (!Array.isArray(object.decks))
                    throw TypeError(".cktarot.CktarotBackup.decks: array expected");
                message.decks = [];
                for (let i = 0; i < object.decks.length; ++i) {
                    if (typeof object.decks[i] !== "object")
                        throw TypeError(".cktarot.CktarotBackup.decks: object expected");
                    message.decks[i] = $root.cktarot.DeckRow.fromObject(object.decks[i]);
                }
            }
            if (object.cards) {
                if (!Array.isArray(object.cards))
                    throw TypeError(".cktarot.CktarotBackup.cards: array expected");
                message.cards = [];
                for (let i = 0; i < object.cards.length; ++i) {
                    if (typeof object.cards[i] !== "object")
                        throw TypeError(".cktarot.CktarotBackup.cards: object expected");
                    message.cards[i] = $root.cktarot.CardRow.fromObject(object.cards[i]);
                }
            }
            if (object.readings) {
                if (!Array.isArray(object.readings))
                    throw TypeError(".cktarot.CktarotBackup.readings: array expected");
                message.readings = [];
                for (let i = 0; i < object.readings.length; ++i) {
                    if (typeof object.readings[i] !== "object")
                        throw TypeError(".cktarot.CktarotBackup.readings: object expected");
                    message.readings[i] = $root.cktarot.ReadingRow.fromObject(object.readings[i]);
                }
            }
            return message;
        };

        /**
         * Creates a plain object from a CktarotBackup message. Also converts values to other types if specified.
         * @function toObject
         * @memberof cktarot.CktarotBackup
         * @static
         * @param {cktarot.CktarotBackup} message CktarotBackup
         * @param {$protobuf.IConversionOptions} [options] Conversion options
         * @returns {Object.<string,*>} Plain object
         */
        CktarotBackup.toObject = function toObject(message, options) {
            if (!options)
                options = {};
            let object = {};
            if (options.arrays || options.defaults) {
                object.decks = [];
                object.cards = [];
                object.readings = [];
            }
            if (options.defaults)
                object.version = 0;
            if (message.version != null && message.hasOwnProperty("version"))
                object.version = message.version;
            if (message.exportedAt != null && message.hasOwnProperty("exportedAt")) {
                object.exportedAt = message.exportedAt;
                if (options.oneofs)
                    object._exportedAt = "exportedAt";
            }
            if (message.decks && message.decks.length) {
                object.decks = [];
                for (let j = 0; j < message.decks.length; ++j)
                    object.decks[j] = $root.cktarot.DeckRow.toObject(message.decks[j], options);
            }
            if (message.cards && message.cards.length) {
                object.cards = [];
                for (let j = 0; j < message.cards.length; ++j)
                    object.cards[j] = $root.cktarot.CardRow.toObject(message.cards[j], options);
            }
            if (message.readings && message.readings.length) {
                object.readings = [];
                for (let j = 0; j < message.readings.length; ++j)
                    object.readings[j] = $root.cktarot.ReadingRow.toObject(message.readings[j], options);
            }
            return object;
        };

        /**
         * Converts this CktarotBackup to JSON.
         * @function toJSON
         * @memberof cktarot.CktarotBackup
         * @instance
         * @returns {Object.<string,*>} JSON object
         */
        CktarotBackup.prototype.toJSON = function toJSON() {
            return this.constructor.toObject(this, $protobuf.util.toJSONOptions);
        };

        /**
         * Gets the default type url for CktarotBackup
         * @function getTypeUrl
         * @memberof cktarot.CktarotBackup
         * @static
         * @param {string} [typeUrlPrefix] your custom typeUrlPrefix(default "type.googleapis.com")
         * @returns {string} The default type url
         */
        CktarotBackup.getTypeUrl = function getTypeUrl(typeUrlPrefix) {
            if (typeUrlPrefix === undefined) {
                typeUrlPrefix = "type.googleapis.com";
            }
            return typeUrlPrefix + "/cktarot.CktarotBackup";
        };

        return CktarotBackup;
    })();

    return cktarot;
})();

export { $root as default };
