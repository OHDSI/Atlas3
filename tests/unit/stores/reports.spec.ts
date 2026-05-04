import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { PersonReport, ReportType } from '@/models/report.types'

interface MockReportData {
  data: string
}

vi.mock('@/services/webapi')
vi.mock('@/services/report-mapper')

let webapi: typeof import('@/services/webapi')
let mapper: typeof import('@/services/report-mapper')
let useReportsStore: typeof import('@/stores/reports').useReportsStore

beforeAll(async () => {
  vi.resetModules()
  webapi = await import('@/services/webapi')
  mapper = await import('@/services/report-mapper')
  ;({ useReportsStore } = await import('@/stores/reports'))
})

describe('Reports Store', () => {
  beforeEach(() => {
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

      store.setCurrentReport(123, 'SYNPUF', 'person')
      store.error = 'Some error'

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

      await store.fetchReport(123, 'SYNPUF', 'person')

      expect(webapi.getPersonReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapPersonReport).toHaveBeenCalledWith(mockRawData)

      expect(store.loading).toBe(false)
      expect(store.error).toBeNull()
      expect(store.currentReportType).toBe('person')
      expect(store.currentCohortId).toBe(123)
      expect(store.currentSourceKey).toBe('SYNPUF')

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

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: mockMappedData
      })

      await store.fetchReport(123, 'SYNPUF', 'person')

      expect(webapi.getPersonReport).not.toHaveBeenCalled()

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

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      expect(store.reportData.size).toBe(1)

      store.clearReport(123, 'SYNPUF', 'person')

      expect(store.reportData.size).toBe(0)
    })
  })

  describe('clearAllReports', () => {
    it('should remove all cached reports', () => {
      const store = useReportsStore()

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

      store.currentCohortId = 123
      store.currentSourceKey = 'SYNPUF'
      store.currentReportType = 'person'

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

    it('errorMessage should return error value', () => {
      const store = useReportsStore()

      expect(store.errorMessage).toBeNull()

      store.error = 'Test error message'

      expect(store.errorMessage).toBe('Test error message')
    })

    it('getReport should return specific cached report', () => {
      const store = useReportsStore()

      const mockData: PersonReport = {
        yearOfBirth: [{ year: 1920, count: 100 }],
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

      const report = store.getReport(123, 'SYNPUF', 'person')

      expect(report).toBeDefined()
      expect(report?.type).toBe('person')
      expect(report?.cohortId).toBe(123)
      expect(report?.sourceKey).toBe('SYNPUF')
      expect(report?.data).toEqual(mockData)
    })

    it('getReport should return null for non-existent report', () => {
      const store = useReportsStore()

      const report = store.getReport(999, 'UNKNOWN', 'person')

      expect(report).toBeNull()
    })

    it('currentReport should return null when cache does not contain data', () => {
      const store = useReportsStore()

      store.currentCohortId = 123
      store.currentSourceKey = 'SYNPUF'
      store.currentReportType = 'person'

      expect(store.currentReport).toBeNull()
    })
  })

  describe('setReportType', () => {
    it('should update current report type', () => {
      const store = useReportsStore()

      expect(store.currentReportType).toBeNull()

      store.setReportType('condition-eras')

      expect(store.currentReportType).toBe('condition-eras')
    })

    it('should allow changing report type', () => {
      const store = useReportsStore()

      store.setReportType('person')
      expect(store.currentReportType).toBe('person')

      store.setReportType('drug-eras')
      expect(store.currentReportType).toBe('drug-eras')
    })
  })

  describe('fetchReport - Additional Report Types', () => {
    it('should fetch condition-eras report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getConditionErasReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapConditionErasReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'condition-eras')

      expect(webapi.getConditionErasReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapConditionErasReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('condition-eras')
      expect(store.reportData.has('123-SYNPUF-condition-eras')).toBe(true)
    })

    it('should fetch condition report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getConditionReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapConditionReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'condition')

      expect(webapi.getConditionReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapConditionReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('condition')
    })

    it('should fetch drug-eras report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getDrugErasReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapDrugErasReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'drug-eras')

      expect(webapi.getDrugErasReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapDrugErasReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('drug-eras')
    })

    it('should fetch cohort-specific report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getCohortSpecificReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapCohortSpecificReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'cohort-specific')

      expect(webapi.getCohortSpecificReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapCohortSpecificReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('cohort-specific')
    })

    it('should fetch persons-exposure-baseline report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getPersonsExposureBaselineReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapPersonsExposureReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'persons-exposure-baseline')

      expect(webapi.getPersonsExposureBaselineReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapPersonsExposureReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('persons-exposure-baseline')
    })

    it('should fetch persons-exposure-cohort report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getPersonsExposureCohortReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapPersonsExposureReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'persons-exposure-cohort')

      expect(webapi.getPersonsExposureCohortReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapPersonsExposureReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('persons-exposure-cohort')
    })

    it('should fetch visits-baseline report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getVisitsBaselineReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapVisitsReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'visits-baseline')

      expect(webapi.getVisitsBaselineReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapVisitsReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('visits-baseline')
    })

    it('should fetch visit-dates-baseline report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getVisitDatesBaselineReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapVisitDatesReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'visit-dates-baseline')

      expect(webapi.getVisitDatesBaselineReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapVisitDatesReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('visit-dates-baseline')
    })

    it('should fetch care-site-visit-dates-baseline report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getCareSiteVisitDatesBaselineReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapCareSiteVisitDatesReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'care-site-visit-dates-baseline')

      expect(webapi.getCareSiteVisitDatesBaselineReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapCareSiteVisitDatesReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('care-site-visit-dates-baseline')
    })

    it('should fetch visits-cohort report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getVisitsCohortReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapVisitsReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'visits-cohort')

      expect(webapi.getVisitsCohortReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapVisitsReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('visits-cohort')
    })

    it('should fetch visit-dates-cohort report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getVisitDatesCohortReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapVisitDatesReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'visit-dates-cohort')

      expect(webapi.getVisitDatesCohortReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapVisitDatesReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('visit-dates-cohort')
    })

    it('should fetch care-site-visit-dates-cohort report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getCareSiteVisitDatesCohortReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapCareSiteVisitDatesReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'care-site-visit-dates-cohort')

      expect(webapi.getCareSiteVisitDatesCohortReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapCareSiteVisitDatesReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('care-site-visit-dates-cohort')
    })

    it('should fetch drug-utilization-baseline report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getDrugUtilizationBaselineReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapDrugUtilizationReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'drug-utilization-baseline')

      expect(webapi.getDrugUtilizationBaselineReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapDrugUtilizationReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('drug-utilization-baseline')
    })

    it('should fetch drug-utilization-cohort report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getDrugUtilizationCohortReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapDrugUtilizationReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'drug-utilization-cohort')

      expect(webapi.getDrugUtilizationCohortReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapDrugUtilizationReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('drug-utilization-cohort')
    })

    it('should fetch heracles-heel report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getHeraclesHeelReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapHeraclesHeelReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'heracles-heel')

      expect(webapi.getHeraclesHeelReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapHeraclesHeelReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('heracles-heel')
    })

    it('should fetch conditions-by-index report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getConditionsByIndexReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapConditionsByIndexReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'conditions-by-index')

      expect(webapi.getConditionsByIndexReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapConditionsByIndexReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('conditions-by-index')
    })

    it('should fetch death report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getDeathReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapDeathReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'death')

      expect(webapi.getDeathReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapDeathReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('death')
    })

    it('should fetch drug-exposure report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getDrugExposureReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapDrugExposureReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'drug-exposure')

      expect(webapi.getDrugExposureReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapDrugExposureReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('drug-exposure')
    })

    it('should fetch drugs-by-index report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getDrugsByIndexReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapDrugsByIndexReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'drugs-by-index')

      expect(webapi.getDrugsByIndexReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapDrugsByIndexReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('drugs-by-index')
    })

    it('should fetch observation-periods report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getObservationPeriodsReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapObservationPeriodsReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'observation-periods')

      expect(webapi.getObservationPeriodsReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapObservationPeriodsReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('observation-periods')
    })

    it('should fetch procedure report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getProcedureReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapProcedureReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'procedure')

      expect(webapi.getProcedureReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapProcedureReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('procedure')
    })

    it('should fetch procedures-by-index report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getProceduresByIndexReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapProceduresByIndexReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'procedures-by-index')

      expect(webapi.getProceduresByIndexReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapProceduresByIndexReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('procedures-by-index')
    })

    it('should fetch data-completeness report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getDataCompletenessReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapDataCompletenessReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'data-completeness')

      expect(webapi.getDataCompletenessReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapDataCompletenessReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('data-completeness')
    })

    it('should fetch entropy report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getEntropyReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapEntropyReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'entropy')

      expect(webapi.getEntropyReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapEntropyReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('entropy')
    })

    it('should fetch tornado report', async () => {
      const store = useReportsStore()

      const mockRawData = { data: 'raw' }
      const mockMappedData = { data: 'mapped' }

      vi.mocked(webapi.getTornadoReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapTornadoReport).mockReturnValue(mockMappedData as MockReportData)

      await store.fetchReport(123, 'SYNPUF', 'tornado')

      expect(webapi.getTornadoReport).toHaveBeenCalledWith(123, 'SYNPUF')
      expect(mapper.mapTornadoReport).toHaveBeenCalledWith(mockRawData)
      expect(store.currentReportType).toBe('tornado')
    })
  })

  describe('fetchReport - Edge Cases', () => {
    it('should refetch when cache is older than 5 minutes', async () => {
      const store = useReportsStore()

      const oldDate = new Date(Date.now() - 6 * 60 * 1000)

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: oldDate,
        data: {} as PersonReport
      })

      const mockRawData = { yearOfBirth: [{ intervalIndex: 0, countValue: 100 }] }
      const mockMappedData: PersonReport = {
        yearOfBirth: [{ year: 1920, count: 100 }],
        demographics: {
          gender: [],
          race: [],
          ethnicity: []
        }
      }

      vi.mocked(webapi.getPersonReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapPersonReport).mockReturnValue(mockMappedData)

      await store.fetchReport(123, 'SYNPUF', 'person')

      expect(webapi.getPersonReport).toHaveBeenCalled()

      const cached = store.reportData.get('123-SYNPUF-person')
      expect(cached?.fetchedAt.getTime()).toBeGreaterThan(oldDate.getTime())
    })

    it('should handle unsupported report type', async () => {
      const store = useReportsStore()

      await store.fetchReport(123, 'SYNPUF', 'invalid-type' as ReportType)

      expect(store.error).toContain('Unsupported report type: invalid-type')
      expect(store.loading).toBe(false)
    })

    it('should handle null response from condition-eras API', async () => {
      const store = useReportsStore()

      vi.mocked(webapi.getConditionErasReport).mockResolvedValue(null)

      await store.fetchReport(123, 'SYNPUF', 'condition-eras')

      expect(store.error).toContain('Failed to fetch condition eras report data')
      expect(store.loading).toBe(false)
    })

    it('should handle null response from drug-eras API', async () => {
      const store = useReportsStore()

      vi.mocked(webapi.getDrugErasReport).mockResolvedValue(null)

      await store.fetchReport(123, 'SYNPUF', 'drug-eras')

      expect(store.error).toContain('Failed to fetch drug eras report data')
      expect(store.loading).toBe(false)
    })

    it('should handle non-Error exception', async () => {
      const store = useReportsStore()

      vi.mocked(webapi.getPersonReport).mockRejectedValue('String error')

      await store.fetchReport(123, 'SYNPUF', 'person')

      expect(store.loading).toBe(false)
      expect(store.error).toContain('Unknown error')
    })

    it('should set loading to true during fetch', async () => {
      const store = useReportsStore()

      const mockRawData = { yearOfBirth: [{ intervalIndex: 0, countValue: 100 }] }
      const mockMappedData: PersonReport = {
        yearOfBirth: [{ year: 1920, count: 100 }],
        demographics: { gender: [], race: [], ethnicity: [] }
      }

      let loadingDuringFetch = false

      vi.mocked(webapi.getPersonReport).mockImplementation(async () => {
        loadingDuringFetch = store.loading
        return mockRawData
      })
      vi.mocked(mapper.mapPersonReport).mockReturnValue(mockMappedData)

      await store.fetchReport(123, 'SYNPUF', 'person')

      expect(loadingDuringFetch).toBe(true)
      expect(store.loading).toBe(false)
    })

    it('should clear error on successful fetch after previous error', async () => {
      const store = useReportsStore()

      store.error = 'Previous error'

      const mockRawData = { yearOfBirth: [{ intervalIndex: 0, countValue: 100 }] }
      const mockMappedData: PersonReport = {
        yearOfBirth: [{ year: 1920, count: 100 }],
        demographics: { gender: [], race: [], ethnicity: [] }
      }

      vi.mocked(webapi.getPersonReport).mockResolvedValue(mockRawData)
      vi.mocked(mapper.mapPersonReport).mockReturnValue(mockMappedData)

      await store.fetchReport(123, 'SYNPUF', 'person')

      expect(store.error).toBeNull()
    })
  })

  describe('Cache Key Generation', () => {
    it('should generate unique cache keys for different parameters', () => {
      const store = useReportsStore()

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: {} as PersonReport
      })

      store.reportData.set('456-CDM-condition', {
        type: 'condition',
        cohortId: 456,
        sourceKey: 'CDM',
        fetchedAt: new Date(),
        data: {} as MockReportData
      })

      expect(store.reportData.size).toBe(2)
      expect(store.isReportCached(123, 'SYNPUF', 'person')).toBe(true)
      expect(store.isReportCached(456, 'CDM', 'condition')).toBe(true)
      expect(store.isReportCached(123, 'SYNPUF', 'condition')).toBe(false)
      expect(store.isReportCached(456, 'CDM', 'person')).toBe(false)
    })
  })

  describe('Multiple Report Caching', () => {
    it('should cache multiple different reports simultaneously', async () => {
      const store = useReportsStore()

      const mockPersonData = {
        yearOfBirth: [{ year: 1920, count: 100 }],
        demographics: { gender: [], race: [], ethnicity: [] }
      }

      const mockConditionData = { data: 'condition' }

      store.reportData.set('123-SYNPUF-person', {
        type: 'person',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: mockPersonData as PersonReport
      })

      store.reportData.set('123-SYNPUF-condition', {
        type: 'condition',
        cohortId: 123,
        sourceKey: 'SYNPUF',
        fetchedAt: new Date(),
        data: mockConditionData as MockReportData
      })

      expect(store.cacheStats.totalCached).toBe(2)

      const personReport = store.getReport(123, 'SYNPUF', 'person')
      const conditionReport = store.getReport(123, 'SYNPUF', 'condition')

      expect(personReport?.data).toEqual(mockPersonData)
      expect(conditionReport?.data).toEqual(mockConditionData)
    })
  })
})
