/**
 * WebAPI Configuration
 * CDM source key and WebAPI endpoint configuration
 */

/**
 * Default CDM source key for vocabulary operations
 * This can be overridden in components or stores if multiple sources are needed
 */
export const DEFAULT_SOURCE_KEY = 'SYNPUF1K'

/**
 * WebAPI base URL
 * Uses Vite proxy in development, environment variable in production
 */
export const WEBAPI_BASE_URL = import.meta.env.VITE_WEBAPI_URL || '/WebAPI'

/**
 * Get source key from environment or use default
 */
export function getSourceKey(): string {
  return import.meta.env.VITE_CDM_SOURCE_KEY || DEFAULT_SOURCE_KEY
}
