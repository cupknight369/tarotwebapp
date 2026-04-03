import Alpine from 'alpinejs';
import { supabase } from '../lib/supabase.js';
import type { User, Session } from '@supabase/supabase-js';

/**
 * Registers the `auth` Alpine store and hydrates session state from Supabase.
 */
export async function initAuthStore(): Promise<void> {
  const authStore = {
    user: null as User | null,
    session: null as Session | null,
    loading: true,
    error: null as string | null,

    get isAuthenticated(): boolean {
      return this.user !== null;
    },

    get isEmailConfirmed(): boolean {
      return Boolean(this.user?.email_confirmed_at);
    },

    async init() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        this.session = session;
        this.user = session?.user ?? null;
        supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
          this.session = session;
          this.user = session?.user ?? null;
        });
      } catch (e) {
        console.warn('auth init: session unavailable', e);
        this.session = null;
        this.user = null;
        this.error = null;
      } finally {
        this.loading = false;
      }
    },

    async signInWithPassword(email: string, password: string) {
      this.error = null;
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        this.error = error.message;
        throw error;
      }
      this.user = data.user;
      this.session = data.session;
      return data;
    },

    async signInWithMagicLink(email: string) {
      this.error = null;
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          emailRedirectTo: import.meta.env.VITE_APP_URL + '/auth/callback',
        },
      });
      if (error) {
        this.error = error.message;
        throw error;
      }
      // Magic link sent - user will complete sign-in via email
      return data;
    },

    async signOut() {
      this.error = null;
      await supabase.auth.signOut();
      this.user = null;
      this.session = null;
    },

    async refreshSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      this.session = session;
      this.user = session?.user ?? null;
    },

    async resetPassword(password: string) {
      const { data, error } = await supabase.auth.updateUser({ password });
      if (error) {
        this.error = error.message;
        throw error;
      }

      this.error = null;
    },

    clearError() {
      this.error = null;
    },
  };

  Alpine.store('auth', authStore);
  await authStore.init();
}
