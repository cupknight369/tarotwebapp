// Type definitions for Alpine.js global
declare global {
  interface Window {
    Alpine: Alpine;
  }
  
  var Alpine: Alpine;
  
  interface Alpine {
    store(name: string, data?: any): any;
  }
  
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
  }
  
  interface TarotCard {
    title: string;
    num: number;
    img: string;
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
  }
}

export {};
