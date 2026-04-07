import Alpine from 'alpinejs';
import {
  magicLinkEmailSchema,
  passwordLoginSchema,
  passwordResetSchema,
} from '../validation/auth.js';
import { zodFirstIssue } from '../validation/zodErrors.js';

Alpine.data('authComponent', () => ({
  isAccountMenuOpen: false,
  isPassResetOpen: false,
  newPassword: '',
  confirmNewPassword: '',
  pwResetSuccessMessage: '',
  validationError: '',

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
    this.validationError = '';
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
    this.validationError = '';
  },

  async resetPassword() {
    const parsed = passwordResetSchema.safeParse({
      password: this.newPassword,
      confirm: this.confirmNewPassword,
    });
    if (!parsed.success) {
      this.validationError = zodFirstIssue(parsed.error);
      return;
    }
    this.validationError = '';
    await this.auth.resetPassword(parsed.data.password);

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
    this.validationError = '';
    this.auth.clearError();
  },

  async submitPasswordLogin() {
    const parsed = passwordLoginSchema.safeParse({ email: this.email, password: this.password });
    if (!parsed.success) {
      this.validationError = zodFirstIssue(parsed.error);
      return;
    }
    this.validationError = '';
    try {
      await this.auth.signInWithPassword(parsed.data.email, parsed.data.password);
      this.resetLoginUi();
    } catch {
      // Error shown via auth.error
    }
  },

  async submitMagicLink() {
    const parsed = magicLinkEmailSchema.safeParse({ email: this.email });
    if (!parsed.success) {
      this.validationError = zodFirstIssue(parsed.error);
      return;
    }
    this.validationError = '';
    try {
      await this.auth.signInWithMagicLink(parsed.data.email);
      this.magicLinkSent = true;
    } catch {
      // Error shown via auth.error
    }
  },
}));
