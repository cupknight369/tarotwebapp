import Alpine from 'alpinejs'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

export async function initAuthStore() {
  const authStore = {
    user: null as User | null,
    session: null as Session | null,
    loading: true,
    error: null as string | null,

    get isAuthenticated(): boolean {
      return this.user !== null
    },

    get isEmailConfirmed(): boolean {
      return Boolean(this.user?.email_confirmed_at)
    },

    async init() {
      const { data: { session } } = await supabase.auth.getSession()
      this.session = session
      this.user = session?.user ?? null
      this.loading = false

      supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
        this.session = session
        this.user = session?.user ?? null
      })
    },

    async signInWithPassword(email: string, password: string) {
      this.error = null
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        this.error = error.message
        throw error
      }
      this.user = data.user
      this.session = data.session
      return data
    },

    async signInWithMagicLink(email: string) {
      this.error = null
      const { data, error } = await supabase.auth.signInWithOtp({ email, 
        options: { 
          shouldCreateUser: false,
          emailRedirectTo: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : undefined
        } 
      })
      if (error) {
        this.error = error.message
        throw error
      }
      // Magic link sent - user will complete sign-in via email
      return data
    },

    async signOut() {
      this.error = null
      await supabase.auth.signOut()
      this.user = null
      this.session = null
    },

    async refreshSession() {
      const { data: { session } } = await supabase.auth.getSession()
      this.session = session
      this.user = session?.user ?? null
    },

    async resetPassword(password: string) {
      const { data, error } = await supabase.auth.updateUser({ password })
      if (error) {
        this.error = error.message;
        throw error;
      }

      this.error = null;
    },

    clearError() {
      this.error = null
    }
  }

  Alpine.store('auth', authStore)
  await authStore.init()
}
