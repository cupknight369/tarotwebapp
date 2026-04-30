import Alpine from 'alpinejs';

const WELCOME_DISMISSED_KEY = 'welcome_modal_dismissed';

interface WelcomeComponentState {
  open: boolean;
  openIfFirstTime: () => void;
  onOpen: () => void;
  close: () => void;
}

Alpine.data(
  'welcomeComponent',
  () =>
    ({
      open: false,

      openIfFirstTime() {
        const dismissed = localStorage.getItem(WELCOME_DISMISSED_KEY) === 'true';
        if (!dismissed) {
          this.open = true;
        }
      },

      onOpen() {
        this.open = true;
      },

      close() {
        this.open = false;
        localStorage.setItem(WELCOME_DISMISSED_KEY, 'true');
      },
    }) as WelcomeComponentState,
);

export { WELCOME_DISMISSED_KEY };
