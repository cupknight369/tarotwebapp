function cryptoRandomInt(len) {
  // 1. Get a random 32-bit unsigned integer.
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf); // cryptographically strong random 32-bit value [0, 2^32 - 1][web:22]

  // 2. Convert to a fraction in [0, 1).
  const fraction = buf[0] / (0xFFFFFFFF + 1); // 0xFFFFFFFF = 2^32 - 1[web:21]

  // 3. Scale to [0, 78) and floor to get integer 0–77.
  const result = Math.floor(fraction * len);

  return result; // integer from 0 to 77 inclusive
}

function shuffle(array) {
  const newArray = [...array];  // Create copy to preserve original

  for (let i = newArray.length - 1; i > 0; --i) {
    const j = cryptoRandomInt(newArray.length);
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }

  return newArray;
}

function drawMultipleCards(num) {
  if (num > 10 || num < 1) { return; }

  const draws = new Set();

  while (draws.size < num) {
    const randomNum = cryptoRandomInt(Alpine.store('shuffledCards').length);
    if (!draws.has(randomNum)) { draws.add(randomNum); }
  }
  
  return draws;
}

function compSingleDraw(store, data, refs) {
  data.singleDrawNum = cryptoRandomInt(store.cards.length);

  // Set the image source and alt text to the current single draw card
  refs.cardImage.src = store.shuffledCards[data.singleDrawNum]?.img;
  refs.cardImage.alt = store.shuffledCards[data.singleDrawNum]?.title;
}

Alpine.store('cards', [
  { title: 'The Fool', num: 0, img: '/cards/m00.jpg' },
  { title: 'The Magician', num: 1, img: '/cards/m00.jpg' },
  { title: 'The High Priestess', num: 2, img: '/cards/m00.jpg' },
  { title: 'The Empress', num: 3, img: '/cards/m00.jpg' },
  { title: 'The Emperor', num: 4, img: '/cards/m00.jpg' },
  { title: 'The Hierophant', num: 5, img: '/cards/m00.jpg' },
  { title: 'The Lovers', num: 6, img: '/cards/m00.jpg' },
  { title: 'The Chariot', num: 7, img: '/cards/m00.jpg' },
  { title: 'The Strength', num: 8, img: '/cards/m00.jpg' },
  { title: 'The Hermit', num: 9, img: '/cards/m00.jpg' },
  { title: 'The Wheel Of Fortune', num: 10, img: '/cards/m00.jpg' },
  { title: 'Justice', num: 11, img: '/cards/m00.jpg' },
  { title: 'The Hangman', num: 12, img: '/cards/m00.jpg' },
  { title: 'Death', num: 13, img: '/cards/m00.jpg' },
  { title: 'Temperance', num: 14, img: '/cards/m00.jpg' },
  { title: 'The Devil', num: 15, img: '/cards/m00.jpg' },
  { title: 'The Tower', num: 16, img: '/cards/m00.jpg' },
  { title: 'The Star', num: 17, img: '/cards/m00.jpg' },
  { title: 'The Moon', num: 18, img: '/cards/m00.jpg' },
  { title: 'The Sun', num: 19, img: '/cards/m00.jpg' },
  { title: 'Judgement', num: 20, img: '/cards/m00.jpg' },
  { title: 'The World', num: 21, img: '/cards/m00.jpg' },
  { title: 'Ace Of Wands', num: 22, img: '/cards/m00.jpg' },
  { title: 'Two Of Wands', num: 23, img: '/cards/m00.jpg' },
  { title: 'Three Of Wands', num: 24, img: '/cards/m00.jpg' },
  { title: 'Four Of Wands', num: 25, img: '/cards/m00.jpg' },
  { title: 'Five Of Wands', num: 26, img: '/cards/m00.jpg' },
  { title: 'Six Of Wands', num: 27, img: '/cards/m00.jpg' },
  { title: 'Seven Of Wands', num: 28, img: '/cards/m00.jpg' },
  { title: 'Eight Of Wands', num: 29, img: '/cards/m00.jpg' },
  { title: 'Nine Of Wands', num: 30, img: '/cards/m00.jpg' },
  { title: 'Ten Of Wands', num: 31, img: '/cards/m00.jpg' },
  { title: 'Page Of Wands', num: 32, img: '/cards/m00.jpg' },
  { title: 'Knight Of Wands', num: 33, img: '/cards/m00.jpg' },
  { title: 'Queen Of Wands', num: 34, img: '/cards/m00.jpg' },
  { title: 'King Of Wands', num: 35, img: '/cards/m00.jpg' },  
  { title: 'Ace Of Cups', num: 36, img: '/cards/m00.jpg' },
  { title: 'Two Of Cups', num: 37, img: '/cards/m00.jpg' },
  { title: 'Three Of Cups', num: 38, img: '/cards/m00.jpg' },
  { title: 'Four Of Cups', num: 39, img: '/cards/m00.jpg' },
  { title: 'Five Of Cups', num: 40, img: '/cards/m00.jpg' },
  { title: 'Six Of Cups', num: 41, img: '/cards/m00.jpg' },
  { title: 'Seven Of Cups', num: 42, img: '/cards/m00.jpg' },
  { title: 'Eight Of Cups', num: 43, img: '/cards/m00.jpg' },
  { title: 'Nine Of Cups', num: 44, img: '/cards/m00.jpg' },
  { title: 'Ten Of Cups', num: 45, img: '/cards/m00.jpg' },
  { title: 'Page Of Cups', num: 46, img: '/cards/m00.jpg' },
  { title: 'Knight Of Cups', num: 47, img: '/cards/m00.jpg' },
  { title: 'Queen Of Cups', num: 48, img: '/cards/m00.jpg' },
  { title: 'King Of Cups', num: 49, img: '/cards/m00.jpg' },
  { title: 'Ace Of Swords', num: 50, img: '/cards/m00.jpg' },
  { title: 'Two Of Swords', num: 51, img: '/cards/m00.jpg' },
  { title: 'Three Of Swords', num: 52, img: '/cards/m00.jpg' },
  { title: 'Four Of Swords', num: 53, img: '/cards/m00.jpg' },
  { title: 'Five Of Swords', num: 54, img: '/cards/m00.jpg' },
  { title: 'Six Of Swords', num: 55, img: '/cards/m00.jpg' },
  { title: 'Seven Of Swords', num: 56, img: '/cards/m00.jpg' },
  { title: 'Eight Of Swords', num: 57, img: '/cards/m00.jpg' },
  { title: 'Nine Of Swords', num: 58, img: '/cards/m00.jpg' },
  { title: 'Ten Of Swords', num: 59, img: '/cards/m00.jpg' },
  { title: 'Page Of Swords', num: 60, img: '/cards/m00.jpg' },
  { title: 'Knight Of Swords', num: 61, img: '/cards/m00.jpg' },
  { title: 'Queen Of Swords', num: 62, img: '/cards/m00.jpg' },
  { title: 'King Of Swords', num: 63, img: '/cards/m00.jpg' },
  { title: 'Ace Of Pentacles', num: 64, img: '/cards/m00.jpg' },
  { title: 'Two Of Pentacles', num: 65, img: '/cards/m00.jpg' },
  { title: 'Three Of Pentacles', num: 66, img: '/cards/m00.jpg' },
  { title: 'Four Of Pentacles', num: 67, img: '/cards/m00.jpg' },
  { title: 'Five Of Pentacles', num: 68, img: '/cards/m00.jpg' },
  { title: 'Six Of Pentacles', num: 69, img: '/cards/m00.jpg' },
  { title: 'Seven Of Pentacles', num: 70, img: '/cards/m00.jpg' },
  { title: 'Eight Of Pentacles', num: 71, img: '/cards/m00.jpg' },
  { title: 'Nine Of Pentacles', num: 72, img: '/cards/m00.jpg' },
  { title: 'Ten Of Pentacles', num: 73, img: '/cards/m00.jpg' },
  { title: 'Page Of Pentacles', num: 74, img: '/cards/m00.jpg' },
  { title: 'Knight Of Pentacles', num: 75, img: '/cards/m00.jpg' },
  { title: 'Queen Of Pentacles', num: 76, img: '/cards/m00.jpg' },
  { title: 'King Of Pentacles', num: 77, img: '/cards/m00.jpg' },
]);

Alpine.store('shuffledCards', shuffle(Alpine.store('cards')));

