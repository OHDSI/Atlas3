/**
 * Locale Store - Pinia state management for i18n
 * Feature: 008-translation-support
 */

import { defineStore } from 'pinia'
import type {
  LocaleState,
  LocaleCode,
  LocaleFormat,
  TranslationCache
} from '@/types/i18n'
import { i18nService } from '@/services/i18n'

const CACHE_MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours

export const useLocaleStore = defineStore('locale', {
  state: (): LocaleState => ({
    locale: 'en',
    translations: {},
    availableLocales: [],
    loading: false,
    error: null,
    translationCache: new Map<LocaleCode, TranslationCache>()
  }),

  getters: {
    currentLocale: (state): LocaleCode => state.locale,
    
    isLoading: (state): boolean => state.loading,
    
    hasError: (state): boolean => state.error !== null,
    
    localeFormat: (state): LocaleFormat | undefined => {
      const cached = state.translationCache.get(state.locale)
      return cached?.bundle.format
    }
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
          this.availableLocales = [
            { code: 'en', name: 'English' },
            { code: 'de', name: 'Deutsch' },
            { code: 'fr', name: 'Français' },
            { code: 'es', name: 'Español' }
          ]
        }
        
        // Try to fetch available locales from WebAPI
        await this.fetchAvailableLocales()
        
        const savedLocale = localStorage.getItem('locale')
        const detectedLocale = this.detectBrowserLanguage()
        const initialLocale = savedLocale || detectedLocale || 'en'
        
        // Always fetch from WebAPI, even for English
        await this.changeLocale(initialLocale)
      } catch (error) {
        console.error('Failed to initialize locale store:', error)
        this.error = 'Failed to initialize translations'
        // English fallback is already loaded
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
        console.error('Failed to fetch available locales:', error)
        this.availableLocales = [
          { code: 'en', name: 'English' },
          { code: 'de', name: 'Deutsch' },
          { code: 'fr', name: 'Français' },
          { code: 'es', name: 'Español' }
        ]
      }
    },

    /**
     * Fetch translation bundle for a locale
     */
    async fetchTranslations(locale: LocaleCode): Promise<void> {
      const cached = this.translationCache.get(locale)
      
      if (cached && this.isCacheValid(cached)) {
        this.translations = cached.bundle.translations
        return
      }

      const localStorageKey = `translations_${locale}`
      const cachedStr = localStorage.getItem(localStorageKey)
      if (cachedStr) {
        try {
          const cached = JSON.parse(cachedStr) as TranslationCache
          if (this.isCacheValid(cached)) {
            this.translationCache.set(locale, cached)
            this.translations = cached.bundle.translations
            return
          }
        } catch (error) {
          console.error('Failed to parse cached translations:', error)
        }
      }

      this.loading = true
      this.error = null
      
      try {
        const bundle = await i18nService.fetchTranslations(locale)
        const cache: TranslationCache = {
          bundle,
          cachedAt: Date.now(),
          maxAge: CACHE_MAX_AGE
        }
        
        this.translationCache.set(locale, cache)
        localStorage.setItem(localStorageKey, JSON.stringify(cache))
        this.translations = bundle.translations
      } catch (error) {
        console.error(`Failed to fetch translations for ${locale}:`, error)
        this.error = `Failed to load ${locale} translations. Falling back to English.`
        
        // T030: Show error notification (snackbar/toast)
        if (typeof window !== 'undefined' && window.dispatchEvent) {
          window.dispatchEvent(new CustomEvent('i18n-error', {
            detail: {
              message: this.error,
              locale
            }
          }))
        }
        
        if (locale !== 'en') {
          await this.loadFallbackTranslations()
        }
      } finally {
        this.loading = false
      }
    },

    /**
     * Change application locale
     * T045: FR-022: Update page title and metadata on language change
     */
    async changeLocale(locale: LocaleCode): Promise<void> {
      if (!this.isLocaleAvailable(locale)) {
        console.warn(`Locale ${locale} not available, falling back to English`)
        locale = 'en'
      }

      await this.fetchTranslations(locale)
      this.locale = locale
      localStorage.setItem('locale', locale)
      
      // T045: Update page title with locale
      if (typeof document !== 'undefined') {
        const currentTitle = document.title
        const baseTitle = currentTitle.split(' | ')[0] || 'Atlas'
        document.title = `${baseTitle} | ${locale.toUpperCase()}`
        document.documentElement.lang = locale
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
        // Import English translations directly
        const englishTranslations = await import('@/locales/en.json')
        this.translations = englishTranslations.default || englishTranslations
      } catch (error) {
        console.error('Failed to load fallback translations:', error)
        // Provide minimal fallback translations
        this.translations = {
          common: {
            error: 'Error',
            loading: 'Loading...',
            save: 'Save',
            cancel: 'Cancel'
          }
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
    }
  }
})
