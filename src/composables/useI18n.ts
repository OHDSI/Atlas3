/**
 * useI18n Composable - Translation function for Vue components
 */

import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import { useLocaleStore } from '@/stores/locale'
import { logger } from '@/utils/logger'
import type { UseI18nReturn, LocaleCode, Locale, TranslationParams, LocaleFormat } from '@/types/i18n'

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): string | undefined {
  const keys = path.split('.')
  let value = obj

  for (const key of keys) {
    if (value === undefined || value === null) {
      return undefined
    }
    value = value[key]
  }

  return typeof value === 'string' ? value : undefined
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
 * Get translation value directly (for use in v-bind, function calls, etc.)
 */
function getTranslation(
  localeStore: any,
  key: string,
  defaultValueOrParams?: string | TranslationParams,
  params?: TranslationParams
): string {
  // Handle overloaded parameters
  let defaultValue = ''
  let translationParams: TranslationParams | undefined

  if (typeof defaultValueOrParams === 'object') {
    // Called as t(key, params)
    translationParams = defaultValueOrParams
  } else if (typeof defaultValueOrParams === 'string') {
    // Called as t(key, defaultValue) or t(key, defaultValue, params)
    defaultValue = defaultValueOrParams
    translationParams = params
  }

  let translation = getNestedValue(localeStore.translations, key)

  // Fallback to English
  if (!translation) {
    const englishBundle = localeStore.translationCache.get('en')
    if (englishBundle) {
      translation = getNestedValue(englishBundle.bundle.translations, key)
    }

    // Log missing translation in dev mode
    // Only warn if translations have been initialized to avoid noise during app startup
    if (!translation && localeStore.initialized) {
      logger.warn('i18n', `Missing translation for key: "${key}" in locale: ${localeStore.locale}`)
    }
  }

  // Fallback to default value or key itself
  if (!translation) {
    translation = defaultValue || key
  }

  // Parameter interpolation
  if (translationParams) {
    translation = interpolate(translation, translationParams)
  }

  return translation
}

/**
 * Main i18n composable
 */
export function useI18n(): UseI18nReturn {
  const localeStore = useLocaleStore()

  /**
   * Translation function with fallback chain (returns ComputedRef for reactivity)
   * Fallback chain: current locale → English → default value → key
   *
   * Overloaded signatures:
   * - t(key)
   * - t(key, params)
   * - t(key, defaultValue)
   * - t(key, defaultValue, params)
   */
  const t = (
    key: string,
    defaultValueOrParams?: string | TranslationParams,
    params?: TranslationParams
  ): ComputedRef<string> => {
    return computed(() => getTranslation(localeStore, key, defaultValueOrParams, params))
  }

  /**
   * Translation value function (non-reactive, returns string directly)
   * Use for v-bind attributes, function calls, or when reactivity is not needed
   * 
   * Overloaded signatures:
   * - tv(key)
   * - tv(key, params)
   * - tv(key, defaultValue)
   * - tv(key, defaultValue, params)
   */
  const tv = (
    key: string,
    defaultValueOrParams?: string | TranslationParams,
    params?: TranslationParams
  ): string => {
    return getTranslation(localeStore, key, defaultValueOrParams, params)
  }

  const locale = computed((): LocaleCode => localeStore.locale)

  const availableLocales = computed((): Locale[] => localeStore.availableLocales)

  const changeLocale = async (newLocale: LocaleCode): Promise<void> => {
    await localeStore.changeLocale(newLocale)
  }

  const loading = computed((): boolean => localeStore.loading)

  const error = computed((): string | null => localeStore.error)

  const format = computed((): LocaleFormat | undefined => localeStore.localeFormat)

  return {
    t,
    tv,
    locale,
    availableLocales,
    changeLocale,
    loading,
    error,
    format
  }
}
