/**
 * useReports Composable
 *
 * Wraps the reports store with reactive state and convenience methods
 */

import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useReportsStore } from '@/stores/reports'
import type { ReportType } from '@/models/report.types'

export function useReports() {
  const store = useReportsStore()

  // Extract reactive state using storeToRefs
  const {
    currentReportType,
    currentSourceKey,
    currentCohortId,
    loading,
    loadingSection,
    error,
    sectionErrors,
    currentReport,
    isLoading,
    hasError,
    errorMessage,
    cacheStats
  } = storeToRefs(store)

  /**
   * Fetch and display report for specific cohort and source
   */
  async function loadReport(
    cohortId: number,
    sourceKey: string,
    reportType: ReportType
  ): Promise<void> {
    await store.fetchReport(cohortId, sourceKey, reportType)
  }

  /**
   * Switch to different report type (using same cohort/source)
   */
  async function switchReportType(reportType: ReportType): Promise<void> {
    if (!currentCohortId.value || !currentSourceKey.value) {
      console.warn('[useReports] Cannot switch report type without cohort/source context')
      return
    }

    await store.fetchReport(currentCohortId.value, currentSourceKey.value, reportType)
  }

  /**
   * Refresh current report (bypass cache)
   */
  async function refreshReport(): Promise<void> {
    if (!currentCohortId.value || !currentSourceKey.value || !currentReportType.value) {
      console.warn('[useReports] Cannot refresh without current report context')
      return
    }

    // Clear cache first
    store.clearReport(currentCohortId.value, currentSourceKey.value, currentReportType.value)

    // Fetch fresh data
    await store.fetchReport(
      currentCohortId.value,
      currentSourceKey.value,
      currentReportType.value
    )
  }

  /**
   * Check if specific report is available in cache
   */
  function isReportAvailable(
    cohortId: number,
    sourceKey: string,
    reportType: ReportType
  ): boolean {
    return store.isReportCached(cohortId, sourceKey, reportType)
  }

  /**
   * Get specific report data from cache
   */
  function getReportData(cohortId: number, sourceKey: string, reportType: ReportType) {
    return store.getReport(cohortId, sourceKey, reportType)
  }

  /**
   * Clear current report context
   */
  function clearCurrent(): void {
    store.clearCurrentReport()
  }

  /**
   * Clear all cached reports
   */
  function clearAll(): void {
    store.clearAllReports()
  }

  /**
   * Clear specific report from cache
   */
  function clearSpecific(cohortId: number, sourceKey: string, reportType: ReportType): void {
    store.clearReport(cohortId, sourceKey, reportType)
  }

  /**
   * Set report context without fetching
   */
  function setContext(cohortId: number, sourceKey: string, reportType: ReportType): void {
    store.setCurrentReport(cohortId, sourceKey, reportType)
  }

  // Computed helpers
  const hasCurrentReport = computed(() => currentReport.value !== null)

  const currentReportData = computed(() => currentReport.value?.data || null)

  const isPersonReport = computed(() => currentReportType.value === 'person')
  const isConditionErasReport = computed(() => currentReportType.value === 'condition-eras')
  const isDrugErasReport = computed(() => currentReportType.value === 'drug-eras')
  const isCohortSpecificReport = computed(() => currentReportType.value === 'cohort-specific')

  return {
    // Reactive state
    currentReportType,
    currentSourceKey,
    currentCohortId,
    loading,
    loadingSection,
    error,
    sectionErrors,
    currentReport,
    isLoading,
    hasError,
    errorMessage,
    cacheStats,

    // Computed helpers
    hasCurrentReport,
    currentReportData,
    isPersonReport,
    isConditionErasReport,
    isDrugErasReport,
    isCohortSpecificReport,

    // Actions
    loadReport,
    switchReportType,
    refreshReport,
    isReportAvailable,
    getReportData,
    clearCurrent,
    clearAll,
    clearSpecific,
    setContext
  }
}
