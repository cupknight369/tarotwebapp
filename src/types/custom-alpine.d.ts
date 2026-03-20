// Custom app types and Alpine store augmentation (Alpine core from @types/alpinejs)

declare global {
  interface AlpineStore {
    cards: TarotCard[];
    shuffledCards: TarotCard[];
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
}

declare namespace Alpine {
  interface Stores {
    dialog: DialogStoreState;
    settings: SettingsStoreState;
    shuffledCards: TarotCard[];
  }
}

export {};
