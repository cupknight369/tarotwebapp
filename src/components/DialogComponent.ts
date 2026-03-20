import Alpine from 'alpinejs'
import { DialogStoreState } from '../types/dialog.js'

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
    const num = parseInt(this.inputValue, 10);
    if (isNaN(num)) return;
    const min = d?.inputMin ?? 0;
    const max = d?.inputMax ?? 10;
    if (num < min || num > max) return;
    if (d?.onSubmit) d.onSubmit(num);
    this.close();
  },

  handleInputTextSubmit() {
    const d = this.store;
    const text = (this.inputValue ?? '').trim();
    if (d?.onSubmitText) d.onSubmitText(text || 'Untitled Reading');
    this.close();
  },

  initInputValue() {
    const d = this.store;
    this.inputValue = d?.inputDefault ?? '1';
  },

  initInputTextValue() {
    const d = this.store;
    this.inputValue = d?.inputDefault ?? '';
  },
}))
