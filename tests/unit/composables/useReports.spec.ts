import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { PersonReport } from '@/models/report.types'

vi.mock('@/services/webapi')
vi.mock('@/services/report-mapper')

let webapi: typeof import('@/services/webapi')
let mapper: typeof import('@/services/report-mapper')
let useReports: typeof import('@/composables/useReports').useReports
let useReportsStore: typeof import('@/stores/reports').useReportsStore

beforeAll(async () => {
  vi.resetModules()
  webapi = await import('@/services/webapi')
  mapper = await import('@/services/report-mapper')
  ;({ useReports } = await import('@/composables/useReports'))
  ;({ useReportsStore } = await import('@/stores/reports'))
})

describe('useReports Composable', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setActivePinia(createPinia())

    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})

    vi.clearAllMocks()
  })

  afterEach(() => {
    consoleWarnSpy.mockRestore()
  })

  describe('State Exposure', () => {
    it('should expose reactive state from store via storeToRefs', () => {
      const composable = useReports()

      expect(composable.currentReportType).toBeDefined()
      expect(composable.currentSourceKey).toBeDefined()
      expect(composable.currentCohortId).toBeDefined()
      expect(composable.loading).toBeDefined()
      expect(composable.loadingSection).toBeDefined()
      expect(composable.error).toBeDefined()
      expect(composable.sectionErrors).toBeDefined()
      expect(composable.currentReport).toBeDefined()
      expect(composable.isLoading).toBeDefined()
      expect(composable.hasError).toBeDefined()
      expect(composable.errorMessage).toBeDefined()
      expect(composable.cacheStats).toBeDefined()
    })

    it('should have reactive state that reflects store changes', () => {
      const composable = useReports()
      const store = useReportsStore()

      expect(composable.currentReportType.value).toBeNull()
      expect(composable.loading.value).toBe(false)

      store.currentReportType = 'person'
      store.loading = true

      expect(composable.currentReportType.value).toBe('person')
      expect(composable.loading.value).toBe(true)
    })
  })

  describe('loadReport()', () => {
    it('should fetch report with cohortId, sourceKey, and reportType', async () => {
      const composable = useReports()
      const store = useReportsStore()

      const mockRawData = {
        yearOfBirth: [],
        gender: [],
        race: [],
        ethnicity: []
      }
      const mockMappedData: PersonReport = {
        yearOfBirth: [],
        demographics: { gender: [], race: [], ethnicity: [] }
      }

      vi.mocked(webapi.getPersonReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapPersonReport).mockReturnValue(mockMappedData)

      await composable.loadReport(123, 'SYNPUF', 'person')

      expect(webapi.getPersonReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(store.currentCohortId).toBe(123)
      expect(store.currentSourceKey).toBe('SYNPUF')
      expect(store.currentReportType).toBe('person')
    })

    it('should handle different report types', async () => {
      const composable = useReports()

      vi.mocked(webapi.getConditionErasReport).mockResolvedValue([])
      vi.mocked(mapper.mapConditionErasReport).mockReturnValue({
        prevalence: [],
        treemapData: []
      })

      await composable.loadReport(456, 'CDM', 'condition-eras')
      expect(webapi.getConditionErasReport).toHaveBeenCalledWith(456, 'CDM')

      vi.mocked(webapi.getDrugErasReport).mockResolvedValue([])
      vi.mocked(mapper.mapDrugErasReport).mockReturnValue({
        prevalence: [],
        treemapData: []
      })

      await composable.loadReport(789, 'TEST', 'drug-eras')
      expect(webapi.getDrugErasReport).toHaveBeenCalledWith(789, 'TEST')
    })

    it('should propagate errors from store', async () => {
      const composable = useReports()
      const store = useReportsStore()

      vi.mocked(webapi.getPersonReport).mockResolvedValue(null)

      await composable.loadReport(123, 'SYNPUF', 'person')

      expect(store.error).toContain('Failed to fetch person report')
    })
  })

  describe('switchReportType()', () => {
    it('should switch report type using current context', async () => {
      const composable = useReports()
      const store = useReportsStore()

      store.setCurrentReport(123, 'SYNPUF', 'person')

      vi.mocked(webapi.getDrugErasReport).mockResolvedValue([])
      vi.mocked(mapper.mapDrugErasReport).mockReturnValue({
        prevalence: [],
        treemapData: []
      })

      await composable.switchReportType('drug-eras')

      expect(webapi.getDrugErasReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(store.currentReportType).toBe('drug-eras')
    })

    it('should warn and not fetch if no cohortId in context', async () => {
      const composable = useReports()
      const store = useReportsStore()

      store.currentSourceKey = 'SYNPUF'

      await composable.switchReportType('person')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[useReports] Cannot switch report type without cohort/source context'
      )
      expect(webapi.getPersonReport).not.toHaveBeenCalled()
    })

    it('should warn and not fetch if no sourceKey in context', async () => {
      const composable = useReports()
      const store = useReportsStore()

      store.currentCohortId = 123

      await composable.switchReportType('person')

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[useReports] Cannot switch report type without cohort/source context'
      )
      expect(webapi.getPersonReport).not.toHaveBeenCalled()
    })

    it('should warn and not fetch if both cohortId and sourceKey missing', async () => {
      const composable = useReports()

      await composable.switchReportType('person')

      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(webapi.getPersonReport).not.toHaveBeenCalled()
    })
  })

  describe('refreshReport()', () => {
    it('should clear and re-fetch current report', async () => {
      const composable = useReports()
      const store = useReportsStore()

      const mockData: PersonReport = {
        yearOfBirth: [],
        demographics: { gender: [], race: [], ethnicity: [] }
      }

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: mockData
      })

      store.setCurrentReport(123, 'SYNPUF', 'person')

      vi.mocked(webapi.getPersonReport).mockResolvedValue({
        yearOfBirth: [],
        gender: [],
        race: [],
        ethnicity: []
      })
      vi.mocked(mapper.mapPersonReport).mockReturnValue(mockData)

      expect(store.reportData.has('123-SYNPUF-person')).toBe(true)

      await composable.refreshReport()

      expect(webapi.getPersonReport).toHaveBeenCalledWith(123, 'SYNPUF')
    })

    it('should warn and not refresh if no cohortId', async () => {
      const composable = useReports()
      const store = useReportsStore()

      store.currentSourceKey = 'SYNPUF'
      store.currentReportType = 'person'

      await composable.refreshReport()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[useReports] Cannot refresh without current report context'
      )
      expect(webapi.getPersonReport).not.toHaveBeenCalled()
    })

    it('should warn and not refresh if no sourceKey', async () => {
      const composable = useReports()
      const store = useReportsStore()

      store.currentCohortId = 123
      store.currentReportType = 'person'

      await composable.refreshReport()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[useReports] Cannot refresh without current report context'
      )
      expect(webapi.getPersonReport).not.toHaveBeenCalled()
    })

    it('should warn and not refresh if no reportType', async () => {
      const composable = useReports()
      const store = useReportsStore()

      store.currentCohortId = 123
      store.currentSourceKey = 'SYNPUF'

      await composable.refreshReport()

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[useReports] Cannot refresh without current report context'
      )
      expect(webapi.getPersonReport).not.toHaveBeenCalled()
    })

    it('should warn and not refresh if all context missing', async () => {
      const composable = useReports()

      await composable.refreshReport()

      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(webapi.getPersonReport).not.toHaveBeenCalled()
    })

    it('should handle refresh errors gracefully', async () => {
      const composable = useReports()
      const store = useReportsStore()

      store.setCurrentReport(123, 'SYNPUF', 'person')

      vi.mocked(webapi.getPersonReport).mockResolvedValue(null)

      await composable.refreshReport()

      expect(store.error).toContain('Failed to fetch person report')
    })
  })

  describe('isReportAvailable()', () => {
    it('should check if report is cached', () => {
      const composable = useReports()
      const store = useReportsStore()

      expect(composable.isReportAvailable(123, 'SYNPUF', 'person')).toBe(false)

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      expect(composable.isReportAvailable(123, 'SYNPUF', 'person')).toBe(true)
    })

    it('should return false for uncached reports', () => {
      const composable = useReports()

      const result = composable.isReportAvailable(456, 'CDM', 'drug-eras')

      expect(result).toBe(false)
    })

    it('should handle multiple cache checks', () => {
      const composable = useReports()
      const store = useReportsStore()

      store.reportData.set('1-A-person', {
        type: 'person',
        cohortId: 1,
        sourceKey: 'A',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      expect(composable.isReportAvailable(1, 'A', 'person')).toBe(true)
      expect(composable.isReportAvailable(2, 'B', 'condition-eras')).toBe(false)
      expect(composable.isReportAvailable(3, 'C', 'drug-eras')).toBe(false)
    })
  })

  describe('getReportData()', () => {
    it('should retrieve cached report data', () => {
      const composable = useReports()
      const store = useReportsStore()

      const mockReportData: PersonReport = {
        yearOfBirth: [{ year: 1950, count: 100 }],
        demographics: {
          gender: [{ conceptId: 8507, conceptName: 'Male', count: 60, percentage: 100 }],
          race: [{ conceptId: 8527, conceptName: 'White', count: 80, percentage: 100 }],
          ethnicity: [{ conceptId: 38003564, conceptName: 'Not Hispanic', count: 90, percentage: 100 }]
        }
      }

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: mockReportData
      })

      const result = composable.getReportData(123, 'SYNPUF', 'person')

      expect(result?.data).toEqual(mockReportData)
    })

    it('should return null for missing reports', () => {
      const composable = useReports()

      const result = composable.getReportData(999, 'MISSING', 'person')

      expect(result).toBeNull()
    })
  })

  describe('clearCurrent()', () => {
    it('should clear current report context', () => {
      const composable = useReports()
      const store = useReportsStore()

      store.setCurrentReport(123, 'SYNPUF', 'person')
      expect(store.currentCohortId).toBe(123)

      composable.clearCurrent()

      expect(store.currentCohortId).toBeNull()
      expect(store.currentSourceKey).toBeNull()
      expect(store.currentReportType).toBeNull()
    })
  })

  describe('clearAll()', () => {
    it('should clear all cached reports', () => {
      const composable = useReports()
      const store = useReportsStore()

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      expect(store.reportData.size).toBe(1)

      composable.clearAll()

      expect(store.reportData.size).toBe(0)
    })
  })

  describe('clearSpecific()', () => {
    it('should clear specific report from cache', () => {
      const composable = useReports()
      const store = useReportsStore()

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      expect(store.reportData.has('123-SYNPUF-person')).toBe(true)

      composable.clearSpecific(123, 'SYNPUF', 'person')

      expect(store.reportData.has('123-SYNPUF-person')).toBe(false)
    })

    it('should handle clearing different reports', () => {
      const composable = useReports()
      const store = useReportsStore()

      store.reportData.set('1-A-person', {
        type: 'person',
        cohortId: 1,
        sourceKey: 'A',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      store.reportData.set('2-B-condition-eras', {
        type: 'condition-eras',
        cohortId: 2,
        sourceKey: 'B',
        fetchedAt: new Date(),
        data: { prevalence: [], treemapData: [] }
      })

      composable.clearSpecific(1, 'A', 'person')

      expect(store.reportData.has('1-A-person')).toBe(false)
      expect(store.reportData.has('2-B-condition-eras')).toBe(true)
    })
  })

  describe('setContext()', () => {
    it('should set report context without fetching', () => {
      const composable = useReports()
      const store = useReportsStore()

      composable.setContext(123, 'SYNPUF', 'person')

      expect(store.currentCohortId).toBe(123)
      expect(store.currentSourceKey).toBe('SYNPUF')
      expect(store.currentReportType).toBe('person')
      expect(webapi.getPersonReport).not.toHaveBeenCalled()
    })

    it('should update context to different values', () => {
      const composable = useReports()
      const store = useReportsStore()

      composable.setContext(456, 'CDM', 'drug-eras')

      expect(store.currentCohortId).toBe(456)
      expect(store.currentSourceKey).toBe('CDM')
      expect(store.currentReportType).toBe('drug-eras')
    })
  })

  describe('Computed Helpers', () => {
    describe('hasCurrentReport', () => {
      it('should return true when current report exists', () => {
        const composable = useReports()
        const store = useReportsStore()

        store.reportData.set('123-SYNPUF-person', {
          type: 'person',
          cohortId: 123,
          sourceKey: 'SYNPUF',
          fetchedAt: new Date(),
          data: {} as PersonReport
        })

        store.setCurrentReport(123, 'SYNPUF', 'person')

        expect(composable.hasCurrentReport.value).toBe(true)
      })

      it('should return false when current report is null', () => {
        const composable = useReports()

        expect(composable.hasCurrentReport.value).toBe(false)
      })
    })

    describe('currentReportData', () => {
      it('should return data from current report', () => {
        const composable = useReports()
        const store = useReportsStore()

        const mockData: PersonReport = {
          yearOfBirth: [{ year: 1950, count: 100 }],
          demographics: {
            gender: [{ conceptId: 8507, conceptName: 'Male', count: 60, percentage: 100 }],
            race: [{ conceptId: 8527, conceptName: 'White', count: 80, percentage: 100 }],
            ethnicity: [{ conceptId: 38003564, conceptName: 'Not Hispanic', count: 90, percentage: 100 }]
          }
        }

        store.reportData.set('123-SYNPUF-person', {
          type: 'person',
          cohortId: 123,
          sourceKey: 'SYNPUF',
          fetchedAt: new Date(),
          data: mockData
        })

        store.setCurrentReport(123, 'SYNPUF', 'person')

        expect(composable.currentReportData.value).toEqual(mockData)
      })

      it('should return null when no current report', () => {
        const composable = useReports()

        expect(composable.currentReportData.value).toBeNull()
      })
    })

    describe('Report Type Helpers', () => {
      it('isPersonReport should be true for person report', () => {
        const composable = useReports()
        const store = useReportsStore()

        store.currentReportType = 'person'

        expect(composable.isPersonReport.value).toBe(true)
        expect(composable.isConditionErasReport.value).toBe(false)
        expect(composable.isDrugErasReport.value).toBe(false)
        expect(composable.isCohortSpecificReport.value).toBe(false)
      })

      it('isConditionErasReport should be true for condition-eras report', () => {
        const composable = useReports()
        const store = useReportsStore()

        store.currentReportType = 'condition-eras'

        expect(composable.isPersonReport.value).toBe(false)
        expect(composable.isConditionErasReport.value).toBe(true)
        expect(composable.isDrugErasReport.value).toBe(false)
        expect(composable.isCohortSpecificReport.value).toBe(false)
      })

      it('isDrugErasReport should be true for drug-eras report', () => {
        const composable = useReports()
        const store = useReportsStore()

        store.currentReportType = 'drug-eras'

        expect(composable.isPersonReport.value).toBe(false)
        expect(composable.isConditionErasReport.value).toBe(false)
        expect(composable.isDrugErasReport.value).toBe(true)
        expect(composable.isCohortSpecificReport.value).toBe(false)
      })

      it('isCohortSpecificReport should be true for cohort-specific report', () => {
        const composable = useReports()
        const store = useReportsStore()

        store.currentReportType = 'cohort-specific'

        expect(composable.isPersonReport.value).toBe(false)
        expect(composable.isConditionErasReport.value).toBe(false)
        expect(composable.isDrugErasReport.value).toBe(false)
        expect(composable.isCohortSpecificReport.value).toBe(true)
      })

      it('all type helpers should be false when no report type set', () => {
        const composable = useReports()

        expect(composable.isPersonReport.value).toBe(false)
        expect(composable.isConditionErasReport.value).toBe(false)
        expect(composable.isDrugErasReport.value).toBe(false)
        expect(composable.isCohortSpecificReport.value).toBe(false)
      })
    })
  })

  describe('Integration Tests', () => {
    it('should support complete workflow: load -> switch -> refresh -> clear', async () => {
      const composable = useReports()
      const store = useReportsStore()

      vi.mocked(webapi.getPersonReport).mockResolvedValue({
        yearOfBirth: [],
        gender: [],
        race: [],
        ethnicity: []
      })
      vi.mocked(mapper.mapPersonReport).mockReturnValue({
        yearOfBirth: [],
        demographics: { gender: [], race: [], ethnicity: [] }
      })

      await composable.loadReport(123, 'SYNPUF', 'person')
      expect(store.currentReportType).toBe('person')

      vi.mocked(webapi.getDrugErasReport).mockResolvedValue([])
      vi.mocked(mapper.mapDrugErasReport).mockReturnValue({
        prevalence: [],
        treemapData: []
      })

      await composable.switchReportType('drug-eras')
      expect(store.currentReportType).toBe('drug-eras')

      await composable.refreshReport()
      expect(webapi.getDrugErasReport).toHaveBeenCalled()

      composable.clearSpecific(123, 'SYNPUF', 'drug-eras')
      expect(store.reportData.has('123-SYNPUF-drug-eras')).toBe(false)
    })

    it('should handle checking availability and retrieving data', () => {
      const composable = useReports()
      const store = useReportsStore()

      const mockData: PersonReport = {
        yearOfBirth: [],
        demographics: { gender: [], race: [], ethnicity: [] }
      }

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: mockData
      })

      const isAvailable = composable.isReportAvailable(123, 'SYNPUF', 'person')
      expect(isAvailable).toBe(true)

      const data = composable.getReportData(123, 'SYNPUF', 'person')
      expect(data).toBeDefined()
      expect(data?.type).toBe('person')
    })

    it('should properly handle context setting and clearing', () => {
      const composable = useReports()
      const store = useReportsStore()

      composable.setContext(123, 'SYNPUF', 'person')
      expect(store.currentCohortId).toBe(123)

      composable.clearCurrent()
      expect(store.currentCohortId).toBeNull()

      store.reportData.set('test', {
        type: 'person',
        cohortId: 1,
        sourceKey: 'A',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      composable.clearAll()
      expect(store.reportData.size).toBe(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle switching report type with zero cohortId', async () => {
      const composable = useReports()
      const store = useReportsStore()

      store.currentCohortId = 0
      store.currentSourceKey = 'SYNPUF'

      await composable.switchReportType('person')

      expect(consoleWarnSpy).toHaveBeenCalled()
      expect(webapi.getPersonReport).not.toHaveBeenCalled()
    })

    it('should handle refreshing with zero cohortId', async () => {
      const composable = useReports()
      const store = useReportsStore()

      store.currentCohortId = 0
      store.currentSourceKey = 'SYNPUF'
      store.currentReportType = 'person'

      await composable.refreshReport()

      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('should handle multiple rapid switches', async () => {
      const composable = useReports()
      const store = useReportsStore()

      store.currentCohortId = 123
      store.currentSourceKey = 'SYNPUF'

      vi.mocked(webapi.getPersonReport).mockResolvedValue({
        yearOfBirth: [],
        gender: [],
        race: [],
        ethnicity: []
      })
      vi.mocked(mapper.mapPersonReport).mockReturnValue({
        yearOfBirth: [],
        demographics: { gender: [], race: [], ethnicity: [] }
      })

      vi.mocked(webapi.getDrugErasReport).mockResolvedValue([])
      vi.mocked(mapper.mapDrugErasReport).mockReturnValue({
        prevalence: [],
        treemapData: []
      })

      vi.mocked(webapi.getConditionErasReport).mockResolvedValue([])
      vi.mocked(mapper.mapConditionErasReport).mockReturnValue({
        prevalence: [],
        treemapData: []
      })

      await composable.switchReportType('person')
      await composable.switchReportType('drug-eras')
      await composable.switchReportType('condition-eras')

      expect(webapi.getPersonReport).toHaveBeenCalled()
      expect(webapi.getDrugErasReport).toHaveBeenCalled()
      expect(webapi.getConditionErasReport).toHaveBeenCalled()
    })

    it('should handle clearing all multiple times', () => {
      const composable = useReports()
      const store = useReportsStore()

      composable.clearAll()
      composable.clearAll()
      composable.clearAll()

      expect(store.reportData.size).toBe(0)
    })

    it('should handle empty string sourceKey', async () => {
      const composable = useReports()
      const store = useReportsStore()

      store.currentCohortId = 123
      store.currentSourceKey = ''

      await composable.switchReportType('person')

      expect(consoleWarnSpy).toHaveBeenCalled()
    })
  })
})
