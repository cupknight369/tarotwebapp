import Alpine from 'alpinejs'

Alpine.data('settingsComponent', () => ({
  init() {
    if (Alpine.store('settings') === undefined) {
      Alpine.store('settings', { open: false, censored: false });
    }
  },
}))
