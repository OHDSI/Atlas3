/**
 * Locale-aware formatting utilities
 * Feature: 008-translation-support
 * FR-014: Implements Intl.DateTimeFormat for locale-aware date formatting
 */

import type { LocaleCode } from '@/types/i18n'

/**
 * Format number according to locale
 * FR-013: Locale-aware number formatting
 */
export function formatNumber(
  value: number,
  locale: LocaleCode = 'en',
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value)
  } catch (error) {
    console.error('Error formatting number:', error)
    return String(value)
  }
}

/**
 * Format date according to locale
 * FR-014: Locale-aware date formatting using Intl.DateTimeFormat
 */
export function formatDate(
  value: Date | string | number,
  locale: LocaleCode = 'en',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const date = value instanceof Date ? value : new Date(value)
    if (isNaN(date.getTime())) {
      return 'Invalid Date'
    }
    return new Intl.DateTimeFormat(locale, options).format(date)
  } catch (error) {
    console.error('Error formatting date:', error)
    return String(value)
  }
}

/**
 * Format date and time according to locale
 */
export function formatDateTime(
  value: Date | string | number,
  locale: LocaleCode = 'en'
): string {
  return formatDate(value, locale, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

/**
 * Format date only (no time) according to locale
 */
export function formatDateOnly(
  value: Date | string | number,
  locale: LocaleCode = 'en'
): string {
  return formatDate(value, locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Format time only (no date) according to locale
 */
export function formatTimeOnly(
  value: Date | string | number,
  locale: LocaleCode = 'en'
): string {
  return formatDate(value, locale, {
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Format currency according to locale
 */
export function formatCurrency(
  value: number,
  locale: LocaleCode = 'en',
  currency: string = 'USD'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency
    }).format(value)
  } catch (error) {
    console.error('Error formatting currency:', error)
    return `${currency} ${value}`
  }
}

/**
 * Format percentage according to locale
 */
export function formatPercent(
  value: number,
  locale: LocaleCode = 'en',
  decimals: number = 0
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value)
  } catch (error) {
    console.error('Error formatting percent:', error)
    return `${(value * 100).toFixed(decimals)}%`
  }
}
