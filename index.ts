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

// Expose functions globally for Alpine.js template access
// Must be done immediately so Alpine can access them
(window as any).cryptoRandomInt = cryptoRandomInt;
(window as any).drawMultipleCards = drawMultipleCards;
(window as any).compSingleDraw = compSingleDraw;
(window as any).addCardToCanvas = addCardToCanvas;
