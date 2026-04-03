import Alpine from 'alpinejs';

Alpine.data('authComponent', () => ({
  isAccountMenuOpen: false,
  isPassResetOpen: false,
  newPassword: '',
  confirmNewPassword: '',
  pwResetSuccessMessage: '',

  loginMode: 'password' as 'password' | 'magiclink',
  email: '',
  password: '',
  magicLinkSent: false,

  get auth() {
    return Alpine.store('auth') as {
      user: { email?: string } | null;
      error: string | null;
      loading: boolean;
      signOut: () => Promise<void>;
      resetPassword: (password: string) => Promise<void>;
      signInWithPassword: (email: string, password: string) => Promise<unknown>;
      signInWithMagicLink: (email: string) => Promise<unknown>;
      clearError: () => void;
    };
  },

  get userEmail(): string {
    return this.auth.user?.email ?? '';
  },

  resetLoginUi() {
    this.loginMode = 'password';
    this.email = '';
    this.password = '';
    this.magicLinkSent = false;
    this.auth.clearError();
  },

  async logout() {
    await this.auth.signOut();
  },

  toggleAccountMenu() {
    this.isAccountMenuOpen = !this.isAccountMenuOpen;
    if (!this.isAccountMenuOpen) {
      this.resetLoginUi();
    }
  },

  togglePassResetForm() {
    this.isPassResetOpen = !this.isPassResetOpen;
  },

  async resetPassword() {
    await this.auth.resetPassword(this.newPassword);

    if (this.auth.error) {
      return;
    }

    this.isPassResetOpen = false;
    this.pwResetSuccessMessage = 'Password changed successfully';
    setTimeout(() => {
      this.pwResetSuccessMessage = '';
    }, 5000);
  },

  setLoginMode(mode: 'password' | 'magiclink') {
    this.loginMode = mode;
    this.auth.clearError();
  },

  async submitPasswordLogin() {
    if (!this.email.trim() || !this.password) return;
    try {
      await this.auth.signInWithPassword(this.email.trim(), this.password);
      this.resetLoginUi();
    } catch (_e) {
      // Error shown via auth.error
    }
  },

  async submitMagicLink() {
    if (!this.email.trim()) return;
    try {
      await this.auth.signInWithMagicLink(this.email.trim());
      this.magicLinkSent = true;
    } catch (_e) {
      // Error shown via auth.error
    }
  },
}));
