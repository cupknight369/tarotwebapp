import Alpine from 'alpinejs'
import './input.css'

import { initAuthStore } from './stores/authStore'
import './components/CanvasComponent'
import './components/DialogComponent'
import './components/SettingsComponent'
import './components/AuthComponent'

declare global {
  interface Window { Alpine: typeof Alpine }
}

window.Alpine = Alpine

;(async () => {
  await initAuthStore()
  Alpine.start()
})()
