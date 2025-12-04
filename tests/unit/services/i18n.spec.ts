/**
 * Unit Tests: i18n Service
 * Tests for src/services/i18n.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { i18nService, fetchLocales, fetchTranslations } from '@/services/i18n'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock config
vi.mock('@/config/webapi', () => ({
  WEBAPI_BASE_URL: 'https://api.example.com/WebAPI',
}))

describe('i18n Service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchLocales', () => {
    it('fetches and validates locales from API', async () => {
      const mockLocales = [
        { code: 'en', name: 'English' },
        { code: 'de', name: 'German' },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLocales),
      })

      const result = await fetchLocales()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/WebAPI/i18n/locales'
      )
      expect(result).toEqual(mockLocales)
    })

    it('handles wrapped response with data property', async () => {
      const mockLocales = [{ code: 'en', name: 'English' }]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: mockLocales }),
      })

      const result = await fetchLocales()

      expect(result).toEqual(mockLocales)
    })

    it('returns default English locale on fetch error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      })

      const result = await fetchLocales()

      expect(result).toEqual([{ code: 'en', name: 'English' }])
    })

    it('returns default locale on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fetchLocales()

      expect(result).toEqual([{ code: 'en', name: 'English' }])
    })

    it('returns default locale on invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ invalid: 'data' }]),
      })

      const result = await fetchLocales()

      expect(result).toEqual([{ code: 'en', name: 'English' }])
    })

    it('validates locale codes are 2 lowercase letters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { code: 'INVALID', name: 'Invalid' }, // uppercase not allowed
          ]),
      })

      const result = await fetchLocales()

      // Should fall back to default due to validation failure
      expect(result).toEqual([{ code: 'en', name: 'English' }])
    })
  })

  describe('fetchTranslations', () => {
    it('fetches translations for locale', async () => {
      const mockTranslations = {
        'app.title': 'Test App',
        'button.save': 'Save',
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTranslations),
      })

      const result = await fetchTranslations('en')

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/WebAPI/i18n?lang=en'
      )
      expect(result.locale).toBe('en')
      expect(result.translations).toEqual(mockTranslations)
      expect(result.fetchedAt).toBeInstanceOf(Date)
    })

    it('includes format data when present', async () => {
      const mockResponse = {
        'app.title': 'Test',
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

      expect(result.format).toEqual(mockResponse.format)
    })

    it('throws error on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      })

      await expect(fetchTranslations('en')).rejects.toThrow()
    })

    it('throws error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(fetchTranslations('en')).rejects.toThrow('Network error')
    })

    it('logs error when format data is invalid', async () => {
      const { logger } = await import('@/utils/logger')
      const mockResponse = {
        'app.title': 'Test',
        format: { invalid: 'format' }, // Invalid format structure
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await fetchTranslations('en')

      // Should still return translations even with invalid format
      expect(result.translations).toHaveProperty('app.title')
      expect(logger.warn).toHaveBeenCalled()
    })

    it('sets fetchedAt timestamp', async () => {
      const beforeFetch = new Date()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ test: 'translation' }),
      })

      const result = await fetchTranslations('de')
      const afterFetch = new Date()

      expect(result.fetchedAt.getTime()).toBeGreaterThanOrEqual(beforeFetch.getTime())
      expect(result.fetchedAt.getTime()).toBeLessThanOrEqual(afterFetch.getTime())
    })
  })

  describe('i18nService object', () => {
    it('exports fetchLocales function', () => {
      expect(i18nService.fetchLocales).toBe(fetchLocales)
    })

    it('exports fetchTranslations function', () => {
      expect(i18nService.fetchTranslations).toBe(fetchTranslations)
    })
  })
})
