import Alpine from 'alpinejs'

Alpine.data('loginPageComponent', () => ({
  loginMode: 'password' as 'password' | 'magiclink',
  email: '',
  password: '',
  magicLinkSent: false,

  get auth() {
    return Alpine.store('auth') as {
      user: { email?: string } | null
      loading: boolean
      error: string | null
      signInWithPassword: (email: string, password: string) => Promise<unknown>
      signInWithMagicLink: (email: string) => Promise<unknown>
      clearError: () => void
    }
  },

  async submitPasswordLogin() {
    if (!this.email.trim() || !this.password) return
    try {
      await this.auth.signInWithPassword(this.email.trim(), this.password)
    } catch (_e) {
      // Error shown via auth.error
    }
  },

  async submitMagicLink() {
    if (!this.email.trim()) return
    try {
      await this.auth.signInWithMagicLink(this.email.trim())
      this.magicLinkSent = true
    } catch (_e) {
      // Error shown via auth.error
    }
  },

  setLoginMode(mode: 'password' | 'magiclink') {
    this.loginMode = mode
    this.auth.clearError()
  }
}))
