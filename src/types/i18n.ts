/**
 * Internationalization (i18n) Type Definitions
 */

import type { ComputedRef } from 'vue'

/**
 * ISO 639-1 language code (2 letters)
 */
export type LocaleCode = string

/**
 * Available language option
 */
export interface Locale {
  code: LocaleCode
  name: string
}

/**
 * Nested translation object structure
 */
export interface Translations {
  [domain: string]: string | Translations
}

/**
 * Locale-specific formatting rules
 */
export interface LocaleFormat {
  date: {
    datetime: string
    datetimeWithSeconds: string
    dateOnly: string
    timeOnly: string
  }
  number: {
    decimal: string
    thousands: string
    grouping: number[]
  }
  currency?: {
    symbol: string
    position: 'before' | 'after'
  }
}

/**
 * Complete translation bundle from WebAPI
 */
export interface TranslationBundle {
  locale: LocaleCode
  translations: Translations
  format?: LocaleFormat
  fetchedAt: Date
}

/**
 * Translation cache metadata
 */
export interface TranslationCache {
  bundle: TranslationBundle
  cachedAt: number
  maxAge: number
}

/**
 * Pinia store state
 */
export interface LocaleState {
  locale: LocaleCode
  translations: Translations
  availableLocales: Locale[]
  loading: boolean
  error: string | null
  translationCache: Map<LocaleCode, TranslationCache>
  initialized: boolean
}

/**
 * Translation function parameters
 */
export interface TranslationParams {
  [key: string]: string | number | boolean
}

/**
 * Translation function signature (reactive) - overloaded
 */
export interface TranslationFunction {
  (key: string): ComputedRef<string>
  (key: string, params: TranslationParams): ComputedRef<string>
  (key: string, defaultValue: string): ComputedRef<string>
  (key: string, defaultValue: string, params: TranslationParams): ComputedRef<string>
}

/**
 * Translation value function signature (non-reactive) - overloaded
 */
export interface TranslationValueFunction {
  (key: string): string
  (key: string, params: TranslationParams): string
  (key: string, defaultValue: string): string
  (key: string, defaultValue: string, params: TranslationParams): string
}

/**
 * i18n composable return type
 */
export interface UseI18nReturn {
  t: TranslationFunction
  tv: TranslationValueFunction
  locale: ComputedRef<LocaleCode>
  availableLocales: ComputedRef<Locale[]>
  changeLocale: (locale: LocaleCode) => Promise<void>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  format: ComputedRef<LocaleFormat | undefined>
}

/**
 * i18n service interface
 */
export interface I18nService {
  fetchLocales(): Promise<Locale[]>
  fetchTranslations(locale: LocaleCode): Promise<TranslationBundle>
}

/**
 * WebAPI response types
 */
export interface WebAPILocalesResponse {
  data: Locale[]
}

export interface WebAPITranslationsResponse {
  data: Translations
}
