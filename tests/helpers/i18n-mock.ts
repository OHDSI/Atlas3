/**
 * Test Helper: i18n Mock
 * Provides real translations from en.json for consistent test mocking
 */

import { computed } from 'vue'
import type { ComputedRef } from 'vue'
import translations from '@/locales/en.json'

/**
 * Get nested translation value by dot-notation key
 * e.g., 'common.search' -> translations.common.search
 */
function getTranslation(key: string): string {
  const keys = key.split('.')
  let value: any = translations

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k]
    } else {
      // Return key if translation not found
      return key
    }
  }

  return typeof value === 'string' ? value : key
}

/**
 * Create mock i18n composable with real translations
 */
export function createI18nMock() {
  return {
    t: (key: string): ComputedRef<string> => computed(() => getTranslation(key)),
    tv: (key: string): string => getTranslation(key)
  }
}

/**
 * Mock module for vi.mock('@/composables/useI18n')
 */
export const mockUseI18n = {
  useI18n: () => createI18nMock()
}
