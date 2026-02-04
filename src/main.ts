import Alpine from 'alpinejs'
import './input.css'

import './components/CanvasComponent'
import './components/DialogComponent'

// Global Alpine setup
declare global {
  interface Window { Alpine: typeof Alpine }
}

window.Alpine = Alpine
Alpine.start()