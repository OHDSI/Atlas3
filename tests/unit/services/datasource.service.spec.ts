/**
 * Data Source Service Tests
 * Tests for data source API operations
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

// Mock transformers
vi.mock('@/utils/datasource-formatters', () => ({
  transformDashboardReport: vi.fn((data) => data),
  transformClinicalDomainReport: vi.fn((data) => ({ data, treemapData: [] })),
  transformDataDensityReport: vi.fn((data) => data),
  transformPersonReport: vi.fn((data) => data),
  transformObservationPeriodReport: vi.fn((data) => data),
  transformDeathReport: vi.fn((data) => data),
}))

// Mock fetch globally BEFORE importing the service
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import {
  listDataSources,
  getDashboardReport,
  getDataDensityReport,
  getPersonReport,
  getClinicalDomainReport,
  getObservationPeriodReport,
  getDeathReport,
} from '@/services/datasource.service'

// fetchJSON retries every failure with a real setTimeout backoff (500ms + 1000ms).
// Driving those timers keeps the suite from sleeping 1.5s per failing case.
async function expectRejection(promise: Promise<unknown>, message?: string): Promise<void> {
  const assertion = expect(promise).rejects.toThrow(message)
  await vi.runAllTimersAsync()
  await assertion
}

describe('DataSourceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  describe('listDataSources', () => {
    it('should fetch and validate data sources', async () => {
      const mockSources = [
        {
          sourceId: 1,
          sourceName: 'Test Source',
          sourceKey: 'TEST',
          sourceDialect: 'postgresql',
          daimons: [],
        },
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSources),
      })

      const result = await listDataSources()

      expect(result).toHaveLength(1)
      const first = result[0]!
      expect(first.sourceKey).toBe('TEST')
    })

    it('should throw user-friendly error on failure', async () => {
      // Use 400 (non-retryable) for immediate failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      })

      await expectRejection(listDataSources(), 'Unable to load data sources')
    })

    it('should retry on 5xx errors', async () => {
      vi.useFakeTimers()
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Server error'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]),
        })

      const promise = listDataSources()

      // Advance timer for first retry
      await vi.advanceTimersByTimeAsync(500)

      const result = await promise

      expect(result).toEqual([])
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('should retry on 429 rate limit', async () => {
      vi.useFakeTimers()
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
    })
  })

  describe('getDashboardReport', () => {
    it('should fetch and transform dashboard report', async () => {
      // Provide data that matches DashboardReportSchema
      const mockReport = {
        summary: {
          sourceName: 'Test Source',
          personCount: 1000,
        },
        genderDistribution: [],
        ageDistribution: { intervalSize: 1, offset: 0, bins: [] },
        cumulativeObservation: { categories: [], series: [] },
        observationByMonth: { categories: [], series: [] },
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReport),
      })

      const result = await getDashboardReport('TEST')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/TEST/dashboard'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('should throw user-friendly error on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not found'),
      })

      await expectRejection(getDashboardReport('TEST'), 'Unable to load Dashboard report')
    })
  })

  describe('getDataDensityReport', () => {
    it('should fetch and transform data density report', async () => {
      const mockReport = {
        recordsPerPerson: [],
        totalRecords: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReport),
      })

      const result = await getDataDensityReport('TEST')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/TEST/datadensity'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('should throw user-friendly error on failure', async () => {
      // Use 400 (non-retryable) for immediate failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Error'),
      })

      await expectRejection(getDataDensityReport('TEST'), 'Unable to load Data Density report')
    })
  })

  describe('getPersonReport', () => {
    it('should fetch and transform person report', async () => {
      const mockReport = {
        yearOfBirth: [],
        gender: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReport),
      })

      const result = await getPersonReport('TEST')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/TEST/person'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('should throw user-friendly error on failure', async () => {
      // Use 400 (non-retryable) for immediate failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Error'),
      })

      await expectRejection(getPersonReport('TEST'), 'Unable to load Person report')
    })
  })

  describe('getClinicalDomainReport', () => {
    it('should fetch condition report', async () => {
      const mockReport = [{ conceptId: 1, conceptName: 'Test' }]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReport),
      })

      await getClinicalDomainReport('TEST', 'conditionOccurrence')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/TEST/condition'),
        expect.any(Object)
      )
    })

    it('should fetch drug report', async () => {
      const mockReport = [{ conceptId: 1, conceptName: 'Test' }]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReport),
      })

      await getClinicalDomainReport('TEST', 'drugExposure')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/TEST/drug'),
        expect.any(Object)
      )
    })

    it('should fetch procedure report', async () => {
      const mockReport = [{ conceptId: 1, conceptName: 'Test' }]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReport),
      })

      await getClinicalDomainReport('TEST', 'procedure')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/TEST/procedure'),
        expect.any(Object)
      )
    })

    it('should throw user-friendly error on failure', async () => {
      // Use 400 (non-retryable) for immediate failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Error'),
      })

      await expectRejection(
        getClinicalDomainReport('TEST', 'conditionOccurrence'),
        'Unable to load conditionOccurrence report'
      )
    })
  })

  describe('getObservationPeriodReport', () => {
    it('should fetch observation period report', async () => {
      const mockReport = {
        ageAtFirst: [],
        observationLength: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReport),
      })

      const result = await getObservationPeriodReport('TEST')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/TEST/observationPeriod'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('should throw user-friendly error on failure', async () => {
      // Use 400 (non-retryable) for immediate failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Error'),
      })

      await expectRejection(
        getObservationPeriodReport('TEST'),
        'Unable to load Observation Period report'
      )
    })
  })

  describe('getDeathReport', () => {
    it('should fetch death report', async () => {
      const mockReport = {
        prevalenceByMonth: [],
        prevalenceByType: [],
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockReport),
      })

      const result = await getDeathReport('TEST')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cdmresults/TEST/death'),
        expect.any(Object)
      )
      expect(result).toBeDefined()
    })

    it('should throw user-friendly error on failure', async () => {
      // Use 400 (non-retryable) for immediate failure
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Error'),
      })

      await expectRejection(getDeathReport('TEST'), 'Unable to load Death report')
    })
  })

  describe('Request Cancellation', () => {
    it('coalesces concurrent sources requests instead of cancelling them', async () => {
      // Several callers fetch the sources list on app start. Coalescing means the
      // first request is NOT aborted by the second — they share one result — which
      // avoids the spurious "Unable to load data sources" error on reload/deep-link.
      const mockSources = [
        {
          sourceId: 1,
          sourceName: 'Test Source',
          sourceKey: 'TEST',
          sourceDialect: 'postgresql',
          daimons: [],
        },
      ]
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSources),
      })

      const [first, second] = await Promise.all([listDataSources(), listDataSources()])

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(first).toEqual(second)
      expect(first).toHaveLength(1)
    })
  })

  describe('Retry Logic', () => {
    beforeEach(() => {
      // Ensure clean mock state for retry tests
      mockFetch.mockReset()
    })

    it('should not retry on 4xx errors (except 429)', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve('Bad request'),
      })

      await expectRejection(listDataSources())
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should retry on 429', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Too many requests'),
      })

      await expectRejection(listDataSources())
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })
})
