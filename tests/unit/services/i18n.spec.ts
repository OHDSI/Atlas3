/**
 * i18n Service Tests
 * Tests for internationalization service
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock webapi config
vi.mock('@/config/webapi', () => ({
  WEBAPI_BASE_URL: 'http://test-api.com/WebAPI',
}))

import { fetchLocales, fetchTranslations, i18nService } from '@/services/i18n'

describe('i18nService', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()

    mockFetch = vi.fn()
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchLocales', () => {
    it('should fetch and validate locales', async () => {
      const mockLocales = [
        { code: 'en', name: 'English' },
        { code: 'es', name: 'Spanish' },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocales),
      })

      const result = await fetchLocales()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/i18n/locales')
      )
      expect(result).toHaveLength(2)
      expect(result[0].code).toBe('en')
    })

    it('should handle wrapped response data', async () => {
      const mockLocales = {
        data: [
          { code: 'en', name: 'English' },
        ],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocales),
      })

      const result = await fetchLocales()

      expect(result).toHaveLength(1)
    })

    it('should return default locale on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      })

      const result = await fetchLocales()

      expect(result).toEqual([{ code: 'en', name: 'English' }])
    })

    it('should return default locale on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchLocales()

      expect(result).toEqual([{ code: 'en', name: 'English' }])
    })

    it('should return default locale for invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ invalid: 'data' }]),
      })

      const result = await fetchLocales()

      expect(result).toEqual([{ code: 'en', name: 'English' }])
    })

    it('should validate locale code format', async () => {
      const mockLocales = [
        { code: 'en', name: 'English' },
        { code: 'invalid_code', name: 'Invalid' }, // Invalid format
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocales),
      })

      const result = await fetchLocales()

      // Should fall back to default due to validation error
      expect(result).toEqual([{ code: 'en', name: 'English' }])
    })
  })

  describe('fetchTranslations', () => {
    it('should fetch translations for locale', async () => {
      const mockTranslations = {
        common: {
          save: 'Save',
          cancel: 'Cancel',
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTranslations),
      })

      const result = await fetchTranslations('en')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/i18n?lang=en')
      )
      expect(result.locale).toBe('en')
      expect(result.translations).toEqual(mockTranslations)
      expect(result.fetchedAt).toBeInstanceOf(Date)
    })

    it('should include format data when present', async () => {
      const mockResponse = {
        common: { save: 'Save' },
        format: {
          date: {
            datetime: 'YYYY-MM-DD HH:mm',
            datetimeWithSeconds: 'YYYY-MM-DD HH:mm:ss',
            dateOnly: 'YYYY-MM-DD',
            timeOnly: 'HH:mm',
          },
          number: {
            decimal: '.',
            thousands: ',',
            grouping: [3],
          },
        },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await fetchTranslations('en')

      expect(result.format).toBeDefined()
    })

    it('should throw error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      })

      await expect(fetchTranslations('xx')).rejects.toThrow(
        'Failed to fetch translations for xx'
      )
    })

    it('should throw error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchTranslations('en')).rejects.toThrow('Network error')
    })
  })

  describe('i18nService object', () => {
    it('should export fetchLocales function', () => {
      expect(i18nService.fetchLocales).toBe(fetchLocales)
    })

    it('should export fetchTranslations function', () => {
      expect(i18nService.fetchTranslations).toBe(fetchTranslations)
    })
  })
})
