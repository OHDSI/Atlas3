/**
 * Locale Store Tests
 * Tests for i18n state management.
 *
 * All locales ship with the frontend bundle — there is no WebAPI i18n
 * round-trip anymore (WebAPI keeps its own i18n resources for classic
 * Atlas 2.x and backend-side messages).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLocaleStore } from '@/stores/locale'
import type { TranslationCache, TranslationBundle } from '@/types/i18n'

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/locales/en.json', () => ({
  default: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
    },
  },
}))

// ja deliberately omits `common.cancel` so tests can prove the bundled-English
// fallback layer fills keys a locale bundle doesn't carry.
vi.mock('@/locales/ja.json', () => ({
  default: {
    common: {
      save: '保存',
    },
  },
}))

vi.mock('@/locales/ko.json', () => ({
  default: { common: { save: '저장' } },
}))

vi.mock('@/locales/ru.json', () => ({
  default: { common: { save: 'Сохранить' } },
}))

vi.mock('@/locales/zh.json', () => ({
  default: { common: { save: '保存' } },
}))

// Arbitrary locale list used by availability/detection tests.
const mockLocales = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
]

// Mirrors BUNDLED_LOCALES in src/stores/locale.ts (ja deliberately last).
const bundledLocales = [
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
]

const mockTranslationBundle: TranslationBundle = {
  locale: 'es',
  translations: {
    common: {
      save: 'Guardar',
      cancel: 'Cancelar',
    },
  },
  format: {
    dateFormat: 'DD/MM/YYYY',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
  },
}

describe('Locale Store', () => {
  let originalLocalStorage: Storage
  let localStorageMock: { [key: string]: string }

  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()

    // Mock localStorage
    localStorageMock = {}
    originalLocalStorage = global.localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key]
        }),
        clear: vi.fn(() => {
          localStorageMock = {}
        }),
        key: vi.fn(),
        length: 0,
      },
      configurable: true,
    })

    // Mock navigator
    Object.defineProperty(global, 'navigator', {
      value: {
        language: 'en-US',
      },
      configurable: true,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(global, 'localStorage', {
      value: originalLocalStorage,
      configurable: true,
    })
  })

  describe('Initial State', () => {
    it('should have en locale initially', () => {
      const store = useLocaleStore()
      expect(store.locale).toBe('en')
    })

    it('should have empty translations initially', () => {
      const store = useLocaleStore()
      expect(store.translations).toEqual({})
    })

    it('should have empty available locales initially', () => {
      const store = useLocaleStore()
      expect(store.availableLocales).toEqual([])
    })

    it('should not be loading initially', () => {
      const store = useLocaleStore()
      expect(store.loading).toBe(false)
    })

    it('should not be initialized initially', () => {
      const store = useLocaleStore()
      expect(store.initialized).toBe(false)
    })
  })

  describe('Getters', () => {
    it('currentLocale should return locale', () => {
      const store = useLocaleStore()
      store.locale = 'es'
      expect(store.currentLocale).toBe('es')
    })

    it('isLoading should return loading state', () => {
      const store = useLocaleStore()
      store.loading = true
      expect(store.isLoading).toBe(true)
    })

    it('hasError should return true when error exists', () => {
      const store = useLocaleStore()
      store.error = 'Some error'
      expect(store.hasError).toBe(true)
    })

    it('hasError should return false when no error', () => {
      const store = useLocaleStore()
      expect(store.hasError).toBe(false)
    })

    it('localeFormat should return format from cache', () => {
      const store = useLocaleStore()
      store.locale = 'es'
      const cache: TranslationCache = {
        bundle: mockTranslationBundle,
        cachedAt: Date.now(),
        maxAge: 86400000,
      }
      store.translationCache.set('es', cache)

      expect(store.localeFormat).toEqual(mockTranslationBundle.format)
    })

    it('localeFormat should return undefined when not cached', () => {
      const store = useLocaleStore()
      expect(store.localeFormat).toBeUndefined()
    })
  })

  describe('initialize Action', () => {
    it('should load fallback translations and expose the bundled locales', async () => {
      const store = useLocaleStore()

      await store.initialize()

      expect(store.initialized).toBe(true)
      expect(store.availableLocales).toEqual(bundledLocales)
      expect(store.error).toBeNull()
    })

    it('should use saved locale from localStorage', async () => {
      const store = useLocaleStore()
      localStorageMock['locale'] = 'ja'

      await store.initialize()

      expect(store.locale).toBe('ja')
      expect((store.translations as { common: Record<string, string> }).common.save).toBe('保存')
    })

    it('should fall back to English when the saved locale is not bundled', async () => {
      const store = useLocaleStore()
      localStorageMock['locale'] = 'es'

      await store.initialize()

      expect(store.locale).toBe('en')
      expect((store.translations as { common: Record<string, string> }).common.save).toBe('Save')
    })

    it('initializes without any network dependency', async () => {
      const fetchSpy = vi.fn()
      vi.stubGlobal('fetch', fetchSpy)

      const store = useLocaleStore()
      await store.initialize()

      expect(store.initialized).toBe(true)
      expect(fetchSpy).not.toHaveBeenCalled()
      vi.unstubAllGlobals()
    })
  })

  describe('fetchTranslations Action', () => {
    it('should use cached translations if valid', async () => {
      const store = useLocaleStore()
      const cache: TranslationCache = {
        bundle: mockTranslationBundle,
        cachedAt: Date.now(),
        maxAge: 86400000,
      }
      store.translationCache.set('es', cache)

      await store.fetchTranslations('es')

      expect(store.translations).toEqual(mockTranslationBundle.translations)
    })

    it('should load bundled translations and cache them in memory', async () => {
      const store = useLocaleStore()
      await store.loadFallbackTranslations()

      await store.fetchTranslations('ja')

      const after = store.translations as { common: Record<string, string> }
      expect(after.common.save).toBe('保存')
      expect(store.translationCache.has('ja')).toBe(true)
      // Bundled loads never touch localStorage.
      expect(localStorage.setItem).not.toHaveBeenCalledWith(
        'translations_ja',
        expect.any(String)
      )
    })

    it('should keep English for a locale with no bundled translations', async () => {
      const store = useLocaleStore()
      await store.loadFallbackTranslations()

      await store.fetchTranslations('es')

      expect(store.locale).toBe('en')
      expect((store.translations as { common: Record<string, string> }).common.save).toBe('Save')
    })
  })

  describe('bundled-fallback merge', () => {
    it('fills keys missing from a locale bundle with bundled English', async () => {
      // The ja mock deliberately omits `common.cancel`; the bundled English
      // fallback layer must fill it so Atlas3-only keys never render as raw
      // i18n keys in partially translated locales.
      const store = useLocaleStore()
      await store.loadFallbackTranslations()

      await store.fetchTranslations('ja')

      const after = store.translations as { common: Record<string, string> }
      expect(after.common.save).toBe('保存') // ja override wins
      expect(after.common.cancel).toBe('Cancel') // fallback fills the gap
    })
  })

  describe('changeLocale Action', () => {
    it('should change locale and save to localStorage', async () => {
      const store = useLocaleStore()
      store.availableLocales = bundledLocales

      await store.changeLocale('ja')

      expect(store.locale).toBe('ja')
      expect(localStorage.setItem).toHaveBeenCalledWith('locale', 'ja')
    })

    it('should fallback to English for unavailable locale', async () => {
      const store = useLocaleStore()
      store.availableLocales = bundledLocales

      await store.changeLocale('de')

      expect(store.locale).toBe('en')
    })

    it('should switch between bundled locales in both directions', async () => {
      const store = useLocaleStore()
      store.availableLocales = bundledLocales
      await store.changeLocale('ja')
      expect((store.translations as { common: Record<string, string> }).common.save).toBe('保存')

      await store.changeLocale('en')

      expect(store.locale).toBe('en')
      expect((store.translations as { common: Record<string, string> }).common.save).toBe('Save')
    })

    it('should set the document html lang attribute', async () => {
      const store = useLocaleStore()
      store.availableLocales = bundledLocales

      await store.changeLocale('ja')

      expect(document.documentElement.getAttribute('lang')).toBe('ja')
    })

    it('should dispatch a locale-changed event on the window', async () => {
      const store = useLocaleStore()
      store.availableLocales = bundledLocales

      const listener = vi.fn()
      window.addEventListener('locale-changed', listener)

      await store.changeLocale('ja')

      expect(listener).toHaveBeenCalled()
      const evt = listener.mock.calls[0]?.[0] as CustomEvent<{ locale: string }>
      expect(evt.detail.locale).toBe('ja')

      window.removeEventListener('locale-changed', listener)
    })
  })

  describe('detectBrowserLanguage Action', () => {
    it('should detect browser language', () => {
      const store = useLocaleStore()
      store.availableLocales = mockLocales

      Object.defineProperty(global, 'navigator', {
        value: { language: 'es-ES' },
        configurable: true,
      })

      expect(store.detectBrowserLanguage()).toBe('es')
    })

    it('should fallback to English for unavailable language', () => {
      const store = useLocaleStore()
      store.availableLocales = mockLocales

      Object.defineProperty(global, 'navigator', {
        value: { language: 'de-DE' },
        configurable: true,
      })

      expect(store.detectBrowserLanguage()).toBe('en')
    })

    it('should handle missing navigator.language', () => {
      const store = useLocaleStore()
      store.availableLocales = mockLocales

      Object.defineProperty(global, 'navigator', {
        value: { language: undefined },
        configurable: true,
      })

      expect(store.detectBrowserLanguage()).toBe('en')
    })
  })

  describe('isLocaleAvailable Action', () => {
    it('should return true for available locale', () => {
      const store = useLocaleStore()
      store.availableLocales = mockLocales
      expect(store.isLocaleAvailable('es')).toBe(true)
    })

    it('should return false for unavailable locale', () => {
      const store = useLocaleStore()
      store.availableLocales = mockLocales
      expect(store.isLocaleAvailable('de')).toBe(false)
    })
  })

  describe('isCacheValid Action', () => {
    it('should return true for valid cache', () => {
      const store = useLocaleStore()
      const cache: TranslationCache = {
        bundle: mockTranslationBundle,
        cachedAt: Date.now(),
        maxAge: 86400000,
      }
      expect(store.isCacheValid(cache)).toBe(true)
    })

    it('should return false for expired cache', () => {
      const store = useLocaleStore()
      const cache: TranslationCache = {
        bundle: mockTranslationBundle,
        cachedAt: Date.now() - 100000000, // Older than maxAge
        maxAge: 86400000,
      }
      expect(store.isCacheValid(cache)).toBe(false)
    })
  })

  describe('loadFallbackTranslations Action', () => {
    it('should load English translations', async () => {
      const store = useLocaleStore()
      await store.loadFallbackTranslations()
      // The mock returns { common: { save: 'Save', cancel: 'Cancel' } }
      expect(store.translations).toBeDefined()
    })
  })

  describe('clearCache Action', () => {
    it('should clear translation cache and legacy localStorage entries', () => {
      const store = useLocaleStore()
      store.translationCache.set('es', {
        bundle: mockTranslationBundle,
        cachedAt: Date.now(),
        maxAge: 86400000,
      })
      localStorageMock['translations_es'] = 'cached'
      localStorageMock['translations_fr'] = 'cached'
      localStorageMock['other_key'] = 'should remain'

      // Override keys to return our mock keys
      Object.defineProperty(localStorage, 'key', {
        value: (i: number) => Object.keys(localStorageMock)[i],
      })
      Object.keys(localStorageMock).forEach(() => {}) // trigger

      store.clearCache()

      expect(store.translationCache.size).toBe(0)
    })
  })
})
