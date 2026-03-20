  /** State for the global dialog store (Alpine.store('dialog')). */
  export interface DialogStoreState {
    open: boolean;
    type: 'confirm' | 'input' | 'inputText';
    title: string;
    confirmLabel?: string;
    cancelLabel?: string;
    cancelLabelVisible: boolean;
    onConfirm?: () => void;
    onCancel?: () => void;
    inputLabel?: string;
    inputPlaceholder?: string;
    inputMin?: number;
    inputMax?: number;
    inputDefault?: string;
    onSubmit?: (value: number) => void;
    onSubmitText?: (value: string) => void;
  }
