import Alpine from 'alpinejs';
import type { MergedThis, TarotCard } from '../types/canvas.js';
import type { SavedReadingState } from '../types/readingState.js';
import * as localReadingsLib from '../lib/localReadings.js';
import { getCardsByIds } from '../lib/decks.js';
import { getCardImageRow, getLocalCardsByIds } from '../lib/localDecks.js';
import { revokeTarotCardBlobUrls } from '../lib/cardBlobUrls.js';

Alpine.data('stateComponent', () => ({
  dirty: false,
  loadedReadingId: null as string | null,
  loadModalOpen: false,
  loadModalConfirmingForId: null as string | null,
  localSavedReadings: [] as { id: string; name: string; updated_at: string }[],
  saveAndLoadTargetId: null as string | null,

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
      })),
    };
  },

  async deserializeState(this: MergedThis, state: SavedReadingState): Promise<void> {
    for (const dc of this.draggableCards) {
      revokeTarotCardBlobUrls(dc.card);
    }

    const ids = state.cards.map((c) => c.card_id);
    const cardMap = await getCardsByIds(ids);

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
          Alpine.store('dialog', {
            open: true,
            type: 'confirm',
            title: result.error ?? 'Failed to save',
            onConfirm: () => {},
            onCancel: () => {},
          });
          return;
        }
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
              Alpine.store('dialog', {
                open: true,
                type: 'confirm',
                title: result.error ?? 'Failed to save',
                cancelLabelVisible: false,
                onConfirm: () => {},
                onCancel: () => {},
              });
              return;
            }
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

  async openLoadModal(): Promise<void> {
    this.loadModalOpen = true;
    this.loadModalConfirmingForId = null;
    this.localSavedReadings = await localReadingsLib.listLocalReadings();
  },

  closeLoadModal(): void {
    this.loadModalOpen = false;
    this.loadModalConfirmingForId = null;
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
        Alpine.store('dialog', {
          open: true,
          type: 'confirm',
          title: result.error ?? 'Failed to save',
          onConfirm: () => {},
          onCancel: () => {},
        });
        return;
      }
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
        const okTitle = 'Reading saved (this device)';
        if (result.ok) {
          Alpine.store('dialog', {
            open: true,
            type: 'confirm',
            title: okTitle,
            confirmLabel: 'Ok',
            cancelLabelVisible: false,
            onConfirm: () => {},
          });
        } else {
          Alpine.store('dialog', {
            open: true,
            type: 'confirm',
            title: result.error ?? 'Failed to save',
            confirmLabel: 'Ok',
            cancelLabelVisible: false,
            onConfirm: () => {},
          });
        }
      });

      return;
    }

    this.triggerTitleDialog();
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
            Alpine.store('dialog', {
              open: true,
              type: 'confirm',
              title: result.error ?? 'Failed to save',
              cancelLabelVisible: false,
              onConfirm: () => {},
              onCancel: () => {},
            });
            return;
          }
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

  cancelLoadConfirm(): void {
    this.loadModalConfirmingForId = null;
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
    this.localSavedReadings = this.localSavedReadings.filter((r) => r.id !== id);
    if (this.loadedReadingId === id) {
      this.loadedReadingId = null;
    }
  },
}));
