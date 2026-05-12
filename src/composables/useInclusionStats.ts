import { ref, computed, watch, onUnmounted } from 'vue'
import type { Ref, ComputedRef } from 'vue'
import { useTrexSQLCache } from '@/composables/useTrexSQLCache'
import { getInclusionStats as fetchInclusionStats } from '@/services/trexsql.service'
import type { InclusionStatsResult } from '@/models/trexsql.types'
import { debounce } from '@/utils/debounce'
import { logger } from '@/utils/logger'

const DEBOUNCE_MS = 500

export interface UseInclusionStatsReturn {
  stats: Ref<InclusionStatsResult | null>
  isLoading: Ref<boolean>
  isPending: ComputedRef<boolean>
  error: Ref<string | null>
  isInvalidExpression: ComputedRef<boolean>
  isStale: ComputedRef<boolean>
  refresh: () => void
}

export function useInclusionStats(
  expression: Ref<Record<string, unknown> | null>
): UseInclusionStatsReturn {
  const { isTrexSQLEnabled, selectedSourceKey, isCacheReady } = useTrexSQLCache()

  const stats = ref<InclusionStatsResult | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const isInvalidExpression = ref(false)
  const lastExpressionKey = ref<string | null>(null)

  const currentExpressionKey = computed(() =>
    expression.value ? JSON.stringify(expression.value) : null
  )

  const isStale = computed(
    () => stats.value !== null && currentExpressionKey.value !== lastExpressionKey.value
  )

  // True from the moment the expression changes until the (debounced)
  // request resolves. The plain `isLoading` only flips to true after the
  // debounce window — `isPending` lets the UI show a spinner immediately.
  const isPending = computed(
    () => isLoading.value || (currentExpressionKey.value !== lastExpressionKey.value
                              && currentExpressionKey.value !== null)
  )

  async function execute(sourceKey: string, expr: Record<string, unknown>): Promise<void> {
    isLoading.value = true
    error.value = null
    isInvalidExpression.value = false
    const key = JSON.stringify(expr)
    try {
      const result = await fetchInclusionStats(sourceKey, expr)
      stats.value = result
      lastExpressionKey.value = key
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      const isInvalid = err instanceof Error && err.name === 'InvalidExpressionError'
      isInvalidExpression.value = isInvalid
      error.value = err instanceof Error ? err.message : 'Failed to fetch inclusion stats'
      // Mark this expression as "answered" (with an error) so isPending
      // clears — otherwise the spinner stays up forever on a 422.
      lastExpressionKey.value = key
      stats.value = null
      if (!isInvalid) {
        logger.warn('useInclusionStats', 'fetch failed', err)
      }
    } finally {
      isLoading.value = false
    }
  }

  const debouncedExecute = debounce(
    (sourceKey: string, expr: Record<string, unknown>) => {
      void execute(sourceKey, expr)
    },
    DEBOUNCE_MS
  )

  function trigger(): void {
    if (!isTrexSQLEnabled.value) return
    if (!isCacheReady.value) return
    if (!selectedSourceKey.value) return
    if (!expression.value) return
    debouncedExecute(selectedSourceKey.value, expression.value)
  }

  watch(
    selectedSourceKey,
    (newSource, oldSource) => {
      if (oldSource !== undefined && newSource !== oldSource) {
        stats.value = null
        lastExpressionKey.value = null
        trigger()
      }
    }
  )

  watch(currentExpressionKey, () => {
    trigger()
  }, { immediate: true })

  // Re-fire once the cache becomes ready: when a cohort definition is
  // loaded straight onto the page, the expression watch above runs first
  // (with isCacheReady === false) and trigger() returns early. Without
  // this watch, nothing else would re-trigger the call until the user
  // edited the expression.
  watch(isCacheReady, (ready) => {
    if (ready) trigger()
  })

  // Same problem for the source: the auto-select inside fetchDataSources
  // sets selectedSourceKey from null → "EUNOMIA" *after* the expression
  // watch fires; the existing watch above ignores that transition because
  // oldSource is undefined.
  watch(selectedSourceKey, (newSource) => {
    if (newSource) trigger()
  })

  onUnmounted(() => {
    debouncedExecute.cancel()
  })

  return {
    stats,
    isLoading,
    isPending,
    error,
    isInvalidExpression: computed(() => isInvalidExpression.value),
    isStale,
    refresh: trigger,
  }
}
