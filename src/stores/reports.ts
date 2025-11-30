/**
 * Reports Pinia Store
 *
 * Manages cohort report data fetching, caching, and state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/utils/logger'
import type {
  ReportType,
  ReportData,
  PersonReport,
  ConditionErasReport,
  ConditionReport,
  DrugErasReport,
  CohortSpecificReport
} from '@/models/report.types'
import {
  getPersonReport,
  getConditionErasReport,
  getConditionReport,
  getDrugErasReport,
  getCohortSpecificReport,
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
  getTornadoReport
} from '@/services/webapi'
import {
  mapPersonReport,
  mapConditionErasReport,
  mapConditionReport,
  mapDrugErasReport,
  mapCohortSpecificReport,
  mapPersonsExposureReport,
  mapVisitsReport,
  mapVisitDatesReport,
  mapCareSiteVisitDatesReport,
  mapDrugUtilizationReport,
  mapHeraclesHeelReport,
  mapConditionsByIndexReport,
  mapDeathReport,
  mapDrugExposureReport,
  mapDrugsByIndexReport,
  mapObservationPeriodsReport,
  mapProcedureReport,
  mapProceduresByIndexReport,
  mapDataCompletenessReport,
  mapEntropyReport,
  mapTornadoReport
} from '@/services/report-mapper'

export const useReportsStore = defineStore('reports', () => {
  // Current report selection
  const currentReportType = ref<ReportType | null>(null)
  const currentSourceKey = ref<string | null>(null)
  const currentCohortId = ref<number | null>(null)

  // Report data cache (key: "{cohortId}-{sourceKey}-{reportType}")
  const reportData = ref<Map<string, ReportData>>(new Map())

  // Loading states
  const loading = ref(false)
  const loadingSection = ref<string | null>(null)

  // Error states
  const error = ref<string | null>(null)
  const sectionErrors = ref<Map<string, string>>(new Map())

  /**
   * Generate cache key for report data
   */
  function getCacheKey(cohortId: number, sourceKey: string, reportType: ReportType): string {
    return `${cohortId}-${sourceKey}-${reportType}`
  }

  /**
   * Fetch report data from WebAPI
   */
  async function fetchReport(
    cohortId: number,
    sourceKey: string,
    reportType: ReportType
  ): Promise<void> {
    const cacheKey = getCacheKey(cohortId, sourceKey, reportType)

    // Check cache first
    if (reportData.value.has(cacheKey)) {
      const cached = reportData.value.get(cacheKey)!
      const cacheAge = Date.now() - cached.fetchedAt.getTime()

      // Use cached data if less than 5 minutes old
      if (cacheAge < 5 * 60 * 1000) {
        logger.debug('ReportsStore', 'Using cached data for', cacheKey)
        currentReportType.value = reportType
        currentSourceKey.value = sourceKey
        currentCohortId.value = cohortId
        return
      }
    }

    loading.value = true
    error.value = null

    try {
      // Fetch specific report data based on type and map to internal format
      let mappedData: PersonReport | ConditionErasReport | ConditionReport | DrugErasReport | CohortSpecificReport | import('@/models/report.types').PersonsExposureReport | import('@/models/report.types').VisitsReport | import('@/models/report.types').VisitDatesReport | import('@/models/report.types').CareSiteVisitDatesReport | import('@/models/report.types').DrugUtilizationReport | import('@/models/report.types').HeraclesHeelReport

      switch (reportType) {
        case 'person': {
          const rawData = await getPersonReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch person report data')
          mappedData = mapPersonReport(rawData)
          break
        }
        case 'condition-eras': {
          const rawData = await getConditionErasReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch condition eras report data')
          mappedData = mapConditionErasReport(rawData)
          break
        }
        case 'condition': {
          const rawData = await getConditionReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch condition report data')
          mappedData = mapConditionReport(rawData)
          break
        }
        case 'drug-eras': {
          const rawData = await getDrugErasReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch drug eras report data')
          mappedData = mapDrugErasReport(rawData)
          break
        }
        case 'cohort-specific': {
          const rawData = await getCohortSpecificReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch cohort specific report data')
          mappedData = mapCohortSpecificReport(rawData)
          break
        }
        case 'persons-exposure-baseline': {
          const rawData = await getPersonsExposureBaselineReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch persons exposure baseline report data')
          mappedData = mapPersonsExposureReport(rawData)
          break
        }
        case 'persons-exposure-cohort': {
          const rawData = await getPersonsExposureCohortReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch persons exposure cohort report data')
          mappedData = mapPersonsExposureReport(rawData)
          break
        }
        case 'visits-baseline': {
          const rawData = await getVisitsBaselineReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch visits baseline report data')
          mappedData = mapVisitsReport(rawData)
          break
        }
        case 'visit-dates-baseline': {
          const rawData = await getVisitDatesBaselineReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch visit dates baseline report data')
          mappedData = mapVisitDatesReport(rawData)
          break
        }
        case 'care-site-visit-dates-baseline': {
          const rawData = await getCareSiteVisitDatesBaselineReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch care site visit dates baseline report data')
          mappedData = mapCareSiteVisitDatesReport(rawData)
          break
        }
        case 'visits-cohort': {
          const rawData = await getVisitsCohortReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch visits cohort report data')
          mappedData = mapVisitsReport(rawData)
          break
        }
        case 'visit-dates-cohort': {
          const rawData = await getVisitDatesCohortReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch visit dates cohort report data')
          mappedData = mapVisitDatesReport(rawData)
          break
        }
        case 'care-site-visit-dates-cohort': {
          const rawData = await getCareSiteVisitDatesCohortReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch care site visit dates cohort report data')
          mappedData = mapCareSiteVisitDatesReport(rawData)
          break
        }
        case 'drug-utilization-baseline': {
          const rawData = await getDrugUtilizationBaselineReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch drug utilization baseline report data')
          mappedData = mapDrugUtilizationReport(rawData)
          break
        }
        case 'drug-utilization-cohort': {
          const rawData = await getDrugUtilizationCohortReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch drug utilization cohort report data')
          mappedData = mapDrugUtilizationReport(rawData)
          break
        }
        case 'heracles-heel': {
          const rawData = await getHeraclesHeelReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch Heracles Heel report data')
          mappedData = mapHeraclesHeelReport(rawData)
          break
        }
        case 'conditions-by-index': {
          const rawData = await getConditionsByIndexReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch conditions by index report data')
          mappedData = mapConditionsByIndexReport(rawData)
          break
        }
        case 'death': {
          const rawData = await getDeathReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch death report data')
          mappedData = mapDeathReport(rawData)
          break
        }
        case 'drug-exposure': {
          const rawData = await getDrugExposureReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch drug exposure report data')
          mappedData = mapDrugExposureReport(rawData)
          break
        }
        case 'drugs-by-index': {
          const rawData = await getDrugsByIndexReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch drugs by index report data')
          mappedData = mapDrugsByIndexReport(rawData)
          break
        }
        case 'observation-periods': {
          const rawData = await getObservationPeriodsReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch observation periods report data')
          mappedData = mapObservationPeriodsReport(rawData)
          break
        }
        case 'procedure': {
          const rawData = await getProcedureReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch procedure report data')
          mappedData = mapProcedureReport(rawData)
          break
        }
        case 'procedures-by-index': {
          const rawData = await getProceduresByIndexReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch procedures by index report data')
          mappedData = mapProceduresByIndexReport(rawData)
          break
        }
        case 'data-completeness': {
          const rawData = await getDataCompletenessReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch data completeness report data')
          mappedData = mapDataCompletenessReport(rawData)
          break
        }
        case 'entropy': {
          const rawData = await getEntropyReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch entropy report data')
          mappedData = mapEntropyReport(rawData)
          break
        }
        case 'tornado': {
          const rawData = await getTornadoReport(cohortId, sourceKey)
          if (!rawData) throw new Error('Failed to fetch tornado report data')
          mappedData = mapTornadoReport(rawData)
          break
        }
        default:
          throw new Error(`Unsupported report type: ${reportType}`)
      }

      // Cache the result
      reportData.value.set(cacheKey, {
        type: reportType,
        cohortId,
        sourceKey,
        fetchedAt: new Date(),
        data: mappedData
      })

      // Update current selection
      currentReportType.value = reportType
      currentSourceKey.value = sourceKey
      currentCohortId.value = cohortId

      logger.debug('ReportsStore', 'Fetched and cached report', cacheKey)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = `Failed to fetch ${reportType} report: ${errorMessage}`
      logger.error('ReportsStore', 'Error fetching report', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Set current report type
   */
  function setReportType(reportType: ReportType): void {
    currentReportType.value = reportType
  }

  /**
   * Clear specific report from cache
   */
  function clearReport(cohortId: number, sourceKey: string, reportType: ReportType): void {
    const cacheKey = getCacheKey(cohortId, sourceKey, reportType)
    reportData.value.delete(cacheKey)
    logger.debug('ReportsStore', 'Cleared cached report', cacheKey)
  }

  /**
   * Set current report context
   */
  function setCurrentReport(cohortId: number, sourceKey: string, reportType: ReportType): void {
    currentCohortId.value = cohortId
    currentSourceKey.value = sourceKey
    currentReportType.value = reportType
  }

  /**
   * Clear all cached reports
   */
  function clearAllReports(): void {
    reportData.value.clear()
    logger.debug('ReportsStore', 'Cleared all cached reports')
  }

  /**
   * Clear current selection
   */
  function clearCurrentReport(): void {
    currentReportType.value = null
    currentSourceKey.value = null
    currentCohortId.value = null
    error.value = null
  }

  /**
   * Get formatted current report data
   */
  const currentReport = computed<ReportData | null>(() => {
    if (!currentCohortId.value || !currentSourceKey.value || !currentReportType.value) {
      return null
    }

    const cacheKey = getCacheKey(
      currentCohortId.value,
      currentSourceKey.value,
      currentReportType.value
    )

    return reportData.value.get(cacheKey) || null
  })

  /**
   * Get formatted report data for specific parameters
   */
  function getReport(
    cohortId: number,
    sourceKey: string,
    reportType: ReportType
  ): ReportData | null {
    const cacheKey = getCacheKey(cohortId, sourceKey, reportType)
    return reportData.value.get(cacheKey) || null
  }

  /**
   * Check if currently loading
   */
  const isLoading = computed(() => loading.value)

  /**
   * Check if has error
   */
  const hasError = computed(() => error.value !== null)

  /**
   * Get current error message
   */
  const errorMessage = computed(() => error.value)

  /**
   * Check if specific report is cached
   */
  function isReportCached(cohortId: number, sourceKey: string, reportType: ReportType): boolean {
    const cacheKey = getCacheKey(cohortId, sourceKey, reportType)
    return reportData.value.has(cacheKey)
  }

  /**
   * Get cache statistics
   */
  const cacheStats = computed(() => ({
    totalCached: reportData.value.size,
    cacheKeys: Array.from(reportData.value.keys())
  }))

  return {
    // State
    currentReportType,
    currentSourceKey,
    currentCohortId,
    reportData,
    loading,
    loadingSection,
    error,
    sectionErrors,

    // Actions
    fetchReport,
    setReportType,
    clearReport,
    setCurrentReport,
    clearAllReports,
    clearCurrentReport,

    // Getters
    currentReport,
    getReport,
    isLoading,
    hasError,
    errorMessage,
    isReportCached,
    cacheStats
  }
})
