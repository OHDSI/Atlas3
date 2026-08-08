/**
 * Reports Pinia Store
 *
 * Manages cohort report data fetching, caching, and state
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { logger } from '@/utils/logger'
import type { RequestController } from '@/types/api'
import type {
  ReportType,
  ReportData,
  PersonReport,
  ConditionErasReport,
  ConditionReport,
  DrugErasReport,
  CohortSpecificReport,
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
  getTornadoReport,
} from '@/services/report.service'
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
  mapTornadoReport,
} from '@/services/report-mapper'

export const useReportsStore = defineStore('reports', () => {
  // Current report selection
  const currentReportType = ref<ReportType | null>(null)
  const currentSourceKey = ref<string | null>(null)
  const currentCohortId = ref<number | null>(null)

  // Report data cache (key: "{cohortId}-{sourceKey}-{reportType}")
  const reportData = ref<Map<string, ReportData>>(new Map())

  // Request controller for cancellation
  const currentRequest = ref<RequestController>({
    controller: null,
    requestId: null,
  })

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
   * Cancel any pending request
   */
  function cancelPendingRequest(): void {
    if (currentRequest.value.controller) {
      currentRequest.value.controller.abort()
      logger.debug('ReportsStore', 'Cancelled pending request', currentRequest.value.requestId)
    }
    currentRequest.value = { controller: null, requestId: null }
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

    // Cancel any previous pending request to prevent stale data
    cancelPendingRequest()

    // Create new controller and unique request ID
    const controller = new AbortController()
    const requestId = `${cacheKey}-${Date.now()}`
    currentRequest.value = { controller, requestId }

    loading.value = true
    error.value = null

    try {
      // Fetch specific report data based on type and map to internal format
      let mappedData:
        | PersonReport
        | ConditionErasReport
        | ConditionReport
        | DrugErasReport
        | CohortSpecificReport
        | import('@/models/report.types').PersonsExposureReport
        | import('@/models/report.types').VisitsReport
        | import('@/models/report.types').VisitDatesReport
        | import('@/models/report.types').CareSiteVisitDatesReport
        | import('@/models/report.types').DrugUtilizationReport
        | import('@/models/report.types').HeraclesHeelReport

      switch (reportType) {
        case 'person': {
          const result = await getPersonReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapPersonReport(result.data)
          break
        }
        case 'condition-eras': {
          const result = await getConditionErasReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapConditionErasReport(result.data)
          break
        }
        case 'condition': {
          const result = await getConditionReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapConditionReport(result.data)
          break
        }
        case 'drug-eras': {
          const result = await getDrugErasReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapDrugErasReport(result.data)
          break
        }
        case 'cohort-specific': {
          const result = await getCohortSpecificReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapCohortSpecificReport(result.data)
          break
        }
        case 'persons-exposure-baseline': {
          const result = await getPersonsExposureBaselineReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapPersonsExposureReport(result.data)
          break
        }
        case 'persons-exposure-cohort': {
          const result = await getPersonsExposureCohortReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapPersonsExposureReport(result.data)
          break
        }
        case 'visits-baseline': {
          const result = await getVisitsBaselineReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapVisitsReport(result.data)
          break
        }
        case 'visit-dates-baseline': {
          const result = await getVisitDatesBaselineReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapVisitDatesReport(result.data)
          break
        }
        case 'care-site-visit-dates-baseline': {
          const result = await getCareSiteVisitDatesBaselineReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapCareSiteVisitDatesReport(result.data)
          break
        }
        case 'visits-cohort': {
          const result = await getVisitsCohortReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapVisitsReport(result.data)
          break
        }
        case 'visit-dates-cohort': {
          const result = await getVisitDatesCohortReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapVisitDatesReport(result.data)
          break
        }
        case 'care-site-visit-dates-cohort': {
          const result = await getCareSiteVisitDatesCohortReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapCareSiteVisitDatesReport(result.data)
          break
        }
        case 'drug-utilization-baseline': {
          const result = await getDrugUtilizationBaselineReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapDrugUtilizationReport(result.data)
          break
        }
        case 'drug-utilization-cohort': {
          const result = await getDrugUtilizationCohortReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapDrugUtilizationReport(result.data)
          break
        }
        case 'heracles-heel': {
          const result = await getHeraclesHeelReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapHeraclesHeelReport(result.data)
          break
        }
        case 'conditions-by-index': {
          const result = await getConditionsByIndexReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapConditionsByIndexReport(result.data)
          break
        }
        case 'death': {
          const result = await getDeathReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapDeathReport(result.data)
          break
        }
        case 'drug-exposure': {
          const result = await getDrugExposureReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapDrugExposureReport(result.data)
          break
        }
        case 'drugs-by-index': {
          const result = await getDrugsByIndexReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapDrugsByIndexReport(result.data)
          break
        }
        case 'observation-periods': {
          const result = await getObservationPeriodsReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapObservationPeriodsReport(result.data)
          break
        }
        case 'procedure': {
          const result = await getProcedureReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapProcedureReport(result.data)
          break
        }
        case 'procedures-by-index': {
          const result = await getProceduresByIndexReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapProceduresByIndexReport(result.data)
          break
        }
        case 'data-completeness': {
          const result = await getDataCompletenessReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapDataCompletenessReport(result.data)
          break
        }
        case 'entropy': {
          const result = await getEntropyReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapEntropyReport(result.data)
          break
        }
        case 'tornado': {
          const result = await getTornadoReport(cohortId, sourceKey)
          if (!result.success) throw new Error(result.error.message)
          mappedData = mapTornadoReport(result.data)
          break
        }
        default:
          throw new Error(`Unsupported report type: ${reportType}`)
      }

      // Check if this request is still the current one (not cancelled)
      if (currentRequest.value.requestId !== requestId) {
        logger.debug('ReportsStore', 'Ignoring stale response for', cacheKey)
        return
      }

      // Cache the result
      reportData.value.set(cacheKey, {
        type: reportType,
        cohortId,
        sourceKey,
        fetchedAt: new Date(),
        data: mappedData,
      })

      // Update current selection
      currentReportType.value = reportType
      currentSourceKey.value = sourceKey
      currentCohortId.value = cohortId

      // Clear the request controller since we're done
      currentRequest.value = { controller: null, requestId: null }

      logger.debug('ReportsStore', 'Fetched and cached report', cacheKey)
    } catch (err) {
      // Ignore AbortError - request was cancelled intentionally
      if (err instanceof Error && err.name === 'AbortError') {
        logger.debug('ReportsStore', 'Request was cancelled', cacheKey)
        return
      }

      // Check if this request is still current before setting error
      if (currentRequest.value.requestId !== requestId) {
        logger.debug('ReportsStore', 'Ignoring error from stale request', cacheKey)
        return
      }

      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      error.value = `Failed to fetch ${reportType} report: ${errorMessage}`
      logger.error('ReportsStore', 'Error fetching report', err)
    } finally {
      // Only clear loading if this was the current request
      if (currentRequest.value.requestId === requestId || currentRequest.value.requestId === null) {
        loading.value = false
      }
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
    cacheKeys: Array.from(reportData.value.keys()),
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
    cancelPendingRequest,

    // Getters
    currentReport,
    getReport,
    isLoading,
    hasError,
    errorMessage,
    isReportCached,
    cacheStats,
  }
})
