import Alpine from 'alpinejs';

interface HelpComponentState {
  open: boolean;
  onOpen: () => void;
  close: () => void;
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
    }) as HelpComponentState,
);
