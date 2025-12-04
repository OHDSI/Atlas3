/**
 * Unit Tests: Locale Store
 * Tests for src/stores/locale.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useLocaleStore } from '@/stores/locale'

// Mock dependencies
vi.mock('@/services/i18n', () => ({
  i18nService: {
    fetchLocales: vi.fn(),
    fetchTranslations: vi.fn(),
  },
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    key: vi.fn(),
    length: 0,
  }
})()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('useLocaleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('starts with English locale', () => {
      const store = useLocaleStore()
      expect(store.locale).toBe('en')
    })

    it('starts with empty translations', () => {
      const store = useLocaleStore()
      expect(store.translations).toEqual({})
    })

    it('starts with empty available locales', () => {
      const store = useLocaleStore()
      expect(store.availableLocales).toEqual([])
    })

    it('starts not loading', () => {
      const store = useLocaleStore()
      expect(store.loading).toBe(false)
    })

    it('starts without errors', () => {
      const store = useLocaleStore()
      expect(store.error).toBeNull()
    })

    it('starts not initialized', () => {
      const store = useLocaleStore()
      expect(store.initialized).toBe(false)
    })
  })

  describe('getters', () => {
    describe('currentLocale', () => {
      it('returns current locale', () => {
        const store = useLocaleStore()
        expect(store.currentLocale).toBe('en')

        store.locale = 'es'
        expect(store.currentLocale).toBe('es')
      })
    })

    describe('isLoading', () => {
      it('returns loading state', () => {
        const store = useLocaleStore()
        expect(store.isLoading).toBe(false)

        store.loading = true
        expect(store.isLoading).toBe(true)
      })
    })

    describe('hasError', () => {
      it('returns false when no error', () => {
        const store = useLocaleStore()
        expect(store.hasError).toBe(false)
      })

      it('returns true when error exists', () => {
        const store = useLocaleStore()
        store.error = 'Some error'
        expect(store.hasError).toBe(true)
      })
    })

    describe('localeFormat', () => {
      it('returns undefined when no cache', () => {
        const store = useLocaleStore()
        expect(store.localeFormat).toBeUndefined()
      })

      it('returns format from cached bundle', () => {
        const store = useLocaleStore()
        const format = { date: 'DD/MM/YYYY', datetime: 'DD/MM/YYYY HH:mm' }
        store.translationCache.set('en', {
          bundle: { translations: {}, format },
          cachedAt: Date.now(),
          maxAge: 86400000,
        })
        expect(store.localeFormat).toEqual(format)
      })
    })
  })

  describe('actions', () => {
    describe('initialize', () => {
      it('loads fallback translations and fetches available locales', async () => {
        const { i18nService } = await import('@/services/i18n')
        vi.mocked(i18nService.fetchLocales).mockResolvedValue([
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Spanish' },
        ])
        vi.mocked(i18nService.fetchTranslations).mockResolvedValue({
          translations: { common: { test: 'Test' } },
        })

        const store = useLocaleStore()
        await store.initialize()

        expect(i18nService.fetchLocales).toHaveBeenCalled()
        expect(store.initialized).toBe(true)
      })

      it('sets default English locale if WebAPI fails', async () => {
        const { i18nService } = await import('@/services/i18n')
        vi.mocked(i18nService.fetchLocales).mockRejectedValue(new Error('Network error'))
        vi.mocked(i18nService.fetchTranslations).mockResolvedValue({
          translations: {},
        })

        const store = useLocaleStore()
        await store.initialize()

        expect(store.availableLocales).toEqual([{ code: 'en', name: 'English' }])
      })

      it('uses saved locale from localStorage', async () => {
        localStorageMock.setItem('locale', 'es')

        const { i18nService } = await import('@/services/i18n')
        vi.mocked(i18nService.fetchLocales).mockResolvedValue([
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Spanish' },
        ])
        vi.mocked(i18nService.fetchTranslations).mockResolvedValue({
          translations: {},
        })

        const store = useLocaleStore()
        await store.initialize()

        expect(store.locale).toBe('es')
      })
    })

    describe('fetchAvailableLocales', () => {
      it('fetches and stores available locales', async () => {
        const { i18nService } = await import('@/services/i18n')
        const mockLocales = [
          { code: 'en', name: 'English' },
          { code: 'fr', name: 'French' },
        ]
        vi.mocked(i18nService.fetchLocales).mockResolvedValue(mockLocales)

        const store = useLocaleStore()
        await store.fetchAvailableLocales()

        expect(store.availableLocales).toEqual(mockLocales)
      })

      it('falls back to English on error', async () => {
        const { i18nService } = await import('@/services/i18n')
        vi.mocked(i18nService.fetchLocales).mockRejectedValue(new Error('Network error'))

        const store = useLocaleStore()
        await store.fetchAvailableLocales()

        expect(store.availableLocales).toEqual([{ code: 'en', name: 'English' }])
      })
    })

    describe('fetchTranslations', () => {
      it('uses cached translations if valid', async () => {
        const { i18nService } = await import('@/services/i18n')
        const cachedBundle = {
          bundle: { translations: { cached: 'value' } },
          cachedAt: Date.now(),
          maxAge: 86400000,
        }

        const store = useLocaleStore()
        store.translationCache.set('en', cachedBundle as never)

        await store.fetchTranslations('en')

        expect(i18nService.fetchTranslations).not.toHaveBeenCalled()
        expect(store.translations).toEqual({ cached: 'value' })
      })

      it('fetches translations from service', async () => {
        const { i18nService } = await import('@/services/i18n')
        const mockBundle = {
          translations: { fetched: 'value' },
        }
        vi.mocked(i18nService.fetchTranslations).mockResolvedValue(mockBundle as never)

        const store = useLocaleStore()
        await store.fetchTranslations('en')

        expect(i18nService.fetchTranslations).toHaveBeenCalledWith('en')
        expect(store.translations).toEqual({ fetched: 'value' })
      })

      it('caches fetched translations', async () => {
        const { i18nService } = await import('@/services/i18n')
        vi.mocked(i18nService.fetchTranslations).mockResolvedValue({
          translations: {},
        } as never)

        const store = useLocaleStore()
        await store.fetchTranslations('es')

        expect(store.translationCache.has('es')).toBe(true)
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'translations_es',
          expect.any(String)
        )
      })

      it('sets loading state during fetch', async () => {
        const { i18nService } = await import('@/services/i18n')
        let resolvePromise: (value: never) => void
        const promise = new Promise<never>((resolve) => {
          resolvePromise = resolve
        })
        vi.mocked(i18nService.fetchTranslations).mockReturnValue(promise)

        const store = useLocaleStore()
        const fetchPromise = store.fetchTranslations('en')

        expect(store.loading).toBe(true)

        resolvePromise!({ translations: {} } as never)
        await fetchPromise

        expect(store.loading).toBe(false)
      })

      it('falls back to English on fetch error', async () => {
        const { i18nService } = await import('@/services/i18n')
        vi.mocked(i18nService.fetchTranslations).mockRejectedValue(new Error('Fetch failed'))

        const store = useLocaleStore()
        await store.fetchTranslations('es')

        expect(store.error).toContain('Failed to load es translations')
      })
    })

    describe('changeLocale', () => {
      it('changes locale and fetches translations', async () => {
        const { i18nService } = await import('@/services/i18n')
        vi.mocked(i18nService.fetchTranslations).mockResolvedValue({
          translations: { test: 'value' },
        } as never)

        const store = useLocaleStore()
        store.availableLocales = [
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Spanish' },
        ]

        await store.changeLocale('es')

        expect(store.locale).toBe('es')
        expect(i18nService.fetchTranslations).toHaveBeenCalledWith('es')
      })

      it('saves locale to localStorage', async () => {
        const { i18nService } = await import('@/services/i18n')
        vi.mocked(i18nService.fetchTranslations).mockResolvedValue({
          translations: {},
        } as never)

        const store = useLocaleStore()
        store.availableLocales = [{ code: 'en', name: 'English' }]

        await store.changeLocale('en')

        expect(localStorageMock.setItem).toHaveBeenCalledWith('locale', 'en')
      })

      it('falls back to English for unavailable locale', async () => {
        const { i18nService } = await import('@/services/i18n')
        vi.mocked(i18nService.fetchTranslations).mockResolvedValue({
          translations: {},
        } as never)

        const store = useLocaleStore()
        store.availableLocales = [{ code: 'en', name: 'English' }]

        await store.changeLocale('xx')

        expect(store.locale).toBe('en')
      })
    })

    describe('detectBrowserLanguage', () => {
      it('detects browser language', () => {
        const store = useLocaleStore()
        store.availableLocales = [
          { code: 'en', name: 'English' },
          { code: 'fr', name: 'French' },
        ]

        // Mock navigator.language
        Object.defineProperty(navigator, 'language', {
          value: 'fr-FR',
          configurable: true,
        })

        expect(store.detectBrowserLanguage()).toBe('fr')
      })

      it('falls back to English for unavailable language', () => {
        const store = useLocaleStore()
        store.availableLocales = [{ code: 'en', name: 'English' }]

        Object.defineProperty(navigator, 'language', {
          value: 'de-DE',
          configurable: true,
        })

        expect(store.detectBrowserLanguage()).toBe('en')
      })
    })

    describe('isLocaleAvailable', () => {
      it('returns true for available locale', () => {
        const store = useLocaleStore()
        store.availableLocales = [
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Spanish' },
        ]

        expect(store.isLocaleAvailable('en')).toBe(true)
        expect(store.isLocaleAvailable('es')).toBe(true)
      })

      it('returns false for unavailable locale', () => {
        const store = useLocaleStore()
        store.availableLocales = [{ code: 'en', name: 'English' }]

        expect(store.isLocaleAvailable('de')).toBe(false)
      })
    })

    describe('isCacheValid', () => {
      it('returns true for fresh cache', () => {
        const store = useLocaleStore()
        const cache = {
          bundle: { translations: {} },
          cachedAt: Date.now(),
          maxAge: 86400000,
        }

        expect(store.isCacheValid(cache as never)).toBe(true)
      })

      it('returns false for expired cache', () => {
        const store = useLocaleStore()
        const cache = {
          bundle: { translations: {} },
          cachedAt: Date.now() - 100000000,
          maxAge: 86400000,
        }

        expect(store.isCacheValid(cache as never)).toBe(false)
      })
    })

    describe('loadFallbackTranslations', () => {
      it('loads English translations', async () => {
        const store = useLocaleStore()
        await store.loadFallbackTranslations()

        // Should have loaded something
        expect(store.translations).toBeDefined()
      })
    })

    describe('clearCache', () => {
      it('clears translation cache', () => {
        const store = useLocaleStore()
        store.translationCache.set('en', {} as never)
        store.translationCache.set('es', {} as never)
        localStorageMock.setItem('translations_en', '{}')
        localStorageMock.setItem('translations_es', '{}')

        // Mock Object.keys to return our keys
        const originalKeys = Object.keys
        vi.spyOn(Object, 'keys').mockImplementation((obj) => {
          if (obj === localStorage) {
            return ['translations_en', 'translations_es', 'other_key']
          }
          return originalKeys(obj)
        })

        store.clearCache()

        expect(store.translationCache.size).toBe(0)
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('translations_en')
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('translations_es')
      })
    })
  })
})
