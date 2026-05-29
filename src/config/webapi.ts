/**
 * WebAPI Configuration
 * CDM source key and WebAPI endpoint configuration
 */

/**
 * Default CDM source key for vocabulary operations
 * This can be overridden in components or stores if multiple sources are needed
 */
export const DEFAULT_SOURCE_KEY = 'SYNPUF1K'

import { getAppConfig } from '@/config/app-config.loader'

/**
 * WebAPI base URL
 * Resolved from runtime configuration (config-local.json).
 */
export function getWebAPIBaseUrl(): string {
  return getAppConfig().api.url
}

/** @deprecated Use getWebAPIBaseUrl() instead */
export const WEBAPI_BASE_URL = '/WebAPI'

/** Get vocabulary source key from localStorage or default */
export function getSourceKey(): string {
  const selectedVocabulary = localStorage.getItem('selectedVocabulary')

  if (
    selectedVocabulary &&
    selectedVocabulary.trim() !== '' &&
    selectedVocabulary !== 'null' &&
    selectedVocabulary !== 'undefined'
  ) {
    return selectedVocabulary
  }

  return DEFAULT_SOURCE_KEY
}
