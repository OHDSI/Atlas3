/**
 * Locale Store - Pinia state management for i18n
 */

import { defineStore } from 'pinia'
import type {
  LocaleState,
  LocaleCode,
  LocaleFormat,
  TranslationCache,
  Translations,
} from '@/types/i18n'
import { i18nService } from '@/services/i18n'
import { logger } from '@/utils/logger'

const CACHE_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

// Atlas3-only keys (e.g. `route.*`) that don't exist in WebAPI's translation
// bundle. We keep the bundled en.json as a fallback layer and deep-merge any
// WebAPI bundle on top so missing keys still resolve.
let bundledFallback: Translations | null = null

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function deepMergeTranslations(base: Translations, override: Translations): Translations {
  const out: Record<string, unknown> = { ...base }
  for (const [key, val] of Object.entries(override)) {
    const existing = out[key]
    if (isPlainObject(existing) && isPlainObject(val)) {
      out[key] = deepMergeTranslations(existing as Translations, val as Translations)
    } else {
      out[key] = val
    }
  }
  return out as Translations
}

function withFallback(bundle: Translations): Translations {
  return bundledFallback ? deepMergeTranslations(bundledFallback, bundle) : bundle
}

export const useLocaleStore = defineStore('locale', {
  state: (): LocaleState => ({
    locale: 'en',
    translations: {},
    availableLocales: [],
    loading: false,
    error: null,
    translationCache: new Map<LocaleCode, TranslationCache>(),
    initialized: false,
  }),

  getters: {
    currentLocale: (state): LocaleCode => state.locale,

    isLoading: (state): boolean => state.loading,

    hasError: (state): boolean => state.error !== null,

    localeFormat: (state): LocaleFormat | undefined => {
      const cached = state.translationCache.get(state.locale)
      return cached?.bundle.format
    },
  },

  actions: {
    /**
     * Initialize i18n system on app startup
     */
    async initialize(): Promise<void> {
      try {
        // Load English translations immediately (bundled)
        await this.loadFallbackTranslations()

        // Set default locales in case WebAPI fails
        if (this.availableLocales.length === 0) {
          this.availableLocales = [{ code: 'en', name: 'English' }]
        }

        // Try to fetch available locales from WebAPI
        await this.fetchAvailableLocales()

        const savedLocale = localStorage.getItem('locale')
        const detectedLocale = this.detectBrowserLanguage()
        const initialLocale = savedLocale || detectedLocale || 'en'

        // Always fetch from WebAPI, even for English
        await this.changeLocale(initialLocale)

        // Mark as initialized after initial translations are loaded
        this.initialized = true
      } catch (error) {
        logger.error('LocaleStore', 'Failed to initialize locale store', error)
        this.error = 'Failed to initialize translations'
        // English fallback is already loaded
        this.initialized = true
      }
    },

    /**
     * Fetch available locales from WebAPI
     */
    async fetchAvailableLocales(): Promise<void> {
      try {
        const locales = await i18nService.fetchLocales()
        this.availableLocales = locales
      } catch (error) {
        logger.error('LocaleStore', 'Failed to fetch available locales', error)
        this.availableLocales = [{ code: 'en', name: 'English' }]
      }
    },

    /**
     * Fetch translation bundle for a locale
     */
    async fetchTranslations(locale: LocaleCode): Promise<void> {
      const cached = this.translationCache.get(locale)

      if (cached && this.isCacheValid(cached)) {
        this.translations = withFallback(cached.bundle.translations)
        return
      }

      const localStorageKey = `translations_${locale}`
      const cachedStr = localStorage.getItem(localStorageKey)
      if (cachedStr) {
        try {
          const cached = JSON.parse(cachedStr) as TranslationCache
          if (this.isCacheValid(cached)) {
            this.translationCache.set(locale, cached)
            this.translations = withFallback(cached.bundle.translations)
            return
          }
        } catch (error) {
          logger.error('LocaleStore', 'Failed to parse cached translations', error)
        }
      }

      this.loading = true
      this.error = null

      try {
        const bundle = await i18nService.fetchTranslations(locale)
        const cache: TranslationCache = {
          bundle,
          cachedAt: Date.now(),
          maxAge: CACHE_MAX_AGE,
        }

        this.translationCache.set(locale, cache)
        localStorage.setItem(localStorageKey, JSON.stringify(cache))
        this.translations = withFallback(bundle.translations)
      } catch (error) {
        logger.error('LocaleStore', `Failed to fetch translations for ${locale}`, error)
        this.error = `Failed to load ${locale} translations. Falling back to English.`

        // Show error notification
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(
            new CustomEvent('i18n-error', {
              detail: {
                message: this.error,
                locale,
              },
            })
          )
        }

        if (locale !== 'en') {
          await this.loadFallbackTranslations()
        }
      } finally {
        this.loading = false
      }
    },

    /**
     * Change application locale and update page title
     */
    async changeLocale(locale: LocaleCode): Promise<void> {
      if (!this.isLocaleAvailable(locale)) {
        logger.warn('LocaleStore', `Locale ${locale} not available, falling back to English`)
        locale = 'en'
      }

      await this.fetchTranslations(locale)
      this.locale = locale
      localStorage.setItem('locale', locale)

      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('lang', locale)
      }

      if (typeof window !== 'undefined' && window.dispatchEvent) {
        window.dispatchEvent(
          new CustomEvent('locale-changed', {
            detail: { locale },
          })
        )
      }
    },

    /**
     * Detect browser language
     */
    detectBrowserLanguage(): LocaleCode {
      const browserLang = navigator.language?.split('-')[0]?.toLowerCase() || 'en'
      return this.isLocaleAvailable(browserLang) ? browserLang : 'en'
    },

    /**
     * Check if locale is available
     */
    isLocaleAvailable(locale: LocaleCode): boolean {
      return this.availableLocales.some(l => l.code === locale)
    },

    /**
     * Check if cache is valid
     */
    isCacheValid(cache: TranslationCache): boolean {
      const age = Date.now() - cache.cachedAt
      return age < cache.maxAge
    },

    /**
     * Load fallback English translations
     */
    async loadFallbackTranslations(): Promise<void> {
      try {
        // Dynamic JSON import returns a module namespace; the actual content
        // is under `.default`. Spread to flatten in case future Vite versions
        // change the shape.
        const englishTranslations = await import('@/locales/en.json')
        const flat = (englishTranslations as { default?: Translations }).default
          ?? (englishTranslations as unknown as Translations)
        bundledFallback = flat
        this.translations = flat
      } catch (error) {
        logger.error('LocaleStore', 'Failed to load fallback translations', error)
        // Provide minimal fallback translations
        this.translations = {
          common: {
            error: 'Error',
            loading: 'Loading...',
            save: 'Save',
            cancel: 'Cancel',
          },
        }
      }
    },

    /**
     * Clear translation cache
     */
    clearCache(): void {
      this.translationCache.clear()
      Object.keys(localStorage)
        .filter(key => key.startsWith('translations_'))
        .forEach(key => localStorage.removeItem(key))
    },
  },
})
