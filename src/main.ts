import Alpine from 'alpinejs'
import './input.css'

import { initAuthStore } from './stores/authStore'
import './components/CanvasComponent'
import './components/DialogComponent'
import './components/SettingsComponent'
import './components/LoginPageComponent'
import './components/AuthComponent'

// Global Alpine setup
declare global {
  interface Window { Alpine: typeof Alpine }
}

window.Alpine = Alpine
initAuthStore()
Alpine.start()