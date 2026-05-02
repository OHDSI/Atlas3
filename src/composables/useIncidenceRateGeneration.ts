import { ref, onUnmounted } from 'vue'
import {
  generateIncidenceRate,
  cancelIncidenceRateGeneration,
  listIncidenceRateInfo,
} from '@/services/webapi'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { IR_GENERATION_POLL_MS, IR_TERMINAL_STATUSES } from '@/models/incidence-rate.types'
import { logger } from '@/utils/logger'

export function useIncidenceRateGeneration(irId: number) {
  const store = useIncidenceRateStore()
  const polling = ref(false)
  const error = ref<string | null>(null)
  let timer: ReturnType<typeof setInterval> | null = null

  function stopPolling() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    polling.value = false
  }

  function isAnyRunning(): boolean {
    return Object.values(store.executionInfoBySourceKey).some(
      info => !IR_TERMINAL_STATUSES.has(info.executionInfo.status)
    )
  }

  async function pollOnce() {
    const result = await listIncidenceRateInfo(irId)
    if (!result.success) {
      error.value = result.error
      logger.error('IRGeneration', 'pollOnce failed', result.error)
      stopPolling()
      return
    }
    for (const info of result.data) {
      // Backend response keys generations by sourceId numerically;
      // we treat the source key as a string. The caller tracks by sourceKey from the data sources store.
      const sourceKey = String(info.executionInfo.id.sourceId)
      store.setExecutionInfo(sourceKey, info)
    }
    if (!isAnyRunning()) stopPolling()
  }

  function startPolling() {
    if (polling.value) return
    polling.value = true
    timer = setInterval(pollOnce, IR_GENERATION_POLL_MS)
  }

  async function start(sourceKey: string): Promise<boolean> {
    error.value = null
    const result = await generateIncidenceRate(irId, sourceKey)
    if (!result.success) {
      error.value = result.error
      logger.error('IRGeneration', 'start failed', result.error)
      return false
    }
    // Optimistically register pending status
    store.setExecutionInfo(sourceKey, {
      executionInfo: result.data,
      summaryList: [],
    })
    startPolling()
    return true
  }

  async function cancel(sourceKey: string): Promise<boolean> {
    const ok = await cancelIncidenceRateGeneration(irId, sourceKey)
    return ok
  }

  // Initial fetch on mount-equivalent: caller may invoke pollOnce() directly.
  try {
    onUnmounted(stopPolling)
  } catch {
    /* outside component */
  }

  return { polling, error, start, cancel, pollOnce, startPolling, stopPolling }
}
