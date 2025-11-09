/**
 * i18n Service - WebAPI integration for translations
 * Feature: 008-translation-support
 */

import { z } from 'zod'
import type { Locale, TranslationBundle, LocaleCode, Translations } from '@/types/i18n'

const API_BASE_URL = import.meta.env.VITE_WEBAPI_URL || ''

// T029: Zod schemas for runtime validation
const LocaleSchema = z.object({
  code: z.string().length(2).regex(/^[a-z]{2}$/),
  name: z.string().min(1)
})

const LocaleArraySchema = z.array(LocaleSchema)

const TranslationsSchema = z.record(z.any())

const LocaleFormatSchema = z.object({
  date: z.object({
    datetime: z.string(),
    datetimeWithSeconds: z.string(),
    dateOnly: z.string(),
    timeOnly: z.string()
  }),
  number: z.object({
    decimal: z.string(),
    thousands: z.string(),
    grouping: z.array(z.number())
  }),
  currency: z.object({
    symbol: z.string(),
    position: z.enum(['before', 'after'])
  }).optional()
}).optional()

/**
 * Fetch available locales from WebAPI
 */
export async function fetchLocales(): Promise<Locale[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/i18n/locales`)
    if (!response.ok) {
      throw new Error(`Failed to fetch locales: ${response.statusText}`)
    }
    const data = await response.json()
    const rawLocales = data.data || data
    
    // T029: Validate with Zod
    const parsed = LocaleArraySchema.safeParse(rawLocales)
    if (!parsed.success) {
      console.error('Invalid locales response:', parsed.error)
      throw new Error('Invalid locales format from WebAPI')
    }
    
    return parsed.data
  } catch (error) {
    console.error('Error fetching locales:', error)
    return [
      { code: 'en', name: 'English' },
      { code: 'de', name: 'Deutsch' },
      { code: 'fr', name: 'Français' },
      { code: 'es', name: 'Español' }
    ]
  }
}

/**
 * Fetch translation bundle for a specific locale
 */
export async function fetchTranslations(locale: LocaleCode): Promise<TranslationBundle> {
  try {
    const response = await fetch(`${API_BASE_URL}/i18n?lang=${locale}`)
    if (!response.ok) {
      throw new Error(`Failed to fetch translations for ${locale}: ${response.statusText}`)
    }
    const data = await response.json()
    
    // WebAPI returns translations directly, not wrapped in { data: ... }
    const rawTranslations = data
    
    // T029: Validate translations with Zod
    const translationsValidation = TranslationsSchema.safeParse(rawTranslations)
    if (!translationsValidation.success) {
      console.error('Invalid translations response:', translationsValidation.error)
      throw new Error(`Invalid translation format for ${locale}`)
    }
    
    const translations: Translations = translationsValidation.data
    
    // Validate format if present
    if (data.format) {
      const formatValidation = LocaleFormatSchema.safeParse(data.format)
      if (!formatValidation.success) {
        console.warn('Invalid format data, skipping:', formatValidation.error)
      }
    }
    
    return {
      locale,
      translations,
      format: data.format,
      fetchedAt: new Date()
    }
  } catch (error) {
    console.error(`Error fetching translations for ${locale}:`, error)
    throw error
  }
}

export const i18nService = {
  fetchLocales,
  fetchTranslations
}
