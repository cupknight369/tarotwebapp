import Alpine from 'alpinejs'
import type { MergedThis } from '../types/canvas.js'
import type { SavedReadingState } from '../types/readingState.js';
import * as readingsLib from '../lib/readings.js'
import { getCardsByIds } from '../lib/decks.js'

Alpine.data('stateComponent', () => ({
  dirty: false,
  loadedReadingId: null as string | null,
  loadModalOpen: false,
  loadModalConfirmingForId: null as string | null,
  savedReadings: [] as { id: string; name: string; updated_at: string }[],
  saveAndLoadTargetId: null as string | null,

  serializeState(this: MergedThis): SavedReadingState {
    return {
      viewport: { scale: this.scale, offsetX: this.offsetX, offsetY: this.offsetY },
      cards: this.draggableCards.map(c => ({
        id: c.id,
        deck_id: c.card.deckId,
        card_id: c.card.id,
        x: c.x,
        y: c.y,
        rotation: c.rotation,
        zIndex: c.zIndex,
        opacity: c.opacity,
      })),
      textLabels: this.textLabels.map(l => ({
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
    const ids = state.cards.map((c) => c.card_id)
    const cardMap = await getCardsByIds(ids)
    this.draggableCards = state.cards.map((c) => {
      const card = cardMap.get(c.card_id)
      if (!card) {
        throw new Error(`Saved reading references unknown card: ${c.card_id}`)
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
      }
    })
    this.textLabels = state.textLabels.map(l => ({
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
    this.maxZIndex = Math.max(0, ...this.draggableCards.map(c => c.zIndex));
    this.maxTextZIndex = Math.max(0, ...this.textLabels.map(l => l.zIndex));
    this.selectedCardIds = [];
    this.editingTextId = null;
    this.dirty = false;
  },

  async createNewReading(this: MergedThis): Promise<void> {
    const confirmed = await new Promise<boolean>(resolve => {
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
      const confirmSave = await new Promise<boolean>(resolve => {
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
          Alpine.store('dialog', { open: true, type: 'confirm', title: result.error ?? 'Failed to save', onConfirm: () => {}, onCancel: () => {} });
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
        cancelLabel: 'Don\'t Save',
        inputDefault: '',
        onSubmitText: (title: string) => {
          this.saveCurrentReading(title).then(async result => {
            if (!result.ok) {
              Alpine.store('dialog', 
                { open: true, type: 'confirm', title: result.error ?? 'Failed to save', cancelLabelVisible: false, onConfirm: () => {}, onCancel: () => {} });
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

  async saveCurrentReading(this: MergedThis, name?: string): Promise<{ ok: boolean; error?: string }> {
    if (this.loadedReadingId) {
      const result = await readingsLib.saveReading(this.serializeState(), undefined, this.loadedReadingId);
      if ('error' in result) return { ok: false, error: result.error };
      this.dirty = false;
      return { ok: true };
    }
    const limit = await readingsLib.getSavedStateLimit();
    const count = await readingsLib.getReadingsCount();
    if (count >= limit) {
      return { ok: false, error: `You've reached the limit of ${limit} saved readings` };
    }
    const result = await readingsLib.saveReading(this.serializeState(), name ?? 'Untitled Reading');
    if ('error' in result) return { ok: false, error: result.error };
    this.loadedReadingId = result.id;
    this.dirty = false;
    return { ok: true };
  },

  async loadReadingById(this: MergedThis, id: string): Promise<void> {
    const data = await readingsLib.loadReading(id);
    if (!data) return;
    await this.deserializeState(data.state);
    this.loadedReadingId = id;
  },

  async openLoadModal(): Promise<void> {
    this.loadModalOpen = true;
    this.loadModalConfirmingForId = null;
    this.savedReadings = await readingsLib.listReadings();
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
        Alpine.store('dialog', { open: true, type: 'confirm', title: result.error ?? 'Failed to save', onConfirm: () => {}, onCancel: () => {} });
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
      this.saveCurrentReading().then(result => {
        result.ok 
        ? Alpine.store('dialog', { open: true, type: 'confirm', title: 'Reading Saved Successfully', confirmLabel: 'Ok', cancelLabelVisible: false, onConfirm: () => {} })
        : Alpine.store('dialog', { open: true, type: 'confirm', title: result.error ?? 'Failed to save', confirmLabel: 'Ok', cancelLabelVisible: false, onConfirm: () => {} });
      });

      return;
    }

    this.triggerTitleDialog();
  },

  triggerTitleDialog(this: MergedThis): void {
    Alpine.store('dialog', {
      open: true,
      type: 'inputText',
      title: 'Name your reading',
      inputPlaceholder: 'Enter a title...',
      confirmLabel: 'Save',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      inputDefault: '',
      onSubmitText: (title: string) => {
        this.saveCurrentReading(title).then(async result => {
          const targetId = this.saveAndLoadTargetId;
          this.saveAndLoadTargetId = null;
          if (!result.ok) {
            Alpine.store('dialog', 
              { open: true, type: 'confirm', title: result.error ?? 'Failed to save', cancelLabelVisible: false, onConfirm: () => {}, onCancel: () => {} });
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

  async deleteReading(id: string): Promise<void> {
    const confirmed = await new Promise<boolean>(resolve => {
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
    await readingsLib.deleteReading(id);
    this.savedReadings = this.savedReadings.filter(r => r.id !== id);
    if (this.loadedReadingId === id) {
      this.loadedReadingId = null;
    }
  },
}));
