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
    x: Math.random() * 200 + 50, // Random initial position
    y: Math.random() * 200 + 50,
    rotation: 0,
    zIndex: draggableZoneComponent.maxZIndex + 1
  };
  
  draggableZoneComponent.draggableCards.push(draggableCard);
  draggableZoneComponent.maxZIndex += 1;
}

// Alpine.js component for draggable zone (pure Alpine.js, no Interact.js)
function draggableZone() {
  const component = {
    draggableCards: [] as DraggableCard[],
    maxZIndex: 0,
    draggingCardId: null as string | null,
    dragStart: null as { offsetX: number; offsetY: number; } | null,
    dragContainer: null as HTMLElement | null,
    
    init() {
      // Store reference globally so buttons can access it
      (window as any).draggableZoneComponent = this;
      this.dragContainer = document.querySelector('#draggable-container') as HTMLElement;
      this.dragContainer.addEventListener('dragstart', (e) => this.onDragStart(e));
      this.dragContainer.addEventListener('dragover', (e) => e.preventDefault());
      this.dragContainer.addEventListener('drop', (e) => this.onDragDrop(e));
    },

    onDragStart(event: DragEvent) {
      const cardElement = event.target as HTMLElement;
      if (!cardElement || !cardElement.id) return;

      const cardId = cardElement.id;
      const card = this.draggableCards.find(c => c.id === cardId);
      if (!card) return;

      // Calculate the offset from where the user clicked relative to the card's top-left corner
      const cardRect = cardElement.getBoundingClientRect();
      const offsetX = event.clientX - cardRect.left;
      const offsetY = event.clientY - cardRect.top;
      
      // Store the offset so we can maintain the relative position on drop
      this.dragStart = { offsetX, offsetY };

      // Bring card to front by updating zIndex in data model
      this.maxZIndex += 1;
      card.zIndex = this.maxZIndex;
      
      // Trigger Alpine reactivity
      this.draggableCards = [...this.draggableCards];

      // Set visual feedback (these are temporary, so direct DOM manipulation is fine)
      cardElement.style.opacity = '0.5';
      cardElement.style.cursor = 'grabbing';

      event.dataTransfer?.setData('text/plain', cardId);
    },
    
    onDragDrop(event: DragEvent) {
      event.preventDefault();
      const cardId = event.dataTransfer?.getData('text/plain');
      if (!cardId || !this.dragStart) return;

      const cardElement = document.querySelector(`#${cardId}`) as HTMLElement;
      if (!cardElement) return;

      // Find the card in the data model
      const card = this.draggableCards.find(c => c.id === cardId);
      if (!card) return;

      const rect = this.dragContainer!.getBoundingClientRect();
      // Calculate drop position relative to container
      const dropX = event.clientX - rect.x;
      const dropY = event.clientY - rect.y;
      
      // Subtract the offset to maintain the relative position where the user started dragging
      let x = dropX - this.dragStart.offsetX;
      let y = dropY - this.dragStart.offsetY;

      // Constrain the card to stay within container bounds
      // Measure the actual card dimensions instead of calculating them
      const cardRect = cardElement.getBoundingClientRect();
      const cardWidth = cardRect.width;
      const cardHeight = cardRect.height;
      x = Math.max(0, Math.min(x, rect.width - cardWidth));
      y = Math.max(0, Math.min(y, rect.height - cardHeight));

      // Update the card's position in the data model
      card.x = x;
      card.y = y;
      
      // Trigger Alpine reactivity by reassigning the array
      // This ensures Alpine detects the change and updates the DOM
      this.draggableCards = [...this.draggableCards];

      cardElement.style.opacity = '1';
      cardElement.style.cursor = 'grab';
      
      // Clear the drag start data
      this.dragStart = null;
    },
    
    clearCanvas() {
      this.draggableCards = [];
      this.maxZIndex = 0;
      this.draggingCardId = null;
      this.dragStart = null;
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
