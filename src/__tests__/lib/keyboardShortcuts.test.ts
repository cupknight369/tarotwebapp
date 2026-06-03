import { describe, expect, it } from 'vitest';

import {
  KEYBOARD_SHORTCUTS,
  filterKeyboardShortcuts,
} from '../../lib/keyboardShortcuts.js';

describe('keyboardShortcuts', () => {
  it('lists all application shortcuts including Alt+C and Alt+K', () => {
    expect(KEYBOARD_SHORTCUTS.length).toBeGreaterThanOrEqual(19);
    expect(KEYBOARD_SHORTCUTS.some((entry) => entry.keys === 'Alt+C')).toBe(true);
    expect(KEYBOARD_SHORTCUTS.some((entry) => entry.keys === 'Alt+K')).toBe(true);
    expect(KEYBOARD_SHORTCUTS.some((entry) => entry.keys === 'Ctrl+S')).toBe(true);
  });

  it('filterKeyboardShortcuts returns all entries for empty query', () => {
    expect(filterKeyboardShortcuts(KEYBOARD_SHORTCUTS, '')).toHaveLength(
      KEYBOARD_SHORTCUTS.length,
    );
    expect(filterKeyboardShortcuts(KEYBOARD_SHORTCUTS, '   ')).toHaveLength(
      KEYBOARD_SHORTCUTS.length,
    );
  });

  it('filterKeyboardShortcuts matches keys and descriptions case-insensitively', () => {
    const byKey = filterKeyboardShortcuts(KEYBOARD_SHORTCUTS, 'ctrl+d');
    expect(byKey).toHaveLength(1);
    expect(byKey[0]?.keys).toBe('Ctrl+D');

    const byDescription = filterKeyboardShortcuts(KEYBOARD_SHORTCUTS, 'shuffle');
    expect(byDescription.some((entry) => entry.keys === 'Ctrl+8')).toBe(true);

    const none = filterKeyboardShortcuts(KEYBOARD_SHORTCUTS, 'zzzz-not-found');
    expect(none).toHaveLength(0);
  });
});
