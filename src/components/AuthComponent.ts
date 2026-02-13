import Alpine from 'alpinejs'

Alpine.data('authComponent', () => ({
  isAccountMenuOpen: false,
  isPassResetOpen: false,
  newPassword: '',
  confirmNewPassword: '',
  pwResetSuccessMessage: '',

  get auth() {
    return Alpine.store('auth') as {
      user: { email?: string } | null
      error: string | null
      signOut: () => Promise<void>
      resetPassword: (password: string) => Promise<void>
    }
  },

  get userEmail(): string {
    return this.auth.user?.email ?? ''
  },

  async logout() {
    await this.auth.signOut()
    window.location.href = '/auth'
  },

  toggleAccountMenu() {
    this.isAccountMenuOpen = !this.isAccountMenuOpen;
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
}))
