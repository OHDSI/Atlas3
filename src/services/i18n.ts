/**
 * i18n Service - WebAPI integration for translations
 */

import { z } from 'zod'
import { logger } from '@/utils/logger'
import type { Locale, TranslationBundle, LocaleCode, Translations } from '@/types/i18n'
import { WEBAPI_BASE_URL } from '@/config/webapi'

const API_BASE_URL = WEBAPI_BASE_URL

// Zod schemas for runtime validation
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

    let data: unknown
    try {
      data = await response.json()
    } catch (parseError) {
      logger.error('i18n', 'Failed to parse JSON response', parseError)
      throw new Error('Invalid response format from locales API')
    }

    const rawLocales = (data as { data?: unknown }).data || data
    
    // Validate with Zod
    const parsed = LocaleArraySchema.safeParse(rawLocales)
    if (!parsed.success) {
      logger.error('i18n', 'Invalid locales response', parsed.error)
      throw new Error('Invalid locales format from WebAPI')
    }

    return parsed.data
  } catch (error) {
    logger.error('i18n', 'Error fetching locales', error)
    return [
      { code: 'en', name: 'English' }
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

    let data: unknown
    try {
      data = await response.json()
    } catch (parseError) {
      logger.error('i18n', 'Failed to parse JSON response', parseError)
      throw new Error(`Invalid response format from translations API for ${locale}`)
    }

    // WebAPI returns translations directly, not wrapped in { data: ... }
    const rawTranslations = data
    
    // Validate translations with Zod
    const translationsValidation = TranslationsSchema.safeParse(rawTranslations)
    if (!translationsValidation.success) {
      logger.error('i18n', 'Invalid translations response', translationsValidation.error)
      throw new Error(`Invalid translation format for ${locale}`)
    }

    const translations: Translations = translationsValidation.data

    // Check if data has format property (type-safe access)
    const dataObj = data as Record<string, unknown>
    const rawFormat = dataObj?.format

    // Validate format if present
    let validatedFormat: z.infer<typeof LocaleFormatSchema> = undefined
    if (rawFormat) {
      const formatValidation = LocaleFormatSchema.safeParse(rawFormat)
      if (formatValidation.success) {
        validatedFormat = formatValidation.data
      } else {
        logger.warn('i18n', 'Invalid format data, skipping', formatValidation.error)
      }
    }

    return {
      locale,
      translations,
      format: validatedFormat,
      fetchedAt: new Date()
    }
  } catch (error) {
    logger.error('i18n', `Error fetching translations for ${locale}`, error)
    throw error
  }
}

export const i18nService = {
  fetchLocales,
  fetchTranslations
}
