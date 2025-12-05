/**
 * Test Helper: i18n Mock
 * Provides real translations from en.json for consistent test mocking
 */

import { computed, ref } from 'vue'
import type { ComputedRef } from 'vue'
import translations from '@/locales/en.json'
import type { TranslationParams, LocaleCode, Locale, LocaleFormat, UseI18nReturn } from '@/types/i18n'

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
      date: 'MM/DD/YYYY',
      datetime: 'MM/DD/YYYY HH:mm',
      number: { decimal: '.', thousands: ',' },
    })),
  }
}

/**
 * Mock module for vi.mock('@/composables/useI18n')
 */
export const mockUseI18n = {
  useI18n: () => createI18nMock()
}
