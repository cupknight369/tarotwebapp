import Alpine from 'alpinejs'
import type { SettingsStoreState } from '../types/settings.js'

const STORAGE_KEY = 'app-settings'

function loadFromStorage(): { censored: boolean; showDeckTitleOnCanvas: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { censored: false, showDeckTitleOnCanvas: true }
    const parsed = JSON.parse(raw)
    return {
      censored: Boolean(parsed?.censored),
      showDeckTitleOnCanvas:
        parsed?.showDeckTitleOnCanvas === undefined
          ? true
          : Boolean(parsed?.showDeckTitleOnCanvas),
    }
  } catch {
    return { censored: false, showDeckTitleOnCanvas: true }
  }
}

export function initSettingsStore() {
  const { censored, showDeckTitleOnCanvas } = loadFromStorage()
  Alpine.store('settings', { open: false, censored, showDeckTitleOnCanvas })
  Alpine.effect(() => {
    const settings = Alpine.store('settings') as SettingsStoreState
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        censored: settings.censored,
        showDeckTitleOnCanvas: settings.showDeckTitleOnCanvas,
      })
    )
  })
}
