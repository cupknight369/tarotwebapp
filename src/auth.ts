import Alpine from 'alpinejs'
import './input.css'

import { supabase } from './lib/supabase'
import { initAuthStore } from './stores/authStore'
import './components/LoginPageComponent'

declare global {
  interface Window { Alpine: typeof Alpine }
}

window.Alpine = Alpine

;(async () => {
  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      window.location.replace('/')
      return
    }
  }

  await initAuthStore()
  const auth = Alpine.store('auth') as { user: unknown; loading: boolean }

  if (auth.user) {
    window.location.href = '/'
    return
  }

  Alpine.start()
})()
