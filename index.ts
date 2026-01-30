/// <reference path="./types/alpine.d.ts" />

function cryptoRandomInt(len: number): number {
  // 1. Get a random 32-bit unsigned integer.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf); // cryptographically strong random 32-bit value [0, 2^32 - 1][web:22]

  // 2. Convert to a fraction in [0, 1).
  const fraction = buf[0] / (0xFFFFFFFF + 1); // 0xFFFFFFFF = 2^32 - 1[web:21]

  // 3. Scale to [0, len) and floor to get integer 0–(len-1).
  const result = Math.floor(fraction * len);

  return result; // integer from 0 to len-1 inclusive
}

function shuffle(array: TarotCard[]): TarotCard[] {
  const newArray = [...array];  // Create copy to preserve original

  for (let i = newArray.length - 1; i > 0; --i) {
    const j = cryptoRandomInt(newArray.length);
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }

  return newArray;
}

function drawMultipleCards(num: number): Set<number> | undefined {
  if (num > 10 || num < 1) { return; }

  const draws = new Set<number>();
  const shuffledCards = Alpine.store('shuffledCards') as TarotCard[];

  while (draws.size < num) {
    const randomNum = cryptoRandomInt(shuffledCards.length);
    if (!draws.has(randomNum)) { draws.add(randomNum); }
  }
  
  return draws;
}

function compSingleDraw(store: AlpineStore, data: AlpineData, refs: AlpineRefs): void {
  data.singleDrawNum = cryptoRandomInt(store.cards.length);

  // Set the image source and alt text to the current single draw card
  const drawnCard = store.shuffledCards[data.singleDrawNum];
  if (drawnCard) {
    refs.cardImage.src = drawnCard.img;
    refs.cardImage.alt = drawnCard.title;
  }
}

const cards: TarotCard[] = [
  { title: 'The Fool', num: 0, img: '/cards/m00.jpg' },
  { title: 'The Magician', num: 1, img: '/cards/m01.jpg' },
  { title: 'The High Priestess', num: 2, img: '/cards/m02.jpg' },
  { title: 'The Empress', num: 3, img: '/cards/m03.jpg' },
  { title: 'The Emperor', num: 4, img: '/cards/m04.jpg' },
  { title: 'The Hierophant', num: 5, img: '/cards/m05.jpg' },
  { title: 'The Lovers', num: 6, img: '/cards/m06.jpg' },
  { title: 'The Chariot', num: 7, img: '/cards/m07.jpg' },
  { title: 'The Strength', num: 8, img: '/cards/m08.jpg' },
  { title: 'The Hermit', num: 9, img: '/cards/m09.jpg' },
  { title: 'The Wheel Of Fortune', num: 10, img: '/cards/m10.jpg' },
  { title: 'Justice', num: 11, img: '/cards/m11.jpg' },
  { title: 'The Hangman', num: 12, img: '/cards/m12.jpg' },
  { title: 'Death', num: 13, img: '/cards/m13.jpg' },
  { title: 'Temperance', num: 14, img: '/cards/m14.jpg' },
  { title: 'The Devil', num: 15, img: '/cards/m15.jpg' },
  { title: 'The Tower', num: 16, img: '/cards/m16.jpg' },
  { title: 'The Star', num: 17, img: '/cards/m17.jpg' },
  { title: 'The Moon', num: 18, img: '/cards/m18.jpg' },
  { title: 'The Sun', num: 19, img: '/cards/m19.jpg' },
  { title: 'Judgement', num: 20, img: '/cards/m20.jpg' },
  { title: 'The World', num: 21, img: '/cards/m21.jpg' },
  { title: 'Ace Of Wands', num: 22, img: '/cards/w01.jpg' },
  { title: 'Two Of Wands', num: 23, img: '/cards/w02.jpg' },
  { title: 'Three Of Wands', num: 24, img: '/cards/w03.jpg' },
  { title: 'Four Of Wands', num: 25, img: '/cards/w04.jpg' },
  { title: 'Five Of Wands', num: 26, img: '/cards/w05.jpg' },
  { title: 'Six Of Wands', num: 27, img: '/cards/w06.jpg' },
  { title: 'Seven Of Wands', num: 28, img: '/cards/w07.jpg' },
  { title: 'Eight Of Wands', num: 29, img: '/cards/w08.jpg' },
  { title: 'Nine Of Wands', num: 30, img: '/cards/w09.jpg' },
  { title: 'Ten Of Wands', num: 31, img: '/cards/w10.jpg' },
  { title: 'Page Of Wands', num: 32, img: '/cards/w11.jpg' },
  { title: 'Knight Of Wands', num: 33, img: '/cards/w12.jpg' },
  { title: 'Queen Of Wands', num: 34, img: '/cards/w13.jpg' },
  { title: 'King Of Wands', num: 35, img: '/cards/w14.jpg' },  
  { title: 'Ace Of Cups', num: 36, img: '/cards/c01.jpg' },
  { title: 'Two Of Cups', num: 37, img: '/cards/c02.jpg' },
  { title: 'Three Of Cups', num: 38, img: '/cards/c03.jpg' },
  { title: 'Four Of Cups', num: 39, img: '/cards/c04.jpg' },
  { title: 'Five Of Cups', num: 40, img: '/cards/c05.jpg' },
  { title: 'Six Of Cups', num: 41, img: '/cards/c06.jpg' },
  { title: 'Seven Of Cups', num: 42, img: '/cards/c07.jpg' },
  { title: 'Eight Of Cups', num: 43, img: '/cards/c08.jpg' },
  { title: 'Nine Of Cups', num: 44, img: '/cards/c09.jpg' },
  { title: 'Ten Of Cups', num: 45, img: '/cards/c10.jpg' },
  { title: 'Page Of Cups', num: 46, img: '/cards/c11.jpg' },
  { title: 'Knight Of Cups', num: 47, img: '/cards/c12.jpg' },
  { title: 'Queen Of Cups', num: 48, img: '/cards/c13.jpg' },
  { title: 'King Of Cups', num: 49, img: '/cards/c14.jpg' },
  { title: 'Ace Of Swords', num: 50, img: '/cards/s01.jpg' },
  { title: 'Two Of Swords', num: 51, img: '/cards/s02.jpg' },
  { title: 'Three Of Swords', num: 52, img: '/cards/s03.jpg' },
  { title: 'Four Of Swords', num: 53, img: '/cards/s04.jpg' },
  { title: 'Five Of Swords', num: 54, img: '/cards/s05.jpg' },
  { title: 'Six Of Swords', num: 55, img: '/cards/s06.jpg' },
  { title: 'Seven Of Swords', num: 56, img: '/cards/s07.jpg' },
  { title: 'Eight Of Swords', num: 57, img: '/cards/s08.jpg' },
  { title: 'Nine Of Swords', num: 58, img: '/cards/s09.jpg' },
  { title: 'Ten Of Swords', num: 59, img: '/cards/s10.jpg' },
  { title: 'Page Of Swords', num: 60, img: '/cards/s11.jpg' },
  { title: 'Knight Of Swords', num: 61, img: '/cards/s12.jpg' },
  { title: 'Queen Of Swords', num: 62, img: '/cards/s13.jpg' },
  { title: 'King Of Swords', num: 63, img: '/cards/s14.jpg' },
  { title: 'Ace Of Pentacles', num: 64, img: '/cards/p01.jpg' },
  { title: 'Two Of Pentacles', num: 65, img: '/cards/p02.jpg' },
  { title: 'Three Of Pentacles', num: 66, img: '/cards/p03.jpg' },
  { title: 'Four Of Pentacles', num: 67, img: '/cards/p04.jpg' },
  { title: 'Five Of Pentacles', num: 68, img: '/cards/p05.jpg' },
  { title: 'Six Of Pentacles', num: 69, img: '/cards/p06.jpg' },
  { title: 'Seven Of Pentacles', num: 70, img: '/cards/p07.jpg' },
  { title: 'Eight Of Pentacles', num: 71, img: '/cards/p08.jpg' },
  { title: 'Nine Of Pentacles', num: 72, img: '/cards/p09.jpg' },
  { title: 'Ten Of Pentacles', num: 73, img: '/cards/p10.jpg' },
  { title: 'Page Of Pentacles', num: 74, img: '/cards/p11.jpg' },
  { title: 'Knight Of Pentacles', num: 75, img: '/cards/p12.jpg' },
  { title: 'Queen Of Pentacles', num: 76, img: '/cards/p13.jpg' },
  { title: 'King Of Pentacles', num: 77, img: '/cards/p14.jpg' },
];

function generateCardId(): string {
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Helper function to add card to draggable zone (called from buttons)
function addCardToCanvas(card: TarotCard): void {
  const draggableZoneComponent = (window as any).draggableZoneComponent;
  if (!draggableZoneComponent) {
    console.error('Draggable zone component not found');
    return;
  }

  const draggableCard: DraggableCard = {
    card,
    id: generateCardId(),
    // Place card at a random position within the draggable zone bounds
    x: (() => {
      const zone = document.getElementById('draggable-container');
      const cardWidth = 150;   // Assumes card width in px (matches <img> CSS)
      let x = 0;
      if (zone) {
        const zoneRect = zone.getBoundingClientRect();
        x = Math.random() * Math.max(zoneRect.width - cardWidth, 0);
      }
      return x;
    })(),
    y: (() => {
      const zone = document.getElementById('draggable-container');
      const cardHeight = 231;
      let y = 0;
      if (zone) {
        const zoneRect = zone.getBoundingClientRect();
        y = Math.random() * Math.max(zoneRect.height - cardHeight, 0);
      }
      return y;
    })(),
    rotation: 0,
    zIndex: draggableZoneComponent.maxZIndex + 1,
    opacity: 1,
    cursor: 'grab',
    display: 'block'
  };
  
  draggableZoneComponent.draggableCards = [...draggableZoneComponent.draggableCards, draggableCard];
  draggableZoneComponent.maxZIndex += 1;
}

// Alpine.js component for draggable zone (pure Alpine.js, no Interact.js)
function draggableZone() {
  const component = {
    draggableCards: [] as DraggableCard[],
    maxZIndex: 0,
    dragStart: null as { startCardX: number; startCardY: number; startDropX: number; startDropY: number } | null,
    dragContainer: null as HTMLElement | null,
    draggingCard: null as HTMLElement | null,
    showClearConfirm: false,
    zoomLevel: 0,
    translateX: 0,
    translateY: 0,
    lastMouseX: 0,
    lastMouseY: 0,

    get scale(): number {
      return Math.pow(10, this.zoomLevel / 10);
    },

    init() {
      // Store reference globally so buttons can access it
      (window as any).draggableZoneComponent = this;
      this.dragContainer = document.querySelector('#draggable-container') as HTMLElement;
    },

    onMouseMoveForZoom(event: MouseEvent) {
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    },

    onWheel(event: WheelEvent) {
      const el = this.dragContainer!;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const currentScale = this.scale;
      const step = 0.25;
      const delta = event.deltaY < 0 ? step : -step;
      const newLevel = Math.max(-10, Math.min(10, this.zoomLevel + delta));
      if (newLevel === this.zoomLevel) return;
      const newScale = Math.pow(10, newLevel / 10);
      const scaleFactor = newScale / currentScale;
      const mouseX = typeof event.clientX === 'number' ? event.clientX : this.lastMouseX;
      const mouseY = typeof event.clientY === 'number' ? event.clientY : this.lastMouseY;
      const contentLeft = rect.left + el.clientLeft;
      const contentTop = rect.top + el.clientTop;
      const fx = mouseX - contentLeft;
      const fy = mouseY - contentTop;
      this.translateX = fx - scaleFactor * (fx - this.translateX);
      this.translateY = fy - scaleFactor * (fy - this.translateY);
      this.zoomLevel = newLevel;
    },

    zoomIn() {
      const el = this.dragContainer!;
      const rect = el.getBoundingClientRect();
      const currentScale = this.scale;
      const newLevel = Math.min(10, this.zoomLevel + 1);
      if (newLevel === this.zoomLevel) return;
      const newScale = Math.pow(10, newLevel / 10);
      const scaleFactor = newScale / currentScale;
      const cx = (rect.width - 2 * el.clientLeft) / 2;
      const cy = (rect.height - 2 * el.clientTop) / 2;
      this.translateX = cx - scaleFactor * (cx - this.translateX);
      this.translateY = cy - scaleFactor * (cy - this.translateY);
      this.zoomLevel = newLevel;
    },

    zoomOut() {
      const el = this.dragContainer!;
      const rect = el.getBoundingClientRect();
      const currentScale = this.scale;
      const newLevel = Math.max(-10, this.zoomLevel - 1);
      if (newLevel === this.zoomLevel) return;
      const newScale = Math.pow(10, newLevel / 10);
      const scaleFactor = newScale / currentScale;
      const cx = (rect.width - 2 * el.clientLeft) / 2;
      const cy = (rect.height - 2 * el.clientTop) / 2;
      this.translateX = cx - scaleFactor * (cx - this.translateX);
      this.translateY = cy - scaleFactor * (cy - this.translateY);
      this.zoomLevel = newLevel;
    },

    onMouseDown(event: MouseEvent) {
      if (event.target === this.dragContainer) return;
      const target = event.target as HTMLElement;
      const cardId = target.id;
      if (!cardId || !this.draggableCards.some(c => c.id === cardId)) return;
      this.draggingCard = target;

      const card = this.draggableCards.find(c => c.id === cardId)!;
      const rect = this.dragContainer!.getBoundingClientRect();
      const startDropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
      const startDropY = event.clientY - rect.top - this.dragContainer!.clientTop;
      this.dragStart = {
        startCardX: card.x,
        startCardY: card.y,
        startDropX,
        startDropY,
      };

      this.maxZIndex += 1;
      this.updateItem(this.draggingCard.id, { zIndex: this.maxZIndex, cursor: 'grabbing' });
    },

    onMouseMove(event: MouseEvent) {
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
      if (!this.draggingCard || !this.dragStart) return;

      const rect = this.dragContainer!.getBoundingClientRect();
      const dropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
      const dropY = event.clientY - rect.top - this.dragContainer!.clientTop;
      // Move card by mouse delta in inner space so the same point stays under the cursor
      const x = this.dragStart.startCardX + (dropX - this.dragStart.startDropX) / this.scale;
      const y = this.dragStart.startCardY + (dropY - this.dragStart.startDropY) / this.scale;

      this.updateItem(this.draggingCard.id, { x, y });
    },

    onMouseUp(event: MouseEvent) {
      event.preventDefault();
      if (!this.draggingCard || !this.dragStart) return;

      const rect = this.dragContainer!.getBoundingClientRect();
      const dropX = event.clientX - rect.left - this.dragContainer!.clientLeft;
      const dropY = event.clientY - rect.top - this.dragContainer!.clientTop;
      const x = this.dragStart.startCardX + (dropX - this.dragStart.startDropX) / this.scale;
      const y = this.dragStart.startCardY + (dropY - this.dragStart.startDropY) / this.scale;

      this.updateItem(this.draggingCard.id, { x, y, display: 'block', cursor: 'grab' });

      this.dragStart = null;
      this.draggingCard = null;
    },    

    clearCanvas() {
      this.draggableCards = [];
      this.maxZIndex = 0;
      this.draggingCard = null;
      this.dragStart = null;
    },

    // Triggers Alpine reactivity for the draggable card
    updateItem(id: string, newProps: Partial<DraggableCard>) {
      const index = this.draggableCards.findIndex(i => i.id === id)
      if (index === -1) return

      // Create a new object, keep the same index
      this.draggableCards[index] = {
        ...this.draggableCards[index],
        ...newProps,
      }
    }
  };
  
  // Initialize and return
  component.init();
  return component;
}

// Expose draggableZone function globally for Alpine.js
(window as any).draggableZone = draggableZone;

// Expose functions globally for Alpine.js template access
// Must be done immediately so Alpine can access them
(window as any).cryptoRandomInt = cryptoRandomInt;
(window as any).shuffle = shuffle;
(window as any).drawMultipleCards = drawMultipleCards;
(window as any).compSingleDraw = compSingleDraw;
(window as any).addCardToCanvas = addCardToCanvas;

// Initialize Alpine stores when Alpine is available
// Use DOMContentLoaded to ensure Alpine is loaded
if (typeof (window as any).Alpine !== 'undefined') {
  Alpine.store('cards', cards);
  Alpine.store('shuffledCards', shuffle(Alpine.store('cards') as TarotCard[]));
} else {
  // If Alpine isn't loaded yet, wait for it
  document.addEventListener('DOMContentLoaded', () => {
    Alpine.store('cards', cards);
    Alpine.store('shuffledCards', shuffle(Alpine.store('cards') as TarotCard[]));
  });
}
