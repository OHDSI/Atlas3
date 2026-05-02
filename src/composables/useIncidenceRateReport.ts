import { ref, watch, type Ref } from 'vue'
import { getIncidenceRateReport } from '@/services/webapi'
import type { IncidenceRateReport } from '@/models/incidence-rate.types'
import { logger } from '@/utils/logger'

/**
 * Reactive report fetch keyed on (sourceKey, targetId, outcomeId).
 * Pass refs/computeds for any combination; the report refetches whenever
 * all four are non-null.
 */
export function useIncidenceRateReport(
  irId: Ref<number | null>,
  sourceKey: Ref<string | null>,
  targetId: Ref<number | null>,
  outcomeId: Ref<number | null>
) {
  const report = ref<IncidenceRateReport | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetch() {
    if (
      irId.value == null ||
      sourceKey.value == null ||
      targetId.value == null ||
      outcomeId.value == null
    ) {
      report.value = null
      return
    }
    loading.value = true
    error.value = null
    try {
      const result = await getIncidenceRateReport(
        irId.value,
        sourceKey.value,
        targetId.value,
        outcomeId.value
      )
      if (result.success) report.value = result.data
      else {
        error.value = result.error
        report.value = null
      }
    } catch (err) {
      logger.error('IRReport', 'fetch failed', err)
      error.value = err instanceof Error ? err.message : 'Failed to fetch report'
    } finally {
      loading.value = false
    }
  }

  watch([irId, sourceKey, targetId, outcomeId], fetch, { immediate: true })

  return { report, loading, error, refetch: fetch }
}
