/**
 * Unit Test: Reports Store
 * Tests Pinia store for report management (T127)
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useReportsStore } from '@/stores/reports'
import type { PersonReport, ReportType } from '@/models/report.types'
import * as webapi from '@/services/webapi'
import * as mapper from '@/services/report-mapper'

// Mock the webapi module
vi.mock('@/services/webapi')
vi.mock('@/services/report-mapper')

describe('Reports Store', () => {
  beforeEach(() => {
    // Create a fresh pinia instance for each test
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = useReportsStore()

      expect(store.currentReportType).toBeNull()
      expect(store.currentSourceKey).toBeNull()
      expect(store.currentCohortId).toBeNull()
      expect(store.reportData.size).toBe(0)
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
    })
  })

  describe('setCurrentReport', () => {
    it('should set current report context', () => {
      const store = useReportsStore()

      store.setCurrentReport(123, 'SYNPUF', 'person')

      expect(store.currentCohortId).toBe(123)
      expect(store.currentSourceKey).toBe('SYNPUF')
      expect(store.currentReportType).toBe('person')
    })
  })

  describe('clearCurrentReport', () => {
    it('should clear current report context', () => {
      const store = useReportsStore()

      // Set some data first
      store.setCurrentReport(123, 'SYNPUF', 'person')
      store.error = 'Some error'

      // Clear it
      store.clearCurrentReport()

      expect(store.currentCohortId).toBeNull()
      expect(store.currentSourceKey).toBeNull()
      expect(store.currentReportType).toBeNull()
      expect(store.error).toBeNull()
    })
  })

  describe('fetchReport', () => {
    it('should fetch and cache person report successfully', async () => {
      const store = useReportsStore()

      // Mock API response
      const mockRawData = {
        yearOfBirth: [{ intervalIndex: 0, countValue: 100 }],
        gender: [{ conceptId: 8507, conceptName: 'Male', countValue: 60 }],
        race: [{ conceptId: 8527, conceptName: 'White', countValue: 80 }],
        ethnicity: [{ conceptId: 38003564, conceptName: 'Not Hispanic', countValue: 90 }]
      }

      const mockMappedData: PersonReport = {
        yearOfBirth: [{ year: 1920, count: 100 }],
        demographics: {
          gender: [{ conceptId: 8507, conceptName: 'Male', count: 60, percentage: 100 }],
          race: [{ conceptId: 8527, conceptName: 'White', count: 80, percentage: 100 }],
          ethnicity: [{ conceptId: 38003564, conceptName: 'Not Hispanic', count: 90, percentage: 100 }]
        }
      }

      vi.mocked(webapi.getPersonReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapPersonReport).mockReturnValue(mockMappedData)

      // Fetch report
      await store.fetchReport(123, 'SYNPUF', 'person')

      // Verify API was called
      expect(webapi.getPersonReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapPersonReport).toHaveBeenCalledWith(mockRawData)

      // Verify state is updated
      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.currentReportType).toBe('person')
      expect(store.currentCohortId).toBe(123)
      expect(store.currentSourceKey).toBe('SYNPUF')

      // Verify data is cached
      expect(store.reportData.size).toBe(1)
      const cachedReport = store.reportData.get('123-SYNPUF-person')
      expect(cachedReport).toBeDefined()
      expect(cachedReport?.type).toBe('person')
      expect(cachedReport?.data).toEqual(mockMappedData)
    })

    it('should use cached data if less than 5 minutes old', async () => {
      const store = useReportsStore()

      const mockMappedData: PersonReport = {
        yearOfBirth: [{ year: 1920, count: 100 }],
        demographics: {
          gender: [{ conceptId: 8507, conceptName: 'Male', count: 60, percentage: 100 }],
          race: [{ conceptId: 8527, conceptName: 'White', count: 80, percentage: 100 }],
          ethnicity: [{ conceptId: 38003564, conceptName: 'Not Hispanic', count: 90, percentage: 100 }]
        }
      }

      // Manually set cache
      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: mockMappedData
      })

      // Fetch same report
      await store.fetchReport(123, 'SYNPUF', 'person')

      // Verify API was NOT called (used cache)
      expect(webapi.getPersonReport).not.toHaveBeenCalled()

      // Verify current report is set
      expect(store.currentReportType).toBe('person')
    })

    it('should handle fetch errors gracefully', async () => {
      const store = useReportsStore()

      vi.mocked(webapi.getPersonReport).mockResolvedValue(null)

      await store.fetchReport(123, 'SYNPUF', 'person')

      expect(store.loading).toBe(false)
      expect(store.error).toContain('Failed to fetch person report')
    })

    it('should handle API exceptions', async () => {
      const store = useReportsStore()

      vi.mocked(webapi.getPersonReport).mockRejectedValue(new Error('Network error'))

      await store.fetchReport(123, 'SYNPUF', 'person')

      expect(store.loading).toBe(false)
      expect(store.error).toContain('Network error')
    })
  })

  describe('clearReport', () => {
    it('should remove specific report from cache', () => {
      const store = useReportsStore()

      // Add some cached data
      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      expect(store.reportData.size).toBe(1)

      // Clear specific report
      store.clearReport(123, 'SYNPUF', 'person')

      expect(store.reportData.size).toBe(0)
    })
  })

  describe('clearAllReports', () => {
    it('should remove all cached reports', () => {
      const store = useReportsStore()

      // Add multiple cached items
      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      store.reportData.set('456-CDM-person', {
        type: 'person',
        cohortId: 456,
        sourceKey: 'CDM',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      expect(store.reportData.size).toBe(2)

      // Clear all
      store.clearAllReports()

      expect(store.reportData.size).toBe(0)
    })
  })

  describe('Getters', () => {
    it('currentReport should return null when no report is set', () => {
      const store = useReportsStore()

      expect(store.currentReport).toBeNull()
    })

    it('currentReport should return cached report data', () => {
      const store = useReportsStore()

      const mockData: PersonReport = {
        yearOfBirth: [{ year: 1920, count: 100 }],
        demographics: {
          gender: [{ conceptId: 8507, conceptName: 'Male', count: 60, percentage: 100 }],
          race: [{ conceptId: 8527, conceptName: 'White', count: 80, percentage: 100 }],
          ethnicity: [{ conceptId: 38003564, conceptName: 'Not Hispanic', count: 90, percentage: 100 }]
        }
      }

      // Set current context
      store.currentCohortId = 123
      store.currentSourceKey = 'SYNPUF'
      store.currentReportType = 'person'

      // Add cached data
      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: mockData
      })

      const current = store.currentReport

      expect(current).toBeDefined()
      expect(current?.type).toBe('person')
      expect(current?.data).toEqual(mockData)
    })

    it('isLoading should reflect loading state', () => {
      const store = useReportsStore()

      expect(store.isLoading).toBe(false)

      store.loading = true

      expect(store.isLoading).toBe(true)
    })

    it('hasError should reflect error state', () => {
      const store = useReportsStore()

      expect(store.hasError).toBe(false)

      store.error = 'Some error'

      expect(store.hasError).toBe(true)
    })

    it('isReportCached should check cache correctly', () => {
      const store = useReportsStore()

      expect(store.isReportCached(123, 'SYNPUF', 'person')).toBe(false)

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      expect(store.isReportCached(123, 'SYNPUF', 'person')).toBe(true)
    })

    it('cacheStats should return correct statistics', () => {
      const store = useReportsStore()

      expect(store.cacheStats.totalCached).toBe(0)
      expect(store.cacheStats.cacheKeys).toEqual([])

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      expect(store.cacheStats.totalCached).toBe(1)
      expect(store.cacheStats.cacheKeys).toContain('123-SYNPUF-person')
    })
  })
})
