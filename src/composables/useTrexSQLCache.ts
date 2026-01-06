import { ref, computed, watch, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { logger } from '@/utils/logger'
import { debounce } from '@/utils/debounce'
import {
  TREXSQL_SELECTED_SOURCE_KEY,
  type PatientCountResult,
  type TrexSQLCacheStatus,
  type DataSourceWithCacheStatus,
  type PatientCountState
} from '@/models/trexsql.types'
import {
  getPatientCount as fetchPatientCount,
  getCacheStatus,
  cancelCountRequest,
  cancelAllCountRequests
} from '@/services/trexsql.service'
import { listDataSources } from '@/services/datasource.service'

const COUNT_DEBOUNCE_MS = 500

export function useTrexSQLCache() {
  const authStore = useAuthStore()

  const selectedSourceKey: Ref<string | null> = ref(null)
  const dataSources: Ref<DataSourceWithCacheStatus[]> = ref([])
  const isLoadingDataSources = ref(false)

  const countState: Ref<PatientCountState> = ref({
    selectedSourceKey: null,
    result: null,
    isLoading: false,
    error: null,
    cacheStatus: null
  })

  const countError: Ref<string | null> = ref(null)
  const isCountLoading = ref(false)
  const isCountSlow = ref(false)

  let slowCountTimerId: ReturnType<typeof setTimeout> | null = null

  const trexSQLDetected = ref<boolean | null>(null)

  const isTrexSQLEnabled: ComputedRef<boolean> = computed(() => {
    // If auth store has explicit value, use it
    if (authStore.user?.trexsqlCacheEnabled !== undefined) {
      return authStore.user.trexsqlCacheEnabled
    }
    return trexSQLDetected.value ?? false
  })

  const patientCount: ComputedRef<PatientCountResult | null> = computed(() => {
    return countState.value.result
  })

  const cohortPatientCountFormatted: ComputedRef<string> = computed(() => {
    if (!countState.value.result) return '—'
    return countState.value.result.cohortPatientCount.toLocaleString()
  })

  const totalPatientCountFormatted: ComputedRef<string> = computed(() => {
    if (!countState.value.result) return '—'
    return countState.value.result.totalPatientCount.toLocaleString()
  })

  const cohortPercentage: ComputedRef<number> = computed(() => {
    const result = countState.value.result
    if (!result || result.totalPatientCount === 0) return 0
    return Math.round((result.cohortPatientCount / result.totalPatientCount) * 100)
  })

  const selectedCacheStatus: ComputedRef<TrexSQLCacheStatus | null> = computed(() => {
    if (!selectedSourceKey.value) return null
    const source = dataSources.value.find(s => s.sourceKey === selectedSourceKey.value)
    return source?.cacheStatus ?? null
  })

  const isCacheReady: ComputedRef<boolean> = computed(() => {
    return selectedCacheStatus.value?.status === 'ready'
  })

  const cacheStatusMessage: ComputedRef<string> = computed(() => {
    const status = selectedCacheStatus.value?.status
    if (!status) return 'No data source selected'

    switch (status) {
      case 'ready':
        return 'Cache ready'
      case 'building':
        return 'Cache is building...'
      case 'not_built':
        return 'Cache not built. Build the cache to enable patient counting.'
      case 'stale':
        return 'Cache is stale. Consider rebuilding for accurate counts.'
      case 'error':
        return selectedCacheStatus.value?.errorMessage || 'Cache error'
      default:
        return 'Unknown cache status'
    }
  })

  function loadSelectedSource(): void {
    try {
      const stored = localStorage.getItem(TREXSQL_SELECTED_SOURCE_KEY)
      if (stored) {
        selectedSourceKey.value = stored
      }
    } catch (error) {
      logger.warn('TrexSQLCache', 'Failed to load selected source from localStorage', error)
    }
  }

  function saveSelectedSource(sourceKey: string | null): void {
    try {
      if (sourceKey) {
        localStorage.setItem(TREXSQL_SELECTED_SOURCE_KEY, sourceKey)
      } else {
        localStorage.removeItem(TREXSQL_SELECTED_SOURCE_KEY)
      }
    } catch (error) {
      logger.warn('TrexSQLCache', 'Failed to save selected source to localStorage', error)
    }
  }

  watch(selectedSourceKey, (newKey) => {
    saveSelectedSource(newKey)
    countState.value.selectedSourceKey = newKey
  })

  async function fetchDataSourcesWithCacheStatus(): Promise<void> {
    if (!isTrexSQLEnabled.value) {
      dataSources.value = []
      return
    }

    isLoadingDataSources.value = true

    try {
      logger.debug('TrexSQLCache', 'Fetching data sources with cache status')

      const sources = await listDataSources()

      // Fetch cache status for each source in parallel
      const sourcesWithStatus = await Promise.all(
        sources.map(async (source): Promise<DataSourceWithCacheStatus> => {
          try {
            const cacheStatus = await getCacheStatus(source.sourceKey)
            return {
              sourceKey: source.sourceKey,
              sourceName: source.sourceName,
              cacheStatus
            }
          } catch (error) {
            logger.warn('TrexSQLCache', `Failed to get cache status for ${source.sourceKey}`, error)
            return {
              sourceKey: source.sourceKey,
              sourceName: source.sourceName,
              cacheStatus: null
            }
          }
        })
      )

      dataSources.value = sourcesWithStatus

      if (!selectedSourceKey.value) {
        const readySource = sourcesWithStatus.find(s => s.cacheStatus?.status === 'ready')
        if (readySource) {
          selectedSourceKey.value = readySource.sourceKey
        } else if (sourcesWithStatus.length > 0) {
          selectedSourceKey.value = sourcesWithStatus[0]?.sourceKey ?? null
        }
      }
    } catch (error) {
      logger.error('TrexSQLCache', 'Failed to fetch data sources', error)
      dataSources.value = []
    } finally {
      isLoadingDataSources.value = false
    }
  }

  function selectDataSource(sourceKey: string): void {
    if (selectedSourceKey.value !== sourceKey) {
      cancelCountRequest(selectedSourceKey.value || '')

      countState.value = {
        selectedSourceKey: sourceKey,
        result: null,
        isLoading: false,
        error: null,
        cacheStatus: dataSources.value.find(s => s.sourceKey === sourceKey)?.cacheStatus ?? null
      }

      selectedSourceKey.value = sourceKey
    }
  }

  function clearSlowCountTimer(): void {
    if (slowCountTimerId) {
      clearTimeout(slowCountTimerId)
      slowCountTimerId = null
    }
    isCountSlow.value = false
  }

  function startSlowCountTimer(): void {
    clearSlowCountTimer()
    slowCountTimerId = setTimeout(() => {
      if (isCountLoading.value) {
        isCountSlow.value = true
      }
    }, 5000)
  }

  async function executePatientCount(
    sourceKey: string,
    expression: Record<string, unknown>
  ): Promise<void> {
    if (!sourceKey || !isTrexSQLEnabled.value) return

    // Check if cache is ready
    const source = dataSources.value.find(s => s.sourceKey === sourceKey)
    if (source?.cacheStatus?.status !== 'ready') {
      countError.value = 'Cache not ready. Please build the cache first.'
      return
    }

    isCountLoading.value = true
    countError.value = null
    countState.value.isLoading = true
    countState.value.error = null

    startSlowCountTimer()

    try {
      const result = await fetchPatientCount(sourceKey, expression)

      countState.value.result = result
      countState.value.isLoading = false
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      const errorMessage = error instanceof Error ? error.message : 'Failed to get patient count'
      countError.value = errorMessage
      countState.value.error = errorMessage
      countState.value.isLoading = false
      logger.error('TrexSQLCache', 'Patient count failed', error)
    } finally {
      isCountLoading.value = false
      clearSlowCountTimer()
    }
  }

  const debouncedGetPatientCount = debounce(
    (sourceKey: string, expression: Record<string, unknown>) => {
      executePatientCount(sourceKey, expression)
    },
    COUNT_DEBOUNCE_MS
  )

  function getPatientCount(expression: Record<string, unknown>): void {
    if (!selectedSourceKey.value) {
      countError.value = 'Please select a data source'
      return
    }

    debouncedGetPatientCount(selectedSourceKey.value, expression)
  }

  async function getPatientCountImmediate(expression: Record<string, unknown>): Promise<void> {
    if (!selectedSourceKey.value) {
      countError.value = 'Please select a data source'
      return
    }

    debouncedGetPatientCount.cancel()
    await executePatientCount(selectedSourceKey.value, expression)
  }

  function cancelCount(): void {
    debouncedGetPatientCount.cancel()
    if (selectedSourceKey.value) {
      cancelCountRequest(selectedSourceKey.value)
    }
    clearSlowCountTimer()
    isCountLoading.value = false
    countState.value.isLoading = false
  }

  function clearCount(): void {
    cancelCount()
    countState.value.result = null
    countError.value = null
  }

  function retryCount(expression: Record<string, unknown>): void {
    countError.value = null
    getPatientCount(expression)
  }

  async function initialize(): Promise<void> {
    loadSelectedSource()

    if (authStore.user?.trexsqlCacheEnabled === undefined) {
      await detectTrexSQLAvailability()
    }

    if (isTrexSQLEnabled.value) {
      await fetchDataSourcesWithCacheStatus()
    }
  }

  async function detectTrexSQLAvailability(): Promise<void> {
    try {
      const sources = await listDataSources()
      const firstSource = sources[0]
      if (firstSource) {
        try {
          await getCacheStatus(firstSource.sourceKey)
          trexSQLDetected.value = true
        } catch {
          trexSQLDetected.value = false
        }
      } else {
        trexSQLDetected.value = false
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.warn('useTrexSQLCache', `Failed to detect TrexSQL availability: ${errorMessage}`)
      trexSQLDetected.value = false
    }
  }

  onUnmounted(() => {
    cancelAllCountRequests()
    debouncedGetPatientCount.cancel()
    clearSlowCountTimer()
  })

  return {
    selectedSourceKey,
    dataSources,
    isLoadingDataSources,
    countState,
    countError,
    isCountLoading,
    isCountSlow,
    isTrexSQLEnabled,
    patientCount,
    cohortPatientCountFormatted,
    totalPatientCountFormatted,
    cohortPercentage,
    selectedCacheStatus,
    isCacheReady,
    cacheStatusMessage,
    initialize,
    fetchDataSourcesWithCacheStatus,
    selectDataSource,
    getPatientCount,
    getPatientCountImmediate,
    cancelCount,
    clearCount,
    retryCount
  }
}

export type UseTrexSQLCacheReturn = ReturnType<typeof useTrexSQLCache>
