// Custom app types and Alpine store augmentation (Alpine core from @types/alpinejs)

declare global {
  interface AlpineStore {
    cards: TarotCard[];
    shuffledCards: TarotCard[];
  }

  /** State for the global dialog store (Alpine.store('dialog')). */
  interface DialogStoreState {
    open: boolean;
    type: 'confirm' | 'input';
    title: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
    inputLabel?: string;
    inputPlaceholder?: string;
    inputMin?: number;
    inputMax?: number;
    inputDefault?: string;
    onSubmit?: (value: number) => void;
  }

  interface AlpineData {
    num: number;
    singleDrawNum: number | null;
    multiDrawNums: Set<number>;
    showShuffledConfirmation?: boolean;
    specificIndexCard?: TarotCard | null;
  }

  interface AlpineRefs {
    cardImage: HTMLImageElement;
    viewport: HTMLDivElement;
    content: HTMLDivElement;
    emptyCanvasMessage: HTMLDivElement;
  }

  interface TarotCard {
    title: string;
    num: number;
    img: string;
    censoredImg?: string | null;
  }

  interface DraggableCard {
    card: TarotCard;
    id: string;
    x: number;
    y: number;
    rotation: number;
    zIndex: number;
    opacity: number;
    cursor: string;
    display: string;
  }

  type TextLabelAnchorPosition = 'above' | 'below' | 'left' | 'right';

  interface TextLabel {
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
  }

  /** State for the global settings store (Alpine.store('settings')). */
  interface SettingsStoreState {
    open: boolean;
    censored: boolean;
  }
}

declare namespace Alpine {
  interface Stores {
    dialog: DialogStoreState;
    settings: SettingsStoreState;
    shuffledCards: TarotCard[];
  }
}

export {};
