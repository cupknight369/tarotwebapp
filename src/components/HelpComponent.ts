import Alpine from 'alpinejs';

interface HelpComponentState {
  open: boolean;
  onOpen: () => void;
  close: () => void;
  openWelcomeInfo: () => void;
  openKeyboardShortcuts: () => void;
}

Alpine.data(
  'helpComponent',
  () =>
    ({
      open: false,

      onOpen() {
        this.open = true;
      },

      close() {
        this.open = false;
      },

      openWelcomeInfo() {
        this.close();
        window.dispatchEvent(new CustomEvent('open-welcome'));
      },

      openKeyboardShortcuts() {
        this.close();
        window.dispatchEvent(new CustomEvent('open-keyboard-shortcuts'));
      },
    }) as HelpComponentState,
);
