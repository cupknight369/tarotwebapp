import Alpine from 'alpinejs';
import type { MergedThis, TarotCard } from '../types/canvas.js';
import type { ReadingGroupSection, SavedReadingState } from '../types/readingState.js';
import type { LocalReadingGroupRow } from '../types/localDb.js';
import { DEFAULT_READING_GROUP_ID } from '../types/localDb.js';
import type { DialogStoreState } from '../types/dialog.js';
import * as localReadingsLib from '../lib/localReadings.js';
import { getCardsByIds } from '../lib/decks.js';
import { logError } from '../lib/logError.js';
import { showQueryFailureDialog } from '../lib/queryFailureUi.js';
import { getCardImageRow, getLocalCardsByIds } from '../lib/localDecks.js';
import { revokeTarotCardBlobUrls } from '../lib/cardBlobUrls.js';
import { readingGroupCreateSchema } from '../validation/readings.js';
import { zodFirstIssue } from '../validation/zodErrors.js';

/** Opens the global confirm dialog for a failed reading save. */
function openSaveFailureDialog(message: string): void {
  Alpine.store('dialog', {
    open: true,
    type: 'confirm',
    title: message,
    confirmLabel: 'OK',
    cancelLabelVisible: false,
    onConfirm: () => {},
    onCancel: () => {},
  });
}

/**
 * @param query - Raw search string from the load modal (title-only match).
 * @param name - Stored reading name; empty/whitespace uses the same label as the UI.
 * @returns True when `query` is empty/whitespace or when the display title contains the trimmed
 *   query, case-insensitively.
 */
function savedReadingTitleMatchesSearch(query: string, name: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  const displayTitle = name.trim() === '' ? 'Untitled Reading' : name;
  return displayTitle.toLowerCase().includes(q);
}

/**
 * @param query - Raw search string from the load modal.
 * @param section - Reading group and its items.
 * @returns Filtered section when group title or reading title matches; empty items otherwise.
 */
function filterReadingSectionBySearch(
  query: string,
  section: ReadingGroupSection,
): ReadingGroupSection {
  const raw = query.trim();
  if (raw === '') return section;
  const q = raw.toLowerCase();
  if (section.group.title.toLowerCase().includes(q)) return section;
  const items = section.items.filter((item) => savedReadingTitleMatchesSearch(query, item.name));
  return { group: section.group, items };
}

Alpine.data('stateComponent', () => ({
  dirty: false,
  loadedReadingId: null as string | null,
  loadModalOpen: false,
  loadModalConfirmingForId: null as string | null,
  loadModalEditingReadingId: null as string | null,
  loadModalEditingTitle: '',
  loadModalSearchQuery: '',
  localSavedReadings: [] as { id: string; name: string; updated_at: string; group_id: string }[],
  loadModalGroupedSections: [] as ReadingGroupSection[],
  loadModalReadingGroups: [] as LocalReadingGroupRow[],
  loadModalCollapsedGroupIds: {} as Record<string, boolean>,
  loadModalNewGroupTitle: '',
  loadModalRenamingGroupId: null as string | null,
  loadModalRenameGroupTitle: '',
  loadModalGroupError: null as string | null,
  loadModalReadingsPending: false,
  saveAndLoadTargetId: null as string | null,
  readingSaveFlashVisible: false,
  _readingSaveFlashTimer: null as ReturnType<typeof setTimeout> | null,
  _ctrlDLastDrawAtMs: null as number | null,

  showReadingSaveFlash(this: MergedThis): void {
    if (this._readingSaveFlashTimer !== null) {
      clearTimeout(this._readingSaveFlashTimer);
      this._readingSaveFlashTimer = null;
    }
    this.readingSaveFlashVisible = true;
    this._readingSaveFlashTimer = setTimeout(() => {
      this.readingSaveFlashVisible = false;
      this._readingSaveFlashTimer = null;
    }, 2200);
  },

  async serializeState(this: MergedThis): Promise<SavedReadingState> {
    const ids = this.draggableCards.map((c) => c.card.id);
    const localMap = await getLocalCardsByIds(ids);
    const cards = await Promise.all(
      this.draggableCards.map(async (dc) => {
        const row: SavedReadingState['cards'][number] = {
          id: dc.id,
          deck_id: dc.card.deckId,
          card_id: dc.card.id,
          deck_title: dc.card.deckTitle,
          card_title: dc.card.title,
          image_source: dc.card.imageSourceLabel,
          censor_image_source: dc.card.censorImageSourceLabel ?? null,
          x: dc.x,
          y: dc.y,
          rotation: dc.rotation,
          zIndex: dc.zIndex,
          opacity: dc.opacity,
          card_number: dc.card.num,
        };
        const localRow = localMap.get(dc.card.id);
        if (!localRow) return row;

        const main = await getCardImageRow(localRow.imageBlobId);
        if (main?.blob) {
          row.image_created_at = main.created_at;
          const mt = main.mimeType ?? main.blob.type;
          if (mt) row.mime_type = mt;
          row.data = new Uint8Array(await main.blob.arrayBuffer());
        }

        if (localRow.censorImageBlobId) {
          const cen = await getCardImageRow(localRow.censorImageBlobId);
          if (cen?.blob) {
            const ct = cen.mimeType ?? cen.blob.type;
            if (ct) row.censored_mime_type = ct;
            row.censored_data = new Uint8Array(await cen.blob.arrayBuffer());
          }
        }
        return row;
      }),
    );

    return {
      viewport: {
        scale: this.scale,
        offsetX: this.offsetX,
        offsetY: this.offsetY,
      },
      cards,
      textLabels: this.textLabels.map((l) => ({
        id: l.id,
        text: l.text,
        x: l.x,
        y: l.y,
        fontSize: l.fontSize,
        fontWeight: l.fontWeight,
        fontStyle: l.fontStyle,
        textDecoration: l.textDecoration,
        color: l.color,
        zIndex: l.zIndex,
        anchorCardId: l.anchorCardId,
        anchorPosition: l.anchorPosition,
        fixedWidth: l.fixedWidth,
        fixedWidthPx: l.fixedWidthPx,
      })),
    };
  },

  async deserializeState(this: MergedThis, state: SavedReadingState): Promise<void> {
    const ids = state.cards.map((c) => c.card_id);
    const cardMapRes = await getCardsByIds(ids);
    if (!cardMapRes.ok) {
      logError('stateComponent.deserializeState.getCardsByIds', cardMapRes.error);
      showQueryFailureDialog(cardMapRes.error);
      return;
    }
    const cardMap = cardMapRes.value;

    for (const dc of this.draggableCards) {
      revokeTarotCardBlobUrls(dc.card);
    }

    this.draggableCards = state.cards.map((c) => {
      const resolved = cardMap.get(c.card_id);
      const hasEmbeddedMain = c.data !== undefined && c.data.length > 0;

      let card: TarotCard;
      if (hasEmbeddedMain) {
        const mime = c.mime_type?.trim() ? c.mime_type : 'application/octet-stream';
        const mainBytes = new Uint8Array(c.data!);
        const img = URL.createObjectURL(new Blob([mainBytes], { type: mime }));
        let censoredImg: string | null = null;
        if (c.censored_data !== undefined && c.censored_data.length > 0) {
          const cm = c.censored_mime_type?.trim()
            ? c.censored_mime_type
            : 'application/octet-stream';
          const censorBytes = new Uint8Array(c.censored_data);
          censoredImg = URL.createObjectURL(new Blob([censorBytes], { type: cm }));
        }
        if (resolved) {
          card = {
            ...resolved,
            img,
            censoredImg: censoredImg ?? resolved.censoredImg ?? null,
            deckTitle: c.deck_title ?? resolved.deckTitle,
            title: c.card_title ?? resolved.title,
            num: c.card_number ?? resolved.num,
            imageSourceLabel: c.image_source ?? resolved.imageSourceLabel,
            censorImageSourceLabel:
              c.censor_image_source !== undefined
                ? c.censor_image_source
                : (resolved.censorImageSourceLabel ?? null),
            invalidReference: false,
          };
        } else {
          card = {
            id: c.card_id,
            deckId: c.deck_id,
            title: c.card_title ?? 'Card',
            num: c.card_number ?? 0,
            img,
            censoredImg,
            invalidReference: false,
            deckTitle: c.deck_title,
            imageSourceLabel: c.image_source,
            censorImageSourceLabel: c.censor_image_source ?? null,
          };
        }
      } else if (resolved) {
        card = {
          ...resolved,
          deckTitle: c.deck_title ?? resolved.deckTitle,
          title: c.card_title ?? resolved.title,
          num: c.card_number ?? resolved.num,
          imageSourceLabel: c.image_source ?? resolved.imageSourceLabel,
          censorImageSourceLabel:
            c.censor_image_source !== undefined
              ? c.censor_image_source
              : (resolved.censorImageSourceLabel ?? null),
        };
      } else {
        card = {
          id: c.card_id,
          deckId: c.deck_id,
          title: c.card_title ?? 'Card',
          num: c.card_number ?? 0,
          img: '',
          censoredImg: null,
          invalidReference: true,
          deckTitle: c.deck_title,
          imageSourceLabel: c.image_source,
          censorImageSourceLabel: c.censor_image_source ?? null,
        };
      }
      return {
        card,
        id: c.id,
        x: c.x,
        y: c.y,
        rotation: c.rotation,
        zIndex: c.zIndex,
        opacity: c.opacity,
        cursor: 'grab',
        display: 'block',
      };
    });
    this.textLabels = state.textLabels.map((l) => ({
      id: l.id,
      text: l.text,
      x: l.x,
      y: l.y,
      fontSize: l.fontSize,
      fontWeight: l.fontWeight,
      fontStyle: l.fontStyle,
      textDecoration: l.textDecoration,
      color: l.color,
      zIndex: l.zIndex,
      cursor: 'grab',
      display: 'block',
      anchorCardId: l.anchorCardId,
      anchorPosition: l.anchorPosition,
      fixedWidth: l.fixedWidth ?? false,
      fixedWidthPx: l.fixedWidthPx ?? 0,
    }));
    if (state.viewport) {
      this.scale = state.viewport.scale;
      this.offsetX = state.viewport.offsetX;
      this.offsetY = state.viewport.offsetY;
    }
    this.maxZIndex = Math.max(0, ...this.draggableCards.map((c) => c.zIndex));
    this.maxTextZIndex = Math.max(0, ...this.textLabels.map((l) => l.zIndex));
    this.selectedCardIds = [];
    this.editingTextId = null;
    this.dirty = false;
  },

  async createNewReading(this: MergedThis): Promise<void> {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: 'Create a new reading?',
        confirmLabel: 'Yes',
        cancelLabel: 'Cancel',
        cancelLabelVisible: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

    if (!confirmed) return;

    if (this.loadedReadingId) {
      const confirmSave = await new Promise<boolean>((resolve) => {
        Alpine.store('dialog', {
          open: true,
          type: 'confirm',
          title: 'Save current reading?',
          confirmLabel: 'Yes',
          cancelLabel: 'No',
          cancelLabelVisible: true,
          onConfirm: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (confirmSave) {
        const result = await this.saveCurrentReading();
        if (!result.ok) {
          openSaveFailureDialog(result.error ?? 'Could not save reading.');
          return;
        }
        this.showReadingSaveFlash();
      }
    } else if (this.dirty) {
      Alpine.store('dialog', {
        open: true,
        type: 'inputText',
        title: 'Save current reading before creating a new one?',
        inputPlaceholder: 'Enter a title...',
        cancelLabelVisible: true,
        confirmLabel: 'Save',
        cancelLabel: "Don't Save",
        inputDefault: '',
        onSubmitText: (title: string) => {
          void this.saveCurrentReading(title).then((result) => {
            if (!result.ok) {
              openSaveFailureDialog(result.error ?? 'Could not save reading.');
              return;
            }
            this.showReadingSaveFlash();
          });
        },
        onCancel: () => {},
      });
    }

    this.shuffleDeck();
    this.clearCanvas();
    this.loadedReadingId = null;
    this.dirty = false;
  },

  async saveCurrentReading(
    this: MergedThis,
    name?: string,
  ): Promise<{ ok: boolean; error?: string }> {
    const state = await this.serializeState();
    if (this.loadedReadingId) {
      const result = await localReadingsLib.saveLocalReading(
        state,
        undefined,
        this.loadedReadingId,
      );
      if ('error' in result) return { ok: false, error: result.error };
      this.dirty = false;
      return { ok: true };
    }
    const result = await localReadingsLib.saveLocalReading(state, name ?? 'Untitled Reading');
    if ('error' in result) return { ok: false, error: result.error };
    this.loadedReadingId = result.id;
    this.dirty = false;
    return { ok: true };
  },

  async loadReadingById(this: MergedThis, id: string): Promise<void> {
    const data = await localReadingsLib.loadLocalReading(id);
    if (!data) return;
    await this.deserializeState(data.state);
    this.loadedReadingId = id;
  },

  async openLoadModal(this: MergedThis): Promise<void> {
    this.loadModalEditingReadingId = null;
    this.loadModalEditingTitle = '';
    this.loadModalSearchQuery = '';
    this.loadModalOpen = true;
    this.loadModalConfirmingForId = null;
    this.loadModalGroupError = null;
    await this.refreshLoadModalReadings();
  },

  async refreshLoadModalReadings(this: MergedThis): Promise<void> {
    this.loadModalReadingsPending = true;
    try {
      const sections = await localReadingsLib.listReadingsGrouped();
      this.loadModalGroupedSections = sections;
      this.loadModalReadingGroups = sections.map((section) => section.group);
      this.localSavedReadings = sections.flatMap((s) => s.items);
      this.loadModalGroupError = null;
    } catch (e) {
      logError('stateComponent.refreshLoadModalReadings', e);
      this.loadModalGroupError = 'Could not load saved readings.';
      const fallback = await localReadingsLib.listLocalReadings();
      this.loadModalGroupedSections = [
        {
          group: { id: DEFAULT_READING_GROUP_ID, title: 'Default' },
          items: fallback,
        },
      ];
      this.loadModalReadingGroups = [{ id: DEFAULT_READING_GROUP_ID, title: 'Default' }];
      this.localSavedReadings = fallback;
    } finally {
      this.loadModalReadingsPending = false;
    }
  },

  filteredLoadModalGroupedSections(this: MergedThis): ReadingGroupSection[] {
    return this.loadModalGroupedSections
      .map((sec) => filterReadingSectionBySearch(this.loadModalSearchQuery, sec))
      .filter((sec) => sec.items.length > 0 || this.loadModalSearchQuery.trim() === '');
  },

  filteredLoadModalReadings(this: MergedThis): {
    id: string;
    name: string;
    updated_at: string;
    group_id: string;
  }[] {
    return this.localSavedReadings.filter((r) =>
      savedReadingTitleMatchesSearch(this.loadModalSearchQuery, r.name),
    );
  },

  isLoadModalGroupCollapsed(this: MergedThis, groupId: string): boolean {
    return this.loadModalCollapsedGroupIds[groupId] === true;
  },

  toggleLoadModalGroupCollapsed(this: MergedThis, groupId: string): void {
    const collapsed = this.isLoadModalGroupCollapsed(groupId);
    this.loadModalCollapsedGroupIds = {
      ...this.loadModalCollapsedGroupIds,
      [groupId]: !collapsed,
    };
  },

  async addLoadModalGroup(this: MergedThis): Promise<void> {
    const parsed = readingGroupCreateSchema.safeParse({ title: this.loadModalNewGroupTitle });
    if (!parsed.success) {
      this.loadModalGroupError = zodFirstIssue(parsed.error);
      return;
    }
    this.loadModalGroupError = null;
    try {
      await localReadingsLib.createReadingGroup(parsed.data.title);
      this.loadModalNewGroupTitle = '';
      await this.refreshLoadModalReadings();
    } catch (e) {
      this.loadModalGroupError = e instanceof Error ? e.message : 'Could not create group';
      logError('stateComponent.addLoadModalGroup', e);
    }
  },

  startRenameLoadModalGroup(this: MergedThis, g: LocalReadingGroupRow): void {
    this.loadModalRenamingGroupId = g.id;
    this.loadModalRenameGroupTitle = g.title;
    this.loadModalGroupError = null;
  },

  cancelRenameLoadModalGroup(this: MergedThis): void {
    this.loadModalRenamingGroupId = null;
    this.loadModalRenameGroupTitle = '';
  },

  async saveRenameLoadModalGroup(this: MergedThis): Promise<void> {
    if (!this.loadModalRenamingGroupId) return;
    const parsed = readingGroupCreateSchema.safeParse({ title: this.loadModalRenameGroupTitle });
    if (!parsed.success) {
      this.loadModalGroupError = zodFirstIssue(parsed.error);
      return;
    }
    this.loadModalGroupError = null;
    try {
      await localReadingsLib.putReadingGroup({
        id: this.loadModalRenamingGroupId,
        title: parsed.data.title,
      });
      this.cancelRenameLoadModalGroup();
      await this.refreshLoadModalReadings();
    } catch (e) {
      this.loadModalGroupError = e instanceof Error ? e.message : 'Rename failed';
      logError('stateComponent.saveRenameLoadModalGroup', e);
    }
  },

  async confirmDeleteLoadModalGroup(this: MergedThis, g: LocalReadingGroupRow): Promise<void> {
    if (g.id === DEFAULT_READING_GROUP_ID) return;
    const ok = await new Promise<boolean>((resolve) => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: `Delete group “${g.title}”? Readings move to Default.`,
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        cancelLabelVisible: true,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!ok) return;
    this.loadModalGroupError = null;
    try {
      await localReadingsLib.deleteReadingGroup(g.id);
      await this.refreshLoadModalReadings();
    } catch (e) {
      this.loadModalGroupError = e instanceof Error ? e.message : 'Delete failed';
      logError('stateComponent.confirmDeleteLoadModalGroup', e);
    }
  },

  async assignReadingGroup(this: MergedThis, readingId: string, groupId: string): Promise<void> {
    const result = await localReadingsLib.assignReadingToGroup(readingId, groupId);
    if (result.error) {
      this.loadModalGroupError = result.error;
      return;
    }
    this.loadModalGroupError = null;
    await this.refreshLoadModalReadings();
  },

  closeLoadModal(this: MergedThis): void {
    this.loadModalOpen = false;
    this.loadModalConfirmingForId = null;
    this.loadModalEditingReadingId = null;
    this.loadModalEditingTitle = '';
  },

  async onSelectReadingToLoad(this: MergedThis, id: string): Promise<void> {
    if (this.dirty) {
      this.loadModalConfirmingForId = id;
      return;
    }
    await this.loadReadingById(id);
    this.closeLoadModal();
  },

  async saveAndLoad(this: MergedThis, id: string): Promise<void> {
    if (this.loadedReadingId) {
      const result = await this.saveCurrentReading();
      if (!result.ok) {
        openSaveFailureDialog(result.error ?? 'Could not save reading.');
        return;
      }
      this.showReadingSaveFlash();
      await this.loadReadingById(id);
      this.closeLoadModal();
      return;
    }
    this.saveAndLoadTargetId = id;
    this.triggerTitleDialog();
  },

  handleSaveClick(this: MergedThis): void {
    if (this.loadedReadingId) {
      void this.saveCurrentReading().then((result) => {
        if (result.ok) {
          this.showReadingSaveFlash();
        } else {
          openSaveFailureDialog(result.error ?? 'Could not save reading.');
        }
      });

      return;
    }

    this.triggerTitleDialog();
  },

  handleSaveShortcut(this: MergedThis, event: KeyboardEvent): void {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    event.preventDefault();
    this.handleSaveClick();
  },

  handleDrawCardShortcut(this: MergedThis, event: KeyboardEvent): void {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    if (event.repeat && this._ctrlDLastDrawAtMs !== null) {
      const elapsed = Date.now() - this._ctrlDLastDrawAtMs;
      if (elapsed < 1000) {
        event.preventDefault();
        return;
      }
    }
    event.preventDefault();
    const canvas = window.draggableZoneComponent;
    if (!canvas) {
      return;
    }
    if (canvas.contextMenu.open) {
      canvas.drawCardAt(canvas.contextMenu.x, canvas.contextMenu.y);
      this._ctrlDLastDrawAtMs = Date.now();
      return;
    }
    if (canvas.lastPointerScreenX !== null && canvas.lastPointerScreenY !== null) {
      canvas.drawCardAt(canvas.lastPointerScreenX, canvas.lastPointerScreenY);
      this._ctrlDLastDrawAtMs = Date.now();
      return;
    }
    if (!canvas.viewport) {
      return;
    }
    const rect = canvas.viewport.getBoundingClientRect();
    canvas.drawCardAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
    this._ctrlDLastDrawAtMs = Date.now();
  },

  handleDrawByNameShortcut(this: MergedThis, event: KeyboardEvent): void {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    event.preventDefault();
    const canvas = window.draggableZoneComponent;
    if (!canvas) {
      return;
    }
    if (canvas.contextMenu.open) {
      canvas.openDrawByNameFromContextMenu();
      return;
    }
    if (canvas.lastPointerScreenX !== null && canvas.lastPointerScreenY !== null) {
      canvas.openDrawByNameAt(canvas.lastPointerScreenX, canvas.lastPointerScreenY);
      return;
    }
    if (!canvas.viewport) {
      return;
    }
    const rect = canvas.viewport.getBoundingClientRect();
    canvas.openDrawByNameAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
  },

  handleAddTextShortcut(this: MergedThis, event: KeyboardEvent): void {
    const target = event.target;
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return;
    }
    event.preventDefault();
    const canvas = window.draggableZoneComponent;
    if (!canvas) {
      return;
    }
    if (canvas.contextMenu.open) {
      canvas.addTextAt(canvas.contextMenu.x, canvas.contextMenu.y);
      return;
    }
    if (canvas.lastPointerScreenX !== null && canvas.lastPointerScreenY !== null) {
      canvas.addTextAt(canvas.lastPointerScreenX, canvas.lastPointerScreenY);
      return;
    }
    if (!canvas.viewport) {
      return;
    }
    const rect = canvas.viewport.getBoundingClientRect();
    canvas.addTextAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
  },

  handleEscapeShortcut(this: MergedThis, event: KeyboardEvent): void {
    const dialogStore = Alpine.store('dialog') as DialogStoreState | undefined;
    if (dialogStore?.open) {
      event.preventDefault();
      dialogStore.onCancel?.();
      dialogStore.open = false;
      return;
    }

    const settingsStore = Alpine.store('settings') as { open?: boolean } | undefined;
    if (settingsStore?.open) {
      event.preventDefault();
      settingsStore.open = false;
      return;
    }

    const canvas = window.draggableZoneComponent;
    if (canvas?.deckModalOpen) {
      event.preventDefault();
      canvas.closeDeckModal();
      return;
    }

    if (canvas?.storageAdditionalInfoOpen) {
      event.preventDefault();
      canvas.closeStorageAdditionalInfo();
      return;
    }

    if (this.loadModalEditingReadingId) {
      event.preventDefault();
      this.cancelLoadModalTitleEdit();
      return;
    }

    if (this.loadModalOpen) {
      event.preventDefault();
      this.closeLoadModal();
      return;
    }
  },

  triggerTitleDialog(this: MergedThis): void {
    Alpine.store('dialog', {
      open: true,
      type: 'inputText',
      title: 'Name your reading (this device)',
      inputPlaceholder: 'Enter a title...',
      confirmLabel: 'Save',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      inputDefault: '',
      onSubmitText: (title: string) => {
        void this.saveCurrentReading(title).then(async (result) => {
          const targetId = this.saveAndLoadTargetId;
          this.saveAndLoadTargetId = null;
          if (!result.ok) {
            openSaveFailureDialog(result.error ?? 'Could not save reading.');
            return;
          }
          this.showReadingSaveFlash();
          if (targetId) {
            await this.loadReadingById(targetId);
            this.closeLoadModal();
          }
        });
      },
      onCancel: () => {
        this.saveAndLoadTargetId = null;
      },
    });
  },

  async discardAndLoad(this: MergedThis, id: string): Promise<void> {
    await this.loadReadingById(id);
    this.closeLoadModal();
  },

  cancelLoadConfirm(this: MergedThis): void {
    this.loadModalConfirmingForId = null;
    this.loadModalEditingReadingId = null;
    this.loadModalEditingTitle = '';
  },

  startLoadModalTitleEdit(this: MergedThis, reading: { id: string; name: string }): void {
    this.loadModalEditingReadingId = reading.id;
    this.loadModalEditingTitle = reading.name ?? '';
  },

  async commitLoadModalTitleEdit(this: MergedThis): Promise<void> {
    const id = this.loadModalEditingReadingId;
    if (!id) return;
    const trimmed = this.loadModalEditingTitle.trim();
    if (trimmed.length === 0) return;
    const result = await localReadingsLib.renameLocalReading(id, trimmed);
    if ('error' in result) {
      openSaveFailureDialog(result.error);
      return;
    }
    await this.refreshLoadModalReadings();
    this.loadModalEditingReadingId = null;
    this.loadModalEditingTitle = '';
  },

  cancelLoadModalTitleEdit(this: MergedThis): void {
    this.loadModalEditingReadingId = null;
    this.loadModalEditingTitle = '';
  },

  async deleteReading(this: MergedThis, id: string): Promise<void> {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: 'Delete this saved reading?',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;
    await localReadingsLib.deleteLocalReading(id);
    await this.refreshLoadModalReadings();
    if (this.loadModalEditingReadingId === id) {
      this.loadModalEditingReadingId = null;
      this.loadModalEditingTitle = '';
    }
    if (this.loadedReadingId === id) {
      this.loadedReadingId = null;
    }
  },
}));
