/**
 * Unit Tests: WebAPI Configuration
 * Tests for src/config/webapi.ts
 *
 * This test suite covers all exports from the webapi configuration:
 * - DEFAULT_SOURCE_KEY constant
 * - WEBAPI_BASE_URL constant with environment variable handling
 * - getSourceKey() function with localStorage integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('webapi.config', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear()
  })

  afterEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
  })

  describe('DEFAULT_SOURCE_KEY', () => {
    it('exports correct default source key value', async () => {
      const { DEFAULT_SOURCE_KEY } = await import('@/config/webapi')

      expect(DEFAULT_SOURCE_KEY).toBe('SYNPUF1K')
    })

    it('default source key is a non-empty string', async () => {
      const { DEFAULT_SOURCE_KEY } = await import('@/config/webapi')

      expect(typeof DEFAULT_SOURCE_KEY).toBe('string')
      expect(DEFAULT_SOURCE_KEY.length).toBeGreaterThan(0)
    })
  })

  describe('WEBAPI_BASE_URL', () => {
    it('uses VITE_WEBAPI_URL when environment variable is set', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', 'https://api.example.com/WebAPI')

      const { WEBAPI_BASE_URL } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('https://api.example.com/WebAPI')
    })

    it('uses default /WebAPI when VITE_WEBAPI_URL is empty string', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', '')

      const { WEBAPI_BASE_URL } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('/WebAPI')
    })

    it('handles custom WebAPI path', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', '/custom/api/path')

      const { WEBAPI_BASE_URL } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('/custom/api/path')
    })

    it('handles full URL with protocol and domain', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', 'https://ohdsi.example.org:8080/WebAPI')

      const { WEBAPI_BASE_URL } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('https://ohdsi.example.org:8080/WebAPI')
    })

    it('handles URL with trailing slash', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', 'https://api.example.com/WebAPI/')

      const { WEBAPI_BASE_URL } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('https://api.example.com/WebAPI/')
    })

    it('handles URL without leading slash', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', 'WebAPI')

      const { WEBAPI_BASE_URL } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('WebAPI')
    })

    it('handles localhost URL', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', 'http://localhost:8080/WebAPI')

      const { WEBAPI_BASE_URL } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('http://localhost:8080/WebAPI')
    })
  })

  describe('getSourceKey', () => {
    it('returns DEFAULT_SOURCE_KEY when localStorage is empty', async () => {
      const { getSourceKey, DEFAULT_SOURCE_KEY } = await import('@/config/webapi')

      const result = getSourceKey()

      expect(result).toBe(DEFAULT_SOURCE_KEY)
      expect(result).toBe('SYNPUF1K')
    })

    it('returns value from localStorage when selectedVocabulary is set', async () => {
      localStorage.setItem('selectedVocabulary', 'CUSTOM_CDM')

      const { getSourceKey } = await import('@/config/webapi')

      const result = getSourceKey()

      expect(result).toBe('CUSTOM_CDM')
    })

    it('returns DEFAULT_SOURCE_KEY when selectedVocabulary is null', async () => {
      // Explicitly set to null
      localStorage.removeItem('selectedVocabulary')

      const { getSourceKey, DEFAULT_SOURCE_KEY } = await import('@/config/webapi')

      const result = getSourceKey()

      expect(result).toBe(DEFAULT_SOURCE_KEY)
    })

    it('returns DEFAULT_SOURCE_KEY when selectedVocabulary is empty string', async () => {
      localStorage.setItem('selectedVocabulary', '')

      const { getSourceKey, DEFAULT_SOURCE_KEY } = await import('@/config/webapi')

      const result = getSourceKey()

      // Empty string is falsy, so it should return default
      expect(result).toBe(DEFAULT_SOURCE_KEY)
    })

    it('handles multiple vocabulary sources correctly', async () => {
      const { getSourceKey } = await import('@/config/webapi')

      // First vocabulary
      localStorage.setItem('selectedVocabulary', 'VOCAB_1')
      expect(getSourceKey()).toBe('VOCAB_1')

      // Change to second vocabulary
      localStorage.setItem('selectedVocabulary', 'VOCAB_2')
      expect(getSourceKey()).toBe('VOCAB_2')

      // Remove selection, should return default
      localStorage.removeItem('selectedVocabulary')
      expect(getSourceKey()).toBe('SYNPUF1K')
    })

    it('handles vocabulary keys with special characters', async () => {
      const specialKey = 'CDM-2024_v5.4'
      localStorage.setItem('selectedVocabulary', specialKey)

      const { getSourceKey } = await import('@/config/webapi')

      expect(getSourceKey()).toBe(specialKey)
    })

    it('handles vocabulary keys with spaces', async () => {
      const keyWithSpaces = 'Production CDM'
      localStorage.setItem('selectedVocabulary', keyWithSpaces)

      const { getSourceKey } = await import('@/config/webapi')

      expect(getSourceKey()).toBe(keyWithSpaces)
    })

    it('handles uppercase vocabulary keys', async () => {
      localStorage.setItem('selectedVocabulary', 'MYCDM')

      const { getSourceKey } = await import('@/config/webapi')

      expect(getSourceKey()).toBe('MYCDM')
    })

    it('handles lowercase vocabulary keys', async () => {
      localStorage.setItem('selectedVocabulary', 'mycdm')

      const { getSourceKey } = await import('@/config/webapi')

      expect(getSourceKey()).toBe('mycdm')
    })

    it('handles mixed case vocabulary keys', async () => {
      localStorage.setItem('selectedVocabulary', 'MyCDM')

      const { getSourceKey } = await import('@/config/webapi')

      expect(getSourceKey()).toBe('MyCDM')
    })

    it('handles numeric vocabulary keys', async () => {
      localStorage.setItem('selectedVocabulary', '12345')

      const { getSourceKey } = await import('@/config/webapi')

      expect(getSourceKey()).toBe('12345')
    })

    it('handles very long vocabulary keys', async () => {
      const longKey = 'A'.repeat(1000)
      localStorage.setItem('selectedVocabulary', longKey)

      const { getSourceKey } = await import('@/config/webapi')

      expect(getSourceKey()).toBe(longKey)
    })

    it('can be called multiple times without side effects', async () => {
      localStorage.setItem('selectedVocabulary', 'TEST_CDM')

      const { getSourceKey } = await import('@/config/webapi')

      // Call multiple times
      const result1 = getSourceKey()
      const result2 = getSourceKey()
      const result3 = getSourceKey()

      expect(result1).toBe('TEST_CDM')
      expect(result2).toBe('TEST_CDM')
      expect(result3).toBe('TEST_CDM')

      // Verify localStorage wasn't modified
      expect(localStorage.getItem('selectedVocabulary')).toBe('TEST_CDM')
    })

    it('reflects localStorage changes immediately', async () => {
      const { getSourceKey } = await import('@/config/webapi')

      // Initial state - no selection
      expect(getSourceKey()).toBe('SYNPUF1K')

      // User selects vocabulary
      localStorage.setItem('selectedVocabulary', 'NEW_CDM')
      expect(getSourceKey()).toBe('NEW_CDM')

      // User changes selection
      localStorage.setItem('selectedVocabulary', 'ANOTHER_CDM')
      expect(getSourceKey()).toBe('ANOTHER_CDM')

      // User clears selection
      localStorage.removeItem('selectedVocabulary')
      expect(getSourceKey()).toBe('SYNPUF1K')
    })

    it('handles whitespace-only vocabulary keys as invalid and returns default', async () => {
      localStorage.setItem('selectedVocabulary', '   ')

      const { getSourceKey, DEFAULT_SOURCE_KEY } = await import('@/config/webapi')

      // Whitespace-only string is now correctly rejected as invalid
      expect(getSourceKey()).toBe(DEFAULT_SOURCE_KEY)
    })

    it('returns string type in all cases', async () => {
      const { getSourceKey } = await import('@/config/webapi')

      // No selection
      expect(typeof getSourceKey()).toBe('string')

      // With selection
      localStorage.setItem('selectedVocabulary', 'TEST')
      expect(typeof getSourceKey()).toBe('string')
    })
  })

  describe('integration scenarios', () => {
    it('works correctly with both custom WEBAPI_BASE_URL and selectedVocabulary', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', 'https://production.example.com/WebAPI')
      localStorage.setItem('selectedVocabulary', 'PROD_CDM')

      const { WEBAPI_BASE_URL, getSourceKey } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('https://production.example.com/WebAPI')
      expect(getSourceKey()).toBe('PROD_CDM')
    })

    it('works correctly with empty WEBAPI_BASE_URL and custom selectedVocabulary', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', '')
      localStorage.setItem('selectedVocabulary', 'CUSTOM_CDM')

      const { WEBAPI_BASE_URL, getSourceKey } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('/WebAPI')
      expect(getSourceKey()).toBe('CUSTOM_CDM')
    })

    it('works correctly with custom WEBAPI_BASE_URL and default selectedVocabulary', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', 'https://test.example.com/api')
      localStorage.removeItem('selectedVocabulary')

      const { WEBAPI_BASE_URL, getSourceKey } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('https://test.example.com/api')
      expect(getSourceKey()).toBe('SYNPUF1K')
    })

    it('works correctly with empty env var and no selectedVocabulary', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', '')
      localStorage.removeItem('selectedVocabulary')

      const { WEBAPI_BASE_URL, getSourceKey, DEFAULT_SOURCE_KEY } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('/WebAPI')
      expect(getSourceKey()).toBe(DEFAULT_SOURCE_KEY)
      expect(getSourceKey()).toBe('SYNPUF1K')
    })
  })

  describe('edge cases and error handling', () => {
    it('handles unicode characters in vocabulary keys', async () => {
      const unicodeKey = 'CDM_测试_データ_테스트'
      localStorage.setItem('selectedVocabulary', unicodeKey)

      const { getSourceKey } = await import('@/config/webapi')

      expect(getSourceKey()).toBe(unicodeKey)
    })

    it('handles vocabulary key with newlines', async () => {
      const keyWithNewline = 'CDM\nWithNewline'
      localStorage.setItem('selectedVocabulary', keyWithNewline)

      const { getSourceKey } = await import('@/config/webapi')

      expect(getSourceKey()).toBe(keyWithNewline)
    })

    it('handles vocabulary key with null character', async () => {
      const keyWithNull = 'CDM\0WithNull'
      localStorage.setItem('selectedVocabulary', keyWithNull)

      const { getSourceKey } = await import('@/config/webapi')

      expect(getSourceKey()).toBe(keyWithNull)
    })

    it('handles WEBAPI_BASE_URL with query parameters', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', 'https://api.example.com/WebAPI?version=2.14&locale=en')

      const { WEBAPI_BASE_URL } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('https://api.example.com/WebAPI?version=2.14&locale=en')
    })

    it('handles WEBAPI_BASE_URL with fragment identifier', async () => {
      vi.stubEnv('VITE_WEBAPI_URL', 'https://api.example.com/WebAPI#section')

      const { WEBAPI_BASE_URL } = await import('@/config/webapi')

      expect(WEBAPI_BASE_URL).toBe('https://api.example.com/WebAPI#section')
    })
  })
})
