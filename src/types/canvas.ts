import type { CardCanvasCountEntry } from '../lib/cardCanvasCounts.js';
import type {
  CorrespondenceCanvasCountEntry,
  CorrespondenceDisplay,
} from '../lib/correspondenceCanvasCounts.js';

export type { CorrespondenceDisplay };
import type { ReadingGroupSection, SavedReadingState } from './readingState.js';
import type { LocalReadingGroupRow } from './localDb.js';

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
  loadModalEditingReadingId: string | null;
  loadModalEditingTitle: string;
  loadModalSearchQuery: string;
  localSavedReadings: { id: string; name: string; updated_at: string; group_id: string }[];
  loadModalGroupedSections: ReadingGroupSection[];
  loadModalReadingGroups: LocalReadingGroupRow[];
  loadModalCollapsedGroupIds: Record<string, boolean>;
  loadModalNewGroupTitle: string;
  loadModalRenamingGroupId: string | null;
  loadModalRenameGroupTitle: string;
  loadModalGroupError: string | null;
  loadModalReadingsPending: boolean;
  loadModalSelectedReadingIds: string[];
  randomNumberModalOpen: boolean;
  randomNumberLowerBound: string;
  randomNumberUpperBound: string;
  randomNumberResult: number | null;
  randomNumberError: string | null;
  randomNumberScreenX: number | null;
  randomNumberScreenY: number | null;
  saveAndLoadTargetId: string | null;
  readingSaveFlashVisible: boolean;
  _readingSaveFlashTimer: ReturnType<typeof setTimeout> | null;
  _ctrlDLastDrawAtMs: number | null;
  dragStart: {
    startCardX: number;
    startCardY: number;
    startDropX: number;
    startDropY: number;
  } | null;
  dragContainer: HTMLElement | null;
  draggingCard: HTMLElement | null;
  showShuffledConfirmation: boolean;
  selectedCardIds: string[];
  selectedTextIds: string[];
  selectionBox: { startX: number; startY: number; currentX: number; currentY: number } | null;
  selectionBoxStyle: string;
  groupDragOffsets: Record<string, { dx: number; dy: number }> | null;

  isPanning: boolean;
  panStartX: number;
  panStartY: number;

  viewport: HTMLDivElement | null;
  content: HTMLDivElement | null;
  emptyCanvasMessage: HTMLDivElement | null;
  lastPointerScreenX: number | null;
  lastPointerScreenY: number | null;

  contextMenu: {
    open: boolean;
    /** Screen X for fixed menu positioning. */
    x: number;
    /** Screen Y for fixed menu positioning. */
    y: number;
    /** Content-space X captured when the menu opens. */
    contentX: number;
    /** Content-space Y captured when the menu opens. */
    contentY: number;
    cardId: string | null;
    textId: string | null;
  };

  drawByName: {
    screenX: number;
    screenY: number;
    query: string;
    highlightIndex: number;
  } | null;
  /** Top title matches for the draw-by-name picker (derived from store + query). */
  drawByNameMatches(): TarotCard[];

  textLabels: TextLabel[];
  maxTextZIndex: number;
  draggingTextId: string | null;
  textDragStart: { startX: number; startY: number; startDropX: number; startDropY: number } | null;
  resizingTextId: string | null;
  textResizeStart: { startWidthPx: number; startDropX: number } | null;
  editingTextId: string | null;
  pendingAnchor: { textId: string; cardId: string; screenX: number; screenY: number } | null;

  storageWarningVisible: boolean;
  storageAdditionalInfoOpen: boolean;
  _storageWarningStartupListener: (() => void) | null;

  activeTouchId: number | null;
  touchStartPos: { clientX: number; clientY: number; target: EventTarget | null } | null;
  touchGestureStarted: boolean;
  lastCanvasTap: { tapKey: string; time: number; x: number; y: number } | null;
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
    box2: { left: number; top: number; width: number; height: number },
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
  openDrawByIndexDialog(screenX: number, screenY: number): void;
  openDrawByIndexFromContextMenu(): void;
  openRandomNumberModalFromContextMenu(): void;
  openRandomNumberModal(screenX: number, screenY: number): void;
  closeRandomNumberModal(): void;
  generateRandomNumber(): void;
  addRandomNumberResultToCanvas(): void;
  handleRandomNumberShortcut(event: KeyboardEvent): void;
  addCardAtScreenPosition(card: TarotCard, screenX: number, screenY: number): void;
  serializeState(): Promise<SavedReadingState>;
  deserializeState(state: SavedReadingState): Promise<void>;

  deckModalOpen: boolean;
  deckModalTab: DeckModalTab;
  catalogOffers: CatalogDeckOffer[];
  onDeviceDecks: OnDeviceDeckEntry[];
  deckSearchQuery: string;
  selectedDeckIds: string[];
  newLocalDeckTitle: string;
  newLocalDeckTitleError: string;
  isDeckSelected(deckId: string): boolean;
  toggleDeckSelection(deckId: string): void;
  selectAllDecks(): void;
  clearDeckSelection(): void;
  filteredOnDeviceDecks(): OnDeviceDeckEntry[];
  filteredCatalogOffers(): CatalogDeckOffer[];
  setDeckModalTab(tab: DeckModalTab): void;
  refreshDeckLists(): Promise<void>;
  openDeckModal(): Promise<void>;
  closeDeckModal(): void;
  switchToDeck(deckId: string, keepDeckModalOpen?: boolean): Promise<void>;
  cycleDeck(direction: 1 | -1): Promise<void>;
  onCycleDeckEvent(event: Event): void;
  onOpenDeckModalEvent(): void;
  switchDeckByName: null | {
    query: string;
    highlightIndex: number;
  };
  switchDeckByNameMatches(): OnDeviceDeckEntry[];
  onSwitchDeckByNameEvent(): void;
  openSwitchDeckByName(): Promise<void>;
  onSwitchDeckByNameQueryInput(value: string): void;
  moveSwitchDeckByNameHighlight(delta: 1 | -1): void;
  onSwitchDeckByNameKeydown(event: KeyboardEvent): void;
  confirmSwitchDeckByNameSelection(deck?: OnDeviceDeckEntry): Promise<void>;
  cancelSwitchDeckByName(): void;
  handleDeckEscape(): void;
  createLocalDeckAction(): Promise<void>;
  downloadCatalogDeckAction(deckId: string): Promise<void>;
  onDeckDownloadComplete(deckId: string): Promise<void>;
  finishDownloadedDeck(deckId: string): Promise<void>;
  removeCatalogInstallAction(deckId: string): Promise<void>;
  deleteLocalDeckAction(deckId: string): Promise<void>;
  confirmAndDeleteSelectedDecks(): Promise<void>;
  createNewReading(): Promise<void>;
  saveCurrentReading(name?: string): Promise<{ ok: boolean; error?: string }>;
  loadReadingById(id: string): Promise<void>;
  openLoadModal(): Promise<void>;
  refreshLoadModalReadings(): Promise<void>;
  filteredLoadModalGroupedSections(): ReadingGroupSection[];
  filteredLoadModalReadings(): { id: string; name: string; updated_at: string; group_id: string }[];
  isLoadModalReadingSelected(id: string): boolean;
  toggleLoadModalReadingSelection(id: string): void;
  isLoadModalReadingGroupSelected(groupId: string): boolean;
  toggleLoadModalReadingGroupSelection(groupId: string): void;
  selectAllLoadModalReadings(): void;
  clearLoadModalReadingSelection(): void;
  confirmAndDeleteSelectedLoadModalReadings(): Promise<void>;
  isLoadModalGroupCollapsed(groupId: string): boolean;
  toggleLoadModalGroupCollapsed(groupId: string): void;
  addLoadModalGroup(): Promise<void>;
  startRenameLoadModalGroup(g: LocalReadingGroupRow): void;
  cancelRenameLoadModalGroup(): void;
  saveRenameLoadModalGroup(): Promise<void>;
  confirmDeleteLoadModalGroup(g: LocalReadingGroupRow): Promise<void>;
  assignReadingGroup(readingId: string, groupId: string): Promise<void>;
  closeLoadModal(): void;
  onSelectReadingToLoad(id: string): Promise<void>;
  saveAndLoad(id: string): Promise<void>;
  handleSaveClick(): void;
  handleSaveShortcut(event: KeyboardEvent): void;
  handleDrawCardShortcut(event: KeyboardEvent): void;
  handleDrawByNameShortcut(event: KeyboardEvent): void;
  handleDrawByIndexShortcut(event: KeyboardEvent): void;
  handleAddTextShortcut(event: KeyboardEvent): void;
  handleShuffleShortcut(event: KeyboardEvent): void;
  handleNextDeckShortcut(event: KeyboardEvent): void;
  handlePreviousDeckShortcut(event: KeyboardEvent): void;
  handleSwitchDeckByNameShortcut(event: KeyboardEvent): void;
  handleOpenDeckModalShortcut(event: KeyboardEvent): void;
  handleOpenReadingsModalShortcut(event: KeyboardEvent): void;
  handleOpenSettingsModalShortcut(event: KeyboardEvent): void;
  handleOpenAccountModalShortcut(event: KeyboardEvent): void;
  handleOpenCorrespondenceManagerShortcut(event: KeyboardEvent): void;
  handleToggleCanvasOverlaysShortcut(event: KeyboardEvent): void;
  handleOpenKeyboardShortcutsShortcut(event: KeyboardEvent): void;
  handleClearCanvasShortcut(event: KeyboardEvent): void;
  handleNewReadingShortcut(event: KeyboardEvent): void;
  promptClearCanvas(): void;
  handleEscapeShortcut(event: KeyboardEvent): void;
  showReadingSaveFlash(): void;
  triggerTitleDialog(): void;
  discardAndLoad(id: string): Promise<void>;
  cancelLoadConfirm(): void;
  startLoadModalTitleEdit(reading: { id: string; name: string; updated_at: string }): void;
  commitLoadModalTitleEdit(): Promise<void>;
  cancelLoadModalTitleEdit(): void;
  deleteReading(id: string): Promise<void>;
  addCardToCanvas(card: TarotCard): void;
  generateCardId(): string;
  generateTextId(): string;
  addTextAt(screenX: number, screenY: number): void;
  addTextAtContent(contentX: number, contentY: number): void;
  addTextLabelWithTextAt(screenX: number, screenY: number, text: string): void;
  getTextLabelPosition(label: TextLabel): { x: number; y: number };
  getTextLabelBounds(label: TextLabel): {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  getTextLabelStyle(label: TextLabel): string;
  buildGroupDragOffsets(
    anchorX: number,
    anchorY: number,
  ): Record<string, { dx: number; dy: number }>;
  applyGroupDragAt(newAnchorX: number, newAnchorY: number): void;
  cryptoRandomInt(len: number): number;
  onMouseWheelClick(event: MouseLikeEvent): void;
  drawCardAt(x: number, y: number): void;
  drawCardAtContent(contentX: number, contentY: number): void;
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
  setTextLabelFixedWidthToggle(id: string, enabled: boolean): void;
  applyFontProfileToLabel(textId: string, profileId: string): void;
  syncLabelsToFontProfile(profileId: string): void;
  clearFontProfileFromLabel(textId: string): void;
  getFontProfileTitleForLabel(textId: string): string;
  deleteCard(cardId: string): void;
  deleteSelectedCards(): void;
  rotateCard(cardId: string, direction: 'clockwise' | 'counter-clockwise' | '180'): void;
  onContextMenu(event: MouseLikeEvent): void;
  getContextMenuScreenPosition(): { x: number; y: number };
  closeContextMenu(): void;
  editTextLabelFromContextMenu(): void;
  drawCardAtContextMenu(): void;
  addTextAtContextMenu(): void;
  toggleCanvasOverlaysFromContextMenu(): void;
  handleContextMenuTouchDismiss(ev: TouchEvent): void;
  openDrawByNameAt(screenX: number, screenY: number): void;
  openDrawByNameFromContextMenu(): void;
  onDrawByNameQueryInput(value: string): void;
  moveDrawByNameHighlight(delta: 1 | -1): void;
  onDrawByNameKeydown(event: KeyboardEvent): void;
  confirmDrawByNameSelection(card?: TarotCard): void;
  cancelDrawByName(): void;

  runStartupStorageWarningCheck(): Promise<void>;
  dismissStorageWarning(): void;
  openStorageAdditionalInfo(): void;
  closeStorageAdditionalInfo(): void;
  exportFromStorageWarning(): void;

  correspondenceCountBarCollapsed: boolean;
  correspondenceBarEntries: CorrespondenceCanvasCountEntry[];
  _correspondenceBarRefreshGen: number;
  _correspondenceDisplaysHydrateGen: number;
  showCorrespondenceOnCanvas(): boolean;
  showCorrespondenceThumbnailsOnCanvas(): boolean;
  hydrateCanvasCardCorrespondenceDisplays(): Promise<void>;
  onCorrespondencesChanged(): Promise<void>;
  refreshCorrespondenceCountBar(): Promise<void>;

  cardCountBarCollapsed: boolean;
  cardCountBarEntries: CardCanvasCountEntry[];
  refreshCardCountBar(): void;

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
};

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
  /** Ids of correspondence library entries assigned to this card (local decks). */
  correspondence_ids?: readonly string[];
  /** Resolved correspondence icons for canvas display (thumbnail or letter placeholder). */
  correspondenceDisplays?: readonly CorrespondenceDisplay[];
}

export interface DraggableCard {
  card: TarotCard;
  id: string;
  x: number;
  y: number;
  /** Card image rotation in degrees (0, 90, 180, 270, …). */
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
  fixedWidth: boolean;
  /** Persisted even when fixedWidth is false so toggling restores the last width. */
  fixedWidthPx: number;
  /** App-wide font profile assigned to this label, or null if none. */
  fontProfileId: string | null;
}
