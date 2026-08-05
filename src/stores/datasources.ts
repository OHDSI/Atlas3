/**
 * Data Sources Pinia Store
 */
import { defineStore } from 'pinia'
import { ref, computed, triggerRef } from 'vue'
import type { DataSource, ReportData } from '@/models/datasource.types'
import { isPluginReportType, type AnyReportType, type ReportType } from '@/models/datasource.types'
import {
  listDataSources,
  getDashboardReport,
  getClinicalDomainReport,
} from '@/services/datasource.service'
import { logger } from '@/utils/logger'

export const useDataSourcesStore = defineStore('datasources', () => {
  // State
  const sources = ref<DataSource[]>([])
  const selectedSourceId = ref<number | null>(null)
  const selectedReportType = ref<AnyReportType | null>(null)
  const reportCache = ref<Map<string, ReportData>>(new Map())

  const loading = ref({
    sources: false,
    report: false,
  })

  const error = ref({
    sources: null as string | null,
    report: null as string | null,
  })

  // Getters
  const selectedSource = computed(() => {
    if (selectedSourceId.value === null) return null
    return sources.value.find(s => s.sourceId === selectedSourceId.value) || null
  })

  const currentReport = computed(() => {
    if (!selectedSourceId.value || !selectedReportType.value) return null
    const cacheKey = `${selectedSourceId.value}-${selectedReportType.value}`
    const report = reportCache.value.get(cacheKey) || null
    logger.debug('DataSourcesStore', 'currentReport computed', {
      cacheKey,
      hasReport: !!report,
      reportType: report?.type,
    })
    return report
  })

  const isLoading = computed(() => loading.value.sources || loading.value.report)

  // Actions
  let fetchPromise: Promise<void> | null = null

  async function fetchDataSources() {
    if (fetchPromise) return fetchPromise
    fetchPromise = doFetchDataSources()
    try { await fetchPromise } finally { fetchPromise = null }
  }

  async function doFetchDataSources() {
    loading.value.sources = true
    error.value.sources = null

    try {
      sources.value = await listDataSources()

      // Auto-select first source if none selected
      if (sources.value.length > 0 && selectedSourceId.value === null) {
        selectedSourceId.value = sources.value[0]?.sourceId || null
      }
    } catch (err) {
      error.value.sources = err instanceof Error ? err.message : 'Failed to load data sources'
      logger.error('DataSourcesStore', 'Error fetching sources', err)
    } finally {
      loading.value.sources = false
    }
  }

  async function selectDataSource(sourceId: number) {
    selectedSourceId.value = sourceId

    // If a report type is selected, fetch the report for the new source
    if (selectedReportType.value && !isPluginReportType(selectedReportType.value)) {
      await fetchReport(selectedReportType.value)
    }
  }

  async function selectReportType(reportType: AnyReportType) {
    selectedReportType.value = reportType

    // Plugin surfaces fetch their own data inside the parcel; there is no
    // WebAPI report endpoint behind a plugin report type.
    if (isPluginReportType(reportType)) return

    if (selectedSourceId.value) {
      await fetchReport(reportType)
    }
  }

  async function fetchReport(reportType: ReportType) {
    if (!selectedSourceId.value) return

    const source = selectedSource.value
    if (!source) return

    const cacheKey = `${selectedSourceId.value}-${reportType}`

    // Return cached if available
    if (reportCache.value.has(cacheKey)) {
      logger.debug('DataSourcesStore', 'Using cached report', cacheKey)
      return
    }

    // Don't start a new fetch if already loading
    if (loading.value.report) {
      logger.debug('DataSourcesStore', 'Already loading a report, skipping', cacheKey)
      return
    }

    loading.value.report = true
    error.value.report = null

    try {
      if (reportType === 'dashboard') {
        const data = await getDashboardReport(source.sourceKey)
        cacheReport(cacheKey, { type: 'dashboard', data })
      } else if (reportType === 'datadensity') {
        const { getDataDensityReport } = await import('@/services/datasource.service')
        const data = await getDataDensityReport(source.sourceKey)
        cacheReport(cacheKey, { type: 'datadensity', data })
      } else if (reportType === 'person') {
        const { getPersonReport } = await import('@/services/datasource.service')
        const data = await getPersonReport(source.sourceKey)
        cacheReport(cacheKey, { type: 'person', data })
      } else if (reportType === 'observationPeriod') {
        const { getObservationPeriodReport } = await import('@/services/datasource.service')
        const data = await getObservationPeriodReport(source.sourceKey)
        cacheReport(cacheKey, { type: 'observationPeriod', data })
      } else if (reportType === 'death') {
        const { getDeathReport } = await import('@/services/datasource.service')
        const data = await getDeathReport(source.sourceKey)
        cacheReport(cacheKey, { type: 'death', data })
      } else if (
        reportType === 'visit' ||
        reportType === 'conditionOccurrence' ||
        reportType === 'conditionEra' ||
        reportType === 'procedure' ||
        reportType === 'drugExposure' ||
        reportType === 'drugEra' ||
        reportType === 'measurement' ||
        reportType === 'observation'
      ) {
        const data = await getClinicalDomainReport(source.sourceKey, reportType)
        cacheReport(cacheKey, { type: 'clinical', data: { prevalenceData: data } })
      } else {
        throw new Error(`Report type ${reportType} not yet implemented`)
      }
    } catch (err) {
      // Ignore abort errors - user switched reports before this one loaded
      if (err instanceof Error && err.name === 'AbortError') {
        logger.debug('DataSourcesStore', 'Report fetch aborted', cacheKey)
        return
      }

      error.value.report = err instanceof Error ? err.message : 'Failed to load report'
      logger.error('DataSourcesStore', 'Error fetching report', {
        reportType,
        sourceKey: source.sourceKey,
        error: err,
      })
    } finally {
      loading.value.report = false
    }
  }

  function cacheReport(key: string, data: ReportData) {
    reportCache.value.set(key, data)
    // Trigger reactivity manually since Map mutations aren't tracked
    triggerRef(reportCache)
  }

  function clearCache() {
    reportCache.value.clear()
  }

  function retryFetchSources() {
    return fetchDataSources()
  }

  function retryFetchReport() {
    if (selectedReportType.value && !isPluginReportType(selectedReportType.value)) {
      return fetchReport(selectedReportType.value)
    }
  }

  return {
    // State
    sources,
    selectedSourceId,
    selectedReportType,
    reportCache,
    loading,
    error,

    // Getters
    selectedSource,
    currentReport,
    isLoading,

    // Actions
    fetchDataSources,
    selectDataSource,
    selectReportType,
    fetchReport,
    cacheReport,
    clearCache,
    retryFetchSources,
    retryFetchReport,
  }
})
