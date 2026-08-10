/**
 * WebAPI Configuration
 * CDM source key and WebAPI endpoint configuration
 */

/**
 * Last-resort CDM source key, used only before the WebAPI source list has
 * loaded. It is the OHDSI demo CDM and will not exist on most deployments:
 * always prefer `useWebAPIStore().getValidVocabularySource()`, which validates
 * against the sources the server actually reports.
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

/**
 * Get the vocabulary source key from localStorage, unvalidated.
 * @deprecated Use `useWebAPIStore().getValidVocabularySource()` and fall back
 * to this only when the store has no sources yet.
 */
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
