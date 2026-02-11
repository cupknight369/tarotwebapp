import Alpine from 'alpinejs'

Alpine.data('authComponent', () => ({
  get auth() {
    return Alpine.store('auth') as {
      user: { email?: string } | null
      signOut: () => Promise<void>
    }
  },

  get userEmail(): string {
    return this.auth.user?.email ?? ''
  },

  async logout() {
    await this.auth.signOut()
    window.location.href = '/auth'
  }
}))
