import Alpine from 'alpinejs'
import './input.css'

import { initAuthStore } from './stores/authStore.js'
import { initSettingsStore } from './stores/settingsStore.js'
import './components/CanvasScaleComponent'
import './components/CanvasCardComponent'
import './components/CanvasTextLabelComponent'
import './components/CanvasComponent'
import './components/CanvasStateComponent'
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
