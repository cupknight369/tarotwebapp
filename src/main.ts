import Alpine from 'alpinejs'
import './input.css'

import { initAuthStore } from './stores/authStore.js'
import { initSettingsStore } from './stores/settingsStore.js'
import './components/ScaleComponent'
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
  initSettingsStore()
  Alpine.start()
})()
