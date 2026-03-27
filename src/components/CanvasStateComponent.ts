import Alpine from 'alpinejs'
import type { MergedThis } from '../types/canvas.js'
import type { SavedReadingState } from '../types/readingState.js'
import * as readingsLib from '../lib/readings.js'
import * as localReadingsLib from '../lib/localReadings.js'
import { getCardsByIds } from '../lib/decks.js'

Alpine.data('stateComponent', () => ({
  dirty: false,
  loadedReadingId: null as string | null,
  loadedReadingScope: null as 'local' | 'cloud' | null,
  loadModalOpen: false,
  loadModalConfirmingForId: null as string | null,
  loadModalConfirmingScope: null as 'local' | 'cloud' | null,
  localSavedReadings: [] as { id: string; name: string; updated_at: string }[],
  cloudSavedReadings: [] as { id: string; name: string; updated_at: string }[],
  saveAndLoadTargetId: null as string | null,
  saveAndLoadTargetScope: null as 'local' | 'cloud' | null,

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
          this.saveCurrentReading(title, 'local').then(async result => {
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
    this.loadedReadingScope = null;
    this.dirty = false;
  },

  async saveCurrentReading(this: MergedThis, name?: string, target?: 'local' | 'cloud'): Promise<{ ok: boolean; error?: string }> {
    const auth = Alpine.store('auth') as { isEmailConfirmed: boolean }

    const effectiveTarget: 'local' | 'cloud' = this.loadedReadingId
      ? (this.loadedReadingScope ?? 'local')
      : (target ?? 'local')

    if (effectiveTarget === 'cloud') {
      if (!auth.isEmailConfirmed) {
        return { ok: false, error: 'Cloud save requires a verified email on your account.' }
      }
      if (this.loadedReadingId && this.loadedReadingScope === 'cloud') {
        const result = await readingsLib.saveReading(this.serializeState(), undefined, this.loadedReadingId);
        if ('error' in result) return { ok: false, error: result.error };
        this.dirty = false;
        return { ok: true };
      }
      const limit = await readingsLib.getSavedStateLimit();
      const count = await readingsLib.getReadingsCount();
      if (count >= limit) {
        return { ok: false, error: `You've reached the limit of ${limit} cloud saved readings` };
      }
      const result = await readingsLib.saveReading(this.serializeState(), name ?? 'Untitled Reading');
      if ('error' in result) return { ok: false, error: result.error };
      this.loadedReadingId = result.id;
      this.loadedReadingScope = 'cloud';
      this.dirty = false;
      return { ok: true };
    }

    if (this.loadedReadingId) {
      const result = await localReadingsLib.saveLocalReading(this.serializeState(), undefined, this.loadedReadingId);
      if ('error' in result) return { ok: false, error: result.error };
      this.dirty = false;
      return { ok: true };
    }
    const result = await localReadingsLib.saveLocalReading(this.serializeState(), name ?? 'Untitled Reading');
    if ('error' in result) return { ok: false, error: result.error };
    this.loadedReadingId = result.id;
    this.loadedReadingScope = 'local';
    this.dirty = false;
    return { ok: true };
  },

  async loadReadingById(this: MergedThis, scope: 'local' | 'cloud', id: string): Promise<void> {
    if (scope === 'cloud') {
      const data = await readingsLib.loadReading(id);
      if (!data) return;
      await this.deserializeState(data.state);
    } else {
      const data = await localReadingsLib.loadLocalReading(id);
      if (!data) return;
      await this.deserializeState(data.state);
    }
    this.loadedReadingId = id;
    this.loadedReadingScope = scope;
  },

  async openLoadModal(): Promise<void> {
    this.loadModalOpen = true;
    this.loadModalConfirmingForId = null;
    this.loadModalConfirmingScope = null;
    this.localSavedReadings = await localReadingsLib.listLocalReadings();
    const auth = Alpine.store('auth') as { isEmailConfirmed: boolean }
    this.cloudSavedReadings = auth.isEmailConfirmed ? await readingsLib.listReadings() : [];
  },

  closeLoadModal(): void {
    this.loadModalOpen = false;
    this.loadModalConfirmingForId = null;
    this.loadModalConfirmingScope = null;
  },

  async onSelectReadingToLoad(this: MergedThis, scope: 'local' | 'cloud', id: string): Promise<void> {
    if (this.dirty) {
      this.loadModalConfirmingForId = id;
      this.loadModalConfirmingScope = scope;
      return;
    }
    await this.loadReadingById(scope, id);
    this.closeLoadModal();
  },

  async saveAndLoad(this: MergedThis, scope: 'local' | 'cloud', id: string): Promise<void> {
    if (this.loadedReadingId) {
      const result = await this.saveCurrentReading();
      if (!result.ok) {
        Alpine.store('dialog', { open: true, type: 'confirm', title: result.error ?? 'Failed to save', onConfirm: () => {}, onCancel: () => {} });
        return;
      }
      await this.loadReadingById(scope, id);
      this.closeLoadModal();
      return;
    }
    this.saveAndLoadTargetId = id;
    this.saveAndLoadTargetScope = scope;
    this.triggerTitleDialog();
  },

  handleSaveClick(this: MergedThis): void {
    if (this.loadedReadingId) {
      this.saveCurrentReading().then(result => {
        const okTitle =
          this.loadedReadingScope === 'cloud'
            ? 'Reading saved (cloud)'
            : 'Reading saved (this device)'
        result.ok
          ? Alpine.store('dialog', { open: true, type: 'confirm', title: okTitle, confirmLabel: 'Ok', cancelLabelVisible: false, onConfirm: () => {} })
          : Alpine.store('dialog', { open: true, type: 'confirm', title: result.error ?? 'Failed to save', confirmLabel: 'Ok', cancelLabelVisible: false, onConfirm: () => {} });
      });

      return;
    }

    this.triggerTitleDialog();
  },

  handleSaveToCloudClick(this: MergedThis): void {
    const auth = Alpine.store('auth') as { isEmailConfirmed: boolean }
    if (!auth.isEmailConfirmed) {
      Alpine.store('dialog', {
        open: true,
        type: 'confirm',
        title: 'Cloud save requires a verified email.',
        confirmLabel: 'Ok',
        cancelLabelVisible: false,
        onConfirm: () => {},
      });
      return;
    }
    if (this.loadedReadingId && this.loadedReadingScope === 'cloud') {
      this.saveCurrentReading(undefined, 'cloud').then(result => {
        result.ok
          ? Alpine.store('dialog', { open: true, type: 'confirm', title: 'Reading saved to cloud', confirmLabel: 'Ok', cancelLabelVisible: false, onConfirm: () => {} })
          : Alpine.store('dialog', { open: true, type: 'confirm', title: result.error ?? 'Failed to save', confirmLabel: 'Ok', cancelLabelVisible: false, onConfirm: () => {} });
      });
      return;
    }
    Alpine.store('dialog', {
      open: true,
      type: 'inputText',
      title: 'Name your reading (cloud)',
      inputPlaceholder: 'Enter a title...',
      confirmLabel: 'Save to cloud',
      cancelLabel: 'Cancel',
      cancelLabelVisible: true,
      inputDefault: '',
      onSubmitText: (title: string) => {
        this.saveCurrentReading(title, 'cloud').then(result => {
          result.ok
            ? Alpine.store('dialog', { open: true, type: 'confirm', title: 'Reading saved to cloud', confirmLabel: 'Ok', cancelLabelVisible: false, onConfirm: () => {} })
            : Alpine.store('dialog', { open: true, type: 'confirm', title: result.error ?? 'Failed to save', confirmLabel: 'Ok', cancelLabelVisible: false, onConfirm: () => {} });
        });
      },
      onCancel: () => {},
    });
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
        this.saveCurrentReading(title, 'local').then(async result => {
          const targetId = this.saveAndLoadTargetId;
          const targetScope = this.saveAndLoadTargetScope;
          this.saveAndLoadTargetId = null;
          this.saveAndLoadTargetScope = null;
          if (!result.ok) {
            Alpine.store('dialog',
              { open: true, type: 'confirm', title: result.error ?? 'Failed to save', cancelLabelVisible: false, onConfirm: () => {}, onCancel: () => {} });
            return;
          }
          if (targetId && targetScope) {
            await this.loadReadingById(targetScope, targetId);
            this.closeLoadModal();
          }
        });
      },
      onCancel: () => {
        this.saveAndLoadTargetId = null;
        this.saveAndLoadTargetScope = null;
      },
    });
  },

  async discardAndLoad(this: MergedThis, scope: 'local' | 'cloud', id: string): Promise<void> {
    await this.loadReadingById(scope, id);
    this.closeLoadModal();
  },

  cancelLoadConfirm(): void {
    this.loadModalConfirmingForId = null;
    this.loadModalConfirmingScope = null;
  },

  async deleteReading(this: MergedThis, scope: 'local' | 'cloud', id: string): Promise<void> {
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
    if (scope === 'cloud') {
      await readingsLib.deleteReading(id);
      this.cloudSavedReadings = this.cloudSavedReadings.filter(r => r.id !== id);
    } else {
      await localReadingsLib.deleteLocalReading(id);
      this.localSavedReadings = this.localSavedReadings.filter(r => r.id !== id);
    }
    if (this.loadedReadingId === id && this.loadedReadingScope === scope) {
      this.loadedReadingId = null;
      this.loadedReadingScope = null;
    }
  },
}));
