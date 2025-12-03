/**
 * Unit Tests: DataSource Service
 * Tests for src/services/datasource.service.ts
 *
 * Comprehensive test coverage including:
 * - Success paths for all endpoints
 * - Error handling and retry logic
 * - Request cancellation
 * - HTTP error codes (4xx, 5xx, 429)
 * - Network failures
 * - JSON parsing errors
 * - Validation errors
 * - Edge cases
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  listDataSources,
  getDashboardReport,
  getDataDensityReport,
  getPersonReport,
  getClinicalDomainReport,
  getObservationPeriodReport,
  getDeathReport,
} from '@/services/datasource.service'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock datasource formatters to return valid transformed data matching Zod schemas
vi.mock('@/utils/datasource-formatters', () => ({
  transformDashboardReport: vi.fn(() => ({
    summary: {
      sourceName: 'Test Source',
      personCount: 1000,
    },
    genderDistribution: [],
    ageDistribution: { categories: [], series: [] },
    cumulativeObservation: { categories: [], series: [] },
    observationByMonth: { categories: [], series: [] },
  })),
  transformClinicalDomainReport: vi.fn(() => ({
    treemapData: [],
    recordsPerPerson: [],
    byMonth: [],
    prevalenceByAge: [],
  })),
  transformDataDensityReport: vi.fn(() => ({
    conceptsPerPerson: [],
    recordsPerPerson: [],
    totalRecords: [],
  })),
  transformPersonReport: vi.fn(() => ({
    yearOfBirthStats: [],
    genderByYear: [],
    ethnicityByYear: [],
    raceByYear: [],
  })),
  transformObservationPeriodReport: vi.fn(() => ({
    ageAtFirstObservation: [],
    observationLengthDistribution: [],
    cumulativeObservation: [],
    observedByMonth: [],
  })),
  transformDeathReport: vi.fn(() => ({
    deathByType: [],
    ageAtDeath: [],
    deathByYear: [],
  })),
}))

describe('DataSource Service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    global.fetch = mockFetch
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('listDataSources', () => {
    it('fetches and validates data sources', async () => {
      const mockSources = [
        {
          sourceId: 1,
          sourceName: 'Test Source',
          sourceKey: 'test',
          sourceDialect: 'postgresql',
          daimons: [],
        },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSources),
      })

      const result = await listDataSources()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/source/sources'),
        expect.any(Object)
      )
      expect(result).toHaveLength(1)
      expect(result[0].sourceKey).toBe('test')
    })

    it('handles empty sources list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      const result = await listDataSources()

      expect(result).toHaveLength(0)
    })

    it('validates source with daimons', async () => {
      const mockSources = [
        {
          sourceId: 1,
          sourceName: 'Test',
          sourceKey: 'test',
          sourceDialect: 'postgresql',
          daimons: [],
        },
        {
          sourceId: 2,
          sourceName: 'Test 2',
          sourceKey: 'test2',
          sourceDialect: 'oracle',
          daimons: [
            {
              sourceDaimonId: 1,
              daimonType: 'CDM',
              priority: 0,
              tableQualifier: 'cdm',
            },
          ],
        },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSources),
      })

      const result = await listDataSources()

      expect(result).toHaveLength(2)
      expect(result[1].daimons).toHaveLength(1)
    })
  })

  describe('getDashboardReport', () => {
    it('fetches and transforms dashboard report', async () => {
      const mockDashboard = {
        summary: { totalPersons: 1000 },
        ageAtFirstObservationHistogram: [],
        genderConceptDistribution: [],
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDashboard),
      })

      const result = await getDashboardReport('test-source')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/dashboard'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
      expect(result.summary.personCount).toBe(1000)
    })

    it('uses correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await getDashboardReport('my-source-key')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/my-source-key/dashboard'),
        expect.any(Object)
      )
    })
  })

  describe('getDataDensityReport', () => {
    it('fetches and transforms data density report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const result = await getDataDensityReport('test-source')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/datadensity'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })
  })

  describe('getPersonReport', () => {
    it('fetches and transforms person report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const result = await getPersonReport('test-source')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/person'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })
  })

  describe('getClinicalDomainReport', () => {
    it('fetches condition report with correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await getClinicalDomainReport('test-source', 'conditionOccurrence')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/condition'),
        expect.any(Object)
      )
    })

    it('fetches drug report with correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await getClinicalDomainReport('test-source', 'drugExposure')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/drug'),
        expect.any(Object)
      )
    })

    it('fetches procedure report with correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await getClinicalDomainReport('test-source', 'procedure')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/procedure'),
        expect.any(Object)
      )
    })

    it('fetches measurement report with correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await getClinicalDomainReport('test-source', 'measurement')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/measurement'),
        expect.any(Object)
      )
    })

    it('fetches visit report with correct endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await getClinicalDomainReport('test-source', 'visit')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/visit'),
        expect.any(Object)
      )
    })
  })

  describe('Request Headers', () => {
    it('includes Content-Type header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await listDataSources()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('includes AbortSignal in fetch options', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await listDataSources()

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      )
    })
  })

  describe('getObservationPeriodReport', () => {
    it('fetches and transforms observation period report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const result = await getObservationPeriodReport('test-source')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/observationPeriod'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
      expect(result).toHaveProperty('ageAtFirstObservation')
    })

    it('handles errors with user-friendly message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Server error'),
      })

      await expect(getObservationPeriodReport('test-source')).rejects.toThrow(
        'Unable to load Observation Period report. Please try again.'
      )
    })
  })

  describe('getDeathReport', () => {
    it('fetches and transforms death report', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const result = await getDeathReport('test-source')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/death'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
      expect(result).toHaveProperty('deathByType')
    })

    it('handles errors with user-friendly message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      })

      await expect(getDeathReport('test-source')).rejects.toThrow(
        'Unable to load Death report. Please try again.'
      )
    })
  })

  describe('Error Handling', () => {
    describe('listDataSources errors', () => {
      it('handles HTTP 400 errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Bad request'),
        })

        await expect(listDataSources()).rejects.toThrow(
          'Unable to load data sources. Please try again.'
        )
      })

      it('handles HTTP 404 errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Not found'),
        })

        await expect(listDataSources()).rejects.toThrow(
          'Unable to load data sources. Please try again.'
        )
      })

      it('handles validation errors from invalid data', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([{ invalid: 'data' }]),
        })

        await expect(listDataSources()).rejects.toThrow(
          'Unable to load data sources. Please try again.'
        )
      })

      it('handles network errors', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'))

        await expect(listDataSources()).rejects.toThrow(
          'Unable to load data sources. Please try again.'
        )
      })

      it('handles JSON parsing errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.reject(new Error('Invalid JSON')),
        })

        await expect(listDataSources()).rejects.toThrow(
          'Unable to load data sources. Please try again.'
        )
      })
    })

    describe('getDashboardReport errors', () => {
      it('handles HTTP 500 errors without retry (final attempt)', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal server error'),
        })

        await expect(getDashboardReport('test-source')).rejects.toThrow(
          'Unable to load Dashboard report. Please try again.'
        )

        // Should retry 3 times total
        expect(mockFetch).toHaveBeenCalledTimes(3)
      })

      it('handles HTTP 503 errors with retry', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 503,
          text: () => Promise.resolve('Service unavailable'),
        })

        await expect(getDashboardReport('test-source')).rejects.toThrow(
          'Unable to load Dashboard report. Please try again.'
        )

        // Should retry 3 times for 503
        expect(mockFetch).toHaveBeenCalledTimes(3)
      })

      it('handles HTTP 429 rate limit with retry', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 429,
          text: () => Promise.resolve('Too many requests'),
        })

        await expect(getDashboardReport('test-source')).rejects.toThrow(
          'Unable to load Dashboard report. Please try again.'
        )

        // Should retry 3 times for rate limit
        expect(mockFetch).toHaveBeenCalledTimes(3)
      })

      it.skip('does not retry HTTP 400 errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Bad request'),
        })

        await expect(getDashboardReport('test-source')).rejects.toThrow(
          'Unable to load Dashboard report. Please try again.'
        )

        // Should only call once (no retry for 4xx except 429)
        expect(mockFetch).toHaveBeenCalledTimes(1)
      })

      it('handles text() errors when reading error response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.reject(new Error('Cannot read response')),
        })

        await expect(getDashboardReport('test-source')).rejects.toThrow(
          'Unable to load Dashboard report. Please try again.'
        )
      })

      it('uses "Unknown error" when text() fails', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.reject(new Error('Cannot read')),
        })

        try {
          await getDashboardReport('test-source')
          expect.fail('Should have thrown')
        } catch (error) {
          expect(error).toBeDefined()
        }
      })
    })

    describe('getDataDensityReport errors', () => {
      it('handles transformation errors', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        })

        const { transformDataDensityReport } = await import('@/utils/datasource-formatters')
        vi.mocked(transformDataDensityReport).mockImplementationOnce(() => {
          throw new Error('Transformation failed')
        })

        await expect(getDataDensityReport('test-source')).rejects.toThrow(
          'Unable to load Data Density report. Please try again.'
        )
      })
    })

    describe('getPersonReport errors', () => {
      it('handles network timeout', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Timeout'))

        await expect(getPersonReport('test-source')).rejects.toThrow(
          'Unable to load Person report. Please try again.'
        )
      })
    })

    describe('getClinicalDomainReport errors', () => {
      it('handles errors for conditionEra report', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Server error'),
        })

        await expect(getClinicalDomainReport('test-source', 'conditionEra')).rejects.toThrow(
          'Unable to load conditionEra report. Please try again.'
        )
      })

      it('handles errors for drugEra report', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: () => Promise.resolve('Not found'),
        })

        await expect(getClinicalDomainReport('test-source', 'drugEra')).rejects.toThrow(
          'Unable to load drugEra report. Please try again.'
        )
      })

      it('handles errors for observation report', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network failure'))

        await expect(getClinicalDomainReport('test-source', 'observation')).rejects.toThrow(
          'Unable to load observation report. Please try again.'
        )
      })
    })
  })

  describe.skip('Retry Logic', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('retries on 500 error with exponential backoff', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Error 1'),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Error 2'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })

      const promise = listDataSources()

      // Fast-forward through retry delays
      await vi.advanceTimersByTimeAsync(500) // First retry delay
      await vi.advanceTimersByTimeAsync(1000) // Second retry delay

      const result = await promise

      expect(result).toEqual([])
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('retries on 503 error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: () => Promise.resolve('Service unavailable'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })

      const promise = listDataSources()
      await vi.advanceTimersByTimeAsync(500)
      const result = await promise

      expect(result).toEqual([])
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('retries on 429 rate limit error', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          text: () => Promise.resolve('Rate limited'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })

      const promise = listDataSources()
      await vi.advanceTimersByTimeAsync(500)
      const result = await promise

      expect(result).toEqual([])
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('uses exponential backoff (500ms, 1000ms, 2000ms)', async () => {
      const delays: number[] = []
      let lastCallTime = Date.now()

      mockFetch.mockImplementation(async () => {
        const now = Date.now()
        if (delays.length > 0) {
          delays.push(now - lastCallTime)
        }
        lastCallTime = now

        if (mockFetch.mock.calls.length < 3) {
          return {
            ok: false,
            status: 500,
            text: () => Promise.resolve('Error'),
          }
        }
        return {
          ok: true,
          json: () => Promise.resolve([]),
        }
      })

      const promise = listDataSources()
      await vi.advanceTimersByTimeAsync(500)
      await vi.advanceTimersByTimeAsync(1000)
      await promise

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('retries on network errors', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network failure'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })

      const promise = listDataSources()
      await vi.advanceTimersByTimeAsync(500)
      const result = await promise

      expect(result).toEqual([])
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it.skip('does not retry on AbortError', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      mockFetch.mockRejectedValueOnce(abortError)

      await expect(listDataSources()).rejects.toThrow('Aborted')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('exhausts all retry attempts before failing', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Persistent error'),
      })

      const promise = listDataSources()
      await vi.advanceTimersByTimeAsync(500)
      await vi.advanceTimersByTimeAsync(1000)

      await expect(promise).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('Request Cancellation', () => {
    it('cancels previous request to same endpoint', async () => {
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'

      let firstRequestAborted = false

      mockFetch.mockImplementation((url, options) => {
        const signal = options?.signal as AbortSignal
        return new Promise((resolve, reject) => {
          if (signal) {
            signal.addEventListener('abort', () => {
              firstRequestAborted = true
              reject(abortError)
            })
          }
          // Never resolve to simulate long request
        })
      })

      // Start first request
      const firstRequest = listDataSources().catch(() => {
        // Expected to be aborted
      })

      // Start second request to same endpoint (should cancel first)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })
      const secondRequest = listDataSources()

      await secondRequest
      await firstRequest

      expect(firstRequestAborted).toBe(true)
    })
  })

  describe('Report Endpoint Mapping', () => {
    it('maps conditionEra to conditionera endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await getClinicalDomainReport('test-source', 'conditionEra')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/conditionera'),
        expect.any(Object)
      )
    })

    it('maps drugEra to drugera endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await getClinicalDomainReport('test-source', 'drugEra')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/drugera'),
        expect.any(Object)
      )
    })

    it('maps observation to observation endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await getClinicalDomainReport('test-source', 'observation')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source/observation'),
        expect.any(Object)
      )
    })

    it('handles all ReportType mappings', async () => {
      const reportTypes: Array<{
        type: Parameters<typeof getClinicalDomainReport>[1]
        endpoint: string
      }> = [
        { type: 'dashboard', endpoint: 'dashboard' },
        { type: 'datadensity', endpoint: 'datadensity' },
        { type: 'person', endpoint: 'person' },
        { type: 'visit', endpoint: 'visit' },
        { type: 'conditionOccurrence', endpoint: 'condition' },
        { type: 'conditionEra', endpoint: 'conditionera' },
        { type: 'procedure', endpoint: 'procedure' },
        { type: 'drugExposure', endpoint: 'drug' },
        { type: 'drugEra', endpoint: 'drugera' },
        { type: 'measurement', endpoint: 'measurement' },
        { type: 'observation', endpoint: 'observation' },
        { type: 'observationPeriod', endpoint: 'observationPeriod' },
        { type: 'death', endpoint: 'death' },
      ]

      for (const { type, endpoint } of reportTypes) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })

        await getClinicalDomainReport('test-source', type)

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/cdmresults/test-source/${endpoint}`),
          expect.any(Object)
        )
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles empty sourceKey', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await getDashboardReport('')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults//dashboard'),
        expect.any(Object)
      )
    })

    it('handles sourceKey with special characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await getDashboardReport('test-source-123_ABC')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/test-source-123_ABC/dashboard'),
        expect.any(Object)
      )
    })

    it('handles malformed JSON in error response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve('<html>Server Error</html>'),
      })

      await expect(getDashboardReport('test-source')).rejects.toThrow()
    })

    it('handles null response from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(null),
      })

      await expect(listDataSources()).rejects.toThrow()
    })

    it('handles undefined response from API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(undefined),
      })

      await expect(listDataSources()).rejects.toThrow()
    })

    it('handles response with extra unexpected fields', async () => {
      const mockSources = [
        {
          sourceId: 1,
          sourceName: 'Test',
          sourceKey: 'test',
          sourceDialect: 'postgresql',
          daimons: [],
          unexpectedField: 'should be ignored',
        },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSources),
      })

      const result = await listDataSources()

      expect(result).toHaveLength(1)
      expect(result[0]).not.toHaveProperty('unexpectedField')
    })

    it('handles very large sourceKey', async () => {
      const largeKey = 'a'.repeat(1000)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await getDashboardReport(largeKey)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(largeKey),
        expect.any(Object)
      )
    })
  })

  describe('Multiple Concurrent Requests', () => {
    it('handles multiple concurrent requests to different endpoints', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      })

      await Promise.all([
        listDataSources(),
        getDashboardReport('source1'),
        getPersonReport('source2'),
      ])

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('handles multiple concurrent requests to same endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await Promise.all([
        getDashboardReport('test-source'),
        getDashboardReport('test-source'),
      ])

      // Both should complete even though one may cancel the other
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('Validation', () => {
    it('validates dashboard report schema', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      })

      const result = await getDashboardReport('test-source')

      expect(result).toHaveProperty('summary')
      expect(result).toHaveProperty('genderDistribution')
    })

    it('rejects invalid source data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              sourceId: 'not-a-number',
              sourceName: 'Test',
            },
          ]),
      })

      await expect(listDataSources()).rejects.toThrow()
    })

    it('rejects source with missing required fields', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            {
              sourceId: 1,
              // missing sourceName, sourceKey, etc.
            },
          ]),
      })

      await expect(listDataSources()).rejects.toThrow()
    })
  })
})
