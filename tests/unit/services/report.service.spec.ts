/**
 * Unit Tests: Report Service
 * Tests for src/services/report.service.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({ token: null })),
}))

import {
  getCohortReport,
  getPersonReport,
  getConditionErasReport,
  getConditionReport,
  getDrugErasReport,
  getCohortSpecificReport,
  triggerFullAnalysis,
  triggerQuickAnalysis,
  triggerUtilization,
  getCompletedAnalyses,
  getPersonsExposureBaselineReport,
  getPersonsExposureCohortReport,
  getVisitsBaselineReport,
  getVisitDatesBaselineReport,
  getCareSiteVisitDatesBaselineReport,
  getVisitsCohortReport,
  getVisitDatesCohortReport,
  getCareSiteVisitDatesCohortReport,
  getDrugUtilizationBaselineReport,
  getDrugUtilizationCohortReport,
  getHeraclesHeelReport,
  getConditionsByIndexReport,
  getDeathReport,
  getDrugExposureReport,
  getDrugsByIndexReport,
  getObservationPeriodsReport,
  getProcedureReport,
  getProceduresByIndexReport,
  getDataCompletenessReport,
  getEntropyReport,
  getTornadoReport,
  getCDMDrilldown,
  getConditionDrilldown,
  getConditionEraDrilldown,
  getDrugDrilldown,
  getDrugEraDrilldown,
  getMeasurementDrilldown,
  getObservationDrilldown,
  getProcedureDrilldown,
} from '@/services/report.service'

describe('services/report.service', () => {
  let mockFetch: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch = vi.fn()
    global.fetch = mockFetch as unknown as typeof fetch
    localStorage.clear()
    localStorage.setItem('locale', 'en')
  })

  describe('getCohortReport', () => {
    it('fetches and returns the cohort report', async () => {
      const mockReport = {
        summary: {
          cohortId: 123,
          sourceKey: 'SYNPUF1K',
          totalPersons: 800,
          generatedDate: '2026-01-01',
        },
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockReport),
      })

      const result = await getCohortReport(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortdefinition/123/report/SYNPUF1K'),
        expect.any(Object)
      )
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.summary?.totalPersons).toBe(800)
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('reports a network failure as ApiResult, not a thrown error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getCohortReport(123, 'SYNPUF1K')

      expect(result.success).toBe(false)
    })

    it('fails when the response shape does not validate', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ invalid: 'data' }),
      })

      const result = await getCohortReport(123, 'SYNPUF1K')

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected getCohortReport to fail')
      } else {
        expect(result.error.status).toBe(0)
      }
    })

    it('fails when the summary is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({}),
      })

      const result = await getCohortReport(123, 'SYNPUF1K')

      expect(result.success).toBe(false)
    })
  })

  describe('Analysis Triggers', () => {
    it('triggers full analysis', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })

      const result = await triggerFullAnalysis(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cohortanalysis'),
        expect.objectContaining({ method: 'POST' })
      )
      expect(result.success).toBe(true)
    })

    it('triggers quick analysis', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })

      const result = await triggerQuickAnalysis(123, 'SYNPUF1K')

      expect(result.success).toBe(true)
    })

    it('triggers utilization', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })

      const result = await triggerUtilization(123, 'SYNPUF1K')

      expect(result.success).toBe(true)
    })

    it('reports trigger failures as ApiResult, not a thrown error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await triggerFullAnalysis(123, 'SYNPUF1K')

      expect(result.success).toBe(false)
    })
  })

  describe('getCompletedAnalyses', () => {
    it('fetches completed analyses', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify([1, 2, 3]) })

      const result = await getCompletedAnalyses(123, 'SYNPUF1K')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual([1, 2, 3])
      } else {
        expect.fail(`expected success, got ${result.error.message}`)
      }
    })

    it('returns a failure ApiResult on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await getCompletedAnalyses(123, 'SYNPUF1K')

      expect(result.success).toBe(false)
      if (result.success) {
        expect.fail('expected getCompletedAnalyses to fail')
      } else {
        expect(result.error.message).toContain('Network error')
      }
    })
  })

  // Every remaining `get*Report` function shares the same shape: GET the
  // endpoint, return ApiResult<T>. Table-driven so the 950-line slice stays
  // covered without 20 near-identical copies of the same test body.
  const simpleReports: Array<{
    name: string
    fn: (cohortId: number, sourceKey: string) => Promise<{ success: boolean }>
    path: string
  }> = [
    { name: 'getPersonReport', fn: getPersonReport, path: '/cohortresults/SYNPUF1K/123/person' },
    {
      name: 'getConditionErasReport',
      fn: getConditionErasReport,
      path: '/cohortresults/SYNPUF1K/123/conditionera',
    },
    {
      name: 'getConditionReport',
      fn: getConditionReport,
      path: '/cohortresults/SYNPUF1K/123/condition',
    },
    { name: 'getDrugErasReport', fn: getDrugErasReport, path: '/cohortresults/SYNPUF1K/123/drugera' },
    {
      name: 'getCohortSpecificReport',
      fn: getCohortSpecificReport,
      path: '/cohortresults/SYNPUF1K/123/cohortspecific',
    },
    {
      name: 'getPersonsExposureBaselineReport',
      fn: getPersonsExposureBaselineReport,
      path: '/cohortresults/SYNPUF1K/123/observationperiod',
    },
    {
      name: 'getPersonsExposureCohortReport',
      fn: getPersonsExposureCohortReport,
      path: '/cohortresults/SYNPUF1K/123/cohort',
    },
    {
      name: 'getVisitsBaselineReport',
      fn: getVisitsBaselineReport,
      path: '/cohortresults/SYNPUF1K/123/visitsbaseline',
    },
    {
      name: 'getVisitDatesBaselineReport',
      fn: getVisitDatesBaselineReport,
      path: '/cohortresults/SYNPUF1K/123/visitdatesbaseline',
    },
    {
      name: 'getCareSiteVisitDatesBaselineReport',
      fn: getCareSiteVisitDatesBaselineReport,
      path: '/cohortresults/SYNPUF1K/123/caresitevisitdatesbaseline',
    },
    {
      name: 'getVisitsCohortReport',
      fn: getVisitsCohortReport,
      path: '/cohortresults/SYNPUF1K/123/visitscohort',
    },
    {
      name: 'getVisitDatesCohortReport',
      fn: getVisitDatesCohortReport,
      path: '/cohortresults/SYNPUF1K/123/visitdatescohort',
    },
    {
      name: 'getCareSiteVisitDatesCohortReport',
      fn: getCareSiteVisitDatesCohortReport,
      path: '/cohortresults/SYNPUF1K/123/caresitevisitdatescohort',
    },
    {
      name: 'getDrugUtilizationBaselineReport',
      fn: getDrugUtilizationBaselineReport,
      path: '/cohortresults/SYNPUF1K/123/drugutilizationbaseline',
    },
    {
      name: 'getDrugUtilizationCohortReport',
      fn: getDrugUtilizationCohortReport,
      path: '/cohortresults/SYNPUF1K/123/drugutilizationcohort',
    },
    {
      name: 'getHeraclesHeelReport',
      fn: getHeraclesHeelReport,
      path: '/cohortresults/SYNPUF1K/123/heraclesheel',
    },
    {
      name: 'getConditionsByIndexReport',
      fn: getConditionsByIndexReport,
      path: '/cohortresults/SYNPUF1K/123/conditionsbyindex',
    },
    { name: 'getDeathReport', fn: getDeathReport, path: '/cohortresults/SYNPUF1K/123/death' },
    {
      name: 'getDrugExposureReport',
      fn: getDrugExposureReport,
      path: '/cohortresults/SYNPUF1K/123/drugexposure',
    },
    {
      name: 'getDrugsByIndexReport',
      fn: getDrugsByIndexReport,
      path: '/cohortresults/SYNPUF1K/123/drugsbyindex',
    },
    {
      name: 'getObservationPeriodsReport',
      fn: getObservationPeriodsReport,
      path: '/cohortresults/SYNPUF1K/123/observationperiod',
    },
    {
      name: 'getProcedureReport',
      fn: getProcedureReport,
      path: '/cohortresults/SYNPUF1K/123/procedure',
    },
    {
      name: 'getProceduresByIndexReport',
      fn: getProceduresByIndexReport,
      path: '/cohortresults/SYNPUF1K/123/proceduresbyindex',
    },
    {
      name: 'getDataCompletenessReport',
      fn: getDataCompletenessReport,
      path: '/cohortresults/SYNPUF1K/123/datacompleteness',
    },
    { name: 'getEntropyReport', fn: getEntropyReport, path: '/cohortresults/SYNPUF1K/123/entropy' },
    { name: 'getTornadoReport', fn: getTornadoReport, path: '/cohortresults/SYNPUF1K/123/tornado' },
  ]

  describe.each(simpleReports)('$name', ({ fn, path }) => {
    it('fetches the report and wraps it as a successful ApiResult', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })

      const result = await fn(123, 'SYNPUF1K')

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(path), expect.any(Object))
      expect(result.success).toBe(true)
    })

    it('returns a failure ApiResult on error, not a thrown error or null', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await fn(123, 'SYNPUF1K')

      expect(result.success).toBe(false)
    })
  })

  // Drill-down endpoints follow the same GET-and-wrap shape as the reports
  // above, just with a different id in the path.
  const drilldowns: Array<{
    name: string
    fn: (sourceKey: string, a: number | string, b: number) => Promise<{ success: boolean }>
    call: () => Promise<{ success: boolean }>
    path: string
  }> = [
    {
      name: 'getCDMDrilldown',
      fn: getCDMDrilldown as never,
      call: () => getCDMDrilldown('SYNPUF1K', 'condition', 1),
      path: '/cdmresults/SYNPUF1K/condition/1',
    },
    {
      name: 'getConditionDrilldown',
      fn: getConditionDrilldown as never,
      call: () => getConditionDrilldown('SYNPUF1K', 123, 1),
      path: '/cohortresults/SYNPUF1K/123/condition/1',
    },
    {
      name: 'getConditionEraDrilldown',
      fn: getConditionEraDrilldown as never,
      call: () => getConditionEraDrilldown('SYNPUF1K', 123, 1),
      path: '/cohortresults/SYNPUF1K/123/conditionera/1',
    },
    {
      name: 'getDrugDrilldown',
      fn: getDrugDrilldown as never,
      call: () => getDrugDrilldown('SYNPUF1K', 123, 1),
      path: '/cohortresults/SYNPUF1K/123/drug/1',
    },
    {
      name: 'getDrugEraDrilldown',
      fn: getDrugEraDrilldown as never,
      call: () => getDrugEraDrilldown('SYNPUF1K', 123, 1),
      path: '/cohortresults/SYNPUF1K/123/drugera/1',
    },
    {
      name: 'getMeasurementDrilldown',
      fn: getMeasurementDrilldown as never,
      call: () => getMeasurementDrilldown('SYNPUF1K', 123, 1),
      path: '/cohortresults/SYNPUF1K/123/measurement/1',
    },
    {
      name: 'getObservationDrilldown',
      fn: getObservationDrilldown as never,
      call: () => getObservationDrilldown('SYNPUF1K', 123, 1),
      path: '/cohortresults/SYNPUF1K/123/observation/1',
    },
    {
      name: 'getProcedureDrilldown',
      fn: getProcedureDrilldown as never,
      call: () => getProcedureDrilldown('SYNPUF1K', 123, 1),
      path: '/cohortresults/SYNPUF1K/123/procedure/1',
    },
  ]

  describe.each(drilldowns)('$name', ({ call, path }) => {
    it('fetches the drill-down and wraps it as a successful ApiResult', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })

      const result = await call()

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining(path), expect.any(Object))
      expect(result.success).toBe(true)
    })

    it('returns a failure ApiResult on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const result = await call()

      expect(result.success).toBe(false)
    })
  })

  describe('Request Headers', () => {
    it('includes User-Language header', async () => {
      localStorage.setItem('locale', 'de')
      mockFetch.mockResolvedValueOnce({ ok: true, text: async () => JSON.stringify({}) })

      await getPersonReport(123, 'SYNPUF1K')

      const callArgs = mockFetch.mock.calls[0]
      const headers = callArgs[1]?.headers as Headers
      expect(headers.get('User-Language')).toBe('de')
    })
  })
})
