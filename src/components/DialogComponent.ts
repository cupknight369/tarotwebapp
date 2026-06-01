import Alpine from 'alpinejs';
import { DialogStoreState } from '../types/dialog.js';
import { dialogBoundedIntSchema, readingTitleSchema } from '../validation/dialog.js';
import { zodFirstIssue } from '../validation/zodErrors.js';
import { numericInputStepDelta, stepBoundedIntegerString } from '../lib/numericInput.js';

const DEFAULT_DIALOG_STATE: DialogStoreState = {
  open: false,
  type: 'confirm',
  title: '',
  confirmLabel: 'Yes',
  cancelLabel: 'Cancel',
  cancelLabelVisible: true,
  onConfirm: undefined,
  onCancel: undefined,
  inputLabel: undefined,
  inputPlaceholder: undefined,
  inputMin: undefined,
  inputMax: undefined,
  inputDefault: undefined,
  onSubmit: undefined,
  onSubmitText: undefined,
};

Alpine.data('dialogComponent', () => ({
  inputValue: '' as string,
  inputError: '' as string,

  get store(): DialogStoreState {
    return Alpine.store('dialog') as DialogStoreState;
  },

  init() {
    if (Alpine.store('dialog') === undefined) {
      Alpine.store('dialog', { ...DEFAULT_DIALOG_STATE });
    }
  },

  close() {
    const d = this.store;
    if (d) {
      d.open = false;
    }
  },

  /** Handler snapshot used to skip close when a new dialog replaced this one. */
  snapshotDialogHandlers(d: DialogStoreState | undefined) {
    return {
      onConfirm: d?.onConfirm,
      onCancel: d?.onCancel,
      onSubmit: d?.onSubmit,
      onSubmitText: d?.onSubmitText,
    };
  },

  /** Closes after the current click unless the dialog store was replaced (e.g. chained prompts). */
  scheduleClose(snap = this.snapshotDialogHandlers(this.store)) {
    queueMicrotask(() => {
      const d = this.store;
      if (!d?.open) return;
      const current = this.snapshotDialogHandlers(d);
      if (
        current.onConfirm === snap.onConfirm &&
        current.onCancel === snap.onCancel &&
        current.onSubmit === snap.onSubmit &&
        current.onSubmitText === snap.onSubmitText
      ) {
        this.close();
      }
    });
  },

  handleConfirm() {
    const d = this.store;
    const snap = this.snapshotDialogHandlers(d);
    if (d?.onConfirm) d.onConfirm();
    this.scheduleClose(snap);
  },

  handleCancel() {
    const d = this.store;
    const snap = this.snapshotDialogHandlers(d);
    if (d?.onCancel) d.onCancel();
    this.scheduleClose(snap);
  },

  handleInputSubmit() {
    const d = this.store;
    const snap = this.snapshotDialogHandlers(d);
    const min = d?.inputMin ?? 0;
    const max = d?.inputMax ?? 10;
    const parsed = dialogBoundedIntSchema(min, max).safeParse(this.inputValue);
    if (!parsed.success) {
      this.inputError = zodFirstIssue(parsed.error);
      return;
    }
    this.inputError = '';
    if (d?.onSubmit) d.onSubmit(parsed.data);
    this.scheduleClose(snap);
  },

  handleInputTextSubmit() {
    const d = this.store;
    const snap = this.snapshotDialogHandlers(d);
    const parsed = readingTitleSchema.safeParse(this.inputValue ?? '');
    if (!parsed.success) {
      this.inputError = zodFirstIssue(parsed.error);
      return;
    }
    this.inputError = '';
    if (d?.onSubmitText) d.onSubmitText(parsed.data);
    this.scheduleClose(snap);
  },

  initInputValue() {
    const d = this.store;
    this.inputError = '';
    this.inputValue = d?.inputDefault ?? '1';
  },

  initInputTextValue() {
    const d = this.store;
    this.inputError = '';
    this.inputValue = d?.inputDefault ?? '';
  },

  focusConfirmButton(this: {
    $refs: Record<string, HTMLElement>;
    $nextTick: (cb?: () => void) => void;
  }) {
    this.$nextTick(() => {
      const el = this.$refs.confirmButton as HTMLButtonElement | undefined;
      el?.focus();
    });
  },

  handleInputValueKeydown(e: KeyboardEvent) {
    const delta = numericInputStepDelta(e.key);
    if (delta === null) return;
    e.preventDefault();
    const d = this.store;
    const min = d?.inputMin ?? 0;
    const max = d?.inputMax ?? 10;
    this.inputValue = stepBoundedIntegerString(this.inputValue, delta, min, max, min);
  },
}));
