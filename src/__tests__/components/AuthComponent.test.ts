/**
 * @vitest-environment happy-dom
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { VitestGlobalWithAlpineDataCapture } from '../helpers/alpineDataCapture.js';

const alpineStub = vi.hoisted(() =>
  (globalThis as unknown as VitestGlobalWithAlpineDataCapture).__vitestCreateAlpineDataCapture(
    'authComponent',
  ),
);

vi.mock('alpinejs', () => ({
  default: alpineStub.Alpine,
}));

/** Registers `authComponent` with Alpine (side effect). */
import '../../components/AuthComponent.js';

type AuthStore = {
  user: { email?: string } | null;
  error: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<unknown>;
  signInWithMagicLink: (email: string) => Promise<unknown>;
  clearError: () => void;
};

type AuthComponentInstance = {
  isAccountMenuOpen: boolean;
  isPassResetOpen: boolean;
  newPassword: string;
  confirmNewPassword: string;
  pwResetSuccessMessage: string;
  validationError: string;
  loginMode: 'password' | 'magiclink';
  email: string;
  password: string;
  magicLinkSent: boolean;
  readonly userEmail: string;
  resetLoginUi: () => void;
  logout: () => Promise<void>;
  toggleAccountMenu: () => void;
  togglePassResetForm: () => void;
  resetPassword: () => Promise<void>;
  setLoginMode: (mode: 'password' | 'magiclink') => void;
  submitPasswordLogin: () => Promise<void>;
  submitMagicLink: () => Promise<void>;
};

function createAuthStore(): AuthStore & {
  signOut: ReturnType<typeof vi.fn>;
  resetPassword: ReturnType<typeof vi.fn>;
  signInWithPassword: ReturnType<typeof vi.fn>;
  signInWithMagicLink: ReturnType<typeof vi.fn>;
  clearError: ReturnType<typeof vi.fn>;
} {
  return {
    user: null,
    error: null,
    loading: false,
    signOut: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue(undefined),
    signInWithPassword: vi.fn().mockResolvedValue(undefined),
    signInWithMagicLink: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
  } as unknown as AuthStore & {
    signOut: ReturnType<typeof vi.fn>;
    resetPassword: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signInWithMagicLink: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
  };
}

function mountComponent(auth: AuthStore): AuthComponentInstance {
  alpineStub.rawStores.auth = auth;
  const factory = alpineStub.getFactory();
  if (!factory) {
    throw new Error('authComponent factory was not registered');
  }
  return factory() as AuthComponentInstance;
}

describe('authComponent (AuthComponent.ts)', () => {
  beforeEach(() => {
    alpineStub.rawStores.auth = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes userEmail from the auth store', () => {
    const auth = createAuthStore();
    auth.user = { email: 'user@example.com' };
    const c = mountComponent(auth);
    expect(c.userEmail).toBe('user@example.com');

    auth.user = null;
    const c2 = mountComponent(auth);
    expect(c2.userEmail).toBe('');
  });

  it('resetLoginUi resets fields and clears auth errors', () => {
    const auth = createAuthStore();
    const c = mountComponent(auth);
    c.loginMode = 'magiclink';
    c.email = 'a@b.com';
    c.password = 'secret';
    c.magicLinkSent = true;
    c.validationError = 'x';
    c.resetLoginUi();
    expect(c.loginMode).toBe('password');
    expect(c.email).toBe('');
    expect(c.password).toBe('');
    expect(c.magicLinkSent).toBe(false);
    expect(c.validationError).toBe('');
    expect(auth.clearError).toHaveBeenCalled();
  });

  it('toggleAccountMenu closes the menu and resets login UI', () => {
    const auth = createAuthStore();
    const c = mountComponent(auth);
    expect(c.isAccountMenuOpen).toBe(false);
    c.toggleAccountMenu();
    expect(c.isAccountMenuOpen).toBe(true);
    c.email = 'dirty@example.com';
    c.toggleAccountMenu();
    expect(c.isAccountMenuOpen).toBe(false);
    expect(c.email).toBe('');
  });

  it('togglePassResetForm toggles and clears validationError', () => {
    const auth = createAuthStore();
    const c = mountComponent(auth);
    c.validationError = 'bad';
    c.togglePassResetForm();
    expect(c.isPassResetOpen).toBe(true);
    expect(c.validationError).toBe('');
    c.togglePassResetForm();
    expect(c.isPassResetOpen).toBe(false);
  });

  it('resetPassword sets validationError when Zod fails', async () => {
    const auth = createAuthStore();
    const c = mountComponent(auth);
    c.newPassword = 'short';
    c.confirmNewPassword = 'short';
    await c.resetPassword();
    expect(c.validationError.length).toBeGreaterThan(0);
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('resetPassword sets validationError when passwords do not match', async () => {
    const auth = createAuthStore();
    const c = mountComponent(auth);
    c.newPassword = 'abcdef';
    c.confirmNewPassword = 'abcdeg';
    await c.resetPassword();
    expect(c.validationError).toContain('match');
    expect(auth.resetPassword).not.toHaveBeenCalled();
  });

  it('resetPassword returns early when auth.error is set after reset', async () => {
    const auth = createAuthStore();
    auth.resetPassword.mockImplementation(() => {
      auth.error = 'Server said no';
    });
    const c = mountComponent(auth);
    c.newPassword = 'abcdef';
    c.confirmNewPassword = 'abcdef';
    c.isPassResetOpen = true;
    await c.resetPassword();
    expect(auth.resetPassword).toHaveBeenCalledWith('abcdef');
    expect(c.isPassResetOpen).toBe(true);
    expect(c.pwResetSuccessMessage).toBe('');
  });

  it('resetPassword closes the form and shows a timed success message', async () => {
    vi.useFakeTimers();
    const auth = createAuthStore();
    const c = mountComponent(auth);
    c.newPassword = 'abcdef';
    c.confirmNewPassword = 'abcdef';
    c.isPassResetOpen = true;
    await c.resetPassword();
    expect(c.isPassResetOpen).toBe(false);
    expect(c.pwResetSuccessMessage).toBe('Password changed successfully');
    vi.advanceTimersByTime(5000);
    expect(c.pwResetSuccessMessage).toBe('');
  });

  it('setLoginMode updates mode and clears errors', () => {
    const auth = createAuthStore();
    const c = mountComponent(auth);
    c.validationError = 'x';
    c.setLoginMode('magiclink');
    expect(c.loginMode).toBe('magiclink');
    expect(c.validationError).toBe('');
    expect(auth.clearError).toHaveBeenCalled();
  });

  it('submitPasswordLogin sets validationError for invalid input', async () => {
    const auth = createAuthStore();
    const c = mountComponent(auth);
    c.email = 'not-an-email';
    c.password = '';
    await c.submitPasswordLogin();
    expect(c.validationError.length).toBeGreaterThan(0);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('submitPasswordLogin signs in and resets UI on success', async () => {
    const auth = createAuthStore();
    const c = mountComponent(auth);
    c.email = ' ok@example.com ';
    c.password = 'secret';
    c.loginMode = 'magiclink';
    await c.submitPasswordLogin();
    expect(auth.signInWithPassword).toHaveBeenCalledWith('ok@example.com', 'secret');
    expect(c.email).toBe('');
    expect(c.loginMode).toBe('password');
  });

  it('submitPasswordLogin swallows sign-in rejection', async () => {
    const auth = createAuthStore();
    auth.signInWithPassword.mockRejectedValue(new Error('network'));
    const c = mountComponent(auth);
    c.email = 'ok@example.com';
    c.password = 'secret';
    await expect(c.submitPasswordLogin()).resolves.toBeUndefined();
    expect(c.email).toBe('ok@example.com');
  });

  it('submitMagicLink sets validationError for invalid email', async () => {
    const auth = createAuthStore();
    const c = mountComponent(auth);
    c.email = 'bad';
    await c.submitMagicLink();
    expect(c.validationError.length).toBeGreaterThan(0);
    expect(auth.signInWithMagicLink).not.toHaveBeenCalled();
  });

  it('submitMagicLink sends link and sets magicLinkSent', async () => {
    const auth = createAuthStore();
    const c = mountComponent(auth);
    c.email = 'magic@example.com';
    await c.submitMagicLink();
    expect(auth.signInWithMagicLink).toHaveBeenCalledWith('magic@example.com');
    expect(c.magicLinkSent).toBe(true);
  });

  it('submitMagicLink swallows magic-link rejection', async () => {
    const auth = createAuthStore();
    auth.signInWithMagicLink.mockRejectedValue(new Error('rate limit'));
    const c = mountComponent(auth);
    c.email = 'magic@example.com';
    await expect(c.submitMagicLink()).resolves.toBeUndefined();
    expect(c.magicLinkSent).toBe(false);
  });

  it('logout awaits signOut', async () => {
    const auth = createAuthStore();
    const c = mountComponent(auth);
    await c.logout();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });
});
