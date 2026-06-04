/** A single keyboard shortcut entry for the reference table. */
export interface KeyboardShortcutEntry {
  readonly keys: string;
  readonly description: string;
}

/** All application keyboard shortcuts shown in the reference table. */
export const KEYBOARD_SHORTCUTS: readonly KeyboardShortcutEntry[] = [
  { keys: 'Ctrl+S', description: 'Save current reading' },
  { keys: 'Ctrl+D', description: 'Draw a card at pointer or canvas center' },
  { keys: 'Ctrl+N', description: 'Draw a card by name' },
  { keys: 'Ctrl+I', description: 'Draw a card by index' },
  { keys: 'Ctrl+T', description: 'Add a text label' },
  { keys: 'Ctrl+Shift+3', description: 'Generate a random number' },
  { keys: 'Ctrl+8', description: 'Shuffle the active deck' },
  { keys: 'Ctrl+/', description: 'Switch deck by name' },
  { keys: 'Ctrl+,', description: 'Switch to previous deck' },
  { keys: 'Ctrl+.', description: 'Switch to next deck' },
  { keys: 'Ctrl+9', description: 'Clear the canvas' },
  { keys: 'Ctrl+0', description: 'Start a new reading' },
  { keys: 'Alt+1', description: 'Open deck modal' },
  { keys: 'Alt+2', description: 'Open readings modal' },
  { keys: 'Alt+3', description: 'Open settings' },
  { keys: 'Alt+4', description: 'Open account menu' },
  { keys: 'Alt+C', description: 'Open correspondences manager' },
  { keys: 'Alt+K', description: 'Open keyboard shortcuts reference' },
  { keys: 'Esc', description: 'Close open modals and dialogs' },
] as const;

/**
 * Filters shortcuts by a case-insensitive keyword match on keys or description.
 *
 * @param shortcuts - Shortcut list to filter.
 * @param query - User-entered filter text.
 * @returns Matching shortcuts, or the full list when query is empty.
 */
export function filterKeyboardShortcuts(
  shortcuts: readonly KeyboardShortcutEntry[],
  query: string,
): KeyboardShortcutEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...shortcuts];
  }
  return shortcuts.filter(
    (entry) => entry.keys.toLowerCase().includes(q) || entry.description.toLowerCase().includes(q),
  );
}
