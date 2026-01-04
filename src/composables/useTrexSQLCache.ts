/**
 * useTrexSQLCache Composable
 *
 * Manages TrexSQL cache state, patient counting, and dataset selection.
 * Provides reactive state for UI components with:
 * - LocalStorage persistence for selected data source
 * - Debounced patient count requests (500ms)
 * - Request cancellation for rapid filter changes
 * - Graceful error handling
 *
 * @packageDocumentation
 */

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

/**
 * Debounce delay for patient count requests (500ms per spec)
 */
const COUNT_DEBOUNCE_MS = 500

/**
 * Composable for TrexSQL cache operations
 */
export function useTrexSQLCache() {
  const authStore = useAuthStore()

  // ============================================================================
  // State
  // ============================================================================

  /** Currently selected data source key */
  const selectedSourceKey: Ref<string | null> = ref(null)

  /** All available data sources with their cache status */
  const dataSources: Ref<DataSourceWithCacheStatus[]> = ref([])

  /** Whether data sources are loading */
  const isLoadingDataSources = ref(false)

  /** Patient count state */
  const countState: Ref<PatientCountState> = ref({
    selectedSourceKey: null,
    result: null,
    isLoading: false,
    error: null,
    cacheStatus: null
  })

  /** Error message for count operations */
  const countError: Ref<string | null> = ref(null)

  /** Whether a count request is in progress */
  const isCountLoading = ref(false)

  /** Whether count request has been running for a long time (>5s) */
  const isCountSlow = ref(false)

  /** Timer ID for slow count detection */
  let slowCountTimerId: ReturnType<typeof setTimeout> | null = null

  // ============================================================================
  // Computed Properties
  // ============================================================================

  /**
   * Whether TrexSQL cache feature is enabled on the server
   * Check from auth store user info
   */
  const isTrexSQLEnabled: ComputedRef<boolean> = computed(() => {
    return authStore.user?.trexsqlCacheEnabled ?? false
  })

  /**
   * Current patient count result
   */
  const patientCount: ComputedRef<PatientCountResult | null> = computed(() => {
    return countState.value.result
  })

  /**
   * Cohort patient count as formatted string
   */
  const cohortPatientCountFormatted: ComputedRef<string> = computed(() => {
    if (!countState.value.result) return '—'
    return countState.value.result.cohortPatientCount.toLocaleString()
  })

  /**
   * Total patient count as formatted string
   */
  const totalPatientCountFormatted: ComputedRef<string> = computed(() => {
    if (!countState.value.result) return '—'
    return countState.value.result.totalPatientCount.toLocaleString()
  })

  /**
   * Cohort percentage of total dataset (0-100)
   */
  const cohortPercentage: ComputedRef<number> = computed(() => {
    const result = countState.value.result
    if (!result || result.totalPatientCount === 0) return 0
    return Math.round((result.cohortPatientCount / result.totalPatientCount) * 100)
  })

  /**
   * Cache status for selected data source
   */
  const selectedCacheStatus: ComputedRef<TrexSQLCacheStatus | null> = computed(() => {
    if (!selectedSourceKey.value) return null
    const source = dataSources.value.find(s => s.sourceKey === selectedSourceKey.value)
    return source?.cacheStatus ?? null
  })

  /**
   * Whether the selected data source has a ready cache
   */
  const isCacheReady: ComputedRef<boolean> = computed(() => {
    return selectedCacheStatus.value?.status === 'ready'
  })

  /**
   * Human-readable cache status message
   */
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

  // ============================================================================
  // LocalStorage Persistence
  // ============================================================================

  /**
   * Load selected source from localStorage
   */
  function loadSelectedSource(): void {
    try {
      const stored = localStorage.getItem(TREXSQL_SELECTED_SOURCE_KEY)
      if (stored) {
        selectedSourceKey.value = stored
        logger.debug('TrexSQLCache', `Loaded selected source from localStorage: ${stored}`)
      }
    } catch (error) {
      logger.warn('TrexSQLCache', 'Failed to load selected source from localStorage', error)
    }
  }

  /**
   * Save selected source to localStorage
   */
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

  // Watch for source changes and persist
  watch(selectedSourceKey, (newKey) => {
    saveSelectedSource(newKey)
    countState.value.selectedSourceKey = newKey
  })

  // ============================================================================
  // Data Source Operations
  // ============================================================================

  /**
   * Fetch data sources with their cache status
   */
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
      logger.debug('TrexSQLCache', `Fetched ${sourcesWithStatus.length} data sources`)

      // Auto-select first source with ready cache if none selected
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

  /**
   * Select a data source
   */
  function selectDataSource(sourceKey: string): void {
    if (selectedSourceKey.value !== sourceKey) {
      // Cancel any pending count request
      cancelCountRequest(selectedSourceKey.value || '')

      // Clear previous count state
      countState.value = {
        selectedSourceKey: sourceKey,
        result: null,
        isLoading: false,
        error: null,
        cacheStatus: dataSources.value.find(s => s.sourceKey === sourceKey)?.cacheStatus ?? null
      }

      selectedSourceKey.value = sourceKey
      logger.debug('TrexSQLCache', `Selected data source: ${sourceKey}`)
    }
  }

  // ============================================================================
  // Patient Count Operations
  // ============================================================================

  /**
   * Clear slow count timer
   */
  function clearSlowCountTimer(): void {
    if (slowCountTimerId) {
      clearTimeout(slowCountTimerId)
      slowCountTimerId = null
    }
    isCountSlow.value = false
  }

  /**
   * Start slow count timer (shows "counting in progress" after 5 seconds)
   */
  function startSlowCountTimer(): void {
    clearSlowCountTimer()
    slowCountTimerId = setTimeout(() => {
      if (isCountLoading.value) {
        isCountSlow.value = true
      }
    }, 5000)
  }

  /**
   * Internal function to execute patient count request
   */
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
      logger.debug('TrexSQLCache', `Getting patient count for ${sourceKey}`)

      const result = await fetchPatientCount(sourceKey, expression)

      countState.value.result = result
      countState.value.isLoading = false

      logger.debug('TrexSQLCache', `Patient count: ${result.cohortPatientCount}/${result.totalPatientCount} in ${result.executionTimeMs}ms`)
    } catch (error) {
      // Don't report aborted requests as errors
      if (error instanceof Error && error.name === 'AbortError') {
        logger.debug('TrexSQLCache', 'Patient count request was cancelled')
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

  /**
   * Debounced patient count function (500ms delay per spec)
   */
  const debouncedGetPatientCount = debounce(
    (sourceKey: string, expression: Record<string, unknown>) => {
      executePatientCount(sourceKey, expression)
    },
    COUNT_DEBOUNCE_MS
  )

  /**
   * Get patient count for a cohort expression
   * Automatically debounced to prevent excessive API calls
   *
   * @param expression - Cohort expression in Atlas format
   */
  function getPatientCount(expression: Record<string, unknown>): void {
    if (!selectedSourceKey.value) {
      countError.value = 'Please select a data source'
      return
    }

    debouncedGetPatientCount(selectedSourceKey.value, expression)
  }

  /**
   * Get patient count immediately (bypasses debounce)
   * Use sparingly - prefer getPatientCount for most cases
   *
   * @param expression - Cohort expression in Atlas format
   */
  async function getPatientCountImmediate(expression: Record<string, unknown>): Promise<void> {
    if (!selectedSourceKey.value) {
      countError.value = 'Please select a data source'
      return
    }

    debouncedGetPatientCount.cancel()
    await executePatientCount(selectedSourceKey.value, expression)
  }

  /**
   * Cancel pending count request
   */
  function cancelCount(): void {
    debouncedGetPatientCount.cancel()
    if (selectedSourceKey.value) {
      cancelCountRequest(selectedSourceKey.value)
    }
    clearSlowCountTimer()
    isCountLoading.value = false
    countState.value.isLoading = false
  }

  /**
   * Clear patient count state
   */
  function clearCount(): void {
    cancelCount()
    countState.value.result = null
    countError.value = null
  }

  /**
   * Retry last failed count request
   */
  function retryCount(expression: Record<string, unknown>): void {
    countError.value = null
    getPatientCount(expression)
  }

  // ============================================================================
  // Initialization
  // ============================================================================

  /**
   * Initialize the composable
   * Load persisted state and fetch data sources
   */
  async function initialize(): Promise<void> {
    loadSelectedSource()

    if (isTrexSQLEnabled.value) {
      await fetchDataSourcesWithCacheStatus()
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  onUnmounted(() => {
    cancelAllCountRequests()
    debouncedGetPatientCount.cancel()
    clearSlowCountTimer()
  })

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    selectedSourceKey,
    dataSources,
    isLoadingDataSources,
    countState,
    countError,
    isCountLoading,
    isCountSlow,

    // Computed
    isTrexSQLEnabled,
    patientCount,
    cohortPatientCountFormatted,
    totalPatientCountFormatted,
    cohortPercentage,
    selectedCacheStatus,
    isCacheReady,
    cacheStatusMessage,

    // Actions
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

/**
 * Export type for composable return value
 */
export type UseTrexSQLCacheReturn = ReturnType<typeof useTrexSQLCache>
