/**
 * Unit Tests: WebAPI Service
 * Tests for src/services/webapi.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock auth store (http-client imports it dynamically)
vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ token: null })),
}))

import * as webapi from '@/services/webapi'

describe('WebAPI Service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch
    localStorage.clear()
    localStorage.setItem('locale', 'en')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchCDMSources', () => {
    it('fetches and validates CDM sources', async () => {
      const mockSources = [
        {
          sourceId: 1,
          sourceName: 'Test Source',
          sourceKey: 'test',
          sourceDialect: 'postgresql',
          daimons: [],
        },
      ]

      // Use mockResolvedValue instead of mockResolvedValueOnce to handle retries
      // webapi.ts uses response.text() then JSON.parse, so we need to provide text() method
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockSources)),
      })

      const result = await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/source/sources'),
        expect.any(Object)
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
        expect(result.data[0].sourceKey).toBe('test')
      }
    })

    it('returns error on validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([{ invalid: 'data' }])),
      })

      const result = await webapi.fetchCDMSources()

      expect(result.success).toBe(false)
    })
  })

  describe('searchConcepts', () => {
    it('searches concepts with query', async () => {
      const mockConcepts = [
        {
          CONCEPT_ID: 1,
          CONCEPT_NAME: 'Test',
          CONCEPT_CODE: 'T001',
          DOMAIN_ID: 'Condition',
          VOCABULARY_ID: 'SNOMED',
          CONCEPT_CLASS_ID: 'Clinical Finding',
          STANDARD_CONCEPT: 'S',
          INVALID_REASON: null,
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockConcepts)),
      })

      const result = await webapi.searchConcepts('SYNPUF1K', 'diabetes')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/SYNPUF1K/search'),
        expect.any(Object)
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(1)
      }
    })

    it('includes domain filter in POST body when specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([])),
      })

      await webapi.searchConcepts('SYNPUF1K', 'test', 'Condition')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/vocabulary/SYNPUF1K/search'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"DOMAIN_ID":["Condition"]'),
        })
      )
    })

    it('returns error on validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify('invalid')),
      })

      const result = await webapi.searchConcepts('SYNPUF1K', 'test')

      expect(result.success).toBe(false)
    })
  })

  describe('Request Headers', () => {
    it('includes User-Language header', async () => {
      localStorage.setItem('locale', 'de')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([])),
      })

      await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalled()
      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('User-Language')).toBe('de')
    })

    it('defaults to en locale', async () => {
      localStorage.removeItem('locale')

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify([])),
      })

      await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalled()
      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('User-Language')).toBe('en')
    })
  })

  describe.skip('Error Handling and Retry Logic', () => {
    it('retries on 5xx server errors', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        })

      const result = await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(result).toEqual([])
    })

    it('retries on 429 Too Many Requests', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        })

      const result = await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })

    it('retries on network errors (TypeError)', async () => {
      mockFetch
        .mockRejectedValueOnce(new TypeError('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        })

      const result = await webapi.fetchCDMSources()

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(result).toEqual([])
    })

    it('fails after max retry attempts', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })

      await expect(webapi.searchConcepts('test', 'query')).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('does not retry on 4xx client errors (except 429)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      await expect(webapi.getCohortDefinition(999)).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('uses exponential backoff for retries', async () => {
      const startTime = Date.now()

      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(JSON.stringify([])),
        })

      await webapi.fetchCDMSources()

      const elapsed = Date.now() - startTime
      // First retry: 500ms, second retry: 1000ms = 1500ms total minimum
      // Allow some tolerance for execution time
      expect(elapsed).toBeGreaterThanOrEqual(1400)
    })

    it('handles string expression in getCohortPrintFriendly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html>Report</html>'),
      })

      const cohortDef = {
        id: 1,
        name: 'Test',
        expression: '{"ConceptSets": []}',
      }

      const result = await webapi.getCohortPrintFriendly(cohortDef as never)

      expect(result).toContain('Report')
    })

    it('handles expression wrapper in getCohortPrintFriendly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve('<html>Report</html>'),
      })

      const cohortDef = {
        expression: {
          ConceptSets: [],
        },
      }

      const result = await webapi.getCohortPrintFriendly(cohortDef as never)

      expect(result).toContain('Report')
    })

    it('handles validation errors in getCohortReport', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ invalid: 'data' })),
      })

      const result = await webapi.getCohortReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })

    it('handles missing summary in getCohortReport', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({})),
      })

      const result = await webapi.getCohortReport(123, 'SYNPUF1K')

      expect(result).toBeNull()
    })

    it('handles status mapping in generateCohort - STARTING', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'STARTING' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('PENDING')
    })

    it('handles status mapping in generateCohort - STARTED', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'STARTED' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('PENDING')
    })

    it('handles status mapping in generateCohort - RUNNING', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'RUNNING' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('RUNNING')
    })

    it('handles status mapping in generateCohort - COMPLETE', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'COMPLETE' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('COMPLETE')
    })

    it('handles status mapping in generateCohort - FAILED', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'FAILED' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('FAILED')
    })

    it('handles status mapping in generateCohort - unknown status defaults to PENDING', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({ status: 'UNKNOWN' })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.status).toBe('PENDING')
    })

    it('includes startDate and endDate in generateCohort response', async () => {
      const startDate = '2025-01-01T00:00:00.000Z'
      const endDate = '2025-01-01T01:00:00.000Z'

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          status: 'COMPLETED',
          executionId: 789,
          startDate,
          endDate,
        })),
      })

      const result = await webapi.generateCohort(123, 'SYNPUF1K')

      expect(result?.startTime).toBe(new Date(startDate).toISOString())
      expect(result?.endTime).toBe(new Date(endDate).toISOString())
    })

    it('handles analysis trigger failures gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await webapi.triggerFullAnalysis(123, 'SYNPUF1K')

      expect(result).toBe(false)
    })

    it('handles HTTP error response text in getCohortPrintFriendly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      })

      const result = await webapi.getCohortPrintFriendly({ expression: {} } as never)

      expect(result).toBeNull()
    })
  })
})
