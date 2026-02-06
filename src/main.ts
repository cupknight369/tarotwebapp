import Alpine from 'alpinejs'
import './input.css'

import './components/CanvasComponent'
import './components/DialogComponent'
import './components/SettingsComponent'

// Global Alpine setup
declare global {
  interface Window { Alpine: typeof Alpine }
}

window.Alpine = Alpine
Alpine.start()