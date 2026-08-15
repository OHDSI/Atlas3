/**
 * DataSources Store Tests
 * Tests for data sources state management
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataSourcesStore } from '@/stores/datasources'
import type { DataSource } from '@/models/datasource.types'

// Mock dependencies
vi.mock('@/services/datasource.service', () => ({
  listDataSources: vi.fn(),
  getDashboardReport: vi.fn(),
  getClinicalDomainReport: vi.fn(),
  getDataDensityReport: vi.fn(),
  getPersonReport: vi.fn(),
  getObservationPeriodReport: vi.fn(),
  getDeathReport: vi.fn(),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import {
  listDataSources,
  getDashboardReport,
  getClinicalDomainReport
} from '@/services/datasource.service'

const mockDataSources: DataSource[] = [
  {
    sourceId: 1,
    sourceName: 'Test Source 1',
    sourceDialect: 'postgresql',
    sourceKey: 'TEST_CDM_1',
  } as DataSource,
  {
    sourceId: 2,
    sourceName: 'Test Source 2',
    sourceDialect: 'postgresql',
    sourceKey: 'TEST_CDM_2',
  } as DataSource,
]

describe('DataSources Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have empty sources initially', () => {
      const store = useDataSourcesStore()
      expect(store.sources).toEqual([])
    })

    it('should have null selected source initially', () => {
      const store = useDataSourcesStore()
      expect(store.selectedSourceId).toBeNull()
    })

    it('should have null selected report type initially', () => {
      const store = useDataSourcesStore()
      expect(store.selectedReportType).toBeNull()
    })

    it('should have empty report cache initially', () => {
      const store = useDataSourcesStore()
      expect(store.reportCache.size).toBe(0)
    })

    it('should not be loading initially', () => {
      const store = useDataSourcesStore()
      expect(store.loading.sources).toBe(false)
      expect(store.loading.report).toBe(false)
    })

    it('should have no errors initially', () => {
      const store = useDataSourcesStore()
      expect(store.error.sources).toBeNull()
      expect(store.error.report).toBeNull()
    })
  })

  describe('Getters', () => {
    it('selectedSource should return null when no source selected', () => {
      const store = useDataSourcesStore()
      expect(store.selectedSource).toBeNull()
    })

    it('selectedSource should return the selected source', () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      expect(store.selectedSource).toEqual(mockDataSources[0])
    })

    it('selectedSource should return null for invalid source id', () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 999
      expect(store.selectedSource).toBeNull()
    })

    it('currentReport should return null when no source selected', () => {
      const store = useDataSourcesStore()
      expect(store.currentReport).toBeNull()
    })

    it('currentReport should return null when no report type selected', () => {
      const store = useDataSourcesStore()
      store.selectedSourceId = 1
      expect(store.currentReport).toBeNull()
    })

    it('currentReport should return cached report', () => {
      const store = useDataSourcesStore()
      store.selectedSourceId = 1
      store.selectedReportType = 'dashboard'
      const reportData = { type: 'dashboard', data: { summary: {} } }
      store.reportCache.set('1-dashboard', reportData as any)
      expect(store.currentReport).toEqual(reportData)
    })

    it('isLoading should return true when loading sources', () => {
      const store = useDataSourcesStore()
      store.loading.sources = true
      expect(store.isLoading).toBe(true)
    })

    it('isLoading should return true when loading report', () => {
      const store = useDataSourcesStore()
      store.loading.report = true
      expect(store.isLoading).toBe(true)
    })

    it('isLoading should return false when not loading', () => {
      const store = useDataSourcesStore()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('fetchDataSources Action', () => {
    it('should set loading state while fetching', async () => {
      const store = useDataSourcesStore()
      vi.mocked(listDataSources).mockImplementation(() => new Promise(() => {}))

      const _promise = store.fetchDataSources()
      expect(store.loading.sources).toBe(true)

      // Clean up
      vi.mocked(listDataSources).mockResolvedValue([])
    })

    it('should fetch and store data sources', async () => {
      const store = useDataSourcesStore()
      vi.mocked(listDataSources).mockResolvedValue(mockDataSources)

      await store.fetchDataSources()

      expect(store.sources).toEqual(mockDataSources)
      expect(store.loading.sources).toBe(false)
    })

    it('should auto-select first source if none selected', async () => {
      const store = useDataSourcesStore()
      vi.mocked(listDataSources).mockResolvedValue(mockDataSources)

      await store.fetchDataSources()

      expect(store.selectedSourceId).toBe(1)
    })

    it('should not change selection if already selected', async () => {
      const store = useDataSourcesStore()
      store.selectedSourceId = 2
      vi.mocked(listDataSources).mockResolvedValue(mockDataSources)

      await store.fetchDataSources()

      expect(store.selectedSourceId).toBe(2)
    })

    it('should handle fetch error', async () => {
      const store = useDataSourcesStore()
      vi.mocked(listDataSources).mockRejectedValue(new Error('Network error'))

      await store.fetchDataSources()

      expect(store.error.sources).toBe('Network error')
      expect(store.loading.sources).toBe(false)
    })

    it('should handle non-Error rejection', async () => {
      const store = useDataSourcesStore()
      vi.mocked(listDataSources).mockRejectedValue('String error')

      await store.fetchDataSources()

      expect(store.error.sources).toBe('Failed to load data sources')
    })
  })

  describe('selectDataSource Action', () => {
    it('should update selected source id', async () => {
      const store = useDataSourcesStore()
      await store.selectDataSource(5)
      expect(store.selectedSourceId).toBe(5)
    })

    it('should fetch report if report type is selected', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedReportType = 'dashboard'
      vi.mocked(getDashboardReport).mockResolvedValue({ summary: {} })

      await store.selectDataSource(1)

      expect(getDashboardReport).toHaveBeenCalledWith('TEST_CDM_1')
    })

    it('clears a stale report error when switching sources with a plugin report type selected', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedReportType = 'plugin:p1:my-report'
      store.error.report = 'boom'

      await store.selectDataSource(1)

      expect(store.error.report).toBeNull()
      expect(getDashboardReport).not.toHaveBeenCalled()
    })
  })

  describe('selectReportType Action', () => {
    it('should update selected report type', async () => {
      const store = useDataSourcesStore()
      await store.selectReportType('dashboard')
      expect(store.selectedReportType).toBe('dashboard')
    })

    it('should fetch report if source is selected', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      vi.mocked(getDashboardReport).mockResolvedValue({ summary: {} })

      await store.selectReportType('dashboard')

      expect(getDashboardReport).toHaveBeenCalledWith('TEST_CDM_1')
    })
  })

  describe('fetchReport Action', () => {
    beforeEach(() => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
    })

    it('should do nothing if no source selected', async () => {
      const store = useDataSourcesStore()
      store.selectedSourceId = null
      await store.fetchReport('dashboard')
      expect(getDashboardReport).not.toHaveBeenCalled()
    })

    it('should do nothing if source not found', async () => {
      const store = useDataSourcesStore()
      store.selectedSourceId = 999
      await store.fetchReport('dashboard')
      expect(getDashboardReport).not.toHaveBeenCalled()
    })

    it('should use cached report if available', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      store.reportCache.set('1-dashboard', { type: 'dashboard', data: {} } as any)

      await store.fetchReport('dashboard')

      expect(getDashboardReport).not.toHaveBeenCalled()
    })

    it('should fetch dashboard report', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      vi.mocked(getDashboardReport).mockResolvedValue({ summary: {} })

      await store.fetchReport('dashboard')

      expect(getDashboardReport).toHaveBeenCalledWith('TEST_CDM_1')
      expect(store.reportCache.has('1-dashboard')).toBe(true)
    })

    it('should fetch clinical domain report', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      vi.mocked(getClinicalDomainReport).mockResolvedValue([])

      await store.fetchReport('conditionOccurrence')

      expect(getClinicalDomainReport).toHaveBeenCalledWith('TEST_CDM_1', 'conditionOccurrence')
      expect(store.reportCache.has('1-conditionOccurrence')).toBe(true)
    })

    it('should handle fetch error', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      vi.mocked(getDashboardReport).mockRejectedValue(new Error('API error'))

      await store.fetchReport('dashboard')

      expect(store.error.report).toBe('API error')
      expect(store.loading.report).toBe(false)
    })

    it('should ignore abort errors', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      const abortError = new Error('Aborted')
      abortError.name = 'AbortError'
      vi.mocked(getDashboardReport).mockRejectedValue(abortError)

      await store.fetchReport('dashboard')

      expect(store.error.report).toBeNull()
    })

    it('should join an in-flight request for the same report instead of refetching', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      vi.mocked(getDashboardReport).mockResolvedValue({ summary: {} })

      await Promise.all([store.fetchReport('dashboard'), store.fetchReport('dashboard')])

      expect(getDashboardReport).toHaveBeenCalledTimes(1)
      expect(store.reportCache.has('1-dashboard')).toBe(true)
      expect(store.loading.report).toBe(false)
    })

    it('should still fetch report B when report A is in flight', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1

      let releaseDashboard: (value: unknown) => void = () => {}
      vi.mocked(getDashboardReport).mockReturnValue(
        new Promise(resolve => {
          releaseDashboard = resolve
        }) as ReturnType<typeof getDashboardReport>
      )
      vi.mocked(getClinicalDomainReport).mockResolvedValue([])

      // A starts and stays in flight; B is requested while it hangs.
      const reportA = store.fetchReport('dashboard')
      await store.fetchReport('conditionOccurrence')

      expect(getClinicalDomainReport).toHaveBeenCalledWith('TEST_CDM_1', 'conditionOccurrence')
      expect(store.reportCache.has('1-conditionOccurrence')).toBe(true)
      // A is still running, so the store is still loading.
      expect(store.loading.report).toBe(true)

      releaseDashboard({ summary: {} })
      await reportA

      expect(store.reportCache.has('1-dashboard')).toBe(true)
      expect(store.loading.report).toBe(false)
    })

    it('should handle visit report type', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      vi.mocked(getClinicalDomainReport).mockResolvedValue([])

      await store.fetchReport('visit')

      expect(getClinicalDomainReport).toHaveBeenCalledWith('TEST_CDM_1', 'visit')
    })

    it('should handle procedure report type', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      vi.mocked(getClinicalDomainReport).mockResolvedValue([])

      await store.fetchReport('procedure')

      expect(getClinicalDomainReport).toHaveBeenCalledWith('TEST_CDM_1', 'procedure')
    })

    it('should handle drugExposure report type', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      vi.mocked(getClinicalDomainReport).mockResolvedValue([])

      await store.fetchReport('drugExposure')

      expect(getClinicalDomainReport).toHaveBeenCalledWith('TEST_CDM_1', 'drugExposure')
    })

    it('should handle measurement report type', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      vi.mocked(getClinicalDomainReport).mockResolvedValue([])

      await store.fetchReport('measurement')

      expect(getClinicalDomainReport).toHaveBeenCalledWith('TEST_CDM_1', 'measurement')
    })
  })

  describe('cacheReport Action', () => {
    it('should add report to cache', () => {
      const store = useDataSourcesStore()
      const reportData = { type: 'dashboard', data: {} }

      store.cacheReport('test-key', reportData as any)

      expect(store.reportCache.get('test-key')).toEqual(reportData)
    })
  })

  describe('clearCache Action', () => {
    it('should clear the report cache', () => {
      const store = useDataSourcesStore()
      store.reportCache.set('key1', { type: 'dashboard', data: {} } as any)
      store.reportCache.set('key2', { type: 'dashboard', data: {} } as any)

      store.clearCache()

      expect(store.reportCache.size).toBe(0)
    })
  })

  describe('retryFetchSources Action', () => {
    it('should call fetchDataSources', async () => {
      const store = useDataSourcesStore()
      vi.mocked(listDataSources).mockResolvedValue([])

      await store.retryFetchSources()

      expect(listDataSources).toHaveBeenCalled()
    })
  })

  describe('retryFetchReport Action', () => {
    it('should call fetchReport with selected report type', async () => {
      const store = useDataSourcesStore()
      store.sources = mockDataSources
      store.selectedSourceId = 1
      store.selectedReportType = 'dashboard'
      vi.mocked(getDashboardReport).mockResolvedValue({ summary: {} })

      await store.retryFetchReport()

      expect(getDashboardReport).toHaveBeenCalled()
    })

    it('should do nothing if no report type selected', async () => {
      const store = useDataSourcesStore()
      store.selectedReportType = null

      await store.retryFetchReport()

      expect(getDashboardReport).not.toHaveBeenCalled()
    })
  })

  it('does not fetch a report for a plugin report type', async () => {
    const store = useDataSourcesStore()
    store.sources = [
      { sourceId: 1, sourceName: 'S', sourceKey: 'SYNPUF', sourceDialect: 'postgresql', daimons: [] },
    ]
    store.selectedSourceId = 1

    await store.selectReportType('plugin:p1:my-report')

    expect(store.selectedReportType).toBe('plugin:p1:my-report')
    expect(store.loading.report).toBe(false)
  })

  it('clears a stale report error when switching to a plugin report type', async () => {
    const store = useDataSourcesStore()
    store.sources = [
      { sourceId: 1, sourceName: 'S', sourceKey: 'SYNPUF', sourceDialect: 'postgresql', daimons: [] },
    ]
    store.selectedSourceId = 1
    store.error.report = 'boom'

    await store.selectReportType('plugin:p1:my-report')

    expect(store.error.report).toBeNull()
    expect(getDashboardReport).not.toHaveBeenCalled()
  })
})
