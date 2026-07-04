/**
 * Locale Store - Pinia state management for i18n
 *
 * All locales ship with the frontend bundle — the WebAPI /i18n endpoints are
 * NOT consulted. (WebAPI keeps its own i18n resources for classic Atlas 2.x
 * and its backend-side messages; Atlas3's translations live in src/locales/.)
 */

import { defineStore } from 'pinia'
import type {
  LocaleState,
  Locale,
  LocaleCode,
  LocaleFormat,
  TranslationBundle,
  TranslationCache,
  Translations,
} from '@/types/i18n'
import { logger } from '@/utils/logger'

const CACHE_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

// Locales whose translations ship with the frontend bundle — the full set
// offered in the language selector. ko/ru/zh were imported from WebAPI's i18n
// bundles; they cover the Atlas-2.x-era keys, with Atlas3-only keys falling
// back to bundled English. ja is deliberately last in the picker.
const BUNDLED_LOCALES: Locale[] = [
  { code: 'en', name: 'English' },
  { code: 'ko', name: '한국어' },
  { code: 'ru', name: 'Русский' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
]

// Lazy loaders for the bundled translation files. `en` also doubles as the
// fallback layer (see loadFallbackTranslations).
const bundledTranslationLoaders: Record<LocaleCode, () => Promise<Translations>> = {
  en: () => import('@/locales/en.json').then(unwrapTranslations),
  ja: () => import('@/locales/ja.json').then(unwrapTranslations),
  ko: () => import('@/locales/ko.json').then(unwrapTranslations),
  ru: () => import('@/locales/ru.json').then(unwrapTranslations),
  zh: () => import('@/locales/zh.json').then(unwrapTranslations),
}

// Atlas3-only keys (e.g. `route.*`) that don't exist in the imported ko/ru/zh
// bundles. We keep the bundled en.json as a fallback layer and deep-merge the
// selected locale's bundle on top so missing keys still resolve.
let bundledFallback: Translations | null = null

// Dynamic JSON import returns a module namespace; the actual content is under
// `.default`. Spread to flatten in case future Vite versions change the shape.
function unwrapTranslations(mod: unknown): Translations {
  return (
    (mod as { default?: Translations }).default ?? (mod as unknown as Translations)
  )
}

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

        this.availableLocales = [...BUNDLED_LOCALES]

        const savedLocale = localStorage.getItem('locale')
        const detectedLocale = this.detectBrowserLanguage()
        const initialLocale = savedLocale || detectedLocale || 'en'

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
     * Load the translation bundle for a locale (from the frontend bundle).
     */
    async fetchTranslations(locale: LocaleCode): Promise<void> {
      const cached = this.translationCache.get(locale)

      if (cached && this.isCacheValid(cached)) {
        this.translations = withFallback(cached.bundle.translations)
        return
      }

      const bundledLoader = bundledTranslationLoaders[locale]
      if (!bundledLoader) {
        logger.warn('LocaleStore', `No bundled translations for ${locale}, keeping English`)
        await this.loadFallbackTranslations()
        return
      }

      this.loading = true
      this.error = null
      try {
        const translations = await bundledLoader()
        const bundle: TranslationBundle = {
          locale,
          translations,
          fetchedAt: new Date(),
        }
        this.translationCache.set(locale, {
          bundle,
          cachedAt: Date.now(),
          maxAge: CACHE_MAX_AGE,
        })
        this.translations = withFallback(translations)
      } catch (error) {
        logger.error('LocaleStore', `Failed to load bundled translations for ${locale}`, error)
        this.error = `Failed to load ${locale} translations. Falling back to English.`
        await this.loadFallbackTranslations()
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
        const flat = unwrapTranslations(await import('@/locales/en.json'))
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
      // Remote-bundle localStorage caches from older builds — clean them up.
      Object.keys(localStorage)
        .filter(key => key.startsWith('translations_'))
        .forEach(key => localStorage.removeItem(key))
    },
  },
})
