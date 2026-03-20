import Alpine from 'alpinejs'
import type { SettingsStoreState } from '../types/settings.js'

const STORAGE_KEY = 'app-settings'

function loadFromStorage(): { censored: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { censored: false }
    const parsed = JSON.parse(raw)
    return { censored: Boolean(parsed?.censored) }
  } catch {
    return { censored: false }
  }
}

export function initSettingsStore() {
  const { censored } = loadFromStorage()
  Alpine.store('settings', { open: false, censored })
  Alpine.effect(() => {
    const settings = Alpine.store('settings') as SettingsStoreState
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ censored: settings.censored }))
  })
}
