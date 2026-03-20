import Alpine from 'alpinejs'
import './input.css'

import { initAuthStore } from './stores/authStore.js'
import './components/LoginPageComponent'

declare global {
  interface Window { Alpine: typeof Alpine }
}

window.Alpine = Alpine

;(async () => {
  await initAuthStore()
  const auth = Alpine.store('auth') as { user: unknown; loading: boolean }

  if (auth.user) {
    window.location.href = '/'
    return
  }

  Alpine.start()
})()
