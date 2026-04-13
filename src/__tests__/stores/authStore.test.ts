import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Session, User } from '@supabase/supabase-js';

const alpineStore = vi.hoisted(() => vi.fn());
const getSession = vi.hoisted(() => vi.fn());
const onAuthStateChange = vi.hoisted(() => vi.fn());
const signInWithPassword = vi.hoisted(() => vi.fn());
const signInWithOtp = vi.hoisted(() => vi.fn());
const signOut = vi.hoisted(() => vi.fn());
const updateUser = vi.hoisted(() => vi.fn());
const logError = vi.hoisted(() => vi.fn());

vi.mock('alpinejs', () => ({
  default: {
    store: alpineStore,
  },
}));

vi.mock('../../lib/logError.js', () => ({
  logError,
}));

vi.mock('../../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getSession,
      onAuthStateChange,
      signInWithPassword,
      signInWithOtp,
      signOut,
      updateUser,
    },
  },
}));

import { initAuthStore } from '../../stores/authStore.js';

type AuthStore = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  readonly isAuthenticated: boolean;
  readonly isEmailConfirmed: boolean;
  init: () => Promise<void>;
  signInWithPassword: (email: string, password: string) => Promise<unknown>;
  signInWithMagicLink: (email: string) => Promise<unknown>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  resetPassword: (password: string) => Promise<void>;
  clearError: () => void;
};

function userStub(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  } as User;
}

function sessionStub(user: User | null): Session {
  return {
    access_token: 'at',
    refresh_token: 'rt',
    expires_in: 3600,
    expires_at: 9999999999,
    token_type: 'bearer',
    user: user as User,
  } as Session;
}

function getRegisteredStore(): AuthStore {
  const call = alpineStore.mock.calls.find((c) => c[0] === 'auth');
  expect(call).toBeDefined();
  return call![1] as AuthStore;
}

describe('authStore.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    getSession.mockResolvedValue({ data: { session: null } });
    onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: null,
    });
    signInWithOtp.mockResolvedValue({ data: {}, error: null });
    signOut.mockResolvedValue(undefined);
    updateUser.mockResolvedValue({ data: { user: userStub() }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('registers the auth store and completes init with session and user', async () => {
    const u = userStub();
    const s = sessionStub(u);
    getSession.mockResolvedValue({ data: { session: s } });

    await initAuthStore();

    expect(alpineStore).toHaveBeenCalledWith('auth', expect.any(Object));
    const store = getRegisteredStore();
    expect(store.session).toBe(s);
    expect(store.user).toBe(u);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
    expect(onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(onAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('updates session and user when onAuthStateChange fires', async () => {
    await initAuthStore();
    const store = getRegisteredStore();
    const listener = onAuthStateChange.mock.calls[0][0] as (
      event: string,
      session: Session | null,
    ) => void;

    const u2 = userStub({ id: 'user-2' });
    const s2 = sessionStub(u2);
    listener('TOKEN_REFRESHED', s2);

    expect(store.session).toBe(s2);
    expect(store.user).toBe(u2);
  });

  it('clears user when onAuthStateChange receives null session', async () => {
    const u = userStub();
    getSession.mockResolvedValue({ data: { session: sessionStub(u) } });
    await initAuthStore();
    const store = getRegisteredStore();
    const listener = onAuthStateChange.mock.calls[0][0] as (
      _e: string,
      session: Session | null,
    ) => void;

    listener('SIGNED_OUT', null);

    expect(store.session).toBeNull();
    expect(store.user).toBeNull();
  });

  it('sets user to null when session has no user', async () => {
    const s = sessionStub(userStub());
    Object.assign(s, { user: undefined });
    getSession.mockResolvedValue({ data: { session: s } });

    await initAuthStore();
    const store = getRegisteredStore();

    expect(store.session).toBe(s);
    expect(store.user).toBeNull();
  });

  it('logs, clears session, and finishes loading when getSession throws', async () => {
    const err = new Error('network');
    getSession.mockRejectedValue(err);

    await initAuthStore();
    const store = getRegisteredStore();

    expect(logError).toHaveBeenCalledWith('authStore.init.getSession', err);
    expect(store.session).toBeNull();
    expect(store.user).toBeNull();
    expect(store.error).toBeNull();
    expect(store.loading).toBe(false);
  });

  it('signInWithPassword updates user and session on success', async () => {
    await initAuthStore();
    const store = getRegisteredStore();
    const u = userStub();
    const s = sessionStub(u);
    signInWithPassword.mockResolvedValue({ data: { user: u, session: s }, error: null });

    const data = await store.signInWithPassword('a@b.com', 'secret');

    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'secret',
    });
    expect(data).toEqual({ user: u, session: s });
    expect(store.user).toBe(u);
    expect(store.session).toBe(s);
    expect(store.error).toBeNull();
  });

  it('signInWithPassword sets error and rethrows on failure', async () => {
    await initAuthStore();
    const store = getRegisteredStore();
    const authError = { message: 'Invalid login', name: 'AuthError' };
    signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: authError,
    });

    await expect(store.signInWithPassword('x', 'y')).rejects.toBe(authError);
    expect(store.error).toBe('Invalid login');
  });

  it('signInWithMagicLink uses VITE_APP_URL for emailRedirectTo', async () => {
    vi.stubEnv('VITE_APP_URL', 'https://app.test');

    await initAuthStore();
    const store = getRegisteredStore();

    await store.signInWithMagicLink('hi@example.com');

    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'hi@example.com',
      options: {
        shouldCreateUser: false,
        emailRedirectTo: 'https://app.test/auth/callback',
      },
    });
    expect(store.error).toBeNull();
  });

  it('signInWithMagicLink sets error and rethrows on failure', async () => {
    vi.stubEnv('VITE_APP_URL', 'https://app.test');
    const authError = { message: 'Rate limited', name: 'AuthError' };
    signInWithOtp.mockResolvedValue({ data: {}, error: authError });

    await initAuthStore();
    const store = getRegisteredStore();

    await expect(store.signInWithMagicLink('x@y.z')).rejects.toBe(authError);
    expect(store.error).toBe('Rate limited');
  });

  it('signOut clears user and session', async () => {
    const u = userStub();
    getSession.mockResolvedValue({ data: { session: sessionStub(u) } });
    await initAuthStore();
    const store = getRegisteredStore();

    await store.signOut();

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(store.user).toBeNull();
    expect(store.session).toBeNull();
    expect(store.error).toBeNull();
  });

  it('refreshSession re-reads session from Supabase', async () => {
    await initAuthStore();
    const store = getRegisteredStore();
    const u = userStub({ id: 'refreshed' });
    const s = sessionStub(u);
    getSession.mockResolvedValue({ data: { session: s } });

    await store.refreshSession();

    expect(getSession).toHaveBeenCalled();
    expect(store.session).toBe(s);
    expect(store.user).toBe(u);
  });

  it('refreshSession clears user when getSession returns null session', async () => {
    const u = userStub();
    getSession.mockResolvedValue({ data: { session: sessionStub(u) } });
    await initAuthStore();
    const store = getRegisteredStore();
    getSession.mockResolvedValue({ data: { session: null } });

    await store.refreshSession();

    expect(store.session).toBeNull();
    expect(store.user).toBeNull();
  });

  it('refreshSession sets user to null when session has no user', async () => {
    await initAuthStore();
    const store = getRegisteredStore();
    const s = sessionStub(userStub());
    Object.assign(s, { user: undefined });
    getSession.mockResolvedValue({ data: { session: s } });

    await store.refreshSession();

    expect(store.session).toBe(s);
    expect(store.user).toBeNull();
  });

  it('resetPassword clears error on success', async () => {
    await initAuthStore();
    const store = getRegisteredStore();
    store.error = 'prior';
    updateUser.mockResolvedValue({ data: { user: userStub() }, error: null });

    await store.resetPassword('new-pass');

    expect(updateUser).toHaveBeenCalledWith({ password: 'new-pass' });
    expect(store.error).toBeNull();
  });

  it('resetPassword sets error and rethrows on failure', async () => {
    const authError = { message: 'Weak password', name: 'AuthError' };
    updateUser.mockResolvedValue({ data: { user: null }, error: authError });

    await initAuthStore();
    const store = getRegisteredStore();

    await expect(store.resetPassword('bad')).rejects.toBe(authError);
    expect(store.error).toBe('Weak password');
  });

  it('clearError nulls error', async () => {
    await initAuthStore();
    const store = getRegisteredStore();
    store.error = 'something';

    store.clearError();

    expect(store.error).toBeNull();
  });

  it('isAuthenticated is false without user and true with user', async () => {
    await initAuthStore();
    const store = getRegisteredStore();
    expect(store.isAuthenticated).toBe(false);

    const u = userStub();
    store.user = u;
    expect(store.isAuthenticated).toBe(true);
  });

  it('isEmailConfirmed reflects email_confirmed_at', async () => {
    await initAuthStore();
    const store = getRegisteredStore();

    store.user = userStub({ email_confirmed_at: undefined });
    expect(store.isEmailConfirmed).toBe(false);

    store.user = userStub({ email_confirmed_at: '2026-02-01T00:00:00.000Z' });
    expect(store.isEmailConfirmed).toBe(true);
  });
});
