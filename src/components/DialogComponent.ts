import Alpine from 'alpinejs';
import { DialogStoreState } from '../types/dialog.js';
import { dialogBoundedIntSchema, readingTitleSchema } from '../validation/dialog.js';
import { zodFirstIssue } from '../validation/zodErrors.js';

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

  handleConfirm() {
    const d = this.store;
    if (d?.onConfirm) d.onConfirm();
    this.close();
  },

  handleCancel() {
    const d = this.store;
    if (d?.onCancel) d.onCancel();
    this.close();
  },

  handleInputSubmit() {
    const d = this.store;
    const min = d?.inputMin ?? 0;
    const max = d?.inputMax ?? 10;
    const parsed = dialogBoundedIntSchema(min, max).safeParse(this.inputValue);
    if (!parsed.success) {
      this.inputError = zodFirstIssue(parsed.error);
      return;
    }
    this.inputError = '';
    if (d?.onSubmit) d.onSubmit(parsed.data);
    this.close();
  },

  handleInputTextSubmit() {
    const d = this.store;
    const parsed = readingTitleSchema.safeParse(this.inputValue ?? '');
    if (!parsed.success) {
      this.inputError = zodFirstIssue(parsed.error);
      return;
    }
    this.inputError = '';
    if (d?.onSubmitText) d.onSubmitText(parsed.data);
    this.close();
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
}));
