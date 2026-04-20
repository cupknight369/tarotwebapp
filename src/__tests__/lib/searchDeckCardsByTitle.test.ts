import { describe, expect, it } from 'vitest';

import { searchDeckCardsByTitle } from '../../lib/searchDeckCardsByTitle.js';
import type { TarotCard } from '../../types/canvas.js';

function card(id: string, title: string): TarotCard {
  return { id, deckId: 'd', title, num: 1, img: 'x' };
}

describe('searchDeckCardsByTitle', () => {
  it('returns empty array for empty or whitespace-only query', () => {
    const deck = [card('1', 'The Fool')];
    expect(searchDeckCardsByTitle(deck, '')).toEqual([]);
    expect(searchDeckCardsByTitle(deck, '   ')).toEqual([]);
  });

  it('matches case-insensitively', () => {
    const deck = [card('1', 'The Fool')];
    expect(searchDeckCardsByTitle(deck, 'FOOL')).toEqual([card('1', 'The Fool')]);
    expect(searchDeckCardsByTitle(deck, 'fool')).toEqual([card('1', 'The Fool')]);
  });

  it('sorts by earliest match position in title', () => {
    const deck = [card('a', 'zz star zz'), card('b', 'star light'), card('c', 'my star')];
    expect(searchDeckCardsByTitle(deck, 'star')).toEqual([
      card('b', 'star light'),
      card('c', 'my star'),
      card('a', 'zz star zz'),
    ]);
  });

  it('uses shorter title as tie-breaker when match position ties', () => {
    const deck = [card('long', 'star brightness'), card('short', 'star bee')];
    expect(searchDeckCardsByTitle(deck, 'star')).toEqual([
      card('short', 'star bee'),
      card('long', 'star brightness'),
    ]);
  });

  it('uses original index as final tie-breaker', () => {
    const deck = [card('first', 'alpha tie'), card('second', 'alpha tie')];
    expect(searchDeckCardsByTitle(deck, 'alpha')).toEqual([
      card('first', 'alpha tie'),
      card('second', 'alpha tie'),
    ]);
  });

  it('returns at most three cards by default', () => {
    const deck = [
      card('1', 'star one'),
      card('2', 'star two'),
      card('3', 'star three'),
      card('4', 'star four'),
    ];
    expect(searchDeckCardsByTitle(deck, 'star')).toHaveLength(3);
  });

  it('respects custom limit', () => {
    const deck = [card('1', 'a star'), card('2', 'b star')];
    expect(searchDeckCardsByTitle(deck, 'star', 1)).toHaveLength(1);
  });

  it('excludes non-matching titles', () => {
    const deck = [card('1', 'Moon'), card('2', 'Sun')];
    expect(searchDeckCardsByTitle(deck, 'moon')).toEqual([card('1', 'Moon')]);
  });
});
