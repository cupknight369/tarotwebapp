/// <reference path="../../types/alpine.d.ts" />

const DEFAULT_DIALOG_STATE: DialogStoreState = {
  open: false,
  type: 'confirm',
  title: '',
  confirmLabel: 'Yes',
  cancelLabel: 'Cancel',
  onConfirm: undefined,
  onCancel: undefined,
  inputLabel: undefined,
  inputPlaceholder: undefined,
  inputMin: undefined,
  inputMax: undefined,
  inputDefault: undefined,
  onSubmit: undefined,
};

function dialogComponent(alpine: Alpine) {
  const component = {
    alpine,
    inputValue: '' as string,

    init() {
      if (alpine.store('dialog') === undefined) {
        alpine.store('dialog', { ...DEFAULT_DIALOG_STATE });
      }
    },

    get store(): DialogStoreState {
      return alpine.store('dialog') as DialogStoreState;
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

    /** Reset input value when input dialog is shown (call from x-init on input panel). */
    initInputValue() {
      const d = this.store;
      this.inputValue = d?.inputDefault ?? '1';
    },
  };

  return component;
}

(window as any).dialogComponent = dialogComponent;
