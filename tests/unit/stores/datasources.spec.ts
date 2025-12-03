/**
 * Unit Tests: Data Sources Store
 * Tests for src/stores/datasources.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataSourcesStore } from '@/stores/datasources'

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

describe('useDataSourcesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('starts with empty sources', () => {
      const store = useDataSourcesStore()
      expect(store.sources).toEqual([])
    })

    it('starts with no selection', () => {
      const store = useDataSourcesStore()
      expect(store.selectedSourceId).toBeNull()
      expect(store.selectedReportType).toBeNull()
    })

    it('starts with empty cache', () => {
      const store = useDataSourcesStore()
      expect(store.reportCache.size).toBe(0)
    })

    it('starts with loading states false', () => {
      const store = useDataSourcesStore()
      expect(store.loading.sources).toBe(false)
      expect(store.loading.report).toBe(false)
    })

    it('starts without errors', () => {
      const store = useDataSourcesStore()
      expect(store.error.sources).toBeNull()
      expect(store.error.report).toBeNull()
    })
  })

  describe('getters', () => {
    describe('selectedSource', () => {
      it('returns null when no source selected', () => {
        const store = useDataSourcesStore()
        expect(store.selectedSource).toBeNull()
      })

      it('returns selected source when available', () => {
        const store = useDataSourcesStore()
        const testSource = { sourceId: 1, sourceKey: 'TEST', sourceName: 'Test Source' }
        store.sources = [testSource as never]
        store.selectedSourceId = 1
        expect(store.selectedSource).toEqual(testSource)
      })

      it('returns null when selected source not found', () => {
        const store = useDataSourcesStore()
        store.sources = [{ sourceId: 1, sourceKey: 'TEST' } as never]
        store.selectedSourceId = 999
        expect(store.selectedSource).toBeNull()
      })
    })

    describe('currentReport', () => {
      it('returns null when no source selected', () => {
        const store = useDataSourcesStore()
        store.selectedReportType = 'dashboard'
        expect(store.currentReport).toBeNull()
      })

      it('returns null when no report type selected', () => {
        const store = useDataSourcesStore()
        store.selectedSourceId = 1
        expect(store.currentReport).toBeNull()
      })

      it('returns cached report when available', () => {
        const store = useDataSourcesStore()
        const reportData = { type: 'dashboard', data: { summary: {} } }
        store.selectedSourceId = 1
        store.selectedReportType = 'dashboard'
        store.reportCache.set('1-dashboard', reportData as never)
        expect(store.currentReport).toEqual(reportData)
      })

      it('returns null when report not cached', () => {
        const store = useDataSourcesStore()
        store.selectedSourceId = 1
        store.selectedReportType = 'dashboard'
        expect(store.currentReport).toBeNull()
      })
    })

    describe('isLoading', () => {
      it('returns false when nothing loading', () => {
        const store = useDataSourcesStore()
        expect(store.isLoading).toBe(false)
      })

      it('returns true when sources loading', () => {
        const store = useDataSourcesStore()
        store.loading.sources = true
        expect(store.isLoading).toBe(true)
      })

      it('returns true when report loading', () => {
        const store = useDataSourcesStore()
        store.loading.report = true
        expect(store.isLoading).toBe(true)
      })
    })
  })

  describe('actions', () => {
    describe('fetchDataSources', () => {
      it('fetches and stores data sources', async () => {
        const { listDataSources } = await import('@/services/datasource.service')
        const mockSources = [
          { sourceId: 1, sourceKey: 'TEST1', sourceName: 'Test Source 1' },
          { sourceId: 2, sourceKey: 'TEST2', sourceName: 'Test Source 2' },
        ]
        vi.mocked(listDataSources).mockResolvedValue(mockSources as never)

        const store = useDataSourcesStore()
        await store.fetchDataSources()

        expect(store.sources).toEqual(mockSources)
        expect(store.loading.sources).toBe(false)
        expect(store.error.sources).toBeNull()
      })

      it('auto-selects first source when none selected', async () => {
        const { listDataSources } = await import('@/services/datasource.service')
        const mockSources = [{ sourceId: 1, sourceKey: 'TEST1' }]
        vi.mocked(listDataSources).mockResolvedValue(mockSources as never)

        const store = useDataSourcesStore()
        await store.fetchDataSources()

        expect(store.selectedSourceId).toBe(1)
      })

      it('does not change selection when already selected', async () => {
        const { listDataSources } = await import('@/services/datasource.service')
        const mockSources = [
          { sourceId: 1, sourceKey: 'TEST1' },
          { sourceId: 2, sourceKey: 'TEST2' },
        ]
        vi.mocked(listDataSources).mockResolvedValue(mockSources as never)

        const store = useDataSourcesStore()
        store.selectedSourceId = 2
        await store.fetchDataSources()

        expect(store.selectedSourceId).toBe(2)
      })

      it('handles fetch errors', async () => {
        const { listDataSources } = await import('@/services/datasource.service')
        vi.mocked(listDataSources).mockRejectedValue(new Error('Network error'))

        const store = useDataSourcesStore()
        await store.fetchDataSources()

        expect(store.sources).toEqual([])
        expect(store.error.sources).toBe('Network error')
        expect(store.loading.sources).toBe(false)
      })

      it('sets loading state during fetch', async () => {
        const { listDataSources } = await import('@/services/datasource.service')
        let resolvePromise: (value: never[]) => void
        const promise = new Promise<never[]>((resolve) => {
          resolvePromise = resolve
        })
        vi.mocked(listDataSources).mockReturnValue(promise)

        const store = useDataSourcesStore()
        const fetchPromise = store.fetchDataSources()

        expect(store.loading.sources).toBe(true)

        resolvePromise!([])
        await fetchPromise

        expect(store.loading.sources).toBe(false)
      })
    })

    describe('selectDataSource', () => {
      it('selects the data source', async () => {
        const store = useDataSourcesStore()
        await store.selectDataSource(5)
        expect(store.selectedSourceId).toBe(5)
      })

      it('fetches report if report type already selected', async () => {
        const store = useDataSourcesStore()
        store.sources = [{ sourceId: 5, sourceKey: 'TEST' } as never]
        store.selectedReportType = 'dashboard'

        const { getDashboardReport } = await import('@/services/datasource.service')
        vi.mocked(getDashboardReport).mockResolvedValue({ summary: {} } as never)

        await store.selectDataSource(5)

        expect(getDashboardReport).toHaveBeenCalledWith('TEST')
      })
    })

    describe('selectReportType', () => {
      it('selects the report type', async () => {
        const store = useDataSourcesStore()
        await store.selectReportType('dashboard')
        expect(store.selectedReportType).toBe('dashboard')
      })

      it('fetches report if source already selected', async () => {
        const store = useDataSourcesStore()
        store.sources = [{ sourceId: 1, sourceKey: 'TEST' } as never]
        store.selectedSourceId = 1

        const { getDashboardReport } = await import('@/services/datasource.service')
        vi.mocked(getDashboardReport).mockResolvedValue({ summary: {} } as never)

        await store.selectReportType('dashboard')

        expect(getDashboardReport).toHaveBeenCalledWith('TEST')
      })
    })

    describe('fetchReport', () => {
      beforeEach(() => {
        const store = useDataSourcesStore()
        store.sources = [{ sourceId: 1, sourceKey: 'TEST' } as never]
        store.selectedSourceId = 1
      })

      it('does not fetch if no source selected', async () => {
        const store = useDataSourcesStore()
        store.selectedSourceId = null

        const { getDashboardReport } = await import('@/services/datasource.service')
        await store.fetchReport('dashboard')

        expect(getDashboardReport).not.toHaveBeenCalled()
      })

      it('uses cached report if available', async () => {
        const store = useDataSourcesStore()
        const cachedData = { type: 'dashboard', data: { cached: true } }
        store.reportCache.set('1-dashboard', cachedData as never)

        const { getDashboardReport } = await import('@/services/datasource.service')
        await store.fetchReport('dashboard')

        expect(getDashboardReport).not.toHaveBeenCalled()
      })

      it('fetches dashboard report', async () => {
        const store = useDataSourcesStore()
        const { getDashboardReport } = await import('@/services/datasource.service')
        const mockData = { summary: { personCount: 100 } }
        vi.mocked(getDashboardReport).mockResolvedValue(mockData as never)

        await store.fetchReport('dashboard')

        expect(getDashboardReport).toHaveBeenCalledWith('TEST')
        expect(store.reportCache.has('1-dashboard')).toBe(true)
      })

      it('fetches clinical domain reports', async () => {
        const store = useDataSourcesStore()
        const { getClinicalDomainReport } = await import('@/services/datasource.service')
        const mockData = [{ conceptName: 'Test' }]
        vi.mocked(getClinicalDomainReport).mockResolvedValue(mockData as never)

        await store.fetchReport('conditionOccurrence')

        expect(getClinicalDomainReport).toHaveBeenCalledWith('TEST', 'conditionOccurrence')
        expect(store.reportCache.has('1-conditionOccurrence')).toBe(true)
      })

      it('handles fetch errors', async () => {
        const store = useDataSourcesStore()
        const { getDashboardReport } = await import('@/services/datasource.service')
        vi.mocked(getDashboardReport).mockRejectedValue(new Error('Report error'))

        await store.fetchReport('dashboard')

        expect(store.error.report).toBe('Report error')
        expect(store.loading.report).toBe(false)
      })

      it('ignores abort errors', async () => {
        const store = useDataSourcesStore()
        const { getDashboardReport } = await import('@/services/datasource.service')
        const abortError = new Error('Aborted')
        abortError.name = 'AbortError'
        vi.mocked(getDashboardReport).mockRejectedValue(abortError)

        await store.fetchReport('dashboard')

        expect(store.error.report).toBeNull()
      })

      it('does not start new fetch if already loading', async () => {
        const store = useDataSourcesStore()
        store.loading.report = true

        const { getDashboardReport } = await import('@/services/datasource.service')
        await store.fetchReport('dashboard')

        expect(getDashboardReport).not.toHaveBeenCalled()
      })
    })

    describe('cacheReport', () => {
      it('caches report data', () => {
        const store = useDataSourcesStore()
        const reportData = { type: 'dashboard', data: { summary: {} } }

        store.cacheReport('test-key', reportData as never)

        expect(store.reportCache.get('test-key')).toEqual(reportData)
      })
    })

    describe('clearCache', () => {
      it('clears all cached reports', () => {
        const store = useDataSourcesStore()
        store.reportCache.set('key1', { type: 'dashboard' } as never)
        store.reportCache.set('key2', { type: 'person' } as never)

        store.clearCache()

        expect(store.reportCache.size).toBe(0)
      })
    })

    describe('retryFetchSources', () => {
      it('retries fetching data sources', async () => {
        const { listDataSources } = await import('@/services/datasource.service')
        vi.mocked(listDataSources).mockResolvedValue([])

        const store = useDataSourcesStore()
        await store.retryFetchSources()

        expect(listDataSources).toHaveBeenCalled()
      })
    })

    describe('retryFetchReport', () => {
      it('retries fetching report if type selected', async () => {
        const store = useDataSourcesStore()
        store.sources = [{ sourceId: 1, sourceKey: 'TEST' } as never]
        store.selectedSourceId = 1
        store.selectedReportType = 'dashboard'

        const { getDashboardReport } = await import('@/services/datasource.service')
        vi.mocked(getDashboardReport).mockResolvedValue({ summary: {} } as never)

        await store.retryFetchReport()

        expect(getDashboardReport).toHaveBeenCalled()
      })

      it('does nothing if no report type selected', async () => {
        const store = useDataSourcesStore()
        store.selectedReportType = null

        const { getDashboardReport } = await import('@/services/datasource.service')
        await store.retryFetchReport()

        expect(getDashboardReport).not.toHaveBeenCalled()
      })
    })
  })
})
