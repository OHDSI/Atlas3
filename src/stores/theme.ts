/**
 * Theme Store
 * Owns the light/dark/system preference and resolves it against the OS setting.
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_STORAGE_KEY = 'atlas.theme'

const MODES: ThemeMode[] = ['light', 'dark', 'system']

function readStored(): ThemeMode | null {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return MODES.includes(raw as ThemeMode) ? (raw as ThemeMode) : null
  } catch {
    return null
  }
}

export const useThemeStore = defineStore('theme', () => {
  const preference = ref<ThemeMode>('system')
  const systemPrefersDark = ref(false)
  let initialized = false

  const resolved = computed<'light' | 'dark'>(() => {
    if (preference.value === 'system') return systemPrefersDark.value ? 'dark' : 'light'
    return preference.value
  })

  function initialize(fallback: ThemeMode = 'system') {
    if (initialized) return
    initialized = true
    preference.value = readStored() ?? fallback

    if (typeof matchMedia !== 'function') return
    const query = matchMedia('(prefers-color-scheme: dark)')
    systemPrefersDark.value = query.matches
    query.addEventListener('change', (event) => {
      systemPrefersDark.value = event.matches
    })
  }

  function setPreference(mode: ThemeMode) {
    preference.value = mode
    try {
      localStorage.setItem(THEME_STORAGE_KEY, mode)
    } catch {
      // Private-browsing mode denies writes; the in-memory preference still applies.
    }
  }

  return { preference, resolved, initialize, setPreference }
})
