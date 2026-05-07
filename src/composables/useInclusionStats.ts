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
  error: Ref<string | null>
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
  const lastExpressionKey = ref<string | null>(null)

  const currentExpressionKey = computed(() =>
    expression.value ? JSON.stringify(expression.value) : null
  )

  const isStale = computed(
    () => stats.value !== null && currentExpressionKey.value !== lastExpressionKey.value
  )

  async function execute(sourceKey: string, expr: Record<string, unknown>): Promise<void> {
    isLoading.value = true
    error.value = null
    const key = JSON.stringify(expr)
    try {
      const result = await fetchInclusionStats(sourceKey, expr)
      stats.value = result
      lastExpressionKey.value = key
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      error.value = err instanceof Error ? err.message : 'Failed to fetch inclusion stats'
      logger.warn('useInclusionStats', 'fetch failed', err)
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
      }
    }
  )

  watch(currentExpressionKey, () => {
    trigger()
  }, { immediate: true })

  onUnmounted(() => {
    debouncedExecute.cancel()
  })

  return {
    stats,
    isLoading,
    error,
    isStale,
    refresh: trigger,
  }
}
