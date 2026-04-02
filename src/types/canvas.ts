import type { SavedReadingState } from "./readingState.js";

export interface MouseLikeEvent {
    clientX: number;
    clientY: number;
    target: EventTarget | null;
    button?: number;
    ctrlKey?: boolean;
    preventDefault?: () => void;
}

export type DeckModalTab = 'onDevice' | 'store';

export interface CatalogDeckOffer {
    id: string;
    title: string;
    description: string | null;
    installed: boolean;
}

export interface OnDeviceDeckEntry {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    modified_at: string;
    /** True when this deck id exists in the Supabase catalog (installed from store). */
    fromCatalog: boolean;
}

export type MergedThis = {
    draggableCards: DraggableCard[];
    maxZIndex: number;
    loadedReadingId: string | null;
    dirty: boolean;
    loadModalOpen: boolean;
    loadModalConfirmingForId: string | null;
    localSavedReadings: { id: string; name: string; updated_at: string }[];
    saveAndLoadTargetId: string | null;
    dragStart: { startCardX: number; startCardY: number; startDropX: number; startDropY: number } | null;
    dragContainer: HTMLElement | null;
    draggingCard: HTMLElement | null;
    showShuffledConfirmation: boolean;
    selectedCardIds: string[];
    selectionBox: { startX: number; startY: number; currentX: number; currentY: number } | null;
    selectionBoxStyle: string;
    groupDragOffsets: Record<string, { dx: number; dy: number }> | null;

    isPanning: boolean;
    panStartX: number;
    panStartY: number;

    viewport: HTMLDivElement | null;
    content: HTMLDivElement | null;
    emptyCanvasMessage: HTMLDivElement | null;

    contextMenu: { open: boolean; x: number; y: number; cardId: string | null; textId: string | null };

    textLabels: TextLabel[];
    maxTextZIndex: number;
    draggingTextId: string | null;
    textDragStart: { startX: number; startY: number; startDropX: number; startDropY: number } | null;
    editingTextId: string | null;
    pendingAnchor: { textId: string; cardId: string; screenX: number; screenY: number } | null;

    activeTouchId: number | null;
    touchStartPos: { clientX: number; clientY: number; target: EventTarget | null } | null;
    longPressTimerId: ReturnType<typeof setTimeout> | null;
    longPressActivated: boolean;
    touchMovedAfterLongPress: boolean;
    touchGestureStarted: boolean;
    pinchStartDistance: number;
    pinchStartScale: number;

    CARD_WIDTH: number;
    CARD_HEIGHT: number;
    TEXT_ANCHOR_GAP: number;
    TEXT_LABEL_DEFAULT_HEIGHT: number;

    // CanvasComponent methods
    getCardImg(card: TarotCard, censored: boolean): string;
    cardShowsPlaceholder(card: TarotCard, censored: boolean): boolean;
    screenToContent(screenX: number, screenY: number): { x: number; y: number };
    boxesOverlap(
        box1: { left: number; top: number; width: number; height: number },
        box2: { left: number; top: number; width: number; height: number }
    ): boolean;
    updateSelectionBoxStyle(): void;
    touchToMouseLike(touch: Touch, target?: EventTarget | null, ctrlKey?: boolean): MouseLikeEvent;
    getTouchById(ev: TouchEvent, id: number): Touch | null;
    onTouchStart(e: TouchEvent): void;
    onTouchMove(e: TouchEvent): void;
    onTouchEnd(e: TouchEvent): void;
    onTouchCancel(e: TouchEvent): void;
    centerViewport(): void;
    $refs: Record<string, HTMLElement>;
    $nextTick(cb?: () => void): void;
    init(): void;
    shuffleDeck(): void;
    openDrawByIndexDialog(): void;
    serializeState(): Promise<SavedReadingState>;
    deserializeState(state: SavedReadingState): Promise<void>;

    deckModalOpen: boolean;
    deckModalTab: DeckModalTab;
    catalogOffers: CatalogDeckOffer[];
    onDeviceDecks: OnDeviceDeckEntry[];
    newLocalDeckTitle: string;
    setDeckModalTab(tab: DeckModalTab): void;
    refreshDeckLists(): Promise<void>;
    openDeckModal(): Promise<void>;
    closeDeckModal(): void;
    switchToDeck(deckId: string): Promise<void>;
    createLocalDeckAction(): Promise<void>;
    downloadCatalogDeckAction(deckId: string): Promise<void>;
    removeCatalogInstallAction(deckId: string): Promise<void>;
    deleteLocalDeckAction(deckId: string): Promise<void>;
    createNewReading(): Promise<void>;
    saveCurrentReading(name?: string): Promise<{ ok: boolean; error?: string }>;
    loadReadingById(id: string): Promise<void>;
    openLoadModal(): Promise<void>;
    closeLoadModal(): void;
    onSelectReadingToLoad(id: string): Promise<void>;
    saveAndLoad(id: string): Promise<void>;
    handleSaveClick(): void;
    triggerTitleDialog(): void;
    discardAndLoad(id: string): Promise<void>;
    cancelLoadConfirm(): void;
    deleteReading(id: string): Promise<void>;
    addCardToCanvas(card: TarotCard): void;
    generateCardId(): string;
    generateTextId(): string;
    addTextAt(screenX: number, screenY: number): void;
    getTextLabelPosition(label: TextLabel): { x: number; y: number };
    getTextLabelStyle(label: TextLabel): string;
    cryptoRandomInt(len: number): number;
    drawMultipleCards(num: number): Set<number> | undefined;
    onMouseWheelClick(event: MouseLikeEvent): void;
    drawCardAt(x: number, y: number): void;
    onMouseDown(event: MouseLikeEvent): void;
    onMouseMove(e: MouseLikeEvent): void;
    onMouseUp(event: MouseLikeEvent): void;
    clearCanvas(): void;
    updateItem(id: string, newProps: Partial<DraggableCard>): void;
    updateTextLabel(id: string, newProps: Partial<TextLabel>): void;
    deleteTextLabel(id: string): void;
    setTextLabelAnchor(textId: string, cardId: string, position: TextLabelAnchorPosition): void;
    clearDragState(): void;
    cancelPendingAnchor(): void;
    commitEditTextLabel(): void;
    deleteCard(cardId: string): void;
    deleteSelectedCards(): void;
    rotateCard(cardId: string, direction: 'clockwise' | 'counter-clockwise' | '180'): void;
    onContextMenu(event: MouseLikeEvent): void;
    closeContextMenu(): void;

    // ScaleComponent props & methods
    scale: number;
    offsetX: number;
    offsetY: number;
    minScale: number;
    maxScale: number;
    clamp(v: number, min: number, max: number): number;
    getContentStyle(): string;
    onWheel(e: WheelEvent): void;
    zoomAt(screenX: number, screenY: number, factor: number): void;
    zoomAtCenter(factor: number): void;
}

export interface TarotCard {
    id: string;
    deckId: string;
    title: string;
    num: number;
    img: string;
    censoredImg?: string | null;
    /** Deck display name when known (for persistence / invalid placeholder). */
    deckTitle?: string;
    /** Cloud: storage key; local: image title (e.g. filename) — persisted in reading JSON as image_source. */
    imageSourceLabel?: string;
    censorImageSourceLabel?: string | null;
    /** True when the card data is missing (e.g. deck deleted); canvas shows a placeholder instead of art. */
    invalidReference?: boolean;
}

export interface DraggableCard {
    card: TarotCard;
    id: string;
    x: number;
    y: number;
    rotation: number;
    zIndex: number;
    opacity: number;
    cursor: string;
    display: string;
}

export type TextLabelAnchorPosition = 'above' | 'below' | 'left' | 'right';

export interface TextLabel {
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    fontWeight: number;
    fontStyle: 'normal' | 'italic';
    textDecoration: 'none' | 'underline';
    color: string;
    zIndex: number;
    cursor: string;
    display: string;
    anchorCardId: string | null;
    anchorPosition: TextLabelAnchorPosition | null;
}
