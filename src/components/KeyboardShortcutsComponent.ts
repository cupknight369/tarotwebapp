import Alpine from 'alpinejs';
import {
  KEYBOARD_SHORTCUTS,
  filterKeyboardShortcuts,
  type KeyboardShortcutEntry,
} from '../lib/keyboardShortcuts.js';

interface KeyboardShortcutsComponentState {
  open: boolean;
  filterQuery: string;
  onOpen: () => void;
  close: () => void;
  filteredShortcuts: () => KeyboardShortcutEntry[];
}

Alpine.data(
  'keyboardShortcutsComponent',
  () =>
    ({
      open: false,
      filterQuery: '',

      onOpen() {
        this.open = true;
        this.filterQuery = '';
        this.$nextTick(() => {
          const el = this.$refs.filterInput as HTMLInputElement | undefined;
          el?.focus();
        });
      },

      close() {
        this.open = false;
        this.filterQuery = '';
      },

      filteredShortcuts() {
        return filterKeyboardShortcuts(KEYBOARD_SHORTCUTS, this.filterQuery);
      },
    }) as KeyboardShortcutsComponentState,
);
