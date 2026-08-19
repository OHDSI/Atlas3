/**
 * Test Helper: i18n Mock
 * Provides real translations from en.json for consistent test mocking
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'
import type { TranslationParams, LocaleCode, Locale, LocaleFormat, UseI18nReturn } from '@/types/i18n'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const translations = JSON.parse(
  readFileSync(resolve(__dirname, '../../src/locales/en.json'), 'utf-8')
) as Record<string, unknown>

/**
 * Get nested translation value by dot-notation key
 * e.g., 'common.search' -> translations.common.search
 */
function getNestedTranslation(key: string): string {
  const keys = key.split('.')
  let value: unknown = translations

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = (value as Record<string, unknown>)[k]
    } else {
      // Return key if translation not found
      return key
    }
  }

  return typeof value === 'string' ? value : key
}

/**
 * Interpolate parameters into translation string
 */
function interpolate(template: string, params: TranslationParams): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match
  })
}

/**
 * Get translation with parameter support
 */
function getTranslation(
  key: string,
  defaultValueOrParams?: string | TranslationParams,
  params?: TranslationParams
): string {
  let translation = getNestedTranslation(key)

  // Handle overloaded parameters
  let translationParams: TranslationParams | undefined

  if (typeof defaultValueOrParams === 'object') {
    translationParams = defaultValueOrParams
  } else if (typeof defaultValueOrParams === 'string' && translation === key) {
    translation = defaultValueOrParams
    translationParams = params
  } else {
    translationParams = params
  }

  if (translationParams) {
    translation = interpolate(translation, translationParams)
  }

  return translation
}

/**
 * Create mock i18n composable with real translations
 * Matches the full UseI18nReturn interface
 */
export function createI18nMock(locale: LocaleCode = 'en'): UseI18nReturn {
  const currentLocale = ref<LocaleCode>(locale)
  const loadingRef = ref(false)
  const errorRef = ref<string | null>(null)

  return {
    t: (key: string, defaultValueOrParams?: string | TranslationParams, params?: TranslationParams): ComputedRef<string> =>
      computed(() => getTranslation(key, defaultValueOrParams, params)),
    tv: (key: string, defaultValueOrParams?: string | TranslationParams, params?: TranslationParams): string =>
      getTranslation(key, defaultValueOrParams, params),
    locale: computed(() => currentLocale.value),
    availableLocales: computed((): Locale[] => [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
    ]),
    changeLocale: async (newLocale: LocaleCode): Promise<void> => {
      currentLocale.value = newLocale
    },
    loading: computed(() => loadingRef.value),
    error: computed(() => errorRef.value),
    format: computed((): LocaleFormat | undefined => ({
      date: {
        datetime: 'MM/DD/YYYY HH:mm',
        datetimeWithSeconds: 'MM/DD/YYYY HH:mm:ss',
        dateOnly: 'MM/DD/YYYY',
        timeOnly: 'HH:mm',
      },
      number: { decimal: '.', thousands: ',', grouping: [3] },
    })),
  }
}

/**
 * Create mock i18n composable that returns key names (no actual translations)
 * Useful for unit tests where we only care that the correct i18n key is used,
 * not about the actual translated text. Returns format: "i18n:keyName"
 * 
 * This prevents tests from breaking when translation text changes,
 * since tests only verify the KEY, not the VALUE.
 */
export function createI18nKeyOnlyMock(locale: LocaleCode = 'en'): UseI18nReturn {
  const currentLocale = ref<LocaleCode>(locale)
  const loadingRef = ref(false)
  const errorRef = ref<string | null>(null)

  /**
   * Return just the key in format "i18n:keyName" to verify correct key is used
   */
  function getKeyOnlyTranslation(
    key: string,
    defaultValueOrParams?: string | TranslationParams
  ): string {
    // If a default value (non-object) is provided and key is not found, use default
    // Otherwise return the key itself prefixed with "i18n:"
    if (typeof defaultValueOrParams === 'string') {
      return `i18n:${key}`
    }
    return `i18n:${key}`
  }

  return {
    t: (key: string, defaultValueOrParams?: string | TranslationParams): ComputedRef<string> =>
      computed(() => getKeyOnlyTranslation(key, defaultValueOrParams)),
    tv: (key: string, defaultValueOrParams?: string | TranslationParams): string =>
      getKeyOnlyTranslation(key, defaultValueOrParams),
    locale: computed(() => currentLocale.value),
    availableLocales: computed((): Locale[] => [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
    ]),
    changeLocale: async (newLocale: LocaleCode): Promise<void> => {
      currentLocale.value = newLocale
    },
    loading: computed(() => loadingRef.value),
    error: computed(() => errorRef.value),
    format: computed((): LocaleFormat | undefined => ({
      date: {
        datetime: 'MM/DD/YYYY HH:mm',
        datetimeWithSeconds: 'MM/DD/YYYY HH:mm:ss',
        dateOnly: 'MM/DD/YYYY',
        timeOnly: 'HH:mm',
      },
      number: { decimal: '.', thousands: ',', grouping: [3] },
    })),
  }
}

/**
 * Mock module for vi.mock('@/composables/useI18n')
 */
export const mockUseI18n = {
  useI18n: () => createI18nMock()
}

/**
 * Mock module with key-only translations (recommended for unit tests)
 * Returns "i18n:keyName" format instead of actual translations
 */
export const mockUseI18nKeyOnly = {
  useI18n: () => createI18nKeyOnlyMock()
}
