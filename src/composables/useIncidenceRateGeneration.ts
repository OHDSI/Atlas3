import { ref, onUnmounted } from 'vue'
import {
  generateIncidenceRate,
  cancelIncidenceRateGeneration,
  listIncidenceRateInfo,
} from '@/services/webapi'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useDataSourcesStore } from '@/stores/datasources'
import { IR_GENERATION_POLL_MS, IR_TERMINAL_STATUSES } from '@/models/incidence-rate.types'
import { logger } from '@/utils/logger'

export function useIncidenceRateGeneration(irId: number) {
  const store = useIncidenceRateStore()
  const ds = useDataSourcesStore()
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
      error.value = result.error.message
      logger.error('IRGeneration', 'pollOnce failed', result.error)
      stopPolling()
      return
    }
    for (let attempt = 0; attempt < 2 && ds.sources.length === 0; attempt++) {
      try { await ds.fetchDataSources() } catch { /* retry */ }
    }
    const idToKey = new Map(ds.sources.map(s => [s.sourceId, s.sourceKey]))
    for (const info of result.data) {
      const numId = info.executionInfo.id.sourceId
      const sourceKey = idToKey.get(numId) ?? String(numId)
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
      error.value = result.error.message
      logger.error('IRGeneration', 'start failed', result.error)
      return false
    }
    await pollOnce()
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
