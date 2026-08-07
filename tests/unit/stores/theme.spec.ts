import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useThemeStore, THEME_STORAGE_KEY } from '@/stores/theme'

function mockMatchMedia(matches: boolean) {
  const listeners: Array<(e: { matches: boolean }) => void> = []
  const mql = {
    matches,
    addEventListener: (_: string, cb: (e: { matches: boolean }) => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  )
  return {
    emit(next: boolean) {
      mql.matches = next
      listeners.forEach((cb) => cb({ matches: next }))
    },
  }
}

describe('theme store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('defaults to system when nothing is stored', () => {
    mockMatchMedia(false)
    const store = useThemeStore()
    store.initialize()
    expect(store.preference).toBe('system')
  })

  it('resolves system to dark when the OS prefers dark', () => {
    mockMatchMedia(true)
    const store = useThemeStore()
    store.initialize()
    expect(store.resolved).toBe('dark')
  })

  it('resolves system to light when the OS prefers light', () => {
    mockMatchMedia(false)
    const store = useThemeStore()
    store.initialize()
    expect(store.resolved).toBe('light')
  })

  it('follows a live OS change while the preference is system', () => {
    const media = mockMatchMedia(false)
    const store = useThemeStore()
    store.initialize()
    media.emit(true)
    expect(store.resolved).toBe('dark')
  })

  it('ignores the OS once an explicit preference is set', () => {
    const media = mockMatchMedia(false)
    const store = useThemeStore()
    store.initialize()
    store.setPreference('dark')
    media.emit(false)
    expect(store.resolved).toBe('dark')
  })

  it('persists an explicit preference', () => {
    mockMatchMedia(false)
    const store = useThemeStore()
    store.initialize()
    store.setPreference('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  it('restores a stored preference over the fallback', () => {
    mockMatchMedia(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    const store = useThemeStore()
    store.initialize('light')
    expect(store.preference).toBe('dark')
  })

  it('uses the deployment fallback when nothing is stored', () => {
    mockMatchMedia(false)
    const store = useThemeStore()
    store.initialize('dark')
    expect(store.preference).toBe('dark')
  })

  it('ignores an unrecognised stored value', () => {
    mockMatchMedia(false)
    localStorage.setItem(THEME_STORAGE_KEY, 'neon')
    const store = useThemeStore()
    store.initialize()
    expect(store.preference).toBe('system')
  })
})
